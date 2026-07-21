import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Folder, FolderOpen, FileText, FileCode, FileJson,
  ChevronRight, ChevronDown, Trash2,
  Copy, Scissors, Clipboard, Edit3,
  FilePlus, FolderPlus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent,
  ContextMenuItem, ContextMenuSeparator
} from "@/components/ui/context-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFileExplorerStore } from "@/store/useFileExplorerStore";
import type { FileNode } from "@/types/file";

function getFileIcon(node: FileNode, isExpanded: boolean) {
  if (node.type === "folder") {
    return isExpanded ? <FolderOpen size={16} className="text-amber-500" /> : <Folder size={16} className="text-amber-400" />;
  }
  const ext = node.name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx": return <FileCode size={16} className="text-blue-400" />;
    case "js":
    case "jsx": return <FileCode size={16} className="text-yellow-400" />;
    case "json": return <FileJson size={16} className="text-green-400" />;
    case "md": return <FileText size={16} className="text-purple-400" />;
    default: return <FileText size={16} className="text-muted-foreground" />;
  }
}

function FileTreeItem({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const { selectedId, expandedIds, selectNode, toggleExpand, renameNode, removeNode, duplicateNode, setClipboard } = useFileExplorerStore();
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.name);
  const isSelected = selectedId === node.id;
  const isExpanded = expandedIds.has(node.id);
  const isFolder = node.type === "folder";

  const handleDoubleClick = useCallback(() => {
    if (isFolder) {
      toggleExpand(node.id);
    } else {
      selectNode(node.id);
    }
  }, [isFolder, node.id, toggleExpand, selectNode]);

  const handleRename = useCallback(() => {
    if (renameValue.trim() && renameValue !== node.name) {
      renameNode(node.id, renameValue.trim());
    }
    setIsRenaming(false);
  }, [renameValue, node.name, node.id, renameNode]);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", node.id);
    e.dataTransfer.effectAllowed = "move";
  }, [node.id]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain");
    if (draggedId && isFolder) {
      useFileExplorerStore.getState().moveNode(draggedId, node.id);
    }
  }, [node.id, isFolder]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          draggable
          onDragStart={handleDragStart}
          onDrop={isFolder ? handleDrop : undefined}
          onDragOver={isFolder ? handleDragOver : undefined}
          onClick={() => selectNode(node.id)}
          onDoubleClick={handleDoubleClick}
          className={cn(
            "group flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-sm",
            "transition-colors hover:bg-muted/60",
            isSelected && "bg-muted text-foreground"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {isFolder && (
            <span
              onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
              className="flex h-4 w-4 items-center justify-center rounded hover:bg-muted"
            >
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
          )}
          {!isFolder && <span className="w-4" />}
          {getFileIcon(node, isExpanded)}
          {isRenaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setIsRenaming(false); }}
              className="flex-1 bg-muted px-1 rounded text-sm outline-none ring-1 ring-primary"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="truncate flex-1">{node.name}</span>
          )}

          <div className="hidden group-hover:flex items-center gap-0.5">
            {isFolder && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); useFileExplorerStore.getState().addNode(node.id, "file"); }}>
                    <FilePlus size={12} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">New File</TooltipContent>
              </Tooltip>
            )}
            {isFolder && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); useFileExplorerStore.getState().addNode(node.id, "folder"); }}>
                    <FolderPlus size={12} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">New Folder</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </ContextMenuTrigger>

      <AnimatePresence>
        {isFolder && isExpanded && node.children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {node.children.map((child) => (
              <FileTreeItem key={child.id} node={child} depth={depth + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <ContextMenuContent className="min-w-[180px]">
        {isFolder && (
          <>
            <ContextMenuItem onClick={() => useFileExplorerStore.getState().addNode(node.id, "file")}>
              <FilePlus size={14} /> New File
            </ContextMenuItem>
            <ContextMenuItem onClick={() => useFileExplorerStore.getState().addNode(node.id, "folder")}>
              <FolderPlus size={14} /> New Folder
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuItem onClick={() => { setIsRenaming(true); setRenameValue(node.name); }}>
          <Edit3 size={14} /> Rename
        </ContextMenuItem>
        <ContextMenuItem onClick={() => duplicateNode(node.id)}>
          <Copy size={14} /> Duplicate
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => setClipboard({ action: "copy", node })}>
          <Copy size={14} /> Copy
        </ContextMenuItem>
        <ContextMenuItem onClick={() => setClipboard({ action: "cut", node })}>
          <Scissors size={14} /> Cut
        </ContextMenuItem>
        <ContextMenuItem onClick={() => {
          const clipboard = useFileExplorerStore.getState().clipboard;
          if (clipboard) useFileExplorerStore.getState().pasteNode(node.id);
        }}>
          <Clipboard size={14} /> Paste
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => removeNode(node.id)} className="text-danger">
          <Trash2 size={14} /> Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

const DEMO_TREE: FileNode = {
  id: "root",
  name: "Workspace",
  path: "",
  type: "folder",
  isExpanded: true,
  children: [
    {
      id: "src",
      name: "src",
      path: "/src",
      type: "folder",
      isExpanded: true,
      children: [
        { id: "app.tsx", name: "app.tsx", path: "/src/app.tsx", type: "file" },
        { id: "main.tsx", name: "main.tsx", path: "/src/main.tsx", type: "file" },
        { id: "styles", name: "styles", path: "/src/styles", type: "folder", children: [
          { id: "globals.css", name: "globals.css", path: "/src/styles/globals.css", type: "file" },
        ]},
      ],
    },
    {
      id: "docs",
      name: "docs",
      path: "/docs",
      type: "folder",
      children: [
        { id: "readme.md", name: "readme.md", path: "/docs/readme.md", type: "file" },
      ],
    },
    { id: "index.html", name: "index.html", path: "/index.html", type: "file" },
    { id: "package.json", name: "package.json", path: "/package.json", type: "file" },
  ],
};

export function FileExplorer() {
  const root = useFileExplorerStore((s) => s.root);
  const setRoot = useFileExplorerStore((s) => s.setRoot);

  if (!root) {
    setRoot(DEMO_TREE);
    return null;
  }

  return (
    <ScrollArea className="h-full">
      <div className="py-1 px-1">
        <FileTreeItem node={root} depth={0} />
      </div>
    </ScrollArea>
  );
}
