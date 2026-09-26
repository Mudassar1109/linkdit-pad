import { create } from "zustand";
import { generateId } from "@/lib/utils";
import { useEditorStore } from "@/store/useEditorStore";
import { useToastStore } from "@/store/useToastStore";
import { useI18nStore } from "@/store/useI18nStore";
import type { EditorTab } from "@/types/editor";

export interface BackupSettings {
  enabled: boolean;
  intervalMinutes: number;
}

export interface BackupEntry {
  id: string;
  tabId: string;
  title: string;
  content: string;
  mode: string;
  filePath: string | null;
  createdAt: string;
  charCount: number;
}

const SETTINGS_KEY = "linkdit-pad-backup-settings";
const DATA_KEY = "linkdit-pad-backups";
const MAX_BACKUPS_PER_TAB = 5;

function loadSettings(): BackupSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          enabled: parsed.enabled ?? false,
          intervalMinutes: [5, 15, 30, 60].includes(parsed.intervalMinutes)
            ? parsed.intervalMinutes
            : 15,
        };
      }
    }
  } catch {}
  return { enabled: false, intervalMinutes: 15 };
}

function loadBackups(): Record<string, BackupEntry[]> {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const result: Record<string, BackupEntry[]> = {};
        for (const k of Object.keys(parsed)) {
          if (Array.isArray(parsed[k])) result[k] = parsed[k];
        }
        return result;
      }
    }
  } catch {}
  return {};
}

function persistSettings(settings: BackupSettings, lastBackupAt: number | null): void {
  try {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...settings, lastBackupAt })
    );
  } catch {}
}

function persistBackups(map: Record<string, BackupEntry[]>): void {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(map));
  } catch {}
}

async function writeDiskBackup(
  backups: Record<string, BackupEntry[]>,
  settings: BackupSettings
): Promise<void> {
  try {
    if (!("__TAURI_INTERNALS__" in window)) return;
    const { appDataDir } = await import("@tauri-apps/api/path");
    const { mkdir, writeTextFile } = await import("@tauri-apps/plugin-fs");
    const dir = await appDataDir();
    const backupsDir = `${dir}backups`;
    try {
      await mkdir(backupsDir, { recursive: true });
    } catch {}
    await writeTextFile(
      `${backupsDir}/linkdit-backups.json`,
      JSON.stringify({
        createdAt: new Date().toISOString(),
        settings,
        backups,
      })
    );
  } catch {}
}

interface BackupState {
  settings: BackupSettings;
  backups: Record<string, BackupEntry[]>;
  lastBackupAt: number | null;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  setSettings: (partial: Partial<BackupSettings>) => void;
  runBackup: () => void;
  restoreBackup: (backupId: string) => void;
  deleteBackup: (backupId: string) => void;
  getTabBackups: (tabId: string) => BackupEntry[];
}

export const useBackupStore = create<BackupState>((set, get) => ({
  settings: loadSettings(),
  backups: loadBackups(),
  lastBackupAt: (() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return typeof parsed.lastBackupAt === "number" ? parsed.lastBackupAt : null;
      }
    } catch {}
    return null;
  })(),
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),

  setSettings: (partial) =>
    set((s) => {
      const next = { ...s.settings, ...partial };
      persistSettings(next, s.lastBackupAt);
      return { settings: next };
    }),

  runBackup: () => {
    useEditorStore.getState().commitFocusedPaneToTab();
    const { tabs } = useEditorStore.getState();
    const now = new Date().toISOString();
    const nowTs = Date.now();
    let created = 0;
    const nextBackups: Record<string, BackupEntry[]> = { ...get().backups };

    for (const [tabId, tab] of Object.entries(tabs)) {
      const content = tab.content ?? "";
      if (content.length === 0) continue;
      const entry: BackupEntry = {
        id: generateId(),
        tabId,
        title: tab.meta.title,
        content,
        mode: tab.mode,
        filePath: tab.meta.filePath,
        createdAt: now,
        charCount: content.length,
      };
      const list = [entry, ...(nextBackups[tabId] ?? [])].slice(0, MAX_BACKUPS_PER_TAB);
      nextBackups[tabId] = list;
      created += 1;
    }

    set({
      backups: nextBackups,
      lastBackupAt: nowTs,
      settings: get().settings,
    });
    persistBackups(nextBackups);
    persistSettings(get().settings, nowTs);
    void writeDiskBackup(nextBackups, get().settings);

    if (created > 0) {
      useToastStore.getState().show("success", useI18nStore.getState().t("settings.backup.savedToast", { count: created }));
    }
  },

  restoreBackup: (backupId) => {
    const entry = Object.values(get().backups)
      .flat()
      .find((b) => b.id === backupId);
    if (!entry) return;
    const { tabs, openTab, renameTab, updateContent } = useEditorStore.getState();
    if (tabs[entry.tabId]) {
      updateContent(entry.tabId, entry.content);
      useToastStore.getState().show("success", useI18nStore.getState().t("settings.backup.restored"));
    } else {
      const tabId = openTab({ content: entry.content, mode: entry.mode as EditorTab["mode"] });
      renameTab(tabId, entry.title);
      useToastStore.getState().show("success", useI18nStore.getState().t("settings.backup.restored"));
    }
  },

  deleteBackup: (backupId) => {
    set((s) => {
      const next: Record<string, BackupEntry[]> = {};
      for (const [tabId, list] of Object.entries(s.backups)) {
        const filtered = list.filter((b) => b.id !== backupId);
        if (filtered.length > 0) next[tabId] = filtered;
      }
      persistBackups(next);
      return { backups: next };
    });
  },

  getTabBackups: (tabId) => get().backups[tabId] ?? [],
}));