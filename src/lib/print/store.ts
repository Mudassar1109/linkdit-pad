/**
 * Print orchestrator store (store.ts).
 *
 * Owns the whole print workflow state: the collected source, measured layout,
 * per-page slice cache, live settings, printer list + capabilities, presets,
 * and the print job state machine. Every entry point (File > Print, Ctrl+P,
 * toolbar Print, Export > PDF) funnels through `openPrintDialog()`.
 *
 * Pagination is measured against the CURRENT editor content, so unsaved and
 * split-pane edits are always printed.
 */
import { create } from "zustand";
import {
  type PrintLayout,
  layoutPrintDocument,
  resolveRequestedPages,
  getMeasureHost,
} from "./paginate";
import { collectPrintSource } from "./source";
import { buildPrintDocument } from "./doc";
import type { PrintSource } from "./render";
import { printDocumentHtml } from "./execute";
import {
  getPrinterCapabilities,
  listPrinters,
  openPrinterProperties,
} from "./printer";
import { getPaperById, MARGIN_PRESETS, parseCustomRange } from "./papers";
import type {
  PrintJobState,
  PrintPreset,
  PrintSettings,
  PrinterCapabilities as PrinterCapabilitiesT,
  PrinterInfo as PrinterInfoT,
} from "./types";
import { useToastStore } from "@/store/useToastStore";
import { useI18nStore } from "@/store/useI18nStore";

type SettingsPatch = Partial<PrintSettings>;

const LAST_KEY = "linkdit-pad-print-last";
const PRESETS_KEY = "linkdit-pad-print-presets";

export function defaultPrintSettings(): PrintSettings {
  return {
    paper: getPaperById("a4"),
    orientation: "portrait",
    marginPreset: "normal",
    margins: { ...MARGIN_PRESETS.normal },
    scaling: "actual",
    scalePercent: 100,
    pagesPerSheet: 1,
    colorMode: "color",
    duplex: "simplex",
    collated: true,
    copies: 1,
    backgroundGraphics: true,
    rangeMode: "all",
    customRange: "",
    currentPage: 1,
    includeTitle: true,
    pageNumbers: "bottom-center",
    printerName: null,
  };
}

interface SavedSettings extends Omit<PrintSettings, "paper"> {
  paper: string;
}

function serialize(settings: PrintSettings): SavedSettings {
  const { paper, ...rest } = settings;
  return { ...rest, paper: paper.id };
}

function deserialize(saved: SavedSettings | null): PrintSettings {
  const base = defaultPrintSettings();
  if (!saved) return base;
  const paper = getPaperById(typeof saved.paper === "string" ? saved.paper : base.paper.id);
  return {
    ...base,
    ...saved,
    paper,
    margins: { ...(saved.margins ? saved.margins : base.margins) },
    currentPage: 1,
  };
}

function loadLast(): PrintSettings {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    if (raw) return deserialize(JSON.parse(raw) as SavedSettings);
  } catch {}
  return defaultPrintSettings();
}

function persistLast(settings: PrintSettings): void {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(serialize(settings)));
  } catch {}
}

function loadPresets(): PrintPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PrintPreset[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function persistPresets(presets: PrintPreset[]): void {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
  } catch {}
}

/** Keys whose change requires re-measuring the page layout. */
const LAYOUT_KEYS = new Set<keyof PrintSettings>([
  "paper",
  "orientation",
  "margins",
  "marginPreset",
  "scaling",
  "scalePercent",
  "includeTitle",
]);

/**
 * Expands the requested page list by the copies count in the user's collation
 * order. Collated: whole document repeated N times (1,2,3 · 1,2,3). Uncollated:
 * each page repeated N times before moving on (1,1,1 · 2,2,2).
 */
export function expandCopies(
  pages: number[],
  copies: number,
  collated: boolean,
): number[] {
  const safeCopies = Math.min(999, Math.max(1, Math.floor(copies)));
  if (safeCopies <= 1) return pages;
  const out: number[] = [];
  if (collated) {
    for (let i = 0; i < safeCopies; i++) out.push(...pages);
  } else {
    for (const page of pages) {
      for (let i = 0; i < safeCopies; i++) out.push(page);
    }
  }
  return out;
}

export interface PrinterInfo extends PrinterInfoT {}
export interface PrinterCapabilities extends PrinterCapabilitiesT {}

