/**
 * Paper sizes, margins and unit conversion helpers (papers.ts).
 *
 * All paper tables are in millimetres — the unit the spec requires as the
 * default for custom margins. CSS pixels for the (96dpi) preview are derived
 * from millimetres so one engine drives both the screen preview and the
 * @page-directive driven print output.
 */
import type { PrintMargins, PrintOrientation, PrintPaperSize } from "./types";

export const MM_TO_PX = 96 / 25.4;
export const PX_TO_MM = 25.4 / 96;

export function mmToPx(mm: number): number {
  return mm * MM_TO_PX;
}

export function pxToMm(px: number): number {
  return px * PX_TO_MM;
}

export function mmLabel(mm: number): string {
  const trimmed = Math.round(mm * 10) / 10;
  return Number.isInteger(trimmed) ? String(trimmed) : trimmed.toFixed(1);
}

const paper = (id: string, widthMm: number, heightMm: number): PrintPaperSize => ({
  id,
  name: id.toUpperCase().replace("-", " "),
  widthMm,
  heightMm,
});

export const PAPER_SIZES: PrintPaperSize[] = [
  paper("a3", 297, 420),
  paper("a4", 210, 297),
  paper("a5", 148, 210),
  paper("a6", 105, 148),
  paper("a2", 420, 594),
  paper("b5", 176, 250),
  paper("letter", 215.9, 279.4),
  paper("legal", 215.9, 355.6),
  paper("executive", 184.15, 266.7),
  paper("statement", 139.7, 215.9),
  paper("tabloid", 279.4, 431.8),
];

export type PaperId = (typeof PAPER_SIZES)[number]["id"];

export function getPaperById(id: string): PrintPaperSize {
  return PAPER_SIZES.find((p) => p.id === id) ?? PAPER_SIZES[1];
}

/** Effective printable extent (mm) once orientation is applied. */
export function paperOrientedMm(paper: PrintPaperSize, orientation: PrintOrientation):
  { widthMm: number; heightMm: number } {
  if (orientation === "landscape") {
    return { widthMm: paper.heightMm, heightMm: paper.widthMm };
  }
  return { widthMm: paper.widthMm, heightMm: paper.heightMm };
}

/** Effective printable content size in CSS px after margins are removed. */
export function printableContentPx(
  paper: PrintPaperSize,
  orientation: PrintOrientation,
  marginsMm: PrintMargins,
): { contentWidth: number; contentHeight: number; pageWidth: number; pageHeight: number } {
  const oriented = paperOrientedMm(paper, orientation);
  const pageWidth = mmToPx(oriented.widthMm);
  const pageHeight = mmToPx(oriented.heightMm);
  const contentWidth = Math.max(1, pageWidth - mmToPx(marginsMm.left) - mmToPx(marginsMm.right));
  const contentHeight = Math.max(1, pageHeight - mmToPx(marginsMm.top) - mmToPx(marginsMm.bottom));
  return { contentWidth, contentHeight, pageWidth, pageHeight };
}

/**
 * Standard margin presets, expressed in millimetres.
 *  - Normal:   1" all around (the classic default)
 *  - Narrow:   1.27cm (0.5") all around
 *  - Moderate: 2.54cm top/bottom, 1.91cm left/right
 *  - Wide:     2.54cm top/bottom, 5.08cm left/right
 */
export const MARGIN_PRESETS: Record<"normal" | "narrow" | "moderate" | "wide", PrintMargins> = {
  normal: { top: 25.4, bottom: 25.4, left: 25.4, right: 25.4 },
  narrow: { top: 12.7, bottom: 12.7, left: 12.7, right: 12.7 },
  moderate: { top: 25.4, bottom: 25.4, left: 19.05, right: 19.05 },
  wide: { top: 25.4, bottom: 25.4, left: 50.8, right: 50.8 },
};

export const MARGIN_MAX_MM = 80;
export const MARGIN_MIN_MM = 0;

export function clampMargin(value: number): number {
  return Math.min(MARGIN_MAX_MM, Math.max(MARGIN_MIN_MM, Math.round(value * 10) / 10));
}

export function normalizeMargins(value: PrintMargins): PrintMargins {
  return {
    top: clampMargin(value.top),
    bottom: clampMargin(value.bottom),
    left: clampMargin(value.left),
    right: clampMargin(value.right),
  };
}

export const SCALE_MIN = 10;
export const SCALE_MAX = 200;
export const COPIES_MIN = 1;
export const COPIES_MAX = 999;

export function parseCustomRange(input: string, pageCount: number): number[] | string {
  // Returns the 1-based list of pages, or a string error message.
  const trimmed = input.trim();
  if (!trimmed) return [];
  const pages = new Set<number>();
  const parts = trimmed.split(",");
  for (const part of parts) {
    const seg = part.trim();
    if (!seg) return "print.range.invalid";
    const rangeMatch = seg.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const a = Number(rangeMatch[1]);
      const b = Number(rangeMatch[2]);
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < a) {
        return "print.range.invalid";
      }
      if (b > pageCount) return "print.range.exceedsPageCount";
      for (let i = a; i <= b; i++) pages.add(i);
      continue;
    }
    if (/^\d+$/.test(seg)) {
      const n = Number(seg);
      if (n < 1) return "print.range.invalid";
      if (n > pageCount) return "print.range.exceedsPageCount";
      pages.add(n);
      continue;
    }
    return "print.range.invalid";
  }
  if (pages.size === 0) return "print.range.invalid";
  return [...pages].sort((x, y) => x - y);
}