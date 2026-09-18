import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useBookmarksStore } from "@/store/useBookmarksStore";
import { registerPlainTarget, updatePlainActive } from "@/lib/bookmarks";
import type { TextDirection } from "@/types/editor";

interface PlainTextEditorProps {
  content: string;
  direction: TextDirection;
  onChange: (value: string) => void;
  /** Document (tab) this editor belongs to; required for bookmarks. */
  fileId?: string;
  /** When false the editor cannot be edited (e.g. locked documents). */
  editable?: boolean;
}

export function PlainTextEditor({ content, direction, onChange, fileId, editable = true }: PlainTextEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const lastContentRef = useRef(content);
  const { fontSize, fontFamily, lineHeight, letterSpacing, spellCheck } = useSettingsStore((s) => s.editor);

  useEffect(() => {
    lastContentRef.current = content;
  }, [content]);

  useEffect(() => {
    if (!fileId) return;
    registerPlainTarget(fileId, ref.current);
    return () => registerPlainTarget(fileId, null);
  }, [fileId]);

  useEffect(() => {
    if (!fileId) return;
    const el = ref.current;
    if (el) updatePlainActive(fileId, el.value, el.selectionStart ?? 0);
  }, [fileId]);

  const updateActive = () => {
    if (!fileId) return;
    const el = ref.current;
    if (el) updatePlainActive(fileId, el.value, el.selectionStart ?? 0);
  };

  return (
    <textarea
      ref={ref}
      value={content}
      dir={direction}
      readOnly={!editable}
      spellCheck={spellCheck}
      onChange={(e) => {
        const next = e.target.value;
        const prev = lastContentRef.current;
        if (fileId && prev !== next) {
          useBookmarksStore.getState().adjustForPlainEdit(fileId, prev, next);
          lastContentRef.current = next;
        }
        onChange(next);
      }}
      onSelect={updateActive}
      onClick={updateActive}
      onKeyUp={updateActive}
      onFocus={updateActive}
      placeholder="Start writing…"
      style={{
        fontSize: `${fontSize}px`,
        fontFamily,
        lineHeight,
        letterSpacing: `${letterSpacing}px`,
      }}
      className={cn(
        "h-full w-full resize-none bg-transparent px-16 py-10",
        "text-foreground placeholder:text-muted-foreground focus:outline-none",
        direction === "rtl" && "editor-urdu"
      )}
    />
  );
}