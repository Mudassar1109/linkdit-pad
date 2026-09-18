import { create } from "zustand";

interface ConfirmState {
  isOpen: boolean;
  message: string;
  tabId: string | null;
  resolve: ((action: "save" | "discard" | "cancel") => void) | null;
  show: (message: string, tabId?: string) => Promise<"save" | "discard" | "cancel">;
  close: () => void;
}

export const useConfirmStore = create<ConfirmState>((set) => ({
  isOpen: false,
  message: "",
  tabId: null,
  resolve: null,

  show: (message: string, tabId?: string) => {
    return new Promise<"save" | "discard" | "cancel">((resolve) => {
      set({ isOpen: true, message, tabId: tabId ?? null, resolve });
    });
  },

  close: () => {
    set({ isOpen: false, message: "", tabId: null, resolve: null });
  },
}));
