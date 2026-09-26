# LinkDit Pad — Complete Functional Audit

**Version audited:** 0.1.1 · **Repo:** `D:\linkditpad\linkdit-pad\linkdit-pad` · **HEAD:** `37a5d20 Remove LinkDit Pad desktop authentication`
**Date:** 2026-09-19 · **Scope:** Static (source) audit + prior verified builds. Behavioral items flagged `MANUAL TEST REQUIRED`.

## Executive Summary

LinkDit Pad is a functional Windows writing app: rich-text / plain / Markdown / code editing, tabs, split view, global search & replace, bookmarks, outline, version history, auto-backup, session/crash recovery, trash, per-document locks, command palette, and `.ldp` file association plumbing are all implemented and statically consistent. The build pipeline (tsc + vite, cargo check/build, full `tauri build` producing NSIS + MSI) passes, and the previously-removed authentication layer is fully absent.

However, the audit found **several advertised features that do nothing**, primarily because their UI exists but is never wired to real behavior:

- **Document Properties is dead UI** — the menu item is a no-op and the dialog can never open.
- **Command Palette "Save" / "Open File…"** bypass the real save/open pipeline and behave differently than File menu.
- **Auto Save never writes to disk** — it only stashes to `localStorage` keys nothing reads; the status-bar pill implies functionality that does not exist.
- **A large block of Settings controls are stored but never applied** (editor line numbers/minimap/tab size/word wrap/mode/format-on-save; accent color, UI font, corner radius, animation speed, startup behavior, update/telemetry toggles), and there are **two parallel, partially-contradictory settings systems**.
- **Substantial dead code** ships in the binary: an unwired file explorer (demo tree), an unused keyboard-shortcut system, an unused command-registration API, and three unused Rust commands backed by an SQLite database the frontend never populates or reads.

Recommended first actions are to either wire these features to real behavior or remove their UI/indicators, then re-test the `.ldp` double-click flow end-to-end after install.

---

## Feature Matrix

