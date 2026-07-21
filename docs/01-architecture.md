# LinkDit Pad — Phase 1: Product Architecture

## System overview

LinkDit Pad is a Tauri 2 desktop application: a Rust backend (window
management, filesystem access, SQLite persistence) driving a React +
TypeScript frontend rendered in the OS webview.

```
┌─────────────────────────────────────────────────────────┐
│                      Windows 11 Shell                    │
│  ┌──────────────────────────────────────────────────┐    │
│  │                Tauri Runtime (Rust)               │    │
│  │  window mgmt · fs · sqlite · dialogs · plugins     │    │
│  │        commands.rs · db.rs · error.rs              │    │
│  └───────────────────────▲──────────────────────────┘    │
│                           │ IPC (invoke / events)          │
│  ┌───────────────────────▼──────────────────────────┐    │
│  │              React + TypeScript (webview)          │    │
│  │  ┌───────────┐ ┌────────────┐ ┌─────────────────┐ │    │
│  │  │  Layout   │ │  Editor    │ │  Feature modules │ │    │
│  │  │ TitleBar  │ │ TipTap /   │ │ theme, settings, │ │    │
│  │  │ Sidebar   │ │ CodeMirror │ │ AI, plugins       │ │    │
│  │  │ StatusBar │ │            │ │                   │ │    │
│  │  └───────────┘ └────────────┘ └─────────────────┘ │    │
│  │              Zustand (client state)                │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## Layering rules

1. **UI components** (`src/components`) never talk to Tauri directly —
   they read/write the Zustand store only.
2. **Store actions** (`src/store`) own state transitions and call into
   `src/lib` service wrappers for persistence.
3. **Service wrappers** (to be added in later phases under
   `src/lib/services`) are the only code that calls `@tauri-apps/api`
   `invoke()`, keeping the Rust IPC surface centralized and mockable.
4. **Rust commands** (`src-tauri/src/commands.rs`) are thin: validate
   input, call `db.rs` / filesystem, return typed results via
   `AppResult<T>` (see `error.rs`).

## Data flow: opening and saving a document

```
User clicks "Open" → dialog:allow-open (Rust) → path
   → invoke("open_document", { path })
   → commands::open_document reads file → returns String
   → useEditorStore.openTab({ content })
   → EditorSurface renders PlainTextEditor / RichTextEditor
   → onChange → updateContent (debounced autosave, Phase 7)
   → invoke("save_document", payload)
   → commands::save_document writes disk + upserts SQLite row
```

## Module boundaries (see Phase 2 folder structure)

| Layer | Responsibility | Depends on |
|---|---|---|
| `components/ui` | Design-system primitives (Button, Tooltip…) | nothing app-specific |
| `components/layout` | Window chrome: TitleBar, Sidebar, StatusBar | `store`, `ui` |
| `components/editor` | Editing surfaces: tabs, TipTap, CodeMirror | `store`, `types` |
| `features/*` | Vertical slices (theme, settings, AI) added per phase | `store`, `lib` |
| `store` | Zustand state containers | `types`, `lib` |
| `lib` | Pure utilities + (future) Tauri service wrappers | `types` |
| `src-tauri` | Rust backend: commands, db, error | — |

## Why this shape

- **Testable UI**: components never import Tauri APIs directly, so the
  whole frontend runs and is testable in a plain browser (`npm run dev`)
  without the Rust shell.
- **Swappable persistence**: SQLite today; the same `AppResult<T>`
  command contract can back a future sync layer without touching UI code.
- **Incremental phases**: each later phase (editor engine, theming,
  fonts, AI, security, plugins) adds a `features/<name>` slice and, if
  needed, new Rust commands — without restructuring what's already here.
