/**
 * Print dialog (PrintDialog.tsx).
 *
 * Simple, professional layout:
 *   top bar  – Close, "Print" + document title
 *   left     – Only the essential basics: Printer, Copies, Pages, Orientation,
 *              Paper size, Margins. Advanced options live under "More Settings".
 *   center   – Live paginated preview (what you see is what gets printed)
 *   bottom   – Compact thumbnail strip + Cancel / Print
 *
 * The native Windows print dialog (printer, copies, duplex, color, N-up,
 * collation) is reached via Print once the geometry/range settings are set.
 */
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePrintStore } from "@/lib/print/store";
import { PAPER_SIZES, MARGIN_PRESETS, SCALE_MIN, SCALE_MAX } from "@/lib/print/papers";
import { useI18n } from "@/store/useI18nStore";
import { PrintPreview } from "./PrintPreview";
import { PrintThumbnails } from "./PrintThumbnails";
import { cn } from "@/lib/utils";
import { X, ChevronDown } from "lucide-react";
import type { PrintMarginPreset, PrintRangeMode, PrintScaling, PrintSettings } from "@/lib/print/types";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <span className="block text-[13px] font-medium text-foreground">{label}</span>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function NumberStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled,
  testId,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  testId?: string;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div className="flex items-center gap-1" dir="ltr">
      <Button variant="outline" size="sm" disabled={disabled || value <= min} onClick={() => onChange(clamp(value - step))} aria-label="-">−</Button>
      <input
        type="number"
        dir="ltr"
        min={min}
        max={max}
        step={step}
        value={value}
        data-testid={testId}
        aria-label={testId}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(clamp(n));
        }}
        className="h-8 w-16 rounded-md border border-input bg-transparent px-2 text-center text-sm tabular-nums text-foreground outline-none focus:ring-2 focus:ring-ring"
      />
      <Button variant="outline" size="sm" disabled={disabled || value >= max} onClick={() => onChange(clamp(value + step))} aria-label="+">+</Button>
    </div>
  );
}

function CustomMargins() {
  const t = useI18n().t;
  const setSettings = usePrintStore((s) => s.setSettings);
  const margins = usePrintStore((s) => s.settings.margins);
  const edge = (key: keyof typeof margins, label: string) => (
    <div className="flex-1 space-y-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <input
        type="number"
        dir="ltr"
        min={0}
        max={254}
        step={0.5}
        data-testid={`print-margin-${key}`}
        aria-label={label}
        value={margins[key]}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) {
            setSettings({ margins: { ...margins, [key]: Math.max(0, Math.min(254, n)) } });
          }
        }}
        className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm tabular-nums text-foreground outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
  return (
    <div className="grid grid-cols-4 gap-2">
      {edge("top", t("print.margins.top"))}
      {edge("right", t("print.margins.right"))}
      {edge("bottom", t("print.margins.bottom"))}
      {edge("left", t("print.margins.left"))}
    </div>
  );
}

