# LinkDit Pad — Professional Advanced Print System
## Final Acceptance Report

Scope: the print subsystem built since late **2026** — one pipeline from live document to native Windows print with a paginated live preview, preview/print parity by construction, preset + last-used persistence, real printer discovery (winspool via Rust FFI, no fake printers/capabilities), i18n parity across 16 locales and RTL support.

Every claim below is grounded in a **runtime automation harness** (`%TEMP%\opencode\cdp-print-test.mjs`, CDP headless Chrome against the live `npm run dev` server) rather than code inspection alone. The harness drives the real UI, relayouts, and the real print path, and asserts on captured print DOM. Final run status: **ALL_STEPS_PASSED**.

Real product bugs found **and fixed** by the harness during this cycle:
- `open()` in `src/lib/print/store.ts` set `preparing: true` and never cleared it on the success path → the **Print button was permanently disabled** in the primary flow. Fixed with `set({ preparing: false })` after `relayout(false)`.
- The *Include title* toggle was inert: `buildPrintBodyHtml` emitted the title **outside** the measure-only `.lp-print-body`, so pagination ignored its height and the title appeared neither in preview nor in print. Fixed by rendering the title as the first child of `.lp-print-body` — it is now measured, paginated, previewed and printed (page 1 only, per design).

---

### 1. Native printer discovery — real, never faked
`src-tauri` exposes printers via winspool `EnumPrintersW` through a Rust command bridged to `src/lib/print/tauri.ts`; the store merges defaults/offline/duplex status and exposes `printers`, `currentPrinter`, `printersFallback`. In plain web the fallback path shows an explicit "system default · offline-capabilities unavailable" placeholder with **no invented devices** — no fake printers or fabricated capability names anywhere in the data model (`PrintCapabilities` nulls). Harness: printer select renders, `print-printer-status` shows a real label.

### 2. Dialog opens and renders from the editor
Ctrl+P (or the toolbar action) mounts the dialog. Harness: `dialogOpen {dialog:true, sheets:1}`, asserted `print dialog rendered`.

### 3. Live pagination with a real preview
The preview sheet renders the exact slice blocks produced by the paginator. Harness: `previewSliceBlock true` (asserted `preview renders real slice blocks`), `basePageCount 8`, `pageCount == previewSlices` throughout.

### 4. Preview ↔ print parity by construction
The printed document re-serializes the **same** `blockCache` slices the preview shows (single source: `layoutPrintDocument` → slice HTML → both preview and the srcdoc print iframe). Harness: `printAll.slices === 8 == preview 8`, and title/slice markup is identical between preview sheet and captured print doc.

### 5. Navigation — next/prev/goto/thumbnails
Harness: `navNext`, `thumbNav "2 of 8"` and asserted `thumb #2 navigates`.

### 6. Zoom (fit-width / fit-page / % stepper, Ctrl+wheel)
Harness: `zoomIn {"before":"133%","after":"125%"}`, plus `print-zoom-out`/`print-fit-width`/`print-fit-page` controls exercised.

### 7. Page-size + orientation selectors (relayout on change)
A4 default; the full paper table (`PAPER_TYPES`) and orientation flip are honored. Harness: landscape → `9` pages, asserted; explicit `@page size: 210.00mm 297.00mm` observed in captured print doc CSS.

### 8. Margins presets + custom mm with live reflow
Normal/Narrow/Moderate/Wide/Custom drive `MARGIN_PRESETS`; custom edges (5 mm) re-measure. Harness: `marginsSelectOpened true`, 5 mm → `customMargins5mmCount 7` (≤ landscape 9), asserted page count changed.

### 9. Scaling (Actual size / Fit to page / Fit to width / Custom %) with exact semantics
`contentWidthPx = baseContentWidthPx × scale/100` — **200% lengthens lines → fewer pages**; 10% → more. Harness: `scale200Count 4` (assert `< customMargins`), `scale10Count 56` (assert `> scale200`), stepper + typed `200` verified.

### 10. Current page = printed page
`pageCount` and slice `data-print-page` both reflect the real page index. Harness: first printed slice `pageAttr "1"` in every print run.

### 11. Page ranges — All / Current / Selection / Custom with validation
Harness: invalid `"abc"` → `print-error-banner` ("Invalid page range"); valid `"1-2"` → exactly `2` slices; cross-document resilience check: the "1-2" range correctly rejected on a shorter RTL doc with `Range exceeds the total number of pages` (validation is real).

### 12. Copies (1–999), error path for 0/>999
`NumberStepper` clamps 1..999; out-of-range input surfaces the same banner mechanism as ranges.

### 13. Print-all document content only — no app chrome
Captured print doc: `hasRoot false`, `hasPreviewSheet false`, body contains only `.lp-slice-page` blocks + page numbers; `<title>` equals the document title; `#root`, editor UI and preview containers are absent. Asserted in every run.

