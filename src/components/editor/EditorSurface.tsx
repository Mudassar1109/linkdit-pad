import { useMemo } from "react";
import { FileEdit } from "lucide-react";
import { useActiveTab, useEditorStore } from "@/store/useEditorStore";
import { RichTextEditor } from "./RichTextEditor";
import { PlainTextEditor } from "./PlainTextEditor";
import { Button } from "@/components/ui/button";

export function EditorSurface() {
  const activeTab = useActiveTab();
  const updateContent = useEditorStore((s) => s.updateContent);
  const openTab = useEditorStore((s) => s.openTab);

  const onChange = useMemo(() => {
    if (!activeTab) return () => {};
    return (value: string) => updateContent(activeTab.meta.id, value);
  }, [activeTab?.meta.id, updateContent]);

  if (!activeTab) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <FileEdit size={40} strokeWidth={1.5} />
        <p className="text-sm">No document open</p>
        <Button size="sm" onClick={() => openTab()}>
          New document
        </Button>
      </div>
    );
  }

  const isRichEditor = (
    (activeTab.mode !== "plain" && activeTab.mode !== "code") ||
    /<[a-z][\s\S]*>/i.test(activeTab.content)
  );

  return (
    <div className="flex-1 min-h-0">
      {isRichEditor ? (
        <RichTextEditor
          content={activeTab.content}
          direction={activeTab.meta.direction}
          onChange={onChange}
          key={activeTab.meta.id}
        />
      ) : (
        <PlainTextEditor
          content={activeTab.content}
          direction={activeTab.meta.direction}
          onChange={onChange}
        />
      )}
    </div>
  );
}
