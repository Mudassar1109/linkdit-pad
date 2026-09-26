/**
 * Pagination engine (paginate.ts).
 *
 * Measures the CURRENT document under the active print settings using plain
 * CSS block layout, then paginates it with REAL multi-column fragmentation —
 * the same algorithm Chromium uses on paper — so preview, PDF and native print
 * can never disagree about page boundaries.
 *
 * The key idea is the BOOK:
 *   - the full document is rendered ONCE into a fixed-height, fixed-width
 *     multi-column box (column height == printable area height). Each column is
 *     one page. Blocks that fit inside a page's vertical box stay together
 *     (`break-inside: avoid`), text paragraphs fragment cleanly at line edges,
 *     and unbreakable blocks that would cross a boundary move intact to the
 *     next column — exactly like a real paginator.
 *   - every page is then rendered as a FIXED printable-area window that clips
 *     to one column of that same book. The window is a string fragment that is
 *     byte-identical in the preview, the thumbnails and the print document.
 *
 * This replaces the old "group blocks into pages and re-flow each subset from
 * top = 0" approach, which destroyed intra-page geometry and produced white
 * gaps, misaligned and clipped content and page counts that disagreed with the
 * printed output.
 */
import { normalizeMargins, resolveMargins, buildContentCss, buildPrintBodyHtml } from "./render";
import { parseCustomRange, printableContentPx } from "./papers";
import type { PrintSource } from "./render";
import type { PrintSettings } from "./types";

export interface PrintLayout {
  /** Resolved effective scale percentage (fit-to-page resolves to a number). */
  scalePct: number;
  /** Printable content width in CSS px after scale is applied (= column width). */
  contentWidthPx: number;
  /** Printable content height in CSS px (= column/page height, fixed). */
  contentHeightPx: number;
  /** Oriented paper width in CSS px. */
  pageWidthPx: number;
  /** Oriented paper height in CSS px. */
  pageHeightPx: number;
  /** Unscaled printable content width (from margins/orientation). */
  baseContentWidthPx: number;
  /** Single-flow natural height of the document at the scaled column width. */
  naturalHeightPx: number;
  pageCount: number;
  /** The full-flow document HTML (measured AND re-rendered identically). */
  bookHtml: string;
  title: string;
  direction: "ltr" | "rtl";
}

const SCALE_MIN = 10;
const SCALE_MAX = 200;

function clampScale(n: number): number {
  return Math.min(SCALE_MAX, Math.max(SCALE_MIN, Math.round(n)));
}

export function getMeasureHost(): HTMLElement {
  let host = document.getElementById("lp-print-measure-host");
  if (!host || !document.body.contains(host)) {
    host = document.createElement("div");
    host.id = "lp-print-measure-host";
    host.setAttribute("aria-hidden", "true");
    document.body.appendChild(host);
  }
  return host;
}

function clearHost(host: HTMLElement): void {
  host.replaceChildren();
}

/**
 * Renders the document into a single offscreen flow of the given width.
 * Returns the `.lp-print-doc` root element.
 */
function renderMeasureFlow(
  host: HTMLElement,
  source: PrintSource,
  settings: PrintSettings,
  widthPx: number,
): HTMLElement {
  const style = document.createElement("style");
  style.dataset.printMeasure = "1";
  style.textContent = `
.lp-measure-root{position:fixed !important;left:-24000px !important;top:0 !important;visibility:hidden !important;pointer-events:none !important;z-index:-100000 !important;}
.lp-measure-root .lp-print-body{width:${widthPx}px;}
${buildContentCss()}
`;
  const root = document.createElement("div");
  root.className = "lp-measure-root";
  root.innerHTML = buildPrintBodyHtml(source, settings);
  host.replaceChildren(style, root);
  return root;
}

/**
 * Renders the document into the fixed-height multi-column BOOK for
 * fragmentation-based page measurement. Returns the root element.
 */
