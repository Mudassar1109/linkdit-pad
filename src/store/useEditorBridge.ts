import { create } from "zustand";
import type { Editor } from "@tiptap/react";

interface EditorBridgeState {
  editor: Editor | null;
  version: number;
  setEditor: (editor: Editor | null) => void;
  bumpVersion: () => void;
  isActive: (name: string, attrs?: Record<string, string | boolean>) => boolean;
}

export const useEditorBridge = create<EditorBridgeState>((set, get) => ({
  editor: null,
  version: 0,
  setEditor: (editor) => set({ editor }),
  bumpVersion: () => set((s) => ({ version: s.version + 1 })),
  isActive: (name, attrs) => {
    const ed = get().editor;
    if (!ed) return false;
    try {
      return ed.isActive(name, attrs);
    } catch {
      return false;
    }
  },
}));