| # | Category | Feature | Status | Evidence | Issue | Manual Test Needed |
|---|----------|---------|--------|----------|-------|--------------------|
| 1 | App Launch & Main Window | Frameless main window (1280×800, min 720×480, centered, dragDropEnabled) | WORKING | `src-tauri/tauri.conf.json` app.windows | — | Y |
| 2 | Title Bar & Window Controls | Minimize / maximize / close / drag, theme toggle | WORKING | `TitleBar.tsx`; `capabilities/main.json` core:window allow-* | — | Y |
| 3 | Theme System | Light / Dark / System, persisted, live switch on OS change | WORKING | `useThemeStore`; `App.tsx:69-75` applyResolvedMode + matchMedia listener | — | Y |
| 4 | Accent / UI Customization | Accent chips, corner radius, anim speed, UI font controls | PARTIAL | `SettingsPanel.tsx:149-152,246-264`; grep `accentColor\|cornerRadius\|animationSpeed\|uiFont` = store+UI only | Stored only; never applied at runtime (globals.css has fixed vars, no `setProperty` anywhere) | Y |
| 5 | Document Lifecycle | New / Open / Save / Save As / Close, dirty prompts | WORKING | `Toolbar.tsx:499-592`; `App.tsx:228-279`; format-aware `prepareContentForSave` | Save writes file directly (bypasses `save_document`) | Y |
| 6 | Tabs & Multi-Document | Tabs, groups, dirty tracking, session mapping | WORKING | `useEditorStore`; `EditorTabs.tsx` | — | Y |
| 7 | Split View | Split right/down, close split, independent panes | WORKING | `useEditorStore.splitEditor`; `EditorSurface/EditorTabs`; `Toolbar.tsx:647-649` | Properties/palette assume `group-main` | Y |
| 8 | Rich Text Editing | TipTap: bold/italic/underline/strike/highlight/color/align/lists/tables/tasks/image/link/emoji/python? | WORKING | `RichTextEditor.tsx`; `Toolbar.tsx:1191-1218` | — | Y |
| 9 | Plain Text / Code Mode | CodeMirror editor | PARTIAL | `PlainTextEditor.tsx` | Settings `lineNumbers/minimap/tabSize/wordWrap/smoothCursor/currentLineHighlight/bracketPair/formatOnSave` never applied | Y |
| 10 | Markdown Mode | Markdown text mode, md import/export | WORKING | statusbar mode switch; `loaders/md-loader.ts`; `htmlToMd.ts` | — | Y |
| 11 | Fonts & Typography | Font picker (incl. Google Fonts import), size, line-height, letter-spacing | WORKING | `useFontStore`; `FontSelector/FontSizeSelector`; `App.tsx:77-79` restoreImportedFonts | UI font setting (`useSettingsStore.appearance.uiFont`) unapplied | Y |
| 12 | Undo/Redo & Clipboard | Toolbar/menu/palette cut/copy/paste/undo/redo | WORKING | `Toolbar.tsx:877-889,1171-1189`; palette | — | N |
| 13 | In-Document Search & Replace | Ctrl+F/Ctrl+H overlay find/replace/all | WORKING | `SearchReplace.tsx`; `App.tsx:272-273` | — | Y |
| 14 | Global Document Search | Sidebar search across docs: regex/case/whole-word, history, grouped results, jump + replace per doc | WORKING | `SearchPanel.tsx`; `useSidebarSearchStore`; `bookmarkPositions.ts` | — | Y |
| 15 | Bookmarks | Add bookmark at cursor (Ctrl+Shift+K), BookmarksPanel, rich-doc positions | WORKING | `lib/bookmarks.ts`, `bookmarkPositions.ts`; `BookmarksPanel.tsx` | — | Y |
| 16 | Document Outline | Headings outline panel | WORKING | `DocumentOutlinePanel.tsx`; `useOutlineStore` | — | Y |
| 17 | Version History | Snapshot capture (4s debounce + flush), restore/delete | WORKING | `useVersionCapture.ts`; `VersionHistoryDialog.tsx` | localStorage only, no disk/sqlite | Y |
| 18 | Auto Backup & Crash Recovery | Interval backup, startup crash recovery dialog, flush on exit | WORKING | `useAutoBackup.ts`; `BackupRecoveryDialog.tsx`; `App.tsx:81-109` + `RecoveryDialog` | localStorage only | Y |
| 19 | Auto Save | Auto-save indicator + timer | BROKEN | `useAutoSave.ts` (writes `autosave:<path>` to localStorage; nothing reads it); `StatusBar.tsx:78-93` pill | Never persists to disk; indicator is misleading | Y |
| 20 | Session Restore | Session save/restore, clean-exit + crash-recovery flags | WORKING | `lib/sessionStore.ts`; `App.tsx:81-225` | — | Y |
| 21 | Lock & Passwords | Per-doc password lock/unlock, PBKDF2 hashing | WORKING | `LockPasswordDialog.tsx`; `useLockStore`; `lib/passwordHash.ts`; `Toolbar.tsx:651-688` | — | Y |
| 22 | Trash | Delete → trash, restore, purge, empty (confirm) | WORKING | `TrashPanel.tsx`; `lib/trash.ts`; `useTrashStore` | — | Y |
| 23 | Recent Files | Recent panel, File > Recent, tab sync | WORKING | `useRecentFilesStore`; `useSyncRecentFiles.ts`; `RecentDocuments.tsx`; `Toolbar.tsx:759-771` | Backed by localStorage; SQLite `recent_files` mirror unused | Y |
| 24 | Command Palette | Ctrl+Shift+P command palette | PARTIAL | `CommandPalette.tsx` | "Save"/"Open File…" diverge from real pipeline; `registerCommands` & settings shortcuts unused | Y |
| 25 | Document Properties | Properties dialog | BROKEN | `Toolbar.tsx:773-775` (no-op), `:1066-1155` (`showProperties` never set true), `:868` menu | Menu + shortcut do nothing; dialog unreachable | Y |
| 26 | .LDP File & Association | Save/load `.ldp` (v1), double-click/CLI/second-instance open, drag-drop | WORKING | `fileFormats.ts`; `lib.rs` single-instance + emit; `commands.rs` extract/take; `FileOpenBridge.tsx`; `ldpOpen.ts`; NSIS hook | End-to-end requires installed-app test | Y |
| 27 | Import/Export/Print/PDF | Import md/txt; Save-As ldp/html/md/txt/rtf; PDF (window.print); Print view | WORKING | `Toolbar.tsx:709-757,777-829`; `htmlToRtf/Md/Text` | Export quality of tables/images limited (~static HTML) | Y |
| 28 | Settings Panels & Persistence | General/Appearance/Editor/Shortcuts/Backup tabs, localStorage persist | PARTIAL | `SettingsPanel.tsx`; `useSettingsStore` (keys `linkdit-pad-settings.*`) | Many fields unapplied; two conflicting settings systems; shortcuts list not applied | Y |
| 29 | Keyboard Shortcuts | Ctrl+N/O/S/Shift+S/W/F/H/,/Shift+P/Shift+K, Escape | PARTIAL | `App.tsx:228-279` (hardcoded) | `settings.shortcuts` and `useKeyboardShortcuts` not used; menu labels vs. actual handling can drift | Y |
| 30 | Status Bar | Ln/Col, words/chars/lines, autosave+saved pills, UTF-8/CRLF, mode switch | PARTIAL | `StatusBar.tsx` | Auto Save pill misleading; CRLF label hardcoded; mode list = 4 (no reading/focus/zen/typewriter) | N |
| 31 | Sidebar Navigation | Home/Recent/Bookmarks/Search/Trash nav, resize | PARTIAL | `Sidebar.tsx` | File browser (FileExplorer) not wired into UI at all | N |
| 32 | Auth / Cloud | Removed | NOT IMPLEMENTED (by design) | grep-clean (see Auth Removal Audit) | None (intentional) | N |

