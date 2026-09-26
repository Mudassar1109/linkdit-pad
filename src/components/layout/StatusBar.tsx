import { motion } from "framer-motion";
import { useActiveTab, useEditorStore } from "@/store/useEditorStore";
import { useEditorBridge } from "@/store/useEditorBridge";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useAutosaveStore } from "@/store/useAutosaveStore";
import { useI18n } from "@/store/useI18nStore";
import { cn } from "@/lib/utils";
import type { EditorMode } from "@/types/editor";

const MODES: { id: EditorMode; labelKey: string }[] = [
  { id: "plain", labelKey: "status.modes.plain" },
  { id: "rich", labelKey: "status.modes.rich" },
  { id: "markdown", labelKey: "status.modes.markdown" },
  { id: "code", labelKey: "status.modes.code" },
];

export function StatusBar() {
  const { t } = useI18n();
  const activeTab = useActiveTab();
  const setMode = useEditorStore((s) => s.setMode);
  const showStatusBar = useSettingsStore((s) => s.appearance.showStatusBar);
  const autoSaveEnabled = useSettingsStore((s) => s.editor.autoSave);
  const autosaveStatus = useAutosaveStore((s) => s.status);
  const autosaveError = useAutosaveStore((s) => s.error);
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

  if (!showStatusBar) return null;

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex h-8 items-center justify-between border-t border-border/80 bg-toolbar px-3 text-[11px] text-muted-foreground shrink-0"
    >
      <div className="flex items-center gap-3">
        <span className="tabular-nums hover:text-foreground cursor-default transition-colors">
          {t("status.lnCol", { line: currentLine, col: Math.max(0, currentCol) })}
        </span>
        <span className="w-px h-3.5 bg-border/60" />
        <span className="tabular-nums">{t("status.words", { count: wordCount })}</span>
        <span className="w-px h-3.5 bg-border/60" />
        <span className="tabular-nums">{t("status.chars", { count: charCount })}</span>
        <span className="w-px h-3.5 bg-border/60" />
        <span className="tabular-nums">{t("status.lines", { count: lineCount })}</span>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-2 py-0.5 transition-colors duration-150",
            !autoSaveEnabled
              ? "border-border/60 bg-muted/40 text-muted-foreground"
              : autosaveStatus === "saving"
                ? "border-warning/40 bg-warning/10 text-warning"
                : autosaveStatus === "error"
                  ? "border-danger/40 bg-danger/10 text-danger"
                  : "border-success/40 bg-success/10 text-success"
          )}
          title={
            autosaveStatus === "error" && autosaveError
              ? t("status.autoSaveFailedHelp", { error: autosaveError })
              : autoSaveEnabled
                ? t("status.autoSaveHelp")
                : t("status.autoSaveDisabledHelp")
          }
        >
          {autoSaveEnabled ? (
            <>
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  autosaveStatus === "saving"
                    ? "bg-warning animate-autosave-pulse shadow-glow-sm"
                    : autosaveStatus === "error"
                      ? "bg-danger"
                      : "bg-success shadow-glow-sm"
                )}
              />
              {autosaveStatus === "saving"
                ? t("status.saving")
                : autosaveStatus === "saved"
                  ? t("status.saved")
                  : autosaveStatus === "error"
                    ? t("status.autoSaveFailed")
                    : t("status.autoSave")}
            </>
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
              {t("status.autoSaveOff")}
            </>
          )}
        </span>
        {activeTab?.meta.isDirty && (
          <span className="flex items-center gap-1 text-warning">
            <span className="h-1.5 w-1.5 rounded-full bg-warning animate-autosave-pulse" />
            {t("common.unsaved")}
          </span>
        )}
        {activeTab?.meta.filePath && !activeTab.meta.isDirty && (
          <span className="flex items-center gap-1 text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            {t("common.saved")}
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
              <option key={m.id} value={m.id}>{t(m.labelKey)}</option>
            ))}
          </select>
        )}
      </div>
    </motion.div>
  );
}