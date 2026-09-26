/**
 * Print content renderer (render.ts).
 *
 * Owns the print-safe typography layer and the document body HTML. It never
 * touches page geometry and never decides page breaks — the pagination engine
 * (paginate.ts) supplies fixed printable-area windows and Chromium's own
 * fragmentation supplies the breaks. The SAME CSS + body are used by the
 * preview, the thumbnails, the PDF export and the native print document, so
 * they cannot drift apart.
 *
 * Document colors are PRESERVED, never rewritten:
 *  - no `!important` color overrides exist (headings, pre, tables, blockquote
 *    all inherit the document's inline styles);
 *  - `print-color-adjust: exact` keeps backgrounds/highlights on paper;
 *  - the "Background graphics" toggle uses a class that strips backgrounds in
 *    the preview AND on paper (text colors, links, borders and images stay).
 */
import { MARGIN_PRESETS, paperOrientedMm } from "./papers";
import type { PrintMargins, PrintOrientation, PrintPaperSize, PrintSettings } from "./types";

export interface PrintSource {
  mode: "rich" | "plain" | "code";
  html: string | null;
  text: string | null;
  title: string;
  direction: "ltr" | "rtl";
  hasSelection: boolean;
  selectionHtml: string | null;
}

export interface PrintGeometry {
  pageWidthPx: number;
  pageHeightPx: number;
  contentWidthPx: number;
  contentHeightPx: number;
}

/** Printable geometry in CSS px after orientation + margins + scale. */
export function computePrintGeometry(settings: PrintSettings): PrintGeometry {
  const margins = normalizeMargins(settings.margins);
  const geo = printableContentPx(settings.paper, settings.orientation, margins);
  const scale =
    settings.scaling === "percent" ? settings.scalePercent / 100 : 1;
  return {
    pageWidthPx: geo.pageWidth,
    pageHeightPx: geo.pageHeight,
    contentWidthPx: Math.max(1, geo.contentWidth * scale),
    contentHeightPx: Math.max(1, geo.contentHeight * scale),
  };
}

export function normalizeMargins(value: PrintMargins): PrintMargins {
  return {
    top: finite(value.top),
    bottom: finite(value.bottom),
    left: finite(value.left),
    right: finite(value.right),
  };
}

