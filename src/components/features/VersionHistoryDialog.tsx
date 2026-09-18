import { useMemo, useState } from "react";
import { History, RotateCcw, Eye, Trash2, X, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useVersionHistoryStore, type VersionEntry } from "@/store/useVersionHistoryStore";
import { useLockStore } from "@/store/useLockStore";
import { getFocusedPaneTabId, useEditorStore } from "@/store/useEditorStore";
import { useToastStore } from "@/store/useToastStore";

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function VersionHistoryDialog() {
  const isOpen = useVersionHistoryStore((s) => s.isOpen);
  const close = useVersionHistoryStore((s) => s.close);
  const versions = useVersionHistoryStore((s) => s.versions);
  const restoreVersion = useVersionHistoryStore((s) => s.restoreVersion);
  const deleteVersion = useVersionHistoryStore((s) => s.deleteVersion);
  const locks = useLockStore((s) => s.locks);
  const unlockedIds = useLockStore((s) => s.unlockedIds);
  const [previewVersion, setPreviewVersion] = useState<VersionEntry | null>(null);

  const targetId = getFocusedPaneTabId(useEditorStore.getState());
  const tab = targetId ? useEditorStore.getState().tabs[targetId] : undefined;
  const list = targetId ? versions[targetId] ?? [] : [];
  const locked = targetId ? (locks[targetId] ? !unlockedIds.includes(targetId) : false) : false;

  const sorted = useMemo(() => {
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [list]);

  const isRichContent = (v: VersionEntry) => /<[a-z][\s\S]*>/i.test(v.content);

  const handleRestore = (v: VersionEntry) => {
    if (!targetId || locked) return;
    const ok = restoreVersion(targetId, v.id);
    if (ok) {
      useToastStore.getState().show(
        "success",
        `Restored version from ${formatTime(v.createdAt)}. Current content was saved as the latest version.`
      );
    } else {
      useToastStore.getState().show("error", "Could not restore this version.");
    }
  };

  const handleDelete = (v: VersionEntry) => {
    if (!targetId) return;
    deleteVersion(targetId, v.id);
    useToastStore.getState().show("info", "Version deleted.");
    if (previewVersion?.id === v.id) setPreviewVersion(null);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History size={18} />
              Version History
              {tab ? (
                <span className="ml-1 truncate text-sm font-normal text-muted-foreground">
                  &mdash; {tab.meta.title}
                </span>
              ) : null}
            </DialogTitle>
            <DialogDescription>
              Auto-saved snapshots of this document. Stored locally only.
            </DialogDescription>
          </DialogHeader>

          {!targetId ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No document open.</p>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
              <History size={32} strokeWidth={1.5} />
              <p className="text-sm">No versions yet.</p>
              <p className="text-xs text-muted-foreground/70">
                Versions appear automatically as you make meaningful changes.
              </p>
            </div>
          ) : (
            <div className="max-h-[50vh] space-y-1.5 overflow-y-auto pr-1">
              {sorted.map((v, idx) => (
                <div
                  key={v.id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background/50 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-foreground">v{sorted.length - idx}</span>
                      <span className="truncate text-xs text-muted-foreground">{formatTime(v.createdAt)}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground/80">
                      {v.title} &middot; {v.charCount.toLocaleString()} chars
                      {v.source === "pre-restore" ? " &middot; saved before restore" : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => setPreviewVersion(v)}
                      title={`Preview version from ${formatTime(v.createdAt)}`}
                      aria-label="Preview version"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => handleRestore(v)}
                      disabled={locked}
                      title={locked ? "Unlock the document to restore a version" : "Restore this version"}
                      aria-label="Restore version"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(v)}
                      title="Delete version"
                      aria-label="Delete version"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-danger"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {locked && (
            <div className="mt-2 flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <AlertTriangle size={14} className="shrink-0" />
              This document is locked. Unlock it (Document &rarr; Unlock Document) before restoring a version.
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewVersion} onOpenChange={(o) => !o && setPreviewVersion(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              <span className="flex items-center gap-2">
                <Eye size={16} />
                Preview Version
              </span>
            </DialogTitle>
            {previewVersion && (
              <DialogDescription>
                {previewVersion.title} &middot; {formatTime(previewVersion.createdAt)}
              </DialogDescription>
            )}
          </DialogHeader>
          {previewVersion && (
            <div className="max-h-[55vh] overflow-y-auto rounded-lg border border-border bg-background p-4">
              {isRichContent(previewVersion) ? (
                <div
                  className="prose prose-neutral dark:prose-invert max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: previewVersion.content }}
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">
                  {previewVersion.content}
                </pre>
              )}
            </div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setPreviewVersion(null)}
              className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-transparent px-3 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <X size={14} />
              Close
            </button>
            {previewVersion && (
              <button
                onClick={() => {
                  handleRestore(previewVersion);
                  setPreviewVersion(null);
                }}
                disabled={locked}
                className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <RotateCcw size={14} />
                Restore This Version
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}