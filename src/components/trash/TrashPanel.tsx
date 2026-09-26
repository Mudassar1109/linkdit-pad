import { useEffect, useMemo, useState } from "react";
import {
  Trash2, RotateCcw, Search, ArrowUpDown, AlertTriangle,
  Check, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useTrashStore } from "@/store/useTrashStore";
import { restoreTrashEntry, purgeTrashEntries, emptyTrash } from "@/lib/trash";
import type { TrashEntry } from "@/types/trash";
import { useI18n, useI18nStore } from "@/store/useI18nStore";

type SortKey = "deleted" | "name" | "created";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelative(iso: string): string {
  const t = useI18nStore.getState().t;
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return t("status.justNow");
  if (minutes < 60) return t("status.minutesAgo", { count: minutes });
  if (hours < 24) return t("status.hoursAgo", { count: hours });
  if (days < 7) return t("status.daysAgo", { count: days });
  return formatDateTime(iso);
}

function originalLocation(entry: TrashEntry): string {
  if (!entry.filePath) return useI18nStore.getState().t("panels.trash.locationUnsigned");
  const parts = entry.filePath.split(/[\\/]/).filter(Boolean);
  parts.pop();
  return parts.join("\\") || entry.filePath;
}

export function TrashPanel() {
  const { t } = useI18n();
  const entries = useTrashStore((s) => s.entries);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("deleted");
  const [sortDesc, setSortDesc] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmTarget, setConfirmTarget] = useState<"purge" | "empty" | null>(null);
  const [pendingIds, setPendingIds] = useState<string[]>([]);

  useEffect(() => {
    setSelected((cur) => {
      const ids = new Set(entries.map((e) => e.id));
      const next = new Set([...cur].filter((id) => ids.has(id)));
      return next.size === cur.size ? cur : next;
    });
  }, [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? entries.filter(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            (e.filePath?.toLowerCase().includes(q) ?? false)
        )
      : entries;
    const sorted = [...list];
    const factor = sortDesc ? 1 : -1;
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return factor * a.title.localeCompare(b.title);
        case "created":
          return factor * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        case "deleted":
        default:
          return factor * (new Date(a.deletedAt).getTime() - new Date(b.deletedAt).getTime());
      }
    });
    return sorted;
  }, [entries, query, sortBy, sortDesc]);

  const selectedEntries = entries.filter((e) => selected.has(e.id));
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((e) => selected.has(e.id));

  const toggleAll = () => {
    setSelected(allFilteredSelected ? new Set() : new Set(filtered.map((e) => e.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const askConfirm = (target: "purge" | "empty", ids: string[] = []) => {
    setPendingIds(ids);
    setConfirmTarget(target);
  };

  const runConfirm = async () => {
    if (confirmTarget === "purge") {
      const target =
        pendingIds.length > 0
          ? entries.filter((e) => pendingIds.includes(e.id))
          : entries.filter((e) => selected.has(e.id));
      await purgeTrashEntries(target);
      setSelected(new Set());
    } else {
      await emptyTrash();
      setSelected(new Set());
    }
    setConfirmTarget(null);
    setPendingIds([]);
  };

  return (
    <div className="flex h-full flex-col min-h-0">
      <div className="flex items-center gap-1.5 border-b border-border px-3 py-2 shrink-0">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("panels.trash.filterPlaceholder")}
            className="h-7 w-full rounded-md border border-input bg-background pl-7 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setSortDesc((v) => !v)}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              aria-label={t("panels.trash.toggleSort")}
            >
              <ArrowUpDown size={13} className={cn("transition-transform", sortDesc ? "" : "rotate-180")} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t("panels.trash.toggleSort")}</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5 shrink-0">
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className="h-6 w-auto min-w-0 gap-1 rounded-md border border-input bg-transparent px-2 py-0 text-[11px] text-foreground">
            <ArrowUpDown size={11} className="text-muted-foreground" />
            <SelectValue placeholder={t("panels.trash.sortPlaceholder")} />
          </SelectTrigger>
          <SelectContent className="min-w-[140px]">
            <SelectItem value="deleted">{t("panels.trash.sortDeleted")}</SelectItem>
            <SelectItem value="name">{t("panels.trash.sortName")}</SelectItem>
            <SelectItem value="created">{t("panels.trash.sortCreated")}</SelectItem>
          </SelectContent>
        </Select>
        {selected.size > 0 ? (
          <span className="text-[10px] text-muted-foreground">{t("common.selected", { count: selected.size })}</span>
        ) : (
          <span className="text-[10px] text-muted-foreground">
            {t("common.documents", { count: entries.length })}
          </span>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => askConfirm("empty")}
              disabled={entries.length === 0}
              className="flex h-6 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-danger disabled:opacity-40"
            >
              <Trash2 size={11} />
              {t("panels.trash.emptyTrash")}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t("panels.trash.emptyTrash")}</TooltipContent>
        </Tooltip>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-3 py-1.5 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-[11px] text-primary"
            onClick={() => {
              selectedEntries.forEach((e) => restoreTrashEntry(e.id));
              setSelected(new Set());
            }}
          >
            <RotateCcw size={11} />
            {t("common.restore")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-[11px] text-danger"
            onClick={() => askConfirm("purge")}
          >
            <Trash2 size={11} />
            {t("panels.trash.deletePermanently")}
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-2">
        {entries.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-muted-foreground">
            <Trash2 size={32} strokeWidth={1.5} />
            <p className="text-sm">{t("panels.trash.empty")}</p>
            <p className="text-xs text-muted-foreground/70">{t("panels.trash.emptyHint")}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground">
            <Search size={24} strokeWidth={1.5} />
            <p className="text-sm">{t("panels.trash.noMatching")}</p>
          </div>
        ) : (
          <div className="space-y-0.5 px-2">
            <button
              onClick={toggleAll}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1 hover:bg-muted/60 transition-colors"
            >
              <span className="flex h-4 w-4 items-center justify-center rounded border border-border">
                {allFilteredSelected ? <Check size={10} className="text-primary" /> : null}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("menu.selectAll")}
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground">{filtered.length}</span>
            </button>

            {filtered.map((entry) => {
              const isSelected = selected.has(entry.id);
              return (
                <div
                  key={entry.id}
                  onClick={() => toggleOne(entry.id)}
                  className={cn(
                    "group flex cursor-pointer items-start gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                    isSelected ? "bg-primary/10" : "hover:bg-muted/60"
                  )}
                >
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOne(entry.id);
                    }}
                    className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                      isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border"
                    )}
                  >
                    {isSelected && <Check size={10} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <FileText size={12} className="shrink-0 text-muted-foreground" />
                      <span className="truncate">{entry.title}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {originalLocation(entry)} · {formatRelative(entry.deletedAt)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={confirmTarget !== null} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-danger" />
              {confirmTarget === "empty" ? t("panels.trash.emptyTrash") : t("panels.trash.deletePermanently")}
            </DialogTitle>
            <DialogDescription>
              {confirmTarget === "empty"
                ? t("panels.trash.emptyTrashConfirm")
                : selectedEntries.length === 1
                  ? t("panels.trash.deletePermanentlyConfirm", { title: selectedEntries[0].title })
                  : t("panels.trash.purgeMultiConfirm")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button size="sm" className="bg-danger text-danger-foreground hover:bg-danger/90" onClick={runConfirm}>
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}