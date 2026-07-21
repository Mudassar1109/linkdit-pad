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

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  file: File, edit: Edit3, view: Eye, format: Edit3,
  search: Search, settings: Settings, theme: Palette, help: HelpCircle, ai: Zap,
};

const DEFAULT_COMMANDS: CommandItem[] = [
  { id: "new-file", label: "New File", category: "file", shortcut: "Ctrl+N", action: () => useEditorStore.getState().openTab() },
  { id: "open-file", label: "Open File...", category: "file", shortcut: "Ctrl+O", action: () => {
    (async () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".txt,.md,.html,.rtf";
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const content = await file.text();
          const { openTab, renameTab } = useEditorStore.getState();
          const tabId = openTab({ content, mode: "rich" });
          renameTab(tabId, file.name);
        }
      };
      input.click();
    })();
  } },
  { id: "save", label: "Save", category: "file", shortcut: "Ctrl+S", action: () => {
    const editor = useEditorBridge.getState().editor;
    const activeTab = useEditorStore.getState().tabs[useEditorStore.getState().groups["group-main"]?.activeTabId ?? ""];
    if (!editor || !activeTab) return;
    const blob = new Blob([editor.getHTML()], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTab.meta.title}.html`;
    a.click();
    URL.revokeObjectURL(url);
  } },
  { id: "undo", label: "Undo", category: "edit", shortcut: "Ctrl+Z", action: () => useEditorBridge.getState().editor?.chain().focus().undo().run() },
  { id: "redo", label: "Redo", category: "edit", shortcut: "Ctrl+Y", action: () => useEditorBridge.getState().editor?.chain().focus().redo().run() },
  { id: "bold", label: "Bold", category: "format", shortcut: "Ctrl+B", action: () => useEditorBridge.getState().editor?.chain().focus().toggleBold().run() },
  { id: "italic", label: "Italic", category: "format", shortcut: "Ctrl+I", action: () => useEditorBridge.getState().editor?.chain().focus().toggleItalic().run() },
  { id: "underline", label: "Underline", category: "format", shortcut: "Ctrl+U", action: () => useEditorBridge.getState().editor?.chain().focus().toggleUnderline().run() },
  { id: "find", label: "Find", category: "search", shortcut: "Ctrl+F", action: () => useSearchStore.getState().setIsVisible(true) },
  { id: "replace", label: "Replace", category: "search", shortcut: "Ctrl+H", action: () => { useSearchStore.getState().setIsVisible(true); } },
  { id: "cmd-palette", label: "Command Palette", category: "view", shortcut: "Ctrl+Shift+P", action: () => {} },
  { id: "light-theme", label: "Theme: Light", category: "theme", action: () => useThemeStore.getState().setThemeMode("light") },
  { id: "dark-theme", label: "Theme: Dark", category: "theme", action: () => useThemeStore.getState().setThemeMode("dark") },
  { id: "system-theme", label: "Theme: System", category: "theme", action: () => useThemeStore.getState().setThemeMode("system") },
  { id: "heading-1", label: "Heading 1", category: "format", action: () => useEditorBridge.getState().editor?.chain().focus().toggleHeading({ level: 1 }).run() },
  { id: "heading-2", label: "Heading 2", category: "format", action: () => useEditorBridge.getState().editor?.chain().focus().toggleHeading({ level: 2 }).run() },
  { id: "heading-3", label: "Heading 3", category: "format", action: () => useEditorBridge.getState().editor?.chain().focus().toggleHeading({ level: 3 }).run() },
  { id: "bullet-list", label: "Bullet List", category: "format", action: () => useEditorBridge.getState().editor?.chain().focus().toggleBulletList().run() },
  { id: "ordered-list", label: "Numbered List", category: "format", action: () => useEditorBridge.getState().editor?.chain().focus().toggleOrderedList().run() },
  { id: "task-list", label: "Task List", category: "format", action: () => useEditorBridge.getState().editor?.chain().focus().toggleTaskList().run() },
  { id: "blockquote", label: "Blockquote", category: "format", action: () => useEditorBridge.getState().editor?.chain().focus().toggleBlockquote().run() },
  { id: "code-block", label: "Code Block", category: "format", action: () => useEditorBridge.getState().editor?.chain().focus().toggleCodeBlock().run() },
  { id: "horizontal-rule", label: "Horizontal Rule", category: "insert", action: () => useEditorBridge.getState().editor?.chain().focus().setHorizontalRule().run() },
  { id: "word-count", label: "Word Count", category: "tools", action: () => {
    const editor = useEditorBridge.getState().editor;
    if (editor) {
      const text = editor.state.doc.textContent;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      alert(`Words: ${words}\nCharacters: ${text.length}`);
    }
  }},
  { id: "settings", label: "Open Settings", category: "settings", shortcut: "Ctrl+,", action: () => useSettingsStore.getState().open() },
];

export function CommandPalette() {
  const { isOpen, query, selectedIndex, setIsOpen, setQuery, setSelectedIndex } = useCommandPaletteStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return DEFAULT_COMMANDS;
    const q = query.toLowerCase();
    return DEFAULT_COMMANDS.filter(
      (c) => c.label.toLowerCase().includes(q) || c.category.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    );
  }, [query]);

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
                  placeholder="Type a command or search..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
                <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">ESC</kbd>
              </div>
              <div ref={listRef} className="max-h-[320px] overflow-y-auto p-2">
                {filteredCommands.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Search size={24} className="mb-2 opacity-50" />
                    <p className="text-sm">No commands found</p>
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