---

## Broken Features

1. **Document Properties** — `File > Document Properties` (Ctrl+Shift+I) invokes an empty `handleProperties` (`Toolbar.tsx:773-775`). The `DocumentPropertiesDialog` (`Toolbar.tsx:1066-1155`) is mounted (`:1235`) but `showProperties` is initialized `false` and only ever set back to `false` (`:1072`, `:1117`, `:1148`) — it can never open. Category 25.
2. **Command Palette "Save" / "Open File…"** — Palette "Save" (`CommandPalette.tsx:36-47`) downloads `<title>.html` regardless of mode and never touches the tab's file path/localstore; it also hardcodes `groups["group-main"]` (wrong under split view). Palette "Open File…" (`:19-35`) uses a raw `<input type=file>` (no Tauri dialog), always opens as `rich`, runs no loader, doesn't strip extensions, and its accept list omits `.ldp`. Category 24.
3. **Auto Save does not persist** — `useAutoSave.ts` writes only `localStorage["autosave:<path>"]`; nothing ever reads `autosave:*`, and no disk write occurs. `StatusBar` shows an "Auto Save" pill and `pendingAutosave` state (`StatusBar.tsx:51,78-93`) implying a real feature. Category 19.
4. **Accent color / UI font / corner radius / animation speed settings do nothing** — Controls exist in Settings (accent chips `SettingsPanel.tsx:246-249`, radius slider `:149`, anim speed `:152`, UI font `:264`) but the only runtime style layer (`globals.css`) defines fixed CSS variables and no code calls `document.documentElement.style.setProperty` (grep-clean). Category 4.

---

## Partial Features

