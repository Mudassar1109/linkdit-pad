/**
 * Print document assembly (doc.ts).
 *
 * Builds the self-contained HTML document that is handed to the OS print
 * dialog (execute.ts). It combines:
 *   - @page: real printer margins + oriented paper size (mm, exact),
 *   - the shared typography layer (render.ts),
 *   - the shared fixed-geometry page/sheet fragments (paginate.ts).
 *
 * Because the fragments are byte-for-byte the preview's, what you see is what
 * the PDF and the printer produce. Grayscale is applied as a CSS filter on the
 * whole document, so preview and paper cannot disagree.
 */
import { buildContentCss, normalizeMargins, resolveMargins } from "./render";
import { buildPageFragmentHtml, buildSheetFragmentHtml } from "./paginate";
import type { PrintLayout } from "./paginate";
import type { PrintSettings } from "./types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sheetCss(): string {
  return `
.lp-print-sheet {
  background: #ffffff;
  position: relative;
  page-break-after: always;
  break-after: page;
  overflow: hidden;
}
.lp-print-sheet:last-child { page-break-after: auto; break-after: auto; }
.lp-print-page-num { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
@page { margin: 0; }
`;
}

/**
 * Builds the full self-contained print document.
 *
 * `physicalPages` is the final expanded page list AFTER copies and collation
 * have been applied (see expandCopies in store.ts). Paged output uses one
 * `.lp-print-sheet` per physical page; N-up output groups the physical pages
 * into sheets via buildSheetFragmentHtml.
 */
export function buildPrintDocument(
  layout: PrintLayout,
  settings: PrintSettings,
  physicalPages: number[],
): string {
  normalizeMargins(resolveMargins(settings));
  const pageSize =
    `@page { size: ${layout.pageWidthPx}px ${layout.pageHeightPx}px; margin: 0; }`;

  const fragments = physicalPages.map((page, i) => {
    if (settings.pagesPerSheet > 1) {
      const sheetIndex = Math.floor(i / settings.pagesPerSheet);
      const start = sheetIndex * settings.pagesPerSheet;
      const group = physicalPages.slice(start, start + settings.pagesPerSheet);
      return buildSheetFragmentHtml(layout, group);
    }
    return buildPageFragmentHtml(layout, page, settings);
  });

  const bodyClass = settings.colorMode === "grayscale" ? "lp-print-gray" : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(layout.title || "Print")}</title>
<style>
html, body { margin: 0; padding: 0; }
.lp-print-gray { -webkit-filter: grayscale(1); filter: grayscale(1); }
${pageSize}
${sheetCss()}
${buildContentCss()}
</style>
</head>
<body class="${bodyClass}" dir="${layout.direction}">
${fragments.join("\n")}
</body>
</html>`;
}