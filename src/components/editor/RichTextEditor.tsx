import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import TextStyle from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import Color from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Focus from "@tiptap/extension-focus";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useEditorBridge } from "@/store/useEditorBridge";
import { useSettingsStore } from "@/store/useSettingsStore";
import { FontSize } from "@/extensions/FontSize";
import { Bookmarks } from "@/extensions/Bookmarks";
import type { TextDirection } from "@/types/editor";

interface RichTextEditorProps {
  content: string;
  direction: TextDirection;
  onChange: (html: string) => void;
  /** Document (tab) this editor belongs to; required for bookmarks. */
  fileId?: string;
  /** When false the editor cannot be edited (e.g. locked documents). */
  editable?: boolean;
  /** When true this editor registers itself in the global editor bridge. */
  registerInBridge?: boolean;
}

export function RichTextEditor({ content, direction, onChange, fileId, editable = true, registerInBridge = true }: RichTextEditorProps) {
  const setEditor = useEditorBridge((s) => s.setEditor);
  const bumpVersion = useEditorBridge((s) => s.bumpVersion);
  const contentRef = useRef("");
  const internalChange = useRef(false);
  const { fontSize, fontFamily, lineHeight, letterSpacing, spellCheck } = useSettingsStore((s) => s.editor);

  const ensureContent = (html: string) => {
    const trimmed = html.trim();
    if (!trimmed) return "<p></p>";
    if (trimmed.endsWith("</table>")) return trimmed + "<p></p>";
    const lastTag = trimmed.match(/<\/(\w+)>\s*$/);
    if (lastTag && ["table", "blockquote", "ul", "ol", "div"].includes(lastTag[1])) {
      return trimmed + "<p></p>";
    }
    return html;
  };

  const editor = useEditor({
    content: ensureContent(content),
    editable,
    extensions: [
      StarterKit.configure({
        history: { depth: 100 },
      }),
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      Color.configure({ types: ["textStyle"] }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Start writing…" }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: { class: "text-primary underline cursor-pointer" },
      }),
      Image.configure({ allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      Subscript,
      Superscript,
      Focus.configure({ className: "has-focus" }),
      ...(fileId ? [Bookmarks.configure({ fileId })] : []),
    ],
    onUpdate: ({ editor }) => {
      internalChange.current = true;
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-neutral dark:prose-invert max-w-none",
          "min-h-full px-8 py-10",
          direction === "rtl" && "editor-urdu"
        ),
        dir: direction,
        spellcheck: String(spellCheck),
        style: `font-size: ${fontSize}px; font-family: ${fontFamily}; line-height: ${lineHeight}; letter-spacing: ${letterSpacing}px;`,
      },
    },
  });

  useEffect(() => {
    if (!registerInBridge) return;
    setEditor(editor ?? null);
    return () => setEditor(null);
  }, [editor, setEditor, registerInBridge]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  useEffect(() => {
    if (!editor) return;
    const handler = () => bumpVersion();
    editor.on("selectionUpdate", handler);
    editor.on("update", handler);
    return () => {
      editor.off("selectionUpdate", handler);
      editor.off("update", handler);
    };
  }, [editor, bumpVersion]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (internalChange.current) {
      internalChange.current = false;
      return;
    }
    if (contentRef.current === content) return;
    contentRef.current = content;
    editor.commands.setContent(ensureContent(content), false);
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="editor-container h-full overflow-y-auto">
      <EditorContent editor={editor} />
    </div>
  );
}
