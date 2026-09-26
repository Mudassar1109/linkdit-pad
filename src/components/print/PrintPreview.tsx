/**
 * Print preview (PrintPreview.tsx).
 *
 * Shows the EXACT physical sheet that will be printed: the same fixed-geometry
 * fragment (`buildPageFragmentHtml` / `buildSheetFragmentHtml`) that the print
 * document embeds, wrapped in the physical paper with its real margins. The
 * document colors are preserved — the preview sheet is never whitewashed and
 * never re-coloured, so a dark document with cyan accents prints as the user
 * sees it.
 *
 * Only the sheet containing the current page is mounted, so rendering cost is
 * O(1) regardless of document size.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { usePrintStore } from "@/lib/print/store";
import { buildContentCss, resolveMargins } from "@/lib/print/render";
import { buildPageFragmentHtml, buildSheetFragmentHtml } from "@/lib/print/paginate";
import { mmToPx } from "@/lib/print/papers";
import { useI18n } from "@/store/useI18nStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const CONTENT_CSS = buildContentCss();

function fitScale(
  containerW: number,
  containerH: number,
  pageW: number,
  pageH: number,
  mode: "width" | "page",
): number {
  const pad = 48;
  const target =
    mode === "width"
      ? (containerW - pad) / pageW
      : Math.min((containerW - pad) / pageW, (containerH - pad) / pageH);
  return Math.max(0.1, target);
}

/** Page numbers of the physical sheet that shows `page`. */
function sheetForPage(page: number, pps: number, total: number): number[] {
  if (pps <= 1) return [page];
  const start = (Math.ceil(page / pps) - 1) * pps;
  return Array.from({ length: pps }, (_, i) => start + i + 1).filter((p) => p <= total);
}

export function PrintPreview() {
  const t = useI18n().t;
  const direction = usePrintStore((s) => s.direction);
  const pageCount = usePrintStore((s) => s.pageCount);
  const currentPage = usePrintStore((s) => s.currentPage);
  const layout = usePrintStore((s) => s.layout);
  const settings = usePrintStore((s) => s.settings);
  const ready = usePrintStore((s) => s.ready);
  const measureFailed = usePrintStore((s) => s.measureFailed);
  const goFirst = usePrintStore((s) => s.goFirst);
  const goPrev = usePrintStore((s) => s.goPrev);
  const goNext = usePrintStore((s) => s.goNext);
  const goLast = usePrintStore((s) => s.goLast);
  const zoom = usePrintStore((s) => s.zoom);
  const fitMode = usePrintStore((s) => s.fitMode);
  const setZoom = usePrintStore((s) => s.setZoom);
  const zoomIn = usePrintStore((s) => s.zoomIn);
  const zoomOut = usePrintStore((s) => s.zoomOut);

  const containerRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ width?: number; page?: number }>({});

  const margins = useMemo(
    () => (layout ? resolveMargins(settings) : { top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 }),
    [layout, settings],
  );

  const sheetHtml = useMemo(() => {
    if (!layout) return "";
    const group = sheetForPage(currentPage, settings.pagesPerSheet, pageCount);
    if (settings.pagesPerSheet > 1) {
      return buildSheetFragmentHtml(layout, group, currentPage);
    }
    return buildPageFragmentHtml(layout, currentPage, settings);
  }, [layout, currentPage, settings, pageCount]);

  const pageW = layout?.pageWidthPx ?? 794;
  const pageH = layout?.pageHeightPx ?? 1123;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setFit({
        width: fitScale(el.clientWidth, el.clientHeight, pageW, pageH, "width"),
        page: fitScale(el.clientWidth, el.clientHeight, pageW, pageH, "page"),
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [pageW, pageH]);

  const effectiveFit = fitMode === "width" ? fit.width : fitMode === "page" ? fit.page : undefined;
  const scale = fitMode === "none" ? zoom : (effectiveFit ?? 1);

  if (!ready || !layout) {
    return <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
      {measureFailed ? t("print.error.measureFailed") : t("print.preview.loading")}
    </div>;
  }

  const mPx = {
    top: mmToPx(margins.top),
    right: mmToPx(margins.right),
    bottom: mmToPx(margins.bottom),
    left: mmToPx(margins.left),
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div
        className={cn(
          "flex items-center justify-between gap-2 border-b border-border bg-background px-3 py-1.5",
          direction === "rtl" && "flex-row-reverse"
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-muted-foreground">{t("print.preview.heading")}</span>
          <span className="mx-1 h-4 w-px shrink-0 bg-border" aria-hidden="true" />
          <div className="flex items-center gap-1" dir="ltr">
            <Button variant="ghost" size="sm" data-testid="print-nav-first" onClick={goFirst} disabled={currentPage <= 1} aria-label={t("print.preview.first")}>
              {"|<<"}
            </Button>
            <Button variant="ghost" size="sm" data-testid="print-nav-prev" onClick={goPrev} disabled={currentPage <= 1} aria-label={t("print.preview.prev")}>
              {"<"}
            </Button>
            <span className="mx-1 min-w-[4.5rem] text-center text-sm tabular-nums" data-testid="print-page-indicator">
              {t("print.preview.pageOf", { current: String(currentPage), total: String(pageCount) })}
            </span>
            <Button variant="ghost" size="sm" data-testid="print-nav-next" onClick={goNext} disabled={currentPage >= pageCount} aria-label={t("print.preview.next")}>
              {">"}
            </Button>
            <Button variant="ghost" size="sm" data-testid="print-nav-last" onClick={goLast} disabled={currentPage >= pageCount} aria-label={t("print.preview.last")}>
              {">>|"}
            </Button>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1" dir="ltr">
          <span className="text-xs text-muted-foreground">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="sm" onClick={zoomOut} data-testid="print-zoom-out" aria-label={t("print.preview.zoomOut")}>−</Button>
          <Button variant="outline" size="sm" onClick={zoomIn} data-testid="print-zoom-in" aria-label={t("print.preview.zoomIn")}>+</Button>
          <Button variant={fitMode === "width" ? "secondary" : "ghost"} size="sm" onClick={() => setZoom("width")} data-testid="print-fit-width" aria-label={t("print.preview.fitWidth")}>
            {t("print.preview.fitWidth")}
          </Button>
          <Button variant={fitMode === "page" ? "secondary" : "ghost"} size="sm" onClick={() => setZoom("page")} data-testid="print-fit-page" aria-label={t("print.preview.fitPage")}>
            {t("print.preview.fitPage")}
          </Button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto bg-muted/40 p-6">
        <div className="mx-auto w-fit min-w-fit">
          <div key={currentPage} data-testid="print-sheet" className="lp-print-preview-sheet">
            <style>{CONTENT_CSS}</style>
            <div style={{ width: pageW * scale, height: pageH * scale }} className="relative">
              <div
                className="lp-print-paper shadow-xl overflow-hidden"
                style={{
                  width: pageW,
                  height: pageH,
                  background: "#ffffff",
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  padding: `${mPx.top}px ${mPx.right}px ${mPx.bottom}px ${mPx.left}px`,
                  boxSizing: "border-box",
                  position: "relative",
                }}
              >
                <div dangerouslySetInnerHTML={{ __html: sheetHtml }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}