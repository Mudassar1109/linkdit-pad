import { create } from "zustand";

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  category: "file" | "edit" | "view" | "format" | "search" | "ai" | "settings" | "theme" | "help" | "insert" | "tools";
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteState {
  isOpen: boolean;
  query: string;
  commands: CommandItem[];
  selectedIndex: number;

  setIsOpen: (isOpen: boolean) => void;
  toggle: () => void;
  setQuery: (query: string) => void;
  setCommands: (commands: CommandItem[]) => void;
  setSelectedIndex: (index: number) => void;
  registerCommands: (commands: CommandItem[]) => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  isOpen: false,
  query: "",
  commands: [],
  selectedIndex: 0,

  setIsOpen: (isOpen) => set({ isOpen, query: "", selectedIndex: 0 }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen, query: "", selectedIndex: 0 })),
  setQuery: (query) => set({ query, selectedIndex: 0 }),
  setCommands: (commands) => set({ commands }),
  setSelectedIndex: (index) => set({ selectedIndex: index }),
  registerCommands: (commands) => set((s) => {
    const existingIds = new Set(s.commands.map((c) => c.id));
    const newCmds = commands.filter((c) => !existingIds.has(c.id));
    return { commands: [...s.commands, ...newCmds] };
  }),
}));
