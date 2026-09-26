/**
 * Print system public API (index.ts).
 *
 * Every entry point in the app funnels through `openPrintDialog()`:
 *   - App.tsx global Ctrl+P
 *   - Toolbar Print button / File > Print
 *   - Toolbar Export > PDF (same workflow; PDF export is a print target)
 */
import { usePrintStore } from "./store";

export function openPrintDialog(): void {
  const store = usePrintStore.getState();
  if (store.isOpen) return;
  void store.open();
}

export function closePrintDialog(): void {
  usePrintStore.getState().close();
}

export { usePrintStore, defaultPrintSettings, expandCopies } from "./store";
export * from "./types";
export {
  parseCustomRange,
  getPaperById,
  PAPER_SIZES,
  MARGIN_PRESETS,
  SCALE_MIN,
  SCALE_MAX,
} from "./papers";
export { buildContentCss, buildPrintBodyHtml, computePrintGeometry, resolveMargins } from "./render";
export {
  layoutPrintDocument,
  buildPageFragmentHtml,
  buildSheetFragmentHtml,
  buildPageNumberHtml,
  resolveRequestedPages,
  getMeasureHost,
  nupGrid,
} from "./paginate";
export { buildPrintDocument } from "./doc";