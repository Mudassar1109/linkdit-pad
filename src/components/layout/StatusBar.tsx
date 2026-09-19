import { motion } from "framer-motion";
import { useActiveTab, useEditorStore } from "@/store/useEditorStore";
import { useEditorBridge } from "@/store/useEditorBridge";
import { useSettingsStore } from "@/store/useSettingsStore";
import { cn } from "@/lib/utils";
import type { EditorMode } from "@/types/editor";

const MODES: { id: EditorMode; label: string }[] = [
  { id: "plain", label: "Plain Text" },
  { id: "rich", label: "Rich Text" },
  { id: "markdown", label: "Markdown" },
  { id: "code", label: "Code" },
];

export function StatusBar() {
  const activeTab = useActiveTab();
  const tabs = useEditorStore((s) => s.tabs);
  const setMode = useEditorStore((s) => s.setMode);
  const showStatusBar = useSettingsStore((s) => s.appearance.showStatusBar);
  const editor = useEditorBridge((s) => s.editor);
  useEditorBridge((s) => s.version);

  let currentLine = 1;
  let currentCol = 0;
  let wordCount = 0;
  let charCount = 0;
  let lineCount = 1;

  if (editor) {
    const { from } = editor.state.selection;
    const doc = editor.state.doc;
    const text = doc.textContent;
    const pos = from;
    const beforeCursor = text.substring(0, pos);
    currentLine = (beforeCursor.match(/\n/g) || []).length + 1;
    currentCol = pos - beforeCursor.lastIndexOf("\n") - 1;
    wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    charCount = text.length;
    lineCount = (text.match(/\n/g) || []).length + 1;
  } else if (activeTab) {
    const content = activeTab.content;
    const cursorPos = activeTab.cursorPosition;
    const beforeCursor = content.substring(0, cursorPos);
    currentLine = (beforeCursor.match(/\n/g) || []).length + 1;
    currentCol = cursorPos - content.lastIndexOf("\n", cursorPos - 1) - 1;
    wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    charCount = content.length;
    lineCount = (content.match(/\n/g) || []).length + 1;
  }

  const pendingAutosave = Object.values(tabs).some((t) => t.meta.isDirty && t.meta.filePath);

  if (!showStatusBar) return null;

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex h-8 items-center justify-between border-t border-border/80 bg-card/60 px-3 text-[11px] text-muted-foreground shrink-0"
    >
      <div className="flex items-center gap-3">
        <span className="tabular-nums hover:text-foreground cursor-default transition-colors">
          Ln {currentLine}, Col {Math.max(0, currentCol)}
        </span>
        <span className="w-px h-3.5 bg-border/60" />
        <span className="tabular-nums">{wordCount} words</span>
        <span className="w-px h-3.5 bg-border/60" />
        <span className="tabular-nums">{charCount} chars</span>
        <span className="w-px h-3.5 bg-border/60" />
        <span className="tabular-nums">{lineCount} lines</span>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2 py-0.5 transition-colors duration-150",
            pendingAutosave
              ? "border-warning/40 bg-warning/10 text-warning"
              : "border-success/40 bg-success/10 text-success"
          )}
          title={pendingAutosave ? "Auto Save pending..." : "Auto Save enabled"}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              pendingAutosave
                ? "bg-warning animate-autosave-pulse shadow-glow-sm"
                : "bg-success shadow-glow-sm"
            )}
          />
          Auto Save
        </span>
        {activeTab?.meta.isDirty && (
          <span className="flex items-center gap-1 text-warning">
            <span className="h-1.5 w-1.5 rounded-full bg-warning animate-autosave-pulse" />
            Unsaved
          </span>
        )}
        {activeTab?.meta.filePath && !activeTab.meta.isDirty && (
          <span className="flex items-center gap-1 text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Saved
          </span>
        )}
        <span className="w-px h-3.5 bg-border/60" />
        <span>UTF-8</span>
        <span className="w-px h-3.5 bg-border/60" />
        <span>CRLF</span>
        <span className="w-px h-3.5 bg-border/60" />
        {activeTab && (
          <select
            value={activeTab.mode}
            onChange={(e) => setMode(activeTab.meta.id, e.target.value as EditorMode)}
            className="rounded-md bg-transparent px-1 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            {MODES.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        )}
      </div>
    </motion.div>
  );
}