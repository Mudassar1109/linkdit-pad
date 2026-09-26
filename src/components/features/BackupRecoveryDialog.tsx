import { useMemo } from "react";
import { DatabaseBackup, RotateCcw, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useBackupStore, type BackupEntry } from "@/store/useBackupStore";
import { useToastStore } from "@/store/useToastStore";
import { useI18n } from "@/store/useI18nStore";

function formatTime(ts: number | string): string {
  const d = typeof ts === "string" ? new Date(ts) : new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BackupRecoveryDialog() {
  const { t } = useI18n();
  const isOpen = useBackupStore((s) => s.isOpen);
  const close = useBackupStore((s) => s.close);
  const settings = useBackupStore((s) => s.settings);
  const setSettings = useBackupStore((s) => s.setSettings);
  const backups = useBackupStore((s) => s.backups);
  const lastBackupAt = useBackupStore((s) => s.lastBackupAt);
  const runBackup = useBackupStore((s) => s.runBackup);
  const restoreBackup = useBackupStore((s) => s.restoreBackup);
  const deleteBackup = useBackupStore((s) => s.deleteBackup);

  const groups = useMemo(() => {
    return Object.entries(backups)
      .filter(([, list]) => list.length > 0)
      .map(([tabId, list]) => ({
        tabId,
        list: [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      }));
  }, [backups]);

  const allCount = useMemo(() => groups.reduce((n, g) => n + g.list.length, 0), [groups]);

  const handleRestore = (b: BackupEntry) => {
    restoreBackup(b.id);
    close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DatabaseBackup size={18} />
            {t("menu.backupRecovery")}
          </DialogTitle>
          <DialogDescription>
            {t("settings.backup.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-background/50 px-3 py-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">{t("settings.backup.autoBackup")}</p>
              <p className="text-xs text-muted-foreground">
                {lastBackupAt
                  ? `${t("settings.backup.lastBackup")}: ${formatTime(lastBackupAt)}`
                  : t("settings.backup.noBackupYet")}
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(c) => setSettings({ enabled: c })}
              aria-label={t("settings.backup.autoBackup")}
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{t("settings.backup.interval")}</p>
            <select
              value={settings.intervalMinutes}
              onChange={(e) => setSettings({ intervalMinutes: parseInt(e.target.value) })}
              title={t("settings.backup.interval")}
              aria-label={t("settings.backup.interval")}
              className="h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none"
            >
              <option value={5}>{t("settings.backup.intervalValue", { count: 5 })}</option>
              <option value={15}>{t("settings.backup.intervalValue", { count: 15 })}</option>
              <option value={30}>{t("settings.backup.intervalValue", { count: 30 })}</option>
              <option value={60}>{t("settings.backup.intervalValue", { count: 60 })}</option>
            </select>
          </div>
          <div className="mt-2 flex justify-end">
            <button
              onClick={runBackup}
              className="flex h-7 items-center gap-1.5 rounded-md bg-primary px-2.5 text-xs text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <DatabaseBackup size={13} />
              {t("settings.backup.backUpNow")}
            </button>
          </div>
        </div>

        {allCount === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
            <DatabaseBackup size={32} strokeWidth={1.5} />
            <p className="text-sm">{t("settings.backup.empty")}</p>
            <p className="text-xs text-muted-foreground/70">
              {t("settings.backup.emptyHint")}
            </p>
          </div>
        ) : (
          <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
            {groups.map((group) => (
              <div key={group.tabId}>
                <div className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.list[0].title}{group.list[0].filePath ? ` (${group.list[0].filePath})` : ""}
                </div>
                <div className="space-y-1">
                  {group.list.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center gap-2 rounded-lg border border-border bg-background/50 px-3 py-1.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-foreground">{formatTime(b.createdAt)}</div>
                        <div className="text-[11px] text-muted-foreground/80">
                          {t("status.chars", { count: b.charCount })}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => handleRestore(b)}
                          title={t("common.restore")}
                          aria-label={t("common.restore")}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <RotateCcw size={14} />
                        </button>
                        <button
                          onClick={() => deleteBackup(b.id)}
                          title={t("common.delete")}
                          aria-label={t("common.delete")}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-danger"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground/70">
          <span>
            {t("settings.backup.retentionHint")}
          </span>
          <button
            onClick={() => useToastStore.getState().show("info", t("settings.backup.openLocationToast"))}
            className="text-muted-foreground underline decoration-dotted hover:text-foreground"
            title={t("settings.backup.learnMore")}
          >
            {t("settings.backup.howItWorks")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}