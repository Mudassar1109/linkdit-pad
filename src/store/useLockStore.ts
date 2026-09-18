import { create } from "zustand";
import { hashPassword, verifyPassword } from "@/lib/passwordHash";

export interface LockRecord {
  salt: string;
  hash: string;
  title: string;
  createdAt: string;
}

export type LockDialogMode = "lock" | "unlock";

const STORAGE_KEY = "linkdit-pad-locks";

function load(): Record<string, LockRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, LockRecord>;
      }
    }
  } catch {}
  return {};
}

function persist(map: Record<string, LockRecord>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

interface LockState {
  locks: Record<string, LockRecord>;
  unlockedIds: string[];
  dialog: LockDialogMode | null;
  openDialog: (mode: LockDialogMode) => void;
  closeDialog: () => void;
  lock: (tabId: string, title: string, password: string) => Promise<boolean>;
  unlock: (tabId: string, password: string) => Promise<"ok" | "incorrect" | "not-protected">;
  rejectLock: (tabId: string) => void;
  isProtected: (tabId: string) => boolean;
  isLocked: (tabId: string) => boolean;
}

export const useLockStore = create<LockState>((set, get) => ({
  locks: load(),
  unlockedIds: [],
  dialog: null,
  openDialog: (mode) => set({ dialog: mode }),
  closeDialog: () => set({ dialog: null }),

  lock: async (tabId, title, password) => {
    if (password.length === 0) return false;
    const existing = get().locks[tabId];
    if (existing) {
      set((s) => ({ unlockedIds: s.unlockedIds.filter((id) => id !== tabId) }));
      persist(get().locks);
      return true;
    }
    const derived = await hashPassword(password);
    const record: LockRecord = {
      ...derived,
      title,
      createdAt: new Date().toISOString(),
    };
    set((s) => {
      const next = { ...s.locks, [tabId]: record };
      persist(next);
      return { locks: next };
    });
    return true;
  },

  unlock: async (tabId, password) => {
    const record = get().locks[tabId];
    if (!record) return "not-protected";
    const valid = await verifyPassword(password, record.salt, record.hash);
    if (!valid) return "incorrect";
    set((s) => ({
      unlockedIds: s.unlockedIds.includes(tabId) ? s.unlockedIds : [...s.unlockedIds, tabId],
    }));
    return "ok";
  },

  rejectLock: (tabId) => {
    set((s) => ({
      unlockedIds: s.unlockedIds.filter((id) => id !== tabId),
    }));
  },

  isProtected: (tabId) => !!get().locks[tabId],

  isLocked: (tabId) => !!get().locks[tabId] && !get().unlockedIds.includes(tabId),
}));