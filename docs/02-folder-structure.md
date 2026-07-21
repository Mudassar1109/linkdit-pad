# LinkDit Pad — Phase 2: Folder Structure

```
linkdit-pad/
├── src/                        # React + TypeScript frontend
│   ├── app/
│   │   ├── main.tsx             # React root
│   │   └── App.tsx              # App shell / layout composition
│   ├── components/
│   │   ├── ui/                  # Design-system primitives (Button, Tooltip, …)
│   │   ├── layout/               # TitleBar, Sidebar, StatusBar
│   │   ├── editor/                # EditorTabs, EditorSurface, RichTextEditor, PlainTextEditor
│   │   └── filemanager/           # (Phase 8) file tree, drag & drop
│   ├── features/
│   │   ├── editor/                # (Phase 7) command palette, search/replace, outline
│   │   ├── theme/                 # (Phase 9) theme engine, accent picker
│   │   └── settings/              # (Phase 11) searchable settings panels
│   ├── store/                    # Zustand stores (useEditorStore, useThemeStore, …)
│   ├── hooks/                    # Shared React hooks
│   ├── lib/                      # Pure utilities + Tauri service wrappers
│   ├── types/                    # Shared TypeScript domain types
│   └── styles/                   # globals.css — design tokens
│
├── src-tauri/                   # Rust backend (Tauri 2)
│   ├── src/
│   │   ├── main.rs               # Binary entry point
│   │   ├── lib.rs                # Plugin registration + command handler
│   │   ├── commands.rs           # IPC command surface
│   │   ├── db.rs                 # SQLite schema + connection management
│   │   └── error.rs              # Unified AppError
│   ├── capabilities/             # Tauri v2 permission manifests
│   ├── icons/
│   ├── Cargo.toml
│   ├── build.rs
│   └── tauri.conf.json
│
├── docs/                        # Architecture + phase documentation
├── public/                      # Static assets served as-is
├── index.html
├── package.json
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
└── vite.config.ts
```

## Conventions

- **Path alias**: `@/*` → `src/*` (configured in `tsconfig.json` and
  `vite.config.ts`).
- **One component per file**, PascalCase filenames matching the
  exported component (`EditorTabs.tsx` exports `EditorTabs`).
- **Types live in `src/types`**, never inline-duplicated across
  components — components and store both import from the same source
  of truth.
- **No direct `invoke()` calls in components.** Once Phase 7/8 add real
  file I/O from the UI, those calls go through `src/lib/services/*`
  wrappers, matching the layering rules in `docs/01-architecture.md`.
- **Rust commands are additive, not accumulative in one file** — as the
  command surface grows (Phase 13 AI layer, Phase 14 security/vault),
  split `commands.rs` into `commands/ai.rs`, `commands/vault.rs`, etc.,
  and re-export from `commands/mod.rs`.
