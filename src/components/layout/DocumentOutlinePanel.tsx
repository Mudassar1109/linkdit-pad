import { useMemo } from "react";
import { motion } from "framer-motion";
import { ListTree, X, Heading1, Heading2, Heading3, Heading4, Heading5, Heading6 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorStore, getFocusedPaneTabId } from "@/store/useEditorStore";
import { useEditorBridge } from "@/store/useEditorBridge";
import { useOutlineStore } from "@/store/useOutlineStore";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/store/useI18nStore";

interface OutlineNode {
  level: number;
  text: string;
  children: OutlineNode[];
}

const HEADING_ICONS: Record<number, React.ElementType> = {
  1: Heading1,
  2: Heading2,
  3: Heading3,
  4: Heading4,
  5: Heading5,
  6: Heading6,
};

function extractHeadings(html: string): OutlineNode[] {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const flat: { level: number; text: string }[] = [];
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        const tag = el.tagName.toLowerCase();
        if (/^h[1-6]$/.test(tag)) {
          const text = (el.textContent ?? "").trim();
          if (text) flat.push({ level: Number(tag[1]), text });
          continue;
        }
      }
      if ((child as ChildNode).childNodes?.length) walk(child);
    }
  };
  walk(parsed.body);
  const roots: OutlineNode[] = [];
  const stack: OutlineNode[] = [];
  for (const item of flat) {
    const node: OutlineNode = { level: item.level, text: item.text, children: [] };
    while (stack.length && stack[stack.length - 1].level >= node.level) stack.pop();
    if (stack.length) stack[stack.length - 1].children.push(node);
    else roots.push(node);
    stack.push(node);
  }
  return roots;
}

function Row({ node, depth }: { node: OutlineNode; depth: number }) {
  const editor = useEditorBridge((s) => s.editor);
  const Icon = HEADING_ICONS[node.level] ?? Heading1;

  const jump = () => {
    if (!editor) return;
    let pos: number | null = null;
    editor.state.doc.forEach((docNode, offset) => {
      if (pos !== null) return;
      if (
        docNode.type.name === "heading" &&
        docNode.attrs.level === node.level &&
        docNode.textContent.trim() === node.text
      ) {
        pos = offset + 1;
      }
    });
    if (pos !== null) {
      editor.chain().focus().setTextSelection(pos).scrollIntoView().run();
    }
  };

  return (
    <div>
      <button
        onClick={jump}
        title={node.text}
        className={cn(
          "group flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm text-foreground/90 transition-all duration-150",
          "hover:bg-primary/10 hover:text-primary hover:shadow-glow-sm"
        )}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <Icon size={12} className="shrink-0 text-muted-foreground/60" />
        <span className="min-w-0 truncate">{node.text}</span>
      </button>
      {node.children.map((child, i) => (
        <Row key={i} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function DocumentOutlinePanel() {
  const { t } = useI18n();
  const close = useOutlineStore((s) => s.close);
  const tabs = useEditorStore((s) => s.tabs);
  const splitMode = useEditorStore((s) => s.splitMode);
  const activePane = useEditorStore((s) => s.activePane);
  const secondaryTabId = useEditorStore((s) => s.secondaryTabId);
  const groupActiveId = useEditorStore((s) => s.groups[s.activeGroupId]?.activeTabId);
  const activeGroupId = useEditorStore((s) => s.activeGroupId);

  const focusedTabId = useMemo(() => {
    const state = useEditorStore.getState();
    return getFocusedPaneTabId(state);
  }, [tabs, splitMode, activePane, secondaryTabId, groupActiveId, activeGroupId]);

  const tab = focusedTabId ? tabs[focusedTabId] : undefined;
  const headings = useMemo(
    () => (tab ? extractHeadings(tab.content) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab?.content, splitMode, activePane]
  );

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 240, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.18, ease: "easeInOut" }}
      className="flex h-full shrink-0 flex-col border-l border-border bg-surface"
      aria-label={t("menu.documentOutline")}
    >
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border/70 px-3">
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted/60 text-primary">
            <ListTree size={13} />
          </span>
          {t("menu.documentOutline")}
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("common.close")}
          title={t("common.close")}
          onClick={close}
          className="h-6 w-6"
        >
          <X size={12} />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {!tab ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-muted-foreground">
            <ListTree size={32} strokeWidth={1.5} />
            <p className="text-sm">{t("editor.empty.noDocumentOpen")}</p>
          </div>
        ) : headings.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-muted-foreground">
            <Heading1 size={28} strokeWidth={1.5} />
            <p className="text-sm">{t("panels.outline.empty")}</p>
            <p className="text-xs text-muted-foreground/70">
              {t("panels.outline.hint")}
            </p>
          </div>
        ) : (
          <div className="px-1">
            {headings.map((node, i) => (
              <Row key={i} node={node} depth={0} />
            ))}
          </div>
        )}
      </div>
    </motion.aside>
  );
}