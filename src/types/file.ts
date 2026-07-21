export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileNode[];
  isExpanded?: boolean;
  isRenaming?: boolean;
}

export interface FileExplorerState {
  root: FileNode | null;
  selectedId: string | null;
  expandedIds: Set<string>;
  clipboard: { action: "copy" | "cut"; node: FileNode } | null;
}
