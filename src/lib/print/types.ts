/**
 * Shared type definitions for the LinkDit Pad print pipeline (types.ts).
 *
 * These types are consumed by every part of the print system: the settings
 * store, the print renderer, the pagination engine and the preview UI. Keeping
 * them in one file guarantees File -> Print, Ctrl+P and the toolbar Print all
 * describe print state identically.
 */

export type PrintOrientation = "portrait" | "landscape";

export type PrintMarginPreset = "normal" | "narrow" | "moderate" | "wide" | "custom";

export interface PrintMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export type PrintScaling = "actual" | "fit-to-page" | "fit-to-width" | "percent";

export type PrintPagesPerSheet = 1 | 2 | 4 | 6 | 8 | 16;

export type PrintColorMode = "color" | "grayscale";

export type PrintDuplex = "simplex" | "long-edge" | "short-edge";

export type PrintRangeMode = "all" | "current" | "selection" | "custom";

/** Paper size expressed in millimetres (order-independent A/B/R sizes). */
export interface PrintPaperSize {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
}

export interface PrintSettings {
  paper: PrintPaperSize;
  orientation: PrintOrientation;
  marginPreset: PrintMarginPreset;
  margins: PrintMargins;
  scaling: PrintScaling;
  scalePercent: number;
  pagesPerSheet: PrintPagesPerSheet;
  colorMode: PrintColorMode;
  duplex: PrintDuplex;
  collated: boolean;
  copies: number;
  /** Print background colors, highlights, images and shading on the paper. */
  backgroundGraphics: boolean;
  rangeMode: PrintRangeMode;
  customRange: string;
  /** Preview page the user is currently viewing ("Print current page" basis). */
  currentPage: number;
  includeTitle: boolean;
  pageNumbers: "off" | "bottom-center" | "bottom-left" | "bottom-right" | "top-center" | "top-left" | "top-right";
  printerName: string | null;
}

export interface PrintPreset {
  id: string;
  name: string;
  settings: Omit<PrintSettings, "rangeMode" | "customRange" | "printerName" | "copies">;
  /** ISO timestamp of the last time the preset was saved/updated. */
  updatedAt: string;
}

export interface PrinterInfo {
  name: string;
  isDefault: boolean;
  isNetwork: boolean;
  /** "idle" | "printing" | "offline" | "error" | "unknown" */
  status: string;
  port?: string | null;
}

/** Capabilities Windows reports for a specific printer (best effort). */
export interface PrinterCapabilities {
  supportsColor: boolean | null;
  supportsDuplex: boolean | null;
  collateSupported: boolean | null;
  paperSizesMm: Array<{ name: string; widthMm: number; heightMm: number }>;
  orientations: Array<"portrait" | "landscape">;
  name: string;
  /** True when the printer was enumerated but capability probing failed. */
  fallback: boolean;
}

export type PrintJobStatus = "idle" | "preparing" | "rendering" | "measuring" | "printing" | "finished" | "error";

export interface PrintJobState {
  status: PrintJobStatus;
  messageKey: string | null;
  errorKey: string | null;
  startedAt: number | null;
  finishedAt: number | null;
}

export interface PrintTarget {
  pageCount: number;
  requestedPages: number[];
  selectionActive: boolean;
  documentTitle: string;
  documentDir: "ltr" | "rtl";
  mode: "rich" | "plain" | "code";
}