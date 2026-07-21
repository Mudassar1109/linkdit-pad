# LinkDit Pad

The next generation Windows writing application — Tauri + React + TypeScript + Rust.

> **Status: Phase 1 & 2 scaffold.** This delivers the product architecture and
> folder structure with a real, running app shell (title bar, sidebar, tabs,
> plain-text and rich-text editing, SQLite-backed save). Phases 3–20 from the
> master prompt (deep database schema, full design system, theme/font engines,
> AI layer, encrypted vault, plugin SDK, packaging, etc.) build on top of this
> foundation, one phase at a time.

## Prerequisites

- [Node.js 18+](https://nodejs.org)
- [Rust toolchain](https://rustup.rs) (stable)
- On Windows: the [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
  and [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) (preinstalled on Windows 11)

## Getting started

```bash
npm install

# Run the frontend only, in a regular browser tab (fast iteration):
npm run dev

# Run the full desktop app (Rust + webview):
npm run tauri:dev

# Production build (installer in src-tauri/target/release/bundle):
npm run tauri:build
```

## What's implemented right now

- Frameless, draggable Windows 11–style title bar with real window controls
- Sidebar navigation shell (Files / Recent / Pinned / Search / Settings)
- Multi-tab editor (`EditorTabs`) backed by a Zustand store, with dirty-state
  indicators and tab groups ready for split-view
- Two working editing surfaces: plain text/Markdown (`PlainTextEditor`) and
  rich text via TipTap (`RichTextEditor`), switchable per document, with
  RTL/Urdu-ready styling (`editor-urdu` class, `dir` attribute wiring)
- Status bar with live word/character count and mode switcher
- Full light/dark theme via CSS variables matching the spec's color system
  (`#2563EB` primary, `#06B6D4` accent, semantic success/warning/danger)
- Rust backend: SQLite schema for documents + recent files, `open_document` /
  `save_document` / `list_recent_files` commands, centralized typed errors
- Tauri v2 capability manifest scoped to only the permissions currently used

## What's intentionally not built yet

Font system (250+ fonts), full command palette, search/replace with regex,
version history/undo timeline, file manager tree with drag & drop, AI
provider layer, encryption/vault, plugin SDK, and packaging/installer
polish are all real, multi-day pieces of work — each is its own phase in
`docs/`. Building them as stubs now would violate the "no placeholder code"
rule in the master prompt more than deferring them explicitly.

## Documentation

- [`docs/01-architecture.md`](docs/01-architecture.md) — system layering, data flow
- [`docs/02-folder-structure.md`](docs/02-folder-structure.md) — directory conventions

## Next phases (from the master prompt)

3. Database (extended schema: tags, version history, folders)
4. Design System (full token set, elevation, motion curves)
5. Component Library (dialogs, command palette, context menus)
6. Navigation (routing between workspace views)
7. Editor Engine (CodeMirror 6 integration, search/replace, outline)
8. File Manager (tree view, drag & drop, recent/pinned persistence)
9. Theme Engine · 10. Font System · 11. Settings · 12. Animations
13. AI Layer · 14. Security (vault, Windows Hello) · 15. Plugin SDK
16. Testing · 17. Performance · 18. Packaging · 19. Windows Installer · 20. RC

Say which phase to build next and it'll be scoped and implemented the same way.