export function PrintDialog() {
  const t = useI18n().t;
  const isOpen = usePrintStore((s) => s.isOpen);
  const close = usePrintStore((s) => s.close);
  const preparing = usePrintStore((s) => s.preparing);
  const ready = usePrintStore((s) => s.ready);
  const measureFailed = usePrintStore((s) => s.measureFailed);
  const job = usePrintStore((s) => s.job);
  const settings = usePrintStore((s) => s.settings);
  const setSettings = usePrintStore((s) => s.setSettings);
  const hasSelection = usePrintStore((s) => s.hasSelection);
  const printers = usePrintStore((s) => s.printers);
  const capabilities = usePrintStore((s) => s.capabilities);
  const printersLoading = usePrintStore((s) => s.printersLoading);
  const printersFallback = usePrintStore((s) => s.printersFallback);
  const presets = usePrintStore((s) => s.presets);
  const savePreset = usePrintStore((s) => s.savePreset);
  const deletePreset = usePrintStore((s) => s.deletePreset);
  const applyPreset = usePrintStore((s) => s.applyPreset);
  const selectPrinter = usePrintStore((s) => s.selectPrinter);
  const openProperties = usePrintStore((s) => s.openProperties);
  const print = usePrintStore((s) => s.print);
  const goPrev = usePrintStore((s) => s.goPrev);
  const goNext = usePrintStore((s) => s.goNext);
  const direction = usePrintStore((s) => s.direction);
  const pageCount = usePrintStore((s) => s.pageCount);
  const title = usePrintStore((s) => s.title);

  const [presetName, setPresetName] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // "More Settings" starts collapsed every time the dialog opens.
  useEffect(() => {
    if (isOpen) {
      setMoreOpen(false);
      setPresetName("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, goNext, goPrev]);

  const printerName = settings.printerName;
  const currentPrinter =
    printers.find((p) => p.name === printerName) ??
    printers.find((p) => p.isDefault) ??
    null;

  const canPrint = ready && !preparing && !measureFailed && pageCount > 0 && !printersLoading;
  const printerStatusLabel = currentPrinter
    ? currentPrinter.status === "offline"
      ? t("print.printer.offline")
      : currentPrinter.status === "printing"
        ? t("print.printer.printing")
        : t("print.printer.idle")
    : t("print.printer.unknown");

  const colorCanvasSupported =
    capabilities?.supportsColor == null || capabilities?.supportsColor === true;
  const grayscaleAllowed = capabilities?.supportsColor === true || capabilities == null;
  const duplexSupported = capabilities?.supportsDuplex == null || capabilities?.supportsDuplex === true;
  const duplexOffline = capabilities?.supportsDuplex === false;

  const rangeModes: Array<[PrintRangeMode, string]> = [
    ["all", t("print.range.all")],
    ["current", t("print.range.current")],
    ["selection", t("print.range.selection")],
    ["custom", t("print.range.custom")],
  ];

  const onPresetSave = () => {
    const id = savePreset(presetName);
    if (id) setPresetName("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent
        className="max-w-[100dvw] w-full h-[100dvh] max-h-[100dvh] rounded-none p-0 gap-0 overflow-hidden border-0 bg-background"
        style={{ maxWidth: "100dvw" }}
      >
        <DialogTitle className="sr-only">{t("print.title")}</DialogTitle>
        <DialogDescription className="sr-only">{t("print.title")}</DialogDescription>

        <div className="flex h-full flex-col overflow-hidden" dir={direction}>
          {/* ── Top bar ─────────────────────────────────────────────── */}
          <header
            className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card px-3"
            data-testid="print-topbar"
          >
            <Button variant="ghost" size="icon" onClick={close} aria-label={t("print.cancel")} data-testid="print-close">
              <X className="h-5 w-5" />
            </Button>
            <div className="flex min-w-0 flex-col justify-center">
              <h2 className="text-sm font-semibold leading-tight text-foreground">{t("print.title")}</h2>
              {title && <p className="max-w-[20rem] truncate text-[11px] leading-tight text-muted-foreground">{title}</p>}
            </div>
          </header>

          {/* ── Body: settings + preview ───────────────────────────── */}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {/* Settings sidebar */}
            <aside
              className="flex w-[280px] shrink-0 flex-col border-r border-border bg-card overflow-y-auto print-aside"
              data-testid="print-settings"
              aria-label={t("print.section.settings")}
            >
              <div className="space-y-5 px-4 py-4">
                {/* Printer */}
                <section className="space-y-1.5" data-testid="print-section-printer">
                  <Field label={t("print.printer.label")}>
                    <Select
                      value={printerName ?? (printers.length > 0 ? currentPrinter?.name : undefined)}
                      onValueChange={(v) => selectPrinter(v)}
                      disabled={printersFallback && printers.length === 0}
                    >
                      <SelectTrigger data-testid="print-printer-select" aria-label={t("print.printer.label")}>
                        <SelectValue placeholder={printersFallback ? t("print.printer.systemDefault") : t("print.printer.loading")} />
                      </SelectTrigger>
                      <SelectContent>
                        {printers.map((p) => (
                          <SelectItem key={p.name} value={p.name}>
                            {p.name}
                            {p.isDefault ? ` · ${t("print.printer.default")}` : ""}
                            {p.status === "offline" ? ` · ${t("print.printer.offline")}` : ""}
                          </SelectItem>
                        ))}
                        {printers.length === 0 && (
                          <SelectItem value="__none__" disabled>
                            {printersFallback ? t("print.printer.systemDefault") : t("print.printer.loading")}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </Field>
                  <p className="text-[11px] text-muted-foreground" data-testid="print-printer-state">
                    {printers.length === 0 && printersFallback
                      ? t("print.printer.systemDefault")
                      : printerStatusLabel}
                  </p>
                  {printersFallback && printers.length > 0 && (
                    <p className="text-[11px] text-muted-foreground">{t("print.printer.fallback")}</p>
                  )}
                </section>

                {/* Copies */}
                <section className="space-y-1.5">
                  <Field label={t("print.copies")}>
                    <NumberStepper value={settings.copies} min={1} max={999} onChange={(copies) => setSettings({ copies })} testId="print-copies" />
                  </Field>
                </section>

                {/* Pages / Page range */}
                <section className="space-y-1.5">
                  <span className="block text-[13px] font-medium text-foreground">{t("print.section.range")}</span>
                  <fieldset className="space-y-1.5">
                    {rangeModes.map(([mode, label]) => (
                      <label key={mode} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                        <input
                          type="radio"
                          name="print-range"
                          value={mode}
                          checked={settings.rangeMode === mode}
                          data-testid={`print-range-${mode}`}
                          disabled={mode === "selection" && !hasSelection}
                          onChange={() => setSettings({ rangeMode: mode })}
                          className="accent-primary"
                        />
                        {label}
                      </label>
                    ))}
                  </fieldset>
                  {settings.rangeMode === "custom" && (
                    <>
                      <input
                        type="text"
                        dir="ltr"
                        value={settings.customRange}
                        data-testid="print-range-custom-value"
                        aria-label={t("print.range.custom")}
                        onChange={(e) => setSettings({ customRange: e.target.value })}
                        placeholder="1,2,5-7"
                        className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                      />
                      {job.errorKey && (
                        <p className="text-[11px] text-danger" data-testid="print-range-error-inline">
                          {t(job.errorKey)}
                        </p>
                      )}
                    </>
                  )}
                </section>

                {/* Orientation */}
                <section className="space-y-1.5">
                  <span className="block text-[13px] font-medium text-foreground">{t("print.orientation.label")}</span>
                  <div className="grid grid-cols-2 gap-1" dir={direction}>
                    <Button
                      size="sm"
                      variant={settings.orientation === "portrait" ? "secondary" : "outline"}
                      data-testid="print-orientation-portrait"
                      aria-pressed={settings.orientation === "portrait"}
                      onClick={() => setSettings({ orientation: "portrait" })}
                    >
                      {t("print.orientation.portrait")}
                    </Button>
                    <Button
                      size="sm"
                      variant={settings.orientation === "landscape" ? "secondary" : "outline"}
                      data-testid="print-orientation-landscape"
                      aria-pressed={settings.orientation === "landscape"}
                      onClick={() => setSettings({ orientation: "landscape" })}
                    >
                      {t("print.orientation.landscape")}
                    </Button>
                  </div>
                </section>

                {/* Paper size */}
                <section className="space-y-1.5">
                  <Field label={t("print.paper")}>
                    <Select value={settings.paper.id} onValueChange={(v) => setSettings({ paper: PAPER_SIZES.find((p) => p.id === v) ?? settings.paper })}>
                      <SelectTrigger data-testid="print-paper" aria-label={t("print.paper")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAPER_SIZES.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </section>

                {/* Margins */}
                <section className="space-y-1.5">
                  <Field label={t("print.margins.label")}>
                    <Select
                      value={settings.marginPreset}
                      onValueChange={(v) => {
                        const preset = v as PrintMarginPreset;
                        setSettings({ marginPreset: preset, margins: preset === "custom" ? settings.margins : { ...MARGIN_PRESETS[preset] } });
                      }}
                    >
                      <SelectTrigger data-testid="print-margins-preset" aria-label={t("print.margins.label")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["normal", "narrow", "moderate", "wide", "custom"] as const).map((m) => (
                          <SelectItem key={m} value={m}>{t(`print.margins.${m}`)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  {settings.marginPreset === "custom" && <CustomMargins />}
                </section>

                {/* More Settings (advanced) */}
                <section className="space-y-1.5" data-testid="print-more-settings">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm py-1"
                    aria-expanded={moreOpen}
                    aria-controls="print-more-content"
                    onClick={() => setMoreOpen((o) => !o)}
                  >
                    <span>{t("print.section.output")}</span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", moreOpen && "rotate-180")} />
                  </button>
                  {moreOpen && (
                    <div id="print-more-content" className="space-y-4 pt-1">
                      <Field label={t("print.scaling.label")}>
                        <Select value={settings.scaling} onValueChange={(v) => setSettings({ scaling: v as PrintScaling })}>
                          <SelectTrigger data-testid="print-scaling" aria-label={t("print.scaling.label")}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {
                              (["actual", "fit-to-page", "fit-to-width", "percent"] as const).map((s) => (
                                <SelectItem key={s} value={s}>{t(`print.scaling.${s}`)}</SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </Field>
                      {settings.scaling === "percent" && (
                        <Field label={t("print.percent")}>
                          <NumberStepper value={settings.scalePercent} min={SCALE_MIN} max={SCALE_MAX} step={5} onChange={(scalePercent) => setSettings({ scalePercent })} testId="print-scale-percent" />
                        </Field>
                      )}
                      <Field label={t("print.pagesPerSheet.label")} hint={t("print.pagesPerSheet.hint")}>
                        <Select value={String(settings.pagesPerSheet)} onValueChange={(v) => setSettings({ pagesPerSheet: Number(v) as 1 | 2 | 4 | 6 | 8 | 16 })}>
                          <SelectTrigger data-testid="print-pages-per-sheet" aria-label={t("print.pagesPerSheet.label")}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 4, 6, 8, 16].map((n) => (
                              <SelectItem key={n} value={String(n)}>{String(n)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label={t("print.color.label")}>
                        <Select
                          value={settings.colorMode}
                          onValueChange={(v) => setSettings({ colorMode: v as "color" | "grayscale" })}
                          disabled={capabilities?.supportsColor === false}
                        >
                          <SelectTrigger data-testid="print-color" aria-label={t("print.color.label")}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="color" disabled={!colorCanvasSupported}>{t("print.color.color")}</SelectItem>
                            <SelectItem value="grayscale" disabled={!grayscaleAllowed}>{t("print.color.grayscale")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                        <input
                          type="checkbox"
                          data-testid="print-background-graphics"
                          checked={settings.backgroundGraphics}
                          onChange={(e) => setSettings({ backgroundGraphics: e.target.checked })}
                          className="accent-primary"
                        />
                        <div className="min-w-0">
                          <span className="block">{t("print.backgroundGraphics")}</span>
                          <span className="block text-[11px] text-muted-foreground">{t("print.backgroundGraphicsHint")}</span>
                        </div>
                      </label>
                      <Field label={t("print.duplex.label")}>
                        <Select
                          value={duplexOffline ? "simplex" : settings.duplex}
                          onValueChange={(v) => setSettings({ duplex: v as "simplex" | "long-edge" | "short-edge" })}
                          disabled={!duplexSupported}
                        >
                          <SelectTrigger data-testid="print-duplex" aria-label={t("print.duplex.label")}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="simplex">{t("print.duplex.simplex")}</SelectItem>
                            <SelectItem value="long-edge">{t("print.duplex.long")}</SelectItem>
                            <SelectItem value="short-edge">{t("print.duplex.short")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                        <input
                          type="checkbox"
                          data-testid="print-collate"
                          checked={settings.collated}
                          onChange={(e) => setSettings({ collated: e.target.checked })}
                          className="accent-primary"
                        />
                        {t("print.collate")}
                      </label>
                      <Field label={t("print.pageNumbers.label")}>
                        <Select value={settings.pageNumbers} onValueChange={(v) => setSettings({ pageNumbers: v as PrintSettings["pageNumbers"] })}>
                          <SelectTrigger data-testid="print-page-numbers" aria-label={t("print.pageNumbers.label")}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(["off", "top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"] as const).map((p) => (
                              <SelectItem key={p} value={p}>{t(`print.pageNumbers.${p}`)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                        <input
                          type="checkbox"
                          data-testid="print-include-title"
                          checked={settings.includeTitle}
                          onChange={(e) => setSettings({ includeTitle: e.target.checked })}
                          className="accent-primary"
                        />
                        {t("print.includeTitle")}
                      </label>
                      <Button variant="outline" size="sm" className="w-full" onClick={openProperties} disabled={!printerName} data-testid="print-printer-properties">
                        {t("print.printer.properties")}
                      </Button>

                      {/* Presets */}
                      <div className="space-y-1.5 border-t border-border pt-3">
                        <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("print.presets.label")}</span>
                        <div className="flex gap-1.5" dir={direction}>
                          <input
                            type="text"
                            dir="ltr"
                            value={presetName}
                            data-testid="print-preset-name"
                            aria-label={t("print.presets.namePlaceholder")}
                            onChange={(e) => setPresetName(e.target.value)}
                            placeholder={t("print.presets.namePlaceholder")}
                            className="h-8 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                          />
                          <Button size="sm" onClick={onPresetSave} disabled={!presetName.trim()} data-testid="print-preset-save">
                            {t("print.presets.save")}
                          </Button>
                        </div>
                        {presets.length > 0 && (
                          <ul className="space-y-1" data-testid="print-preset-list" aria-label={t("print.presets.label")}>
                            {presets.map((p) => (
                              <li key={p.id} className="flex items-center gap-1.5">
                                <Button variant="ghost" size="sm" className="flex-1 justify-start truncate" onClick={() => applyPreset(p.id)} data-testid={`print-preset-apply-${p.id}`} title={t("print.presets.apply")}>
                                  {p.name}
                                </Button>
                                <Button variant="ghost" size="sm" aria-label={t("print.presets.delete")} onClick={() => deletePreset(p.id)} data-testid={`print-preset-delete-${p.id}`}>×</Button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </aside>

            {/* Preview */}
            <div ref={previewRef} className="flex min-w-0 flex-1 flex-col bg-background" data-testid="print-preview-pane">
              {job.errorKey && (
                <div className="border-b border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger" role="alert" data-testid="print-error-banner">
                  {t(job.errorKey)}
                  <button className="ml-3 underline" onClick={() => usePrintStore.getState().resetJobError()}>{t("print.dismiss")}</button>
                </div>
              )}
              {measureFailed && (
                <div className="border-b border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger" role="alert" data-testid="print-measure-error">
                  {t("print.error.measureFailed")}
                </div>
              )}
              {job.status !== "idle" && job.status !== "error" && job.messageKey && (
                <div className="border-b border-border bg-muted/40 px-4 py-2 text-sm text-muted-foreground" role="status" data-testid="print-job-status">
                  {t(job.messageKey)}
                </div>
              )}
              <div className="min-h-0 flex-1">
                <PrintPreview />
              </div>
            </div>
          </div>

          {/* ── Thumbnail strip ─────────────────────────────────────── */}
          <PrintThumbnails />

          {/* ── Footer ──────────────────────────────────────────────── */}
          <footer className="flex h-12 shrink-0 items-center justify-end gap-2 border-t border-border bg-card px-4" data-testid="print-footer">
            <Button variant="ghost" onClick={close} data-testid="print-cancel">
              {t("print.cancel")}
            </Button>
            <Button onClick={print} disabled={!canPrint} data-testid="print-submit">
              {t("print.print")}
            </Button>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}