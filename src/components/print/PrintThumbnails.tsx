/**
 * Thumbnail strip (PrintThumbnails.tsx).
 *
 * One thumbnail per PHYSICAL SHEET (document page for 1-up, N-up sheet
 * otherwise), built from the exact fragments used by the preview and the print
 * document — so the strip is always a true page index of the job.
 *
 * Offscreen thumbnails use `content-visibility: auto` so their (large, shared)
 * book subtrees are not laid out until scrolled into view; only a handful of
 * sheets ever pay the layout cost regardless of document size.
 */
import { useEffect, useMemo, useRef } from "react";
import { usePrintStore } from "@/lib/print/store";
import { buildContentCss, resolveMargins } from "@/lib/print/render";
import { buildPageFragmentHtml, buildSheetFragmentHtml } from "@/lib/print/paginate";
import { mmToPx } from "@/lib/print/papers";
import { useI18n } from "@/store/useI18nStore";
import { cn } from "@/lib/utils";

const CONTENT_CSS = buildContentCss();
const STRIP_HEIGHT = 88;

export function PrintThumbnails() {
  const t = useI18n().t;
  const direction = usePrintStore((s) => s.direction);
  const pageCount = usePrintStore((s) => s.pageCount);
  const currentPage = usePrintStore((s) => s.currentPage);
  const setCurrentPage = usePrintStore((s) => s.setCurrentPage);
  const layout = usePrintStore((s) => s.layout);
  const settings = usePrintStore((s) => s.settings);
  const ready = usePrintStore((s) => s.ready);
  const stripRef = useRef<HTMLDivElement>(null);

  const margins = useMemo(
    () => (layout ? resolveMargins(settings) : { top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 }),
    [layout, settings],
  );

  // Keep the active thumbnail in view as the user pages through the document.
  // NOTE: declared before any early return — hook order must never vary
  // between renders (a conditional hook unmounts the whole React tree).
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const active = strip.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [currentPage, pageCount, layout]);

  if (!ready || !layout || pageCount <= 1) return null;

  const pps = settings.pagesPerSheet;
  const sheetCount = Math.ceil(pageCount / pps);
  const pageW = layout.pageWidthPx;
  const pageH = layout.pageHeightPx;
  const thumbScale = Math.min(0.22, (STRIP_HEIGHT - 16) / pageH);
  const mPx = {
    top: mmToPx(margins.top),
    right: mmToPx(margins.right),
    bottom: mmToPx(margins.bottom),
    left: mmToPx(margins.left),
  };

  const sheets = Array.from({ length: sheetCount }, (_, si) => {
    const start = si * pps + 1;
    const group = Array.from({ length: pps }, (_, i) => start + i).filter((p) => p <= pageCount);
    const html = pps > 1
      ? buildSheetFragmentHtml(layout, group)
      : buildPageFragmentHtml(layout, start, settings);
    const representative = start;
    return { index: si + 1, pages: group, html, representative };
  });

  return (
    <div className="shrink-0 border-t border-border bg-card px-4 pb-1.5 pt-2" dir={direction}>
      <style>{CONTENT_CSS}</style>
      <div ref={stripRef} data-testid="print-thumbnails" className="flex gap-2 overflow-x-auto">
        {sheets.map((s) => {
          const active = s.pages.includes(currentPage);
          return (
            <button
              key={s.index}
              type="button"
              data-testid={`print-thumb-${s.representative}`}
              data-active={active ? "true" : "false"}
              onClick={() => setCurrentPage(s.representative)}
              className={cn(
                "relative shrink-0 overflow-hidden rounded-sm border bg-white transition-shadow",
                active ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100"
              )}
              style={{
                width: pageW * thumbScale,
                height: pageH * thumbScale,
                contentVisibility: "auto",
                containIntrinsicSize: `${pageW * thumbScale}px ${pageH * thumbScale}px`,
              }}
              aria-label={`${t("print.preview.thumbnails")} ${s.pages.join("-")}`}
              title={t("print.preview.pageOf", { current: String(s.representative), total: String(pageCount) })}
            >
              <div
                style={{
                  width: pageW,
                  height: pageH,
                  transform: `scale(${thumbScale})`,
                  transformOrigin: "top left",
                  padding: `${mPx.top}px ${mPx.right}px ${mPx.bottom}px ${mPx.left}px`,
                  boxSizing: "border-box",
                  position: "relative",
                }}
              >
                <div dangerouslySetInnerHTML={{ __html: s.html }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}