function renderMeasureBook(
  host: HTMLElement,
  source: PrintSource,
  settings: PrintSettings,
  columnWidthPx: number,
  columnHeightPx: number,
  columnCount: number,
): HTMLElement {
  const style = document.createElement("style");
  style.dataset.printMeasure = "1";
  style.textContent = `
.lp-measure-root{position:fixed !important;left:-24000px !important;top:0 !important;visibility:hidden !important;pointer-events:none !important;z-index:-100000 !important;}
.lp-measure-root.lp-print-book{
  width:${columnCount * columnWidthPx}px !important;
  height:${columnCount * columnHeightPx}px !important;
  column-count:${columnCount} !important;
  -webkit-column-count:${columnCount} !important;
  column-fill:auto !important;
  -webkit-column-fill:auto !important;
  column-gap:0 !important;
  -webkit-column-gap:0 !important;
  direction:ltr !important;
}
${buildContentCss()}
`;
  const root = document.createElement("div");
  root.className = "lp-measure-root lp-print-book";
  root.innerHTML = buildPrintBodyHtml(source, settings);
  host.replaceChildren(style, root);
  return root;
}

/** Natural single-column height at a given width (px). */
export function measureNaturalHeight(root: HTMLElement): number {
  const body = root.querySelector(".lp-print-body") ?? root;
  return Math.max(0, Math.ceil(body.getBoundingClientRect().height));
}

/**
 * Page count from the fragmented book: the page of the deepest content
 * fragment. Uses each block's own top AND bottom so content that fragments
 * across columns is always counted.
 */
function measureBookPageCount(root: HTMLElement, columnHeightPx: number): number {
  const base = root.getBoundingClientRect().top;
  const body = root.querySelector(".lp-print-body") ?? root;
  let maxPage = 1;
  // Sub-pixel guard: content that lands within ~1px of a column boundary
  // belongs to that boundary's page, not the one after it.
  const pageForBottom = (bottom: number) =>
    Math.max(1, Math.ceil((bottom - 0.5) / columnHeightPx));
  const walk: (el: Element) => void = (el) => {
    const rect = el.getBoundingClientRect();
    const top = rect.top - base;
    if (top + rect.height > 0) {
      maxPage = Math.max(maxPage, pageForBottom(top + rect.height));
    }
  };
  Array.from(body.children).forEach(walk);
  const bodyBottom = body.getBoundingClientRect().bottom - base;
  if (bodyBottom > 0) {
    maxPage = Math.max(maxPage, pageForBottom(bodyBottom));
  }
  return Math.max(1, maxPage);
}

function resolveScalePct(
  settings: PrintSettings,
  naturalHeightPx: number,
  contentHeightPx: number,
): number {
  switch (settings.scaling) {
    case "percent":
      return clampScale(settings.scalePercent);
    case "fit-to-page":
    case "fit-to-width": {
      // Shrink-only: never enlarge content beyond its natural size.
      const ratio = naturalHeightPx > 0 ? (contentHeightPx / naturalHeightPx) * 100 : 100;
      return clampScale(Math.floor(Math.min(100, ratio)));
    }
    default:
      return 100;
  }
}

/**
 * Measures the document and returns the shared layout. The layout owns exactly
 * ONE copy of the document HTML (`bookHtml`) plus the fixed geometry; every
 * preview page and every printed page is a clipped window into it.
 */
