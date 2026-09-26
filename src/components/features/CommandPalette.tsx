import { useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, File, Settings, Palette, Edit3, HelpCircle, Zap, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCommandPaletteStore, type CommandItem } from "@/store/useCommandPaletteStore";
import { useEditorStore } from "@/store/useEditorStore";
import { useEditorBridge } from "@/store/useEditorBridge";
import { useThemeStore } from "@/store/useThemeStore";
import { useSearchStore } from "@/store/useSearchStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useI18n, useI18nStore } from "@/store/useI18nStore";
import { openFile, openFileAtPath, saveFile } from "@/components/layout/Toolbar";
import { isLdpPath, openLdpPath } from "@/lib/ldpOpen";
import { getOpenFilters } from "@/lib/fileFormats";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  file: File, edit: Edit3, view: Eye, format: Edit3,
  search: Search, settings: Settings, theme: Palette, help: HelpCircle, ai: Zap,
};

const DEFAULT_COMMANDS: (CommandItem & { labelKey?: string })[] = [
  { id: "new-file", label: "New File", labelKey: "commands.newFile", category: "file", shortcut: "Ctrl+N", action: () => useEditorStore.getState().openTab() },
  { id: "open-file", label: "Open File...", labelKey: "commands.openFile", category: "file", shortcut: "Ctrl+O", action: () => {
    void (async () => {
      try {
        const { open: showOpen } = await import("@tauri-apps/plugin-dialog");
        const file = await showOpen({ multiple: false, filters: getOpenFilters() });
        if (!file) return;
        const path = file as string;
        if (isLdpPath(path)) {
          await openLdpPath(path);
        } else {
          await openFileAtPath(path);
        }
      } catch {
        openFile();
      }
    })();
  } },
  { id: "save", label: "Save", labelKey: "commands.save", category: "file", shortcut: "Ctrl+S", action: () => { void saveFile(); } },
  { id: "undo", label: "Undo", labelKey: "commands.undo", category: "edit", shortcut: "Ctrl+Z", action: () => useEditorBridge.getState().editor?.chain().focus().undo().run() },
  { id: "redo", label: "Redo", labelKey: "commands.redo", category: "edit", shortcut: "Ctrl+Y", action: () => useEditorBridge.getState().editor?.chain().focus().redo().run() },
  { id: "bold", label: "Bold", labelKey: "commands.bold", category: "format", shortcut: "Ctrl+B", action: () => useEditorBridge.getState().editor?.chain().focus().toggleBold().run() },
  { id: "italic", label: "Italic", labelKey: "commands.italic", category: "format", shortcut: "Ctrl+I", action: () => useEditorBridge.getState().editor?.chain().focus().toggleItalic().run() },
  { id: "underline", label: "Underline", labelKey: "commands.underline", category: "format", shortcut: "Ctrl+U", action: () => useEditorBridge.getState().editor?.chain().focus().toggleUnderline().run() },
  { id: "find", label: "Find", labelKey: "commands.find", category: "search", shortcut: "Ctrl+F", action: () => useSearchStore.getState().setIsVisible(true) },
  { id: "replace", label: "Replace", labelKey: "commands.replace", category: "search", shortcut: "Ctrl+H", action: () => { useSearchStore.getState().setIsVisible(true); } },
  { id: "cmd-palette", label: "Command Palette", labelKey: "commands.commandPalette", category: "view", shortcut: "Ctrl+Shift+P", action: () => {} },
  { id: "light-theme", label: "Theme: Light", labelKey: "commands.themeLight", category: "theme", action: () => useThemeStore.getState().setThemeMode("light") },
  { id: "dark-theme", label: "Theme: Dark", labelKey: "commands.themeDark", category: "theme", action: () => useThemeStore.getState().setThemeMode("dark") },
  { id: "system-theme", label: "Theme: System", labelKey: "commands.themeSystem", category: "theme", action: () => useThemeStore.getState().setThemeMode("system") },
  { id: "heading-1", label: "Heading 1", labelKey: "commands.heading1", category: "format", action: () => useEditorBridge.getState().editor?.chain().focus().toggleHeading({ level: 1 }).run() },
  { id: "heading-2", label: "Heading 2", labelKey: "commands.heading2", category: "format", action: () => useEditorBridge.getState().editor?.chain().focus().toggleHeading({ level: 2 }).run() },
  { id: "heading-3", label: "Heading 3", labelKey: "commands.heading3", category: "format", action: () => useEditorBridge.getState().editor?.chain().focus().toggleHeading({ level: 3 }).run() },
  { id: "bullet-list", label: "Bullet List", labelKey: "commands.bulletList", category: "format", action: () => useEditorBridge.getState().editor?.chain().focus().toggleBulletList().run() },
  { id: "ordered-list", label: "Numbered List", labelKey: "commands.orderedList", category: "format", action: () => useEditorBridge.getState().editor?.chain().focus().toggleOrderedList().run() },
  { id: "task-list", label: "Task List", labelKey: "commands.taskList", category: "format", action: () => useEditorBridge.getState().editor?.chain().focus().toggleTaskList().run() },
  { id: "blockquote", label: "Blockquote", labelKey: "commands.blockquote", category: "format", action: () => useEditorBridge.getState().editor?.chain().focus().toggleBlockquote().run() },
  { id: "code-block", label: "Code Block", labelKey: "commands.codeBlock", category: "format", action: () => useEditorBridge.getState().editor?.chain().focus().toggleCodeBlock().run() },
  { id: "horizontal-rule", label: "Horizontal Rule", labelKey: "commands.horizontalRule", category: "insert", action: () => useEditorBridge.getState().editor?.chain().focus().setHorizontalRule().run() },
  { id: "word-count", label: "Word Count", labelKey: "commands.wordCount", category: "tools", action: () => {
    const editor = useEditorBridge.getState().editor;
    if (editor) {
      const text = editor.state.doc.textContent;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      alert(useI18nStore.getState().t("menu.wordsChars", { words, chars: text.length }));
    }
  }},
  { id: "settings", label: "Open Settings", labelKey: "commands.openSettings", category: "settings", shortcut: "Ctrl+,", action: () => useSettingsStore.getState().open() },
];

