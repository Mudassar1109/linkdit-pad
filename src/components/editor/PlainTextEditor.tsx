import { useRef } from "react";
import { cn } from "@/lib/utils";
import type { TextDirection } from "@/types/editor";

interface PlainTextEditorProps {
  content: string;
  direction: TextDirection;
  onChange: (value: string) => void;
}

/** Plain text / Markdown surface — instant startup, no formatting overhead. */
export function PlainTextEditor({ content, direction, onChange }: PlainTextEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  return (
    <textarea
      ref={ref}
      value={content}
      dir={direction}
      spellCheck
      onChange={(e) => onChange(e.target.value)}
      placeholder="Start writing…"
      className={cn(
        "h-full w-full resize-none bg-transparent px-16 py-10 font-editor text-[1rem] leading-[1.75]",
        "text-foreground placeholder:text-muted-foreground focus:outline-none",
        direction === "rtl" && "editor-urdu"
      )}
    />
  );
}
