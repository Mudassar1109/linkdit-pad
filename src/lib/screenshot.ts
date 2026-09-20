import { getFocusedPaneTabId, useEditorStore } from "@/store/useEditorStore";

export type ScreenshotMode = "visible" | "entire";

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

interface CaptureSource {
  node: HTMLElement;
  width: number;
  viewportHeight: number;
  fullHeight: number;
  scrollTop: number;
}

function findFocusedPaneRoot(): HTMLElement | null {
  const s = useEditorStore.getState();
  const pane = s.splitMode !== "none" && s.activePane === "secondary" ? "secondary" : "primary";
  return document.querySelector(`[data-pane="${pane}"]`) as HTMLElement | null;
}

function buildRichSource(container: HTMLElement): CaptureSource {
  const node = container.cloneNode(true) as HTMLElement;
  node.style.width = `${container.clientWidth}px`;
  node.style.height = "auto";
  node.style.minHeight = "0px";
  node.style.overflow = "visible";
  return {
    node,
    width: container.clientWidth,
    viewportHeight: container.clientHeight,
    fullHeight: container.scrollHeight,
    scrollTop: container.scrollTop,
  };
}

function buildPlainSource(textarea: HTMLTextAreaElement): CaptureSource {
  const cs = getComputedStyle(textarea);
  const node = document.createElement("div");
  node.style.cssText = [
    "box-sizing:border-box",
    "width:100%",
    `min-height:${textarea.scrollHeight}px`,
    "white-space:pre-wrap",
    "overflow-wrap:break-word",
    "word-break:break-word",
    `padding:${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
    `font-size:${cs.fontSize}`,
    `font-family:${cs.fontFamily}`,
    `line-height:${cs.lineHeight}`,
    `letter-spacing:${cs.letterSpacing}`,
    `color:${cs.color}`,
    `background:${cs.backgroundColor}`,
    `direction:${cs.direction}`,
    `text-align:${cs.textAlign}`,
  ].join(";");
  node.textContent = textarea.value || "";
  return {
    node,
    width: textarea.clientWidth,
    viewportHeight: textarea.clientHeight,
    fullHeight: textarea.scrollHeight,
    scrollTop: textarea.scrollTop,
  };
}

function collectCssText(): string {
  let out = "";
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules ?? [])) out += rule.cssText + "\n";
    } catch {
      // Cross-origin stylesheet (e.g. Google Fonts) — cannot be inlined.
    }
  }
  return out;
}

function copyCssVariables(target: HTMLElement): void {
  const cs = getComputedStyle(document.documentElement);
  for (let i = 0; i < cs.length; i++) {
    const prop = cs[i];
    if (prop.startsWith("--")) target.style.setProperty(prop, cs.getPropertyValue(prop));
  }
}

function resolveBackground(): string {
  const pane = findFocusedPaneRoot();
  const el = pane?.querySelector<HTMLElement>(".editor-canvas") ?? document.body;
  const cs = getComputedStyle(el);
  const bg = cs.backgroundColor;
  if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") return bg;
  return "hsl(var(--background))";
}

async function rasterize(source: CaptureSource, mode: ScreenshotMode): Promise<Blob> {
  const width = Math.max(1, source.width);
  const height = mode === "entire" ? Math.max(source.viewportHeight, source.fullHeight) : Math.max(1, source.viewportHeight);

  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.className = document.documentElement.className;
  wrapper.style.cssText = `width:${width}px;height:${height}px;overflow:hidden;background:${resolveBackground()};`;
  copyCssVariables(wrapper);

  const style = document.createElement("style");
  style.textContent = collectCssText();
  wrapper.appendChild(style);

  const inner = source.node;
  if (mode === "visible" && source.scrollTop > 0) {
    inner.style.marginTop = `${-source.scrollTop}px`;
  }
  wrapper.appendChild(inner);

  const xhtml = new XMLSerializer().serializeToString(wrapper);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${xhtml}</foreignObject></svg>`;
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));

  try {
    const img = new Image();
    img.decoding = "sync";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Could not render the document image."));
      img.src = svgUrl;
    });

    const MAX_DIM = 16000;
    let scale = Math.min(2, window.devicePixelRatio || 1);
    if (width * scale > MAX_DIM || height * scale > MAX_DIM) {
      scale = Math.max(0.5, MAX_DIM / Math.max(width, height));
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas rendering is not available.");

    try {
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
    } catch {
      throw new Error(
        "Screenshot was blocked because the document contains an external image the app cannot re-render."
      );
    }

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Could not encode the screenshot as a PNG.");
    return blob;
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export async function captureEditorToBlob(mode: ScreenshotMode): Promise<Blob> {
  const pane = findFocusedPaneRoot();
  if (!pane) throw new Error("No editor pane found. Open a document first.");

  const rich = pane.querySelector<HTMLElement>(".editor-container");
  if (rich) return rasterize(buildRichSource(rich), mode);

  const textarea = pane.querySelector<HTMLTextAreaElement>("textarea");
  if (textarea) return rasterize(buildPlainSource(textarea), mode);

  throw new Error("No editable content to capture. Open a document first.");
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