export function layoutPrintDocument(
  host: HTMLElement,
  source: PrintSource,
  settings: PrintSettings,
): PrintLayout {
  const baseSettings: PrintSettings = { ...settings, scaling: "actual", scalePercent: 100 };
  const { pageWidthPx, pageHeightPx, contentWidthPx: baseContent, contentHeightPx: baseHeight } =
    baseGeometry(baseSettings);
  const baseContentWidthPx = Math.max(1, baseContent);
  const contentHeightPx = Math.max(1, baseHeight);

  // Scaling. For fit-to-page / fit-to-width, narrowing the column makes the
  // content taller, so we iterate to a fixed point (converges monotonically).
  let scalePct: number;
  if (settings.scaling === "fit-to-page" || settings.scaling === "fit-to-width") {
    let w = baseContentWidthPx;
    let s = 100;
    for (let i = 0; i < 5; i++) {
      const r = renderMeasureFlow(host, source, settings, w);
      s = resolveScalePct(settings, measureNaturalHeight(r), contentHeightPx);
      const nextW = Math.max(1, Math.round((baseContentWidthPx * s) / 100));
      if (Math.abs(nextW - w) < 0.6) break;
      w = nextW;
    }
    scalePct = s;
  } else {
    scalePct = resolveScalePct(settings, contentHeightPx, contentHeightPx);
  }
  const contentWidthPx = Math.max(1, Math.round((baseContentWidthPx * scalePct) / 100));

  // Final measurement at the scaled column width.
  const r2 = renderMeasureFlow(host, source, settings, contentWidthPx);
  const naturalHeightPx = measureNaturalHeight(r2);
  const estFromNatural = Math.max(1, Math.ceil(naturalHeightPx / contentHeightPx));

  // Fragmentation-aware page count from the real book layout.
  let pageCount = estFromNatural;
  let book = renderMeasureBook(host, source, settings, contentWidthPx, contentHeightPx, estFromNatural);
  let measured = measureBookPageCount(book, contentHeightPx);
  if (measured !== estFromNatural) {
    pageCount = measured;
    // Re-measure with the corrected column count (rare; costs one extra layout).
    book = renderMeasureBook(host, source, settings, contentWidthPx, contentHeightPx, measured);
    measured = measureBookPageCount(book, contentHeightPx);
    pageCount = Math.max(pageCount, measured);
  }
  clearHost(host);

  return {
    scalePct,
    contentWidthPx,
    contentHeightPx,
    pageWidthPx,
    pageHeightPx,
    baseContentWidthPx,
    naturalHeightPx,
    pageCount,
    bookHtml: buildPrintBodyHtml(source, settings),
    title: source.title,
    direction: source.direction,
  };
}

function baseGeometry(settings: PrintSettings): {
  pageWidthPx: number;
  pageHeightPx: number;
  contentWidthPx: number;
  contentHeightPx: number;
} {
  const margins = normalizeMargins(resolveMargins(settings));
  const { contentWidth, contentHeight, pageWidth, pageHeight } = printableContentPx(
    settings.paper,
    settings.orientation,
    margins,
  );
  return { pageWidthPx: pageWidth, pageHeightPx: pageHeight, contentWidthPx: contentWidth, contentHeightPx: contentHeight };
}

/** Inline styles for the shared book column layout at the given page offset. */
function bookPosStyle(
  columnWidthPx: number,
  columnHeightPx: number,
  columnCount: number,
  page: number,
): string {
  return [
    `position:absolute;top:0;left:${-((page - 1) * columnWidthPx)}px`,
    `width:${columnCount * columnWidthPx}px;height:${columnCount * columnHeightPx}px`,
    `column-count:${columnCount};-webkit-column-count:${columnCount}`,
    `column-fill:auto;-webkit-column-fill:auto`,
    `column-gap:0;-webkit-column-gap:0`,
    `direction:ltr`,
  ].join(";");
}

export function buildPageNumberHtml(page: number, total: number, pos: string): string {
  if (pos === "off") return "";
  const vert = pos.startsWith("top") ? "top:4px;" : "bottom:4px;";
  let align: string;
  if (pos.endsWith("left")) align = "left:10px;text-align:left;";
  else if (pos.endsWith("right")) align = "right:10px;text-align:right;";
  else align = "left:0;right:0;text-align:center;";
  return (
    `<div class="lp-print-page-num" style="position:absolute;${vert}${align}` +
    `font-size:9pt;line-height:1;color:#6b7280;font-family:'Segoe UI',system-ui,sans-serif;` +
    `pointer-events:none;z-index:2;">` +
    `${page} / ${total}` +
    `</div>`
  );
}

/**
 * One page's printable-area fragment. The SAME string is used by the preview
 * (wrapped with the physical margins) and by the print document (`@page`
 * supplies the margins). The book window has fixed absolute geometry — content
 * is never re-flowed, so intra-page layout is exact.
 */
