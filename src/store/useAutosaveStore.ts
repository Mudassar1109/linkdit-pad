import { create } from "zustand";

/**
 * Drives the Auto Save status indicator in the status bar.
 * States: idle (nothing pending), saving (disk write in flight),
 * saved (last auto-save succeeded), error (last auto-save failed).
 */
export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

interface AutosaveState {
  status: AutosaveStatus;
  tabId: string | null;
  error: string | null;
  setStatus: (status: AutosaveStatus, tabId?: string | null, error?: string | null) => void;
}

export const useAutosaveStore = create<AutosaveState>((set, get) => ({
  status: "idle",
  tabId: null,
  error: null,
  setStatus: (status, tabId = null, error = null) => {
    const s = get();
    if (s.status === status && s.tabId === tabId && s.error === error) return;
    set({ status, tabId, error });
  },
}));