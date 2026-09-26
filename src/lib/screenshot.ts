import html2canvas from "html2canvas";
import { getFocusedPaneTabId, useEditorStore } from "@/store/useEditorStore";

export type ScreenshotMode = "visible" | "entire";

/**
 * Screenshot engine.
 *
 * The previous implementation rasterized the editor HTML by embedding it into an
 * SVG <foreignObject> and drawing that image onto a <canvas>. Chromium-based
 * webviews (WebView2) treat such SVGs as tainted regardless of CORS, so
 * canvas.toBlob() always threw "Tainted canvases may not be exported".
 *
 * This engine instead re-renders the document content with canvas drawing
 * primitives from the live computed styles (via html2canvas). No SVG, no
 * foreignObject, no canvas-tainting resource loads. Every <img> inside the
 * content is converted to a data: URL first (or replaced with a clean
 * placeholder if it cannot be localized), so nothing inside the document can
 * ever taint the output canvas.
 */

export function screenshotFileName(title?: string): string {
  const base =
    (title ?? "Untitled")
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 80) || "Untitled";
  return `${base}-Screenshot.png`;
}

export function focusedScreenshotTitle(): string | undefined {
  const s = useEditorStore.getState();
  const id = getFocusedPaneTabId(s);
  return id ? s.tabs[id]?.meta.title : undefined;
}

interface ContentSource {
  /** CSS-pixel content width of the editor. */
  width: number;
  /** CSS-pixel height of the visible editor viewport. */
  viewportHeight: number;
  /** CSS-pixel height of the full document content. */
  fullHeight: number;
  /** CSS-pixel scroll offset of the focused editor. */
  scrollTop: number;
  /** Builds a fresh, width-fixed, full-height render node. */
  build: () => HTMLElement;
}

function findFocusedPaneRoot(): HTMLElement | null {
  const s = useEditorStore.getState();
  const pane = s.splitMode !== "none" && s.activePane === "secondary" ? "secondary" : "primary";
  return document.querySelector(`[data-pane="${pane}"]`) as HTMLElement | null;
}

function buildRichSource(container: HTMLElement): ContentSource {
  const width = container.clientWidth;
  const viewportHeight = container.clientHeight;
  const fullHeight = Math.max(container.scrollHeight, viewportHeight);
  const scrollTop = container.scrollTop;
  return {
    width,
    viewportHeight,
    fullHeight,
    scrollTop,
    build() {
      const el = container.cloneNode(true) as HTMLElement;
      el.style.width = `${width}px`;
      el.style.height = "auto";
      el.style.minHeight = "0px";
      el.style.overflow = "visible";
      el.style.position = "relative";
      const pm = el.querySelector<HTMLElement>(".ProseMirror");
      if (pm) pm.style.minHeight = "0px";
      return el;
    },
  };
}