export function buildPageFragmentHtml(
  layout: PrintLayout,
  page: number,
  settings: PrintSettings,
): string {
  const CW = layout.contentWidthPx;
  const CH = layout.contentHeightPx;
  const N = layout.pageCount;
  const num = buildPageNumberHtml(page, N, settings.pageNumbers);
  return (
    `<div class="lp-print-sheet" data-print-page="${page}" data-print-geometry="" ` +
    `style="width:${CW}px;height:${CH}px;position:relative;overflow:hidden;background:#ffffff;">` +
    `<div class="lp-print-clip" style="position:absolute;top:0;left:0;width:${CW}px;height:${CH}px;overflow:hidden;z-index:0;">` +
    `<div class="lp-print-book" style="${bookPosStyle(CW, CH, N, page)}">${layout.bookHtml}</div>` +
    `</div>` +
    num +
    `</div>`
  );
}

/** Grid layout for N-up sheets: n pages per physical sheet. */
export function nupGrid(n: number): { rows: number; cols: number } {
  switch (n) {
    case 2:
      return { rows: 1, cols: 2 };
    case 4:
      return { rows: 2, cols: 2 };
    case 6:
      return { rows: 2, cols: 3 };
    case 8:
      return { rows: 2, cols: 4 };
    case 16:
      return { rows: 4, cols: 4 };
    default:
      return { rows: 1, cols: 1 };
  }
}

/**
 * One physical SHEET containing several document pages scaled to fit
 * (pages per sheet / N-up). Used identically by the preview and the print
 * document so N-up output is the preview.
 */
export function buildSheetFragmentHtml(
  layout: PrintLayout,
  pagesInSheet: number[],
  activePage?: number,
): string {
  const CW = layout.contentWidthPx;
  const CH = layout.contentHeightPx;
  const { rows, cols } = nupGrid(pagesInSheet.length);
  const cellW = CW / cols;
  const cellH = CH / rows;
  const s = Math.min(cellW / CW, cellH / CH);
  const cells = pagesInSheet.map((page, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = c * cellW;
    const y = r * cellH;
    const inner = innerPageFragment(layout, page);
    return (
      `<div class="lp-print-nup-cell" data-print-page="${page}" data-active="${activePage === page ? "true" : "false"}" ` +
      `style="position:absolute;left:${x}px;top:${y}px;width:${cellW}px;height:${cellH}px;overflow:hidden;background:#ffffff;border:1px solid #e5e7eb;">` +
      `<div style="position:absolute;left:0;top:0;width:${CW}px;height:${CH}px;transform:scale(${s});transform-origin:top left;">` +
      inner +
      `</div></div>`
    );
  }).join("");
  return (
    `<div class="lp-print-sheet lp-print-sheet-nup" data-print-nup="" ` +
    `style="width:${CW}px;height:${CH}px;position:relative;overflow:hidden;background:#ffffff;direction:ltr;">` +
    cells +
    `</div>`
  );
}

/** The inner printable-area window (without the page-number chrome). */
function innerPageFragment(layout: PrintLayout, page: number): string {
  const CW = layout.contentWidthPx;
  const CH = layout.contentHeightPx;
  const N = layout.pageCount;
  return (
    `<div class="lp-print-clip" style="position:absolute;top:0;left:0;width:${CW}px;height:${CH}px;overflow:hidden;">` +
    `<div class="lp-print-book" style="${bookPosStyle(CW, CH, N, page)}">${layout.bookHtml}</div>` +
    `</div>`
  );
}

/** Resolves requested page numbers from the range mode (1-based, non-empty). */
export function resolveRequestedPages(
  settings: PrintSettings,
  layout: PrintLayout,
): { pages: number[]; errorKey: string | null } {
  switch (settings.rangeMode) {
    case "all":
      return { pages: Array.from({ length: layout.pageCount }, (_, i) => i + 1), errorKey: null };
    case "current": {
      const current = Math.min(layout.pageCount, Math.max(1, settings.currentPage ?? 1));
      return { pages: [current], errorKey: null };
    }
    case "selection":
      return { pages: Array.from({ length: layout.pageCount }, (_, i) => i + 1), errorKey: null };
    case "custom": {
      const parsed = parseCustomRange(settings.customRange, layout.pageCount);
      if (typeof parsed === "string") return { pages: [], errorKey: parsed };
      if (parsed.length === 0) return { pages: [], errorKey: "print.range.invalid" };
      return { pages: parsed, errorKey: null };
    }
    default:
      return { pages: [], errorKey: "print.range.invalid" };
  }
}