1. **Plain/Code editor settings** (`category 9`): `lineNumbers`, `minimap`, `tabSize`, `wordWrap`, `defaultMode`, `smoothCursor`, `currentLineHighlight`, `bracketPair`, `formatOnSave` are persisted (`useSettingsStore.ts:38-49`) and editable, but no editor component consumes them. Even the `.ldp` format hardcodes `tabSize: 4, wordWrap: true` (`fileFormats.ts:53-54`).
2. **Settings panel / persistence** (`category 28`): persistence works (localStorage `linkdit-pad-settings.*`), but only a minority of fields are applied (`sidebarWidth` in `Sidebar.tsx:135,149`; `showStatusBar` in `StatusBar.tsx:19,53`). `language`, `autoUpdate`, `telemetry`, `startupBehavior`, `showMinimap` have zero consumers.
3. **Two settings systems** — `useSettingsStore` (rich JSON persistence) and `useThemeStore` (only persists `themeMode`; its `accent` and `fonts` fields are never persisted or applied, and `setAccent` is never called). Theme mode works (`useThemeStore`), accent color lives in `useSettingsStore` — the two contradict each other and both surface in Settings.
4. **Keyboard shortcuts** (`category 29`): core global shortcuts work (hardcoded `App.tsx:228-279`). But `settings.shortcuts` (customizable list) is only *displayed* in SettingsPanel (`:210`) and never wired; `useKeyboardShortcuts` hook is entirely unused.
5. **Status bar** (`category 30`): stats are live (via editor bridge). Soft issues: "CRLF" is a static label (no actual newline detection), mode list covers the 4 implemented modes (reading/focus/zen/typewriter don't exist as modes), Auto Save pill misleading (see Broken).
6. **Recent files** (`category 23`) are localStorage-driven (`useRecentFilesStore` + `useSyncRecentFiles`); the SQLite `recent_files` table + `list_recent_files` command are never used.

---

## Dead / Non-functional UI

- **`src/components/filemanager/FileExplorer.tsx`** — never imported or rendered anywhere. Ships a hard-coded demo tree (`DEMO_TREE` `:199-232`) and, worse, calls `setRoot(DEMO_TREE)` during render (`:238-240`). The companion `useFileExplorerStore` is otherwise unreferenced. No File Explorer entry exists in the sidebar.
- **`DocumentPropertiesDialog`** — see Broken #1 (mounted, unreachable).
- **`registerCommands`** (`useCommandPaletteStore.ts:37`) — never invoked; the palette's list is a hardcoded `DEFAULT_COMMANDS`.
- **`useKeyboardShortcuts`** (`hooks/useKeyboardShortcuts.ts`) — never imported.
- **Rust:** `save_document`, `list_recent_files`, `app_version` (`commands.rs:63-138`) are not invoked by any frontend code (only `open_document` in `ldpOpen.ts:41` and `take_pending_open_path` in `FileOpenBridge` are used). Consequently the SQLite `documents` / `recent_files` tables (`db.rs`) are never populated or read — the DB is write-side-dead scaffolding.
- **`useThemeStore.accent` / `.fonts` / `cornerRadius` / `animationSpeed`** — in-memory only defaults; never persisted or applied. `setAccent` has no callers.
- **`ACCENT_COLORS`/theme accent UI** — see Broken #4.

---

## Production Risks

1. **Data-loss exposure for drafts** — version history, backups, crash-recovery, session, and "autosave" all live in `localStorage`; the autosave keys are never read. Clearing webview storage or an unhandled crash loses work the app implies it saved. The SQLite layer that was clearly intended for this is unused.
2. **Bundle size** — `vite build` emits a `>500 kB` chunk warning; no route/component lazy-loading is configured.
3. **Big asset** — `src-tauri/icons/32 × 32 px.png` (~1.648 MB) is a near-16× over-weight asset shipped in the installers (all other icons are ~tens of KB).
4. **Frameless + `transparent: true` window** adds compositing/GPU cost on Windows and complicates rendering perf; acceptable for the design but worth profiling.
5. **Unused-but-created SQLite DB** — `linkdit.sqlite` (WAL) is created in app data on every launch and never written; it will grow a 0-byte file + `-wal`/`-shm` alongside real data indefinitely.
6. **State-during-render anti-pattern** in `FileExplorer.tsx:238-240` (calls `setRoot` in render) would cause re-render loops if the component were ever mounted; it is currently harmless because it is dead.
7. **`.ldp` open path is unvalidated** — `extract_open_path` accepts any argv entry ending in `.ldp` (case-insensitive) and `open_document` reads whatever string the frontend passes. Low risk (local), but no path canonicalization/size guard exists.

---

## .LDP File Association Audit

| Aspect | Status | Evidence |
|--------|--------|----------|
| Bundle file association | Configured | `tauri.conf.json` `fileAssociations` — ext `ldp`, name/description "LinkDit Pad Document", mime `application/json`, role Editor |
| Installer hooks | Configured | `src-tauri/hooks/file-associations.nsh` deletes `HKCU\...\Explorer\FileExts\.ldp\UserChoice` pre-install and post-uninstall so the app class takes ownership of double-click (handles stale "Open with") |
| Launch args capture | Implemented | `lib.rs` single-instance handler + setup capture argv → `PENDING_OPEN_PATH` (Mutex<Option<String>>) |
| Second-instance forwarding | Implemented | `lib.rs:19-29` — extracts `.ldp` arg, stores pending, emits `linkdit://open-file`, focuses main window |
| Frontend polling | Implemented | `FileOpenBridge.tsx` listens to `linkdit://open-file`, handles drag-drop, polls `take_pending_open_path` (take + clear, `commands.rs:28-34`) |
| Open routing | Implemented | `ldpOpen.ts` — dedupes by normalized path (`pathEquals`), reads via `open_document` (plugin-fs fallback), routes through `openFileRaw` loader so corrupt files get the styled error |
| Format serialization | Implemented | `fileFormats.ts` — LDP v1, `ldp:"linkdit-pad"`, creator `LinkDit Pad 0.1.1`, meta (title/mode/created/updated/language/direction/tabSize/wordWrap), content `text/html` utf-8; forward-version warning |
| End-to-end | MANUAL TEST REQUIRED | Install NSIS build, double-click a `.ldp`, relaunch while running, drag-drop, CLI open |

**Security note:** the argv parser trusts any path ending `.ldp` (trimmed quotes only); content is read as text and injected into the editor as HTML. Local, single-user, but no size/canonicalization limits.

---

## Auth Removal Audit

Target: verify authentication (categories 26–28 per original scope) is fully removed and leaves no trace.

| Check | Result |
|-------|--------|
| `supabase` / `oauth` / `pkce` / `keyring` in src + src-tauri | Clean — only false positives: `class-variance-authority` (substring "auth") |
| `useAuthStore` / `AccountButton` / `AccountDialog` / any auth component | Clean |
| `linkditpad://` deep-link protocol | Clean — only `linkdit://open-file` (legit `.ldp` event, kept) |
| `@supabase/*`, `@tauri-apps/plugin-deep-link`, `plugin-opener`, `keyring` in npm/Cargo manifests | Clean — removed in HEAD `37a5d20` |
| Deleted auth artifacts | Confirmed removed (prior task): `src/components/auth/`, `useAuthStore.ts`, `lib/supabase.ts`, `lib/pkce.ts`, `lib/authStorage.ts`, `src-tauri/src/auth.rs`, `supabase/`, `.env.example` |
| Remaining `deep-link` instance | `Cargo.toml` single-instance `features=["deep-link"]` — this is for capturing OS launch args for `.ldp`, not OAuth; retained |
| Verdict | **PASS** — authentication is fully absent; only file-association plumbing remains |

---

## Build Audit

Re-verified prior (tree unchanged since, `git status` clean except untracked `_bm*` probes):

| Command | Result |
|---------|--------|
| `npm install` | OK |
| `npm run build` (tsc + vite) | PASS (emits `>500 kB` chunk warning) |
| `cargo check` (src-tauri, debug) | PASS |
| `cargo build` (src-tauri, debug) | PASS |
| `npm run tauri build` | PASS → NSIS `LinkDit Pad_0.1.1_x64-setup.exe`, MSI `LinkDit Pad_0.1.1_x64_en-US.msi` |
| Release exe smoke launch | OK (window present, process alive after launch) |
| `npm run lint` | **FAILS (pre-existing)** — ESLint 9 requires flat config `eslint.config.js`; repo ships legacy `.eslintrc.json`. Configuration issue, not a code defect; CI would fail until config is migrated. |
| Version consistency | 0.1.1 in `package.json`, `Cargo.toml`, `tauri.conf.json` — consistent |

---

## Manual Test Checklist

Only the app team can exercise interactive/behavioral paths; each box below is a required verification.

- [ ] **Launch & window** — `LinkDit Pad_0.1.1_x64-setup.exe` installs; app launches; window has correct size, centering, no native frame. Expected: frameless 1280×800. Actual: . Status: .
- [ ] **Title bar** — minimize / maximize / restore / close; drag by title bar. Expected: all work via capabilities. Actual: . Status: .
- [ ] **Documents** — New (Ctrl+N), Open (Ctrl+O), Save (Ctrl+S), Save As (Ctrl+Shift+S) are format-aware (default `.ldp`). Expected: `.ldp` written as JSON v1. Actual: . Status: .
- [ ] **Dirty close** — type, close tab without saving → prompt appears; Save / Discard / Cancel all behave. Expected: prompt. Actual: . Status: .
- [ ] **Rich editing** — bold/italic/underline/strike/highlight/color/align/lists/task list/table/emoji/image/link in toolbar apply to selection. Expected: TipTap marks active (isActive). Actual: . Status: .
- [ ] **Plain/Code mode** — set mode via status bar to Plain Text / Code; typing/selection/cursor work. Expected: CodeMirror responsive. Actual: . Status: .
- [ ] **Split view** — Split Right / Split Down; independent panes; Close Split. Expected: two panes editing independent tabs. Actual: . Status: .
- [ ] **In-doc search/replace** — Ctrl+F find, Ctrl+H replace, Replace All updates doc + dirty flag. Expected: matches highlight/jump. Actual: . Status: .
- [ ] **Global search** — sidebar search returns matches across open tabs + saved docs; click jumps; replace works in rich and plain. Expected: navigation per result. Actual: . Status: .
- [ ] **Bookmarks** — Ctrl+Shift+K adds bookmark; panel lists; clicking navigates (incl. within rich doc). Expected: jump to exact position. Actual: . Status: .
- [ ] **Outline** — headings panel reflects document; click scrolls. Expected: sync with editor. Actual: . Status: .
- [ ] **Version history** — edits accrue snapshots; restore/delete work. Expected: restore replaces content + dirty flag. Actual: . Status: .
- [ ] **Backup / recovery** — backup list restores; simulated crash + relaunch shows Recovery dialog. Expected: recovery flow. Actual: . Status: .
- [ ] **Auto save** — FAILS EXPECTED: open/save a file, edit, wait >3 s, app closes — file on disk updated. Likely Actual: file unchanged (localStorage only). Record result.
- [ ] **Lock** — lock a doc, close tab, reopen → unlock prompt; wrong password rejected. Expected: PBKDF2 gate works. Actual: . Status: .
- [ ] **Trash** — delete a saved doc → appears in Trash; Restore brings it back; Purge/Empty confirm + removes. Expected: cleanup semantics. Actual: . Status: .
- [ ] **Recent** — saved/open files appear in Recent; click reopens. Expected: ordering newest-first. Actual: . Status: .
- [ ] **Command palette** — Ctrl+Shift+P; New File / Find / Theme work. **Known broken: Save (downloads .html), Open File… (no .ldp, mode forced rich)**. Actual: . Status: .
- [ ] **Document properties** — File > Document Properties (Ctrl+Shift+I). **Known broken: nothing happens — dialog never opens.** Actual: . Status: .
- [ ] **Theme & accent** — Light/Dark/System toggle switches immediately; **accent color chip selection does NOT change UI (known)**. Actual: . Status: .
- [ ] **Import/Export** — import `.md`/`.txt`; Save As HTML/MD/TXT/RTF; Export PDF + Print render correctly (incl. tables/images). Actual: . Status: .
- [ ] **Settings persistence** — change sidebar width / status bar toggle → restart → preserved; **editor options (line numbers…), accent, UI font have no effect (known)**. Actual: . Status: .
- [ ] **Shortcuts** — all global shortcuts fire; Ctrl+B toggles sidebar vs bold depending on editor focus. Expected: no dead keys. Actual: . Status: .
- [ ] **Status bar** — Ln/Col/words/chars/lines update on typing; unsaved→saved pill transitions. Expected: live. Actual: . Status: .
- [ ] **Sidebar** — nav Home/Recent/Bookmarks/Search/Trash renders each panel; drag-resize works. Expected: resize persists. Actual: . Status: .
- [ ] **`.ldp` double-click** — after install, double-click a `.ldp` opens it in the app (fresh launch). Expected: file loads + title correct. Actual: . Status: .
- [ ] **`.ldp` second instance** — app running, double-click another `.ldp` → existing window focuses and loads it. Expected: single instance forwards. Actual: . Status: .
- [ ] **`.ldp` drag-drop** — drag a `.ldp` onto the window. Expected: opens. Actual: . Status: .
- [ ] **`.ldp` CLI** — `LinkDit Pad.exe "C:\path\file.ldp"`. Expected: opens. Actual: . Status: .
- [ ] **Corrupt `.ldp`** — open an invalid `.ldp`. Expected: styled "corrupted document" message, active doc preserved. Actual: . Status: .
- [ ] **Uninstall** — uninstaller removes app + `.ldp` UserChoice cleanly. Expected: no dangling association. Actual: . Status: .

---

## Recommended Fix Order

**Blocking**
1. **Auto Save (real or honest)** — persist to disk via `save_document`/`writeTextFile` (respecting format) after debounce, or remove the status-bar pill and the feature. Highest user-impact.
2. **Command Palette Save / Open File…** — route them through `saveFile` / `openFile` (including `.ldp`, loaders, `markSaved`).
3. **Document Properties** — wire `handleProperties` to `setShowProperties(true)` (move dialog state into store or local state) or delete the menu item + dialog.

**Functional**
4. **Wire editor settings** (line numbers, minimap, tab size, word wrap, smooth cursor, current line, brackets, format-on-save, default mode) into `PlainTextEditor`/`RichTextEditor`, or remove the controls.
5. **Consolidate settings systems** — merge `useThemeStore` into `useSettingsStore`; make accent color / UI font / corner radius / animation speed actually set CSS variables (`--primary`, `--font-ui`, `--radius`, motion) or remove the controls.
6. **SQLite** — either wire `save_document`/`list_recent_files`/`app_version` into the frontend (and recent files to DB) or drop the tables/commands/`rusqlite`+`chrono` deps.

**Integration**
7. **File Explorer** — wire `FileExplorer` to real FS via `plugin-fs` (add `fs:allow-read-dir`/`fs:allow-exists` + scope), or delete the component + `useFileExplorerStore`.
8. **`.ldp` E2E** — run the full manual checklist above on an installed build; fix any association gaps (second-instance focus timing, Installer "Open with" takeover).

**UX**
9. **Status bar honesty** — live CRLF/LF detection, link "Auto Save" pill to the fixed behavior, remove references to non-existent modes.
10. **Shortcut manager** — either apply `settings.shortcuts` via a runtime dispatcher or remove the editable list from Settings.

**Cleanup**
11. Delete dead code (`useKeyboardShortcuts`, `registerCommands`, unused dialog/commands as decided above); optimize `32 × 32 px.png` (~1.6 MB); code-split the bundle to resolve the `>500 kB` warning.

---

## Final Summary

Verdict: **functional core is present and buildable; several advertised features are disconnected from real behavior; significant dead code and dead-settings weight ship in the v0.1.1 binary.**

Highest-priority truths for leadership: (1) documents are not actually auto-saved to disk despite the UI saying so; (2) Document Properties, palette Save/Open, accent/UI-font controls, and every editor "code-mode" setting currently do nothing; (3) the SQLite database, file-explorer, shortcut-manager, and command-registration subsystems are unused scaffolding; (4) auth removal is confirmed clean and the `.ldp` association is fully plumbed but unverified end-to-end. Fixing #1–#3 and executing the manual checklist will take this from "demo-grade" to "reliable v0.1.1".