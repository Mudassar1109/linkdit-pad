import { create } from "zustand";
import type { FileNode } from "@/types/file";
import { generateId } from "@/lib/utils";

interface FileExplorerState {
  root: FileNode | null;
  selectedId: string | null;
  expandedIds: Set<string>;
  clipboard: { action: "copy" | "cut"; node: FileNode } | null;

  setRoot: (root: FileNode) => void;
  selectNode: (id: string | null) => void;
  toggleExpand: (id: string) => void;
  addNode: (parentId: string, type: "file" | "folder") => void;
  removeNode: (id: string) => void;
  renameNode: (id: string, name: string) => void;
  duplicateNode: (id: string) => void;
  setClipboard: (clipboard: { action: "copy" | "cut"; node: FileNode } | null) => void;
  pasteNode: (parentId: string) => void;
  moveNode: (id: string, targetParentId: string) => void;
}

function findNode(root: FileNode | null, id: string): FileNode | null {
  if (!root) return null;
  if (root.id === id) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return null;
}

function removeFromTree(root: FileNode | null, id: string): FileNode | null {
  if (!root) return null;
  if (root.id === id) return undefined as unknown as FileNode;
  if (root.children) {
    return { ...root, children: root.children.filter((c) => c.id !== id).map((c) => removeFromTree(c, id)).filter(Boolean) as FileNode[] };
  }
  return root;
}

function addToTree(root: FileNode | null, parentId: string, newNode: FileNode): FileNode | null {
  if (!root) return null;
  if (root.id === parentId) {
    return { ...root, children: [...(root.children || []), newNode] };
  }
  if (root.children) {
    return { ...root, children: root.children.map((c) => addToTree(c, parentId, newNode) || c) };
  }
  return root;
}

function replaceNode(root: FileNode | null, id: string, updater: (node: FileNode) => FileNode): FileNode | null {
  if (!root) return null;
  if (root.id === id) return updater(root);
  if (root.children) {
    return { ...root, children: root.children.map((c) => replaceNode(c, id, updater) || c) };
  }
  return root;
}

export const useFileExplorerStore = create<FileExplorerState>((set) => ({
  root: null,
  selectedId: null,
  expandedIds: new Set(),
  clipboard: null,

  setRoot: (root) => set({ root }),

  selectNode: (id) => set({ selectedId: id }),

  toggleExpand: (id) => set((s) => {
    const expandedIds = new Set(s.expandedIds);
    if (expandedIds.has(id)) expandedIds.delete(id);
    else expandedIds.add(id);
    return { expandedIds };
  }),

  addNode: (parentId, type) => set((s) => {
    const name = type === "folder" ? "New Folder" : "Untitled.txt";
    const newNode: FileNode = { id: generateId(), name, path: "", type, children: type === "folder" ? [] : undefined };
    const root = addToTree(s.root, parentId, newNode);
    if (!root) return s;
    const expandedIds = new Set(s.expandedIds);
    expandedIds.add(parentId);
    return { root, expandedIds, selectedId: newNode.id };
  }),

  removeNode: (id) => set((s) => {
    const root = removeFromTree(s.root, id);
    if (!root) return s;
    return { root, selectedId: s.selectedId === id ? null : s.selectedId };
  }),

  renameNode: (id, name) => set((s) => {
    const root = replaceNode(s.root, id, (n) => ({ ...n, name }));
    if (!root) return s;
    return { root };
  }),

  duplicateNode: (id) => set((s) => {
    const node = findNode(s.root, id);
    if (!node) return s;
    if (!s.root) return s;
    function findParent(root: FileNode | null, targetId: string, currentParentId?: string): string | undefined {
      if (!root) return undefined;
      if (root.id === targetId) return currentParentId;
      if (root.children) {
        for (const child of root.children) {
          const found = findParent(child, targetId, root.id);
          if (found) return found;
        }
      }
      return undefined;
    }
    const pid = findParent(s.root, id);
    if (!pid) return s;
    const dup: FileNode = { ...node, id: generateId(), name: `${node.name} (copy)` };
    const root = addToTree(s.root, pid, dup);
    if (!root) return s;
    return { root };
  }),

  setClipboard: (clipboard) => set({ clipboard }),

  pasteNode: (parentId) => set((s) => {
    if (!s.clipboard) return s;
    const newNode: FileNode = { ...s.clipboard.node, id: generateId(), name: s.clipboard.node.name };
    const root = addToTree(s.root, parentId, newNode);
    if (!root) return s;
    const expandedIds = new Set(s.expandedIds);
    expandedIds.add(parentId);
    if (s.clipboard.action === "cut") {
      const rootAfterCut = removeFromTree(root, s.clipboard.node.id);
      return { root: rootAfterCut, clipboard: null, expandedIds };
    }
    return { root, clipboard: null, expandedIds };
  }),

  moveNode: (id, targetParentId) => set((s) => {
    const node = findNode(s.root, id);
    if (!node) return s;
    const rootAfterRemove = removeFromTree(s.root, id);
    if (!rootAfterRemove) return s;
    const root = addToTree(rootAfterRemove, targetParentId, node);
    if (!root) return s;
    const expandedIds = new Set(s.expandedIds);
    expandedIds.add(targetParentId);
    return { root, expandedIds };
  }),
}));