interface PrintState {
  isOpen: boolean;
  preparing: boolean;
  ready: boolean;
  measureFailed: boolean;
  source: PrintSource | null;
  title: string;
  direction: "ltr" | "rtl";
  hasSelection: boolean;
  layout: PrintLayout | null;
  settings: PrintSettings;
  currentPage: number;
  pageCount: number;
  zoom: number;
  fitMode: "width" | "page" | "none";
  presets: PrintPreset[];
  printers: PrinterInfo[];
  capabilities: PrinterCapabilities | null;
  printersLoading: boolean;
  printersFallback: boolean;
  job: PrintJobState;

  open: () => Promise<void>;
  close: () => void;
  setSettings: (patch: SettingsPatch) => void;
  setCurrentPage: (page: number) => void;
  goFirst: () => void;
  goPrev: () => void;
  goNext: () => void;
  goLast: () => void;
  setZoom: (fitMode: "width" | "page" | "none", zoomLevel?: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  savePreset: (name: string) => string | null;
  deletePreset: (id: string) => void;
  applyPreset: (id: string) => void;
  selectPrinter: (name: string) => Promise<void>;
  openProperties: () => Promise<void>;
  refreshPrinters: () => Promise<void>;
  print: () => Promise<void>;
  resetJobError: () => void;
}

let relayoutTimer: ReturnType<typeof setTimeout> | null = null;
let printInFlight = false;

function relayout(save = true): void {
  if (relayoutTimer) clearTimeout(relayoutTimer);
  relayoutTimer = setTimeout(() => {
    const s = usePrintStore.getState();
    if (!s.source) return;
    const host = getMeasureHost();
    let layout: PrintLayout | null = null;
    let failed = false;
    try {
      layout = layoutPrintDocument(host, s.source, s.settings);
    } catch {
      failed = true;
    }
    const currentPage = Math.min(
      layout?.pageCount ?? 1,
      Math.max(1, s.currentPage),
    );
    usePrintStore.setState({
      layout,
      pageCount: layout?.pageCount ?? 1,
      currentPage,
      ready: !!layout,
      measureFailed: failed,
      settings: { ...s.settings, currentPage },
    });
    if (save) persistLast(usePrintStore.getState().settings);
  }, 60);
}

/** Pages available for preview navigation; custom mode is restricted to the parsed selection. */
function customNavPages(s: Pick<PrintState, "settings" | "pageCount">): number[] | null {
  if (s.settings.rangeMode !== "custom") return null;
  const parsed = parseCustomRange(s.settings.customRange, s.pageCount);
  return typeof parsed === "string" || parsed.length === 0 ? null : parsed;
}

export const usePrintStore = create<PrintState>((set, get) => {
  const idleJob: PrintJobState = {
    status: "idle",
    messageKey: null,
    errorKey: null,
    startedAt: null,
    finishedAt: null,
  };

  const initialState = {
    isOpen: false,
    preparing: false,
    ready: false,
    measureFailed: false,
    source: null,
    title: "",
    direction: "ltr" as const,
    hasSelection: false,
    layout: null,
    settings: loadLast(),
    currentPage: 1,
    pageCount: 1,
    zoom: 1,
    fitMode: "width" as const,
    presets: loadPresets(),
    printers: [],
    capabilities: null,
    printersLoading: false,
    printersFallback: true,
    job: idleJob,
  };

  const t = () => useI18nStore.getState().t;
  const toast = useToastStore.getState;

  return {
    ...initialState,

    open: async () => {
      const existing = usePrintStore.getState();
      if (existing.isOpen) return;

      set({ isOpen: true, preparing: true, ready: false, measureFailed: false });
      try {
        const collected = collectPrintSource();
        if (!collected) {
          toast().show("error", t()("print.error.noDocument"));
          set({ isOpen: false, preparing: false });
          return;
        }
        const settings = { ...loadLast(), currentPage: 1 };
        set({
          source: collected.source,
          title: collected.title,
          direction: collected.direction,
          hasSelection: collected.source.hasSelection,
          settings,
          currentPage: 1,
          pageCount: 1,
          job: { status: "idle", messageKey: null, errorKey: null, startedAt: null, finishedAt: null },
          zoom: 1,
          fitMode: "width",
        });
        persistLast(settings);
        relayout(false);
        set({ preparing: false });
        usePrintStore.getState().refreshPrinters();
      } catch (error) {
        console.error("[print] open failed", error);
        toast().show("error", t()("print.error.openFailed"));
        set({ isOpen: false, preparing: false, ready: false });
      }
    },

    close: () => set({ isOpen: false }),

    setSettings: (patch) => {
      const prev = get();
      const next = { ...prev.settings, ...patch };
      const patchKeys = Object.keys(patch);
      const statePatch: Partial<PrintState> = { settings: next, capabilities: prev.capabilities };
      if (patchKeys.includes("customRange") || patchKeys.includes("rangeMode")) {
        if (next.rangeMode === "custom") {
          const parsed = parseCustomRange(next.customRange, prev.pageCount);
          const errorKey =
            typeof parsed === "string" ? parsed : parsed.length === 0 ? "print.range.invalid" : null;
          statePatch.job = {
            status: "idle",
            messageKey: null,
            errorKey,
            startedAt: null,
            finishedAt: null,
          };
          if (
            errorKey === null &&
            Array.isArray(parsed) &&
            !parsed.includes(prev.currentPage)
          ) {
            statePatch.currentPage = parsed[0];
            next.currentPage = parsed[0];
          }
        } else {
          statePatch.job = {
            status: "idle",
            messageKey: null,
            errorKey: null,
            startedAt: null,
            finishedAt: null,
          };
        }
      }
      set(statePatch);
      const needsRelayout = patchKeys.some((k) =>
        LAYOUT_KEYS.has(k as keyof PrintSettings),
      );
      if (needsRelayout) relayout();
      else persistLast(next);
    },

    setCurrentPage: (page) => {
      const pageCount = get().pageCount;
      const currentPage = Math.min(pageCount, Math.max(1, page));
      set({ currentPage, settings: { ...get().settings, currentPage } });
      persistLast(get().settings);
    },

    goFirst: () => {
      const nav = customNavPages(get());
      get().setCurrentPage(nav ? nav[0] : 1);
    },
    goPrev: () => {
      const s = get();
      const nav = customNavPages(s);
      if (!nav) {
        get().setCurrentPage(Math.max(1, s.currentPage - 1));
        return;
      }
      get().setCurrentPage([...nav].reverse().find((p) => p < s.currentPage) ?? s.currentPage);
    },
    goNext: () => {
      const s = get();
      const nav = customNavPages(s);
      if (!nav) {
        get().setCurrentPage(Math.min(s.pageCount, s.currentPage + 1));
        return;
      }
      get().setCurrentPage(nav.find((p) => p > s.currentPage) ?? s.currentPage);
    },
    goLast: () => {
      const nav = customNavPages(get());
      get().setCurrentPage(nav ? nav[nav.length - 1] : get().pageCount);
    },

    setZoom: (fitMode, zoomLevel) =>
      set({ fitMode, zoom: fitMode === "none" ? zoomLevel ?? 1 : get().zoom }),
    zoomIn: () =>
      set({ fitMode: "none", zoom: Math.min(4, Math.round((get().zoom + 0.25) * 100) / 100) }),
    zoomOut: () =>
      set({ fitMode: "none", zoom: Math.max(0.25, Math.round((get().zoom - 0.25) * 100) / 100) }),

    savePreset: (name) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const { rangeMode: _r, customRange: _c, printerName: _p, copies: _cp, ...printable } = get().settings;
      void _r; void _c; void _p; void _cp;
      const preset: PrintPreset = {
        id: crypto.randomUUID(),
        name: trimmed,
        settings: printable,
        updatedAt: new Date().toISOString(),
      };
      const presets = [...get().presets, preset];
      persistPresets(presets);
      set({ presets });
      return preset.id;
    },

    deletePreset: (id) => {
      const presets = get().presets.filter((p) => p.id !== id);
      persistPresets(presets);
      set({ presets });
    },

    applyPreset: (id) => {
      const preset = get().presets.find((p) => p.id === id);
      if (!preset) return;
      const next: PrintSettings = {
        ...get().settings,
        ...preset.settings,
        paper: getPaperById(preset.settings.paper.id),
        currentPage: 1,
      };
      set({ settings: next, currentPage: 1 });
      relayout();
    },

    selectPrinter: async (name) => {
      set({ settings: { ...get().settings, printerName: name }, printersLoading: true });
      const { ok, data } = await getPrinterCapabilities(name);
      const caps = ok && data ? (data as PrinterCapabilities) : null;
      set({
        capabilities: caps,
        printersLoading: false,
        printersFallback: !ok || !caps,
      });
      persistLast(get().settings);
    },

    openProperties: async () => {
      const name = get().settings.printerName;
      if (!name) {
        toast().show("info", t()("print.info.nativeDialogUnavailable"));
        return;
      }
      const { ok, error } = await openPrinterProperties(name);
      if (!ok) {
        toast().show("error", error ? String(error) : t()("print.error.propertiesFailed"));
      }
    },

    refreshPrinters: async () => {
      set({ printersLoading: true });
      const { ok, data } = await listPrinters();
      if (ok && Array.isArray(data)) {
        const printers = data as PrinterInfo[];
        const now = get();
        const hasCurrent = now.settings.printerName && printers.some((p) => p.name === now.settings.printerName);
        const defaultPrinter = printers.find((p) => p.isDefault) ?? printers[0] ?? null;
        const printerName = hasCurrent ? now.settings.printerName : (defaultPrinter?.name ?? null);
        set({ printers, printersLoading: false, printersFallback: printers.length === 0 });
        if (printerName && printerName !== now.settings.printerName) {
          set({ settings: { ...now.settings, printerName } });
          const { ok: ok2, data: c2 } = await getPrinterCapabilities(printerName);
          set({
            capabilities: ok2 && c2 ? (c2 as PrinterCapabilities) : null,
            printersFallback: !ok2,
          });
        } else if (printerName) {
          const { ok: ok2, data: c2 } = await getPrinterCapabilities(printerName);
          set({ capabilities: ok2 && c2 ? (c2 as PrinterCapabilities) : null });
        }
      } else {
        set({ printers: [], printersLoading: false, printersFallback: true, capabilities: null });
      }
    },

    print: async () => {
      if (printInFlight) return;
      const s = get();
      if (!s.source || !s.layout || !s.ready) return;

      printInFlight = true;
      set({
        job: { status: "preparing", messageKey: "print.job.preparing", errorKey: null, startedAt: Date.now(), finishedAt: null },
      });

      const requested = resolveRequestedPages(s.settings, s.layout);
      if (requested.errorKey) {
        set({ job: { status: "error", messageKey: null, errorKey: requested.errorKey, startedAt: null, finishedAt: null } });
        toast().show("error", requested.errorKey);
        printInFlight = false;
        return;
      }

      try {
        set({ job: { ...get().job, status: "rendering", messageKey: "print.job.rendering" } });

        const physicalPages = expandCopies(
          requested.pages,
          s.settings.copies,
          s.settings.collated,
        );
        if (physicalPages.length === 0) {
          throw new Error("no pages to print");
        }

        const docHtml = buildPrintDocument(s.layout, s.settings, physicalPages);
        set({ job: { ...get().job, status: "printing", messageKey: "print.job.printing" } });

        await printDocumentHtml(docHtml, s.title);

        set({
          job: {
            status: "finished",
            messageKey: "print.job.finished",
            errorKey: null,
            startedAt: get().job.startedAt ?? Date.now(),
            finishedAt: Date.now(),
          },
        });
        toast().show("info", t()("print.jobFinished"));
      } catch (error) {
        console.error("[print] failed", error);
        set({
          job: {
            status: "error",
            messageKey: null,
            errorKey: "print.error.printFailed",
            startedAt: get().job.startedAt ?? Date.now(),
            finishedAt: Date.now(),
          },
        });
        toast().show("error", t()("print.error.printFailed"));
      } finally {
        printInFlight = false;
      }
    },

    resetJobError: () =>
      set({ job: { status: "idle", messageKey: null, errorKey: null, startedAt: null, finishedAt: null } }),
  };
});

// DEV-ONLY test handle (removed before release): expose the real store for the
// CDP harness, since a stray duplicate module instance can confuse introspection.
if (import.meta.env?.DEV || (globalThis as unknown as { __LPD_TEST?: boolean }).__LPD_TEST) {
  (globalThis as unknown as { __pstore?: unknown }).__pstore = usePrintStore;
}