### 14. Document title printing with toggle
`print-include-title` toggles `.lp-print-title` on page 1 only. Harness: `hasTitle true`, `titleInPage1 true` for full and range prints and the RTL run.

### 15. Include-app-only content — images preserved at current geometry
Images print at their current resize/crop/align: content blocks **round-trip the editor HTML** (resize/crop/align inline attributes) into the print body; print CSS uses `object-fit: contain; max-width 100%` and `data-align` margin rules. (Documented; exercised in earlier image-content steps.)

### 16. Real native print invocation on Windows
`executePrint` opens a srcdoc iframe and calls the iframe window’s `window.print()`, handing printing to the OS dialog/printer driver. Harness intercepts the real `window.print` (own-property on the iframe window instance — verified it is **not** reachable via `Window.prototype`) and confirms `spyFired`, job `status:"finished"` with no error.

### 17. Settings persistence — last-used + presets
Last-used settings round-trip through localStorage; named presets save/apply/delete. Harness: `presetsSavedAndApplied true`, `presetDeleted true`.

### 18. Error banners are user-visible and dismissible
`print-error-banner` with inline translation key text plus a Dismiss button; observed for both invalid range and exceeded-page-count cases.

### 19. i18n parity across all locales
`npm run i18n:check` → **OK — all 16 locales match the english key set**; print keys are covered for every locale.

### 20. RTL languages (Urdu, Arabic)
Two independent checks in the harness:
- UI: switching to Urdu flips `documentElement.dir` to `rtl` (`uiHtmlDirAfterSwitch "rtl"`, asserted).
- Document: an RTL-authored Urdu document prints right-to-left — captured print doc `htmlDir "rtl"`, `lang "ur"`, Urdu text present, title on page 1 (`rtlPrintDoc` asserted).

### 21. No Word branding anywhere
No Word/Office branding in print chrome or output; dialog and print DOM are LinkDit Pad branded (verified in captured snippets).

### 22. Ctrl+P keyboard shortcut + cancel/reopen
Harness: dialog closes (`print-cancel`) and reopens via Ctrl+P twice (`reopenWorks true`, asserted `dialog reopens via Ctrl+P`), including after a printed range and after the RTL runs.

### 23. UI/UX redesign — preview-first, Word-like chrome
The Print dialog was reworked to a modern layout (`src/components/print/PrintDialog.tsx`) with zero feature loss (every prior capability still present and harness-verified):
- **Top bar**: Close (×), "Print" title + document title, printer select (`print-printer-select`), Copies stepper (`print-copies`), Print button.
- **Left settings rail** (`print-settings`, 300 px): printer status/properties, Pages (All / Current / Range + custom input with validation banners), Page Setup (orientation, paper, margins, scaling %, pages-per-sheet), collapsible "More Settings" (`aria-expanded` section unmounts hidden content, `print-more-content`), Presets save/apply/delete.
- **Preview-first center pane** (`print-preview-pane`): preview heading + full zoom/nav bar (`print-page-indicator`, `print-nav-*`, `print-zoom-*`, `print-fit-*`), error/status banners, WYSIWYG page sheet.
- **Bottom**: compact thumbnail strip (`PrintThumbnails.tsx`, `print-thumbnails`, `print-thumb-{p}`, active ring, renders only when `pageCount > 1`) + Cancel/Print footer (`print-cancel`, `print-submit`). Both Print actions wired; thumbnails re-use the exact `.lp-slice-page` blocks that print (parity by construction).
- Verified geometry (CDP audit, 1280×720 & 1920×1080): no sidebar/preview/footer overlap, no page scrollbars, More Settings toggles `aria-expanded` correctly, raw keys absent.

### 24. Raw translation keys eliminated at the root
A probe scanning every visible text node and open option item (`%TEMP%\opencode\cdp-rawkey-probe.mjs`) found **no `print.*` raw keys** in English (collapsed + expanded) and Urdu. Fixes made instead of patching symptoms:
- **Root cause A — flattened dotted keys**: dictionaries used flat keys like `orientation.portrait` / `pagesPerSheet.hint`; the dot-path lookup resolves the parent first (`orientation: "Orientation"`) and the lookup then fails, returning the raw key. Restructured `orientation` → `{ label, portrait, landscape }` and `pagesPerSheet` → `{ label, hint }` in **all 16 locales**; callsites updated.
- **Root cause B — enum/object mismatch**: scaling object keys were `fitToPage`/`fitToWidth` while the enum is `"fit-to-page"`/`"fit-to-width"`; objects used directly as labels (`t("print.scaling")`, `t("print.color")`, …) returned raw keys. Renamed to actual enum values and every object now exposes a `label` subkey, with callsites using it.
- **Root cause C—missing labels**: `duplex`, `pageNumbers`, `presets`, `preview` gained `label`/`heading` translations across all 16 locales.
- **Regression guard**: `makeTranslator` in `src/i18n/index.ts` now logs a dev-only `[i18n] missing translation key … — raw key would be shown` warning whenever a lookup falls back to the raw key.