function buildPlainSource(textarea: HTMLTextAreaElement): ContentSource {
  const cs = getComputedStyle(textarea);
  const width = textarea.clientWidth;
  const viewportHeight = textarea.clientHeight;
  const fullHeight = textarea.scrollHeight;
  const scrollTop = textarea.scrollTop;
  return {
    width,
    viewportHeight,
    fullHeight,
    scrollTop,
    build() {
      const node = document.createElement("div");
      node.style.cssText = [
        "box-sizing:border-box",
        `width:${width}px`,
        `min-height:${fullHeight}px`,
        "white-space:pre-wrap",
        "overflow-wrap:break-word",
        "word-break:break-word",
        `padding:${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
        `font-size:${cs.fontSize}`,
        `font-family:${cs.fontFamily}`,
        `line-height:${cs.lineHeight}`,
        `letter-spacing:${cs.letterSpacing}`,
        `color:${cs.color}`,
        `direction:${cs.direction}`,
        `text-align:${cs.textAlign}`,
      ].join(";");
      node.textContent = textarea.value || "";
      return node;
    },
  };
}

/** Resolves the concrete editor background color for the active theme. */
function resolveBackground(): string {
  const pane = findFocusedPaneRoot();
  const el = pane?.querySelector<HTMLElement>(".editor-canvas") ?? document.body;
  const cs = getComputedStyle(el);
  if (cs.backgroundColor && cs.backgroundColor !== "transparent" && cs.backgroundColor !== "rgba(0, 0, 0, 0)") {
    return cs.backgroundColor;
  }
  const probe = document.createElement("div");
  probe.style.cssText = "position:absolute;left:0;top:0;width:0;height:0;background:hsl(var(--background));";
  document.body.appendChild(probe);
  const color = getComputedStyle(probe).backgroundColor;
  probe.remove();
  if (color && color !== "transparent" && color !== "rgba(0, 0, 0, 0)") return color;
  return "#ffffff";
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read image data."));
    reader.readAsDataURL(blob);
  });
}

async function urlToDataUrl(src: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(src, { cache: "force-cache", signal: controller.signal });
    if (!res.ok) return null;
    return await blobToDataUrl(await res.blob());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function replaceImageWithPlaceholder(img: HTMLImageElement): void {
  const span = document.createElement("span");
  span.setAttribute("role", "img");
  span.style.cssText = [
    "display:inline-flex",
    "align-items:center",
    "justify-content:center",
    "min-width:140px",
    "min-height:96px",
    "max-width:100%",
    "box-sizing:border-box",
    "border:1px dashed rgba(148,163,184,.65)",
    "border-radius:8px",
    "background:rgba(148,163,184,.12)",
    "color:rgba(100,116,139,.95)",
    "font-size:12.5px",
    "font-style:italic",
    "text-align:center",
    "padding:8px 12px",
    "vertical-align:middle",
  ].join(";");
  span.textContent = img.alt || (img.getAttribute("src") ? "Image unavailable in screenshot" : "Image");
  img.replaceWith(span);
}

/**
 * Converts every <img> in the content to an inline data: URL so that nothing in
 * the document can taint the canvas. Local sources (data:/blob: and anything the
 * webview can fetch with proper CORS) are preserved; anything else is replaced
 * with a clean placeholder so the rest of the screenshot still works.
 */
async function localizeContentImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
  await Promise.all(
    images.map(async (img) => {
      const src = img.getAttribute("src") || "";
      if (!src || /^data:/i.test(src) || /^blob:/i.test(src)) return;
      const data = await urlToDataUrl(src);
      if (data) {
        img.setAttribute("src", data);
      } else {
        replaceImageWithPlaceholder(img);
      }
    })
  );
}

/** Removes url()-based CSS background images that html2canvas cannot fetch. */
function neutralizeBackgroundImages(root: HTMLElement): void {
  for (const el of Array.from(root.querySelectorAll<HTMLElement>("*"))) {
    const bi = getComputedStyle(el).backgroundImage;
    if (bi && bi !== "none" && /url\(/.test(bi) && !/^url\(\s*["']?data:/i.test(bi)) {
      el.style.setProperty("background-image", "none");
    }
  }
}

const MAX_DIM = 16384;
const MAX_SLICE = 8000;

async function renderRange(source: ContentSource, startY: number, endY: number): Promise<Blob> {
  const width = source.width;
  const height = Math.max(1, endY - startY);
  if (width <= 0) throw new Error("Nothing to capture — open a document first.");

  let scale = Math.min(2, window.devicePixelRatio || 1);
  const fit = Math.min(MAX_DIM / width, MAX_DIM / height);
  scale = Math.min(scale, Math.max(0.02, fit));
  if (width * scale > MAX_DIM + 0.5 || height * scale > MAX_DIM + 0.5) {
    throw new Error(`Document is too tall to export as one image (${width}×${height}px is the platform limit).`);
  }

  const backgroundColor = resolveBackground();

  const sandbox = document.createElement("div");
  sandbox.style.cssText = `position:absolute;left:-100000px;top:0;width:${width}px;pointer-events:none;`;
  document.body.appendChild(sandbox);

  const full = source.build();
  sandbox.appendChild(full);
  try {
    await localizeContentImages(full);
    neutralizeBackgroundImages(full);
  } catch {
    // Localization is best-effort; never abort the whole screenshot.
  }

  const sliceHeight = Math.min(MAX_SLICE, Math.floor((MAX_DIM * 0.98) / scale));
  const slices: HTMLCanvasElement[] = [];

  try {
    for (let y = startY; y < endY; y += sliceHeight) {
      const sh = Math.min(sliceHeight, endY - y);
      const box = document.createElement("div");
      box.style.cssText = `position:relative;overflow:hidden;width:${width}px;height:${sh}px;background:${backgroundColor};`;
      const inner = full.cloneNode(true) as HTMLElement;
      inner.style.width = `${width}px`;
      inner.style.marginTop = `${-y}px`;
      box.appendChild(inner);
      sandbox.appendChild(box);
      try {
        const canvas = await html2canvas(box, {
          scale,
          backgroundColor,
          allowTaint: false,
          useCORS: false,
          logging: false,
          imageTimeout: 20000,
          scrollX: 0,
          scrollY: 0,
          windowWidth: width,
          windowHeight: sh,
        });
        slices.push(canvas);
      } finally {
        box.remove();
      }
    }

    const outWidth = Math.max(1, Math.round(width * scale));
    const outHeight = Math.max(1, Math.round(height * scale));
    const final = document.createElement("canvas");
    final.width = outWidth;
    final.height = outHeight;
    const ctx = final.getContext("2d");
    if (!ctx) throw new Error("Canvas rendering is not available.");

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, outWidth, outHeight);
    slices.forEach((slice, i) => {
      ctx.drawImage(slice, 0, Math.round(i * sliceHeight * scale));
    });

    const blob = await new Promise<Blob | null>((resolve) => final.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Could not encode the screenshot as a PNG.");
    return blob;
  } finally {
    sandbox.remove();
  }
}

export async function captureEditorToBlob(mode: ScreenshotMode): Promise<Blob> {
  const pane = findFocusedPaneRoot();
  if (!pane) throw new Error("No editor pane found. Open a document first.");

  const rich = pane.querySelector<HTMLElement>(".editor-container");
  const textarea = pane.querySelector<HTMLTextAreaElement>("textarea");
  const source = rich ? buildRichSource(rich) : textarea ? buildPlainSource(textarea) : null;
  if (!source) throw new Error("No editable content to capture. Open a document first.");

  if (mode === "entire") {
    return renderRange(source, 0, source.fullHeight);
  }
  const top = Math.min(source.scrollTop, Math.max(0, source.fullHeight - source.viewportHeight));
  return renderRange(source, top, top + source.viewportHeight);
}

export async function saveScreenshotPng(blob: Blob, defaultName: string): Promise<boolean> {
  const { save } = await import("@tauri-apps/plugin-dialog");
  const { writeFile } = await import("@tauri-apps/plugin-fs");
  const path = await save({
    defaultPath: defaultName,
    filters: [{ name: "PNG Image", extensions: ["png"] }],
  });
  if (!path) return false;
  await writeFile(path, new Uint8Array(await blob.arrayBuffer()));
  return true;
}

export async function copyScreenshotPng(blob: Blob): Promise<void> {
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
    throw new Error("Clipboard image support is not available in this environment.");
  }
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}