export function CommandPalette() {
  const { t } = useI18n();
  const { isOpen, query, selectedIndex, setIsOpen, setQuery, setSelectedIndex } = useCommandPaletteStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredCommands = useMemo(() => {
    const commands = DEFAULT_COMMANDS.map((c) => ({
      ...c,
      label: c.labelKey ? t(c.labelKey) : c.label,
    }));
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (c) => c.label.toLowerCase().includes(q) || c.category.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    );
  }, [query, t]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  const execute = useCallback((cmd: CommandItem) => {
    cmd.action();
    setIsOpen(false);
  }, [setIsOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setIsOpen(false); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex(Math.min(selectedIndex + 1, filteredCommands.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex(Math.max(selectedIndex - 1, 0)); }
      if (e.key === "Enter" && filteredCommands[selectedIndex]) { e.preventDefault(); execute(filteredCommands[selectedIndex]); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, execute, setIsOpen, setSelectedIndex]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <motion.div initial={{ opacity: 0, y: -20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }} transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed left-[50%] top-[15%] z-50 w-full max-w-[560px] translate-x-[-50%]">
            <div className="rounded-xl border border-border bg-card shadow-panel backdrop-blur-xl overflow-hidden">
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <Search size={18} className="text-muted-foreground shrink-0" />
                <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("commands.placeholder")}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
                <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">ESC</kbd>
              </div>
              <div ref={listRef} className="max-h-[320px] overflow-y-auto p-2">
                {filteredCommands.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Search size={24} className="mb-2 opacity-50" />
                    <p className="text-sm">{t("commands.noCommands")}</p>
                  </div>
                ) : (
                  filteredCommands.map((cmd, idx) => {
                    const Icon = CATEGORY_ICONS[cmd.category] || Search;
                    return (
                      <button key={cmd.id} onClick={() => execute(cmd)}
                        className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          idx === selectedIndex ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50")}>
                        <Icon size={16} className="shrink-0" />
                        <span className="flex-1 text-left">{cmd.label}</span>
                        {cmd.shortcut && <kbd className="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{cmd.shortcut}</kbd>}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