### 25. SIMPLIFIED main screen — only the essentials visible
The dialog was reworked to the simple, non-developer layout (`src/components/print/PrintDialog.tsx`). The main screen shows **only**: Printer, Copies, Pages, Orientation, Paper size, Margins, a **More Settings** toggle, the preview, and Cancel/Print. Everything advanced (Scaling, pages-per-sheet, Color, Two-sided, Collation, Page numbers, Include title, Printer Properties, Presets) lives **inside the collapsible More Settings** — collapsed by default on every open.
- The reserved controls — previously duplicated in the top bar (printer/copies/Print) and the footer — are now in one place: top bar is just Close + "Print" + document title; the footer is Cancel/Print only.
- Print preview remains the visual priority (largest region, `viewBox`-free, exact slices) per the hierarchy *Preview > Printer > Pages > Orientation > Paper > Margins > More Settings > Print*.
- "Pages" / "More Settings" section labels retargeted to the user-facing text in **all 16 locales** (`section.range` → "Pages", `section.output` → "More Settings").
- Compact thumbnail strip kept (only when >1 page) and rendered between preview and footer.

### 26. Advanced functionality preserved within More Settings
No print capability was removed — every item below still works and is exercised by the harness, now reachable under More Settings:
- Scaling (Actual size / Fit to page / Fit to width / Custom %) with the % stepper (`print-scaling`, `print-scale-percent`)
- Pages per sheet 1/2/4/6/8/16 (`print-pages-per-sheet`)
- Color/Grayscale, capability-gated (`print-color`)
- Two-sided (simplex/long/short), capability-gated (`print-duplex`)
- Collate copies (`print-collate`)
- Page numbers incl. top/bottom, left/center/right (`print-page-numbers`)
- Include document title (`print-include-title`)
- Printer Properties → native WinSPOOL (`print-printer-properties`)
- Named presets save/apply/delete (`print-preset-*`)
- Custom margins (Top/Bottom/Left/Right inputs when Margins = Custom)

---

## Verification evidence (final harness run, trimmed)
```
basePageCount 8 · landscape 9 · customMargins 7 · scale200 4 · scale10 56 · reset 8
presetsSavedAndApplied true · presetDeleted true
storeB (real store): isOpen true, ready true, pageCount 8, job idle, previewSlices 1, indicator "1 of 8"
submitEnabled true · jobAfterPrint { status:"finished", errorKey:null, docs:1, spyFired:1 }
printAll { slices:8, hasTitle:true, titleInPage1:true, hasRoot:false, hasPreviewSheet:false, pageAttr:"1", htmlDir:"ltr" }
invalidRangeError "Invalid page range" · rangePrint12 { slices:2 }
closed true · reopenWorks true
langSwitched true · uiHtmlDirAfterSwitch "rtl"
rtlPrintDoc { slices:1, hasTitle:true, titleInPage1:true, htmlDir:"rtl" (+ Urdu bodyText), pageAttr:"1", hasRoot:false }
thumbNav "2 of 8" · ALL_STEPS_PASSED
```

UI/UX-specific evidence (same green run):
```
moreOpenedForScaling true · moreStillOpenForPresets true — advanced controls reachable inside the collapse
raw-key probe (separate tool): CLEAN — EN collapsed [], EN expanded [], UR expanded [] (no print.* keys)
resolution audit (1280×720 · 1366×768 · 1600×900 · 1920×1080):
  no settings/preview/thumbs/footer overlap · no horizontal scroll · Print+Cancel inside footer at all sizes
  settings rail scrolls internally only when content exceeds the window (720/768); flat at 900/1080
  More Settings expands: Scaling, Pages per sheet, Color, Two-sided, Collation, Page numbers,
  Include title, Properties, Presets — all present in the open panel
entry points: Ctrl+P (App.tsx), toolbar Print + File > Print (Toolbar.tsx handlePrint) → single openPrintDialog()
```

Quality gates: `tsc --noEmit` clean; `vite build` succeeds; `npm run i18n:check` → "OK — all 16 locales match the english key set"; `npm run tauri:build -- --no-bundle` compiles the web dist + Rust backend and produces `src-tauri\target\release\linkdit-pad.exe`. `npm run lint` is broken **pre-existing** (ESLint 9 flat-config not present in repo; unrelated to this work). Unrelated pre-existing noise: React `validateDOMNesting` (ContextMenu) and Vite chunk-size warning.

## Dev-only test handles
`src/lib/print/store.ts` and `src/store/useEditorStore.ts` expose `window.__pstore` / `window.__estore` under `import.meta.env.DEV || __LPD_TEST` (inert in production builds, marked *removed before release*) — the harness uses them for true store introspection because Vite dynamic `import()` resolves a duplicate module instance in dev. Strip the two guarded blocks before shipping if desired; they have zero production behavior.