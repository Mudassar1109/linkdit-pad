import type { Editor } from "@tiptap/core";

export const MIN_IMAGE_SIZE = 20;
export const MIN_CROP = 8;
export const MAX_CROP_DIMENSION = 4096;

export function clampBillboard(value: number, min: number, max: number): number {
  if (max < min) return min;
  return clamp(value, min, max);
}

export interface Dims {
  w: number;
  h: number;
}

export interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Usable horizontal space inside the editor's ProseMirror content box. */
export function editorContentWidth(editor: Editor): number {
  const dom = editor.view?.dom as HTMLElement | undefined;
  if (!dom) return 800;
  const cs = window.getComputedStyle(dom);
  const padding =
    parseFloat(cs.paddingLeft || "0") + parseFloat(cs.paddingRight || "0");
  return Math.max(dom.clientWidth - padding, MIN_IMAGE_SIZE);
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (/^https?:/i.test(src)) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image-load-failed"));
    img.src = src;
  });
}

function outputFormat(src: string): { mime: string; quality?: number } {
  const dataMime = src.startsWith("data:image/")
    ? src.slice(5, src.indexOf(";") > -1 ? src.indexOf(";") : src.length)
    : "";
  if (/^image\/(jpeg|png|webp|gif)$/i.test(dataMime)) {
    const mime = dataMime.toLowerCase();
    if (mime === "image/jpeg" || mime === "image/webp") {
      return { mime, quality: 0.92 };
    }
    if (mime === "image/gif") {
      return { mime: "image/png" };
    }
    return { mime: "image/png" };
  }
  const ext = (src.split("?")[0].toLowerCase().match(/\.(jpe?g|png|webp|gif|bmp)$/) || [])[1];
  switch (ext) {
    case "jpg":
    case "jpeg":
      return { mime: "image/jpeg", quality: 0.92 };
    case "webp":
      return { mime: "image/webp", quality: 0.92 };
    default:
      return { mime: "image/png" };
  }
}

/**
 * Crop `src` to `box` (in source-bitmap pixel coordinates) and return a
 * data URL of the result. Throws when the source cannot be drawn to a canvas
 * (e.g. cross-origin resource without CORS headers).
 */
export async function cropToDataUrl(src: string, box: CropBox): Promise<string> {
  const img = await loadImage(src);
  const sw = Math.max(1, Math.round(box.w));
  const sh = Math.max(1, Math.round(box.h));
  let outW = Math.min(sw, MAX_CROP_DIMENSION);
  let outH = Math.min(sh, MAX_CROP_DIMENSION);
  if (sw > MAX_CROP_DIMENSION || sh > MAX_CROP_DIMENSION) {
    const scale = Math.min(MAX_CROP_DIMENSION / sw, MAX_CROP_DIMENSION / sh);
    outW = Math.max(1, Math.round(sw * scale));
    outH = Math.max(1, Math.round(sh * scale));
  }
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no-canvas-context");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, box.x, box.y, sw, sh, 0, 0, outW, outH);
  const { mime, quality } = outputFormat(src);
  return canvas.toDataURL(mime, quality);
}