function finite(n: number): number {
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function printableContentPx(
  paper: PrintPaperSize,
  orientation: PrintOrientation,
  marginsMm: PrintMargins,
): { contentWidth: number; contentHeight: number; pageWidth: number; pageHeight: number } {
  const { widthMm, heightMm } = paperOrientedMm(paper, orientation);
  const scale = 96 / 25.4;
  const pageWidth = widthMm * scale;
  const pageHeight = heightMm * scale;
  return {
    contentWidth: Math.max(1, pageWidth - (marginsMm.left + marginsMm.right) * scale),
    contentHeight: Math.max(1, pageHeight - (marginsMm.top + marginsMm.bottom) * scale),
    pageWidth,
    pageHeight,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const BG_OFF_CLASS = "lp-bg-off";

/**
 * The typography layer shared by preview, print and PDF. It never touches page
 * geometry; the container supplies width, the pagination engine supplies
 * breaks, and @page supplies printer margins. There are no `!important` color
 * overrides so inline document styles always win.
 */
export function buildContentCss(): string {
  return `
.lp-print-doc {
  color: #111827;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
  text-rendering: optimizeLegibility;
}
.lp-print-doc .lp-print-title {
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 20pt; font-weight: 700; line-height: 1.3;
  color: #111827; margin: 0 0 0.6em; padding-bottom: 0.35em;
  border-bottom: 1px solid #e5e7eb; page-break-after: avoid; break-after: avoid;
}
.lp-print-doc.lp-no-title-tag .lp-print-title { display: none; }

.lp-print-body { word-wrap: break-word; overflow-wrap: break-word; }
.lp-print-body.lp-print-plain pre {
  font-family: inherit; font-size: inherit; line-height: inherit;
  white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere;
  background: none; border: none; padding: 0; margin: 0; color: #111827;
}

.lp-print-prose { font-family: "Segoe UI", system-ui, -apple-system, sans-serif; }
.lp-print-prose p { margin: 0.25em 0; min-height: 1.2em; line-height: 1.6; orphans: 3; widows: 3; }
.lp-print-prose h1, .lp-print-prose h2, .lp-print-prose h3,
.lp-print-prose h4, .lp-print-prose h5, .lp-print-prose h6 {
  font-weight: 650; letter-spacing: -0.01em;
  page-break-after: avoid; break-after: avoid;
  page-break-inside: avoid; break-inside: avoid;
}
.lp-print-prose h1 { font-size: 2em; line-height: 1.25; margin: 1.1em 0 0.5em; }
.lp-print-prose h2 { font-size: 1.6em; line-height: 1.3; margin: 1em 0 0.45em; }
.lp-print-prose h3 { font-size: 1.28em; line-height: 1.35; margin: 0.9em 0 0.4em; }
.lp-print-prose h4 { font-size: 1.1em; line-height: 1.4; margin: 0.85em 0 0.35em; }
.lp-print-prose h5 { font-size: 1em; line-height: 1.45; margin: 0.8em 0 0.3em; }
.lp-print-prose h6 {
  font-size: 0.9em; line-height: 1.5; margin: 0.8em 0 0.3em;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.lp-print-prose blockquote {
  border-left: 3px solid #9ca3af; padding-left: 1rem; margin: 0.9em 0;
  page-break-inside: avoid; break-inside: avoid;
}
.lp-print-prose pre {
  background: #f6f8fa; border: 1px solid #e2e8f0; border-radius: 8px;
  padding: 0.8em 1em; font-family: Consolas, Menlo, "Cascadia Code", monospace;
  font-size: 9pt; line-height: 1.45; color: #111827;
  white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere;
}
.lp-print-prose code {
  background: #eef2f6; border-radius: 4px;
  padding: 0.15em 0.35em; font-size: 0.9em;
  font-family: Consolas, Menlo, "Cascadia Code", monospace; word-break: break-word;
}
.lp-print-prose pre code { background: transparent; padding: 0; border-radius: 0; color: inherit; }
.lp-print-prose a { color: #1d4ed8; text-decoration: underline; word-break: break-word; }
.lp-print-prose ul, .lp-print-prose ol { padding-left: 1.5em; }
.lp-print-prose ul { list-style: disc; }
.lp-print-prose ol { list-style: decimal; }
.lp-print-prose li { margin-bottom: 0.15em; page-break-inside: avoid; break-inside: avoid; }
.lp-print-prose ul ul, .lp-print-prose ol ul { list-style: circle; }
.lp-print-prose ol ol, .lp-print-prose ul ol { list-style: lower-alpha; }
.lp-print-prose ul[data-type="taskList"] { list-style: none; padding-left: 0; }
.lp-print-prose ul[data-type="taskList"] > li {
  display: flex; align-items: flex-start; gap: 0.5rem;
  page-break-inside: avoid; break-inside: avoid;
}
.lp-print-prose ul[data-type="taskList"] li > label { flex: 0 0 auto; margin-top: 0.15rem; }
.lp-print-prose ul[data-type="taskList"] li > div { flex: 1 1 auto; }
.lp-print-prose ul[data-type="taskList"] li[data-checked="true"] > div > p {
  text-decoration: line-through; opacity: 0.6;
}
.lp-print-prose table { width: 100%; border-collapse: collapse; margin: 1em 0; }
.lp-print-prose th, .lp-print-prose td {
  border: 1px solid #cbd5e1; padding: 0.5rem 0.7rem; vertical-align: top;
  font-size: 0.95em;
}
.lp-print-prose tr { page-break-inside: avoid; break-inside: avoid; }
.lp-print-prose thead { display: table-header-group; }
.lp-print-prose th { font-weight: 700; }
.lp-print-prose hr { border: none; border-top: 1px solid #d1d5db; margin: 1.2em 0; }
.lp-print-prose img {
  display: block; max-width: 100% !important; height: auto !important;
  object-fit: contain; aspect-ratio: auto; page-break-inside: avoid; break-inside: avoid;
}
.lp-print-prose img[data-align="center"] { margin-left: auto !important; margin-right: auto !important; }
.lp-print-prose img[data-align="right"] { margin-left: auto !important; }
.lp-print-prose img[data-display="inline"] { display: inline-block !important; margin: 0 !important; vertical-align: baseline; }
.lp-print-doc[dir="rtl"] .lp-print-body { text-align: right; }
.lp-print-doc[dir="rtl"] .lp-print-prose ul,
.lp-print-doc[dir="rtl"] .lp-print-prose ol { padding-left: 0; padding-right: 1.5em; }
.lp-print-doc[dir="rtl"] .lp-print-prose blockquote { border-left: 0; border-right: 3px solid #9ca3af; padding-left: 0; padding-right: 1rem; }
.lp-print-doc[dir="rtl"] .lp-print-prose img[data-align="right"] { margin-left: 0 !important; margin-right: auto !important; }
.lp-print-doc[dir="rtl"] .lp-print-prose img[data-align="left"] { margin-right: auto !important; }

/* ---- Background graphics OFF -------------------------------------
   Removes backgrounds (page shading, table fill, highlights) without touching
   text colors, link colors, borders or images. Applies on screen AND on paper
   so the preview always matches the output. */
.lp-print-doc.lp-bg-off,
.lp-print-doc.lp-bg-off * {
  -webkit-print-color-adjust: economy !important;
  print-color-adjust: economy !important;
}
.lp-print-doc.lp-bg-off .lp-print-prose,
.lp-print-doc.lp-bg-off .lp-print-body { background: transparent !important; }
.lp-print-doc.lp-bg-off .lp-print-prose :where(pre, code, th, td, blockquote, mark) {
  background: transparent !important;
}
.lp-print-doc.lp-bg-off .lp-print-prose [style*="background" i] {
  background-color: transparent !important;
  background-image: none !important;
}
.lp-print-doc.lp-bg-off .lp-print-title { border-bottom-color: #d1d5db; }
.lp-print-book {
  margin: 0; padding: 0;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
.lp-print-book .lp-print-doc,
.lp-print-book .lp-print-body {
  width: auto !important;
  max-width: none;
  margin: 0;
  padding: 0;
}
`;
}

/** Resolves the effective margins from a margin preset expression. */
export function resolveMargins(settings: PrintSettings): PrintMargins {
  if (settings.marginPreset !== "custom") {
    return MARGIN_PRESETS[settings.marginPreset];
  }
  return settings.margins;
}

/**
 * The rendered document body (content only, no geometry). The SAME string is
 * measured by pagination, embedded in the preview's book, and printed.
 */
export function buildPrintBodyHtml(
  source: PrintSource,
  settings: PrintSettings,
  rangeModeOverride?: PrintSettings["rangeMode"],
): string {
  const mode = rangeModeOverride ?? settings.rangeMode;
  const isPlain = source.mode !== "rich";
  const useSelection = isPlain ? false : mode === "selection" && !!source.selectionHtml && source.hasSelection;
  const content = useSelection
    ? (source.selectionHtml ?? "")
    : (source.html ?? escapeHtml(source.text ?? ""));

  const bodyClass = `lp-print-body ${isPlain ? "lp-print-plain" : "lp-print-prose"}`;
  const docClass = settings.backgroundGraphics ? "lp-print-doc" : `lp-print-doc ${BG_OFF_CLASS}`;
  return (
    `<div class="${docClass}" dir="${source.direction}">` +
    `<div class="${bodyClass}">` +
    (settings.includeTitle && source.title
      ? `<div class="lp-print-title">${escapeHtml(source.title)}</div>`
      : "") +
    (isPlain ? `<pre>${content}</pre>` : content) +
    `</div>` +
    `</div>`
  );
}