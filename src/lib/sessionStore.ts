import type { EditorTab, TabGroup, SplitState } from "@/types/editor";

const SESSION_KEY = "linkdit-pad-session";
const RECOVERY_KEY = "linkdit-pad-crash-recovery";
const CLEAN_EXIT_KEY = "linkdit-pad-clean-exit";

interface SessionData extends Partial<SplitState> {
  tabs: Record<string, EditorTab>;
  groups: Record<string, TabGroup>;
  activeGroupId: string;
  sidebarVisible: boolean;
  timestamp: number;
}

interface RecoveryEntry {
  title: string;
  content: string;
  mode: string;
  filePath?: string | null;
}

export function saveSession(
  tabs: Record<string, EditorTab>,
  groups: Record<string, TabGroup>,
  activeGroupId: string,
  sidebarVisible: boolean,
  split?: Partial<SplitState>,
): void {
  try {
    const data: SessionData = {
      tabs,
      groups,
      activeGroupId,
      sidebarVisible,
      ...split,
      timestamp: Date.now(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch {
    try {
      const slim: SessionData = {
        tabs: Object.fromEntries(
          Object.entries(tabs).map(([id, tab]) => [
            id,
            tab.meta.filePath ? { ...tab, content: "" } : tab,
          ]),
        ),
        groups,
        activeGroupId,
        sidebarVisible,
        ...split,
        timestamp: Date.now(),
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(slim));
    } catch {}
  }
}

export function loadSession(): SessionData | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SessionData;
    if (!data.tabs || !data.groups || typeof data.activeGroupId !== "string") return null;
    const tabCount = Object.keys(data.tabs).length;
    if (tabCount === 0) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

export function saveCrashRecovery(
  tabs: Record<string, EditorTab>,
): void {
  try {
    const dirtyTabs = Object.fromEntries(
      Object.entries(tabs)
        .filter(([, t]) => t.meta.isDirty && t.content.length > 0)
        .map(([id, t]) => [
          id,
          { title: t.meta.title, content: t.content, mode: t.mode, filePath: t.meta.filePath },
        ]),
    );
    if (Object.keys(dirtyTabs).length === 0) {
      localStorage.removeItem(RECOVERY_KEY);
      return;
    }
    localStorage.setItem(RECOVERY_KEY, JSON.stringify(dirtyTabs));
  } catch {}
}

export function loadCrashRecovery(): Record<string, RecoveryEntry> | null {
  try {
    const raw = localStorage.getItem(RECOVERY_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function hasRecoveryData(): boolean {
  try {
    const raw = localStorage.getItem(RECOVERY_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    return data !== null && typeof data === "object" && Object.keys(data).length > 0;
  } catch {
    return false;
  }
}

export function markCleanExit(): void {
  try {
    localStorage.setItem(CLEAN_EXIT_KEY, "true");
  } catch {}
}

export function isCleanExit(): boolean {
  try {
    return localStorage.getItem(CLEAN_EXIT_KEY) === "true";
  } catch {
    return false;
  }
}

export function clearCleanExit(): void {
  try {
    localStorage.removeItem(CLEAN_EXIT_KEY);
  } catch {}
}

export function clearCrashRecovery(): void {
  try {
    localStorage.removeItem(RECOVERY_KEY);
  } catch {}
}

export function clearAllRecoveryData(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(RECOVERY_KEY);
    localStorage.removeItem(CLEAN_EXIT_KEY);
  } catch {}
}
