import { FileText, RotateCcw, Trash2 } from "lucide-react";

interface RecoveryDialogProps {
  documentCount: number;
  onRestore: () => void;
  onDiscard: () => void;
}

export function RecoveryDialog({ documentCount, onRestore, onDiscard }: RecoveryDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-xl border bg-card p-6 shadow-2xl">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
            <FileText className="text-amber-500" size={20} />
          </div>
          <h2 className="text-lg font-semibold">Recover Previous Session</h2>
        </div>

        <p className="mb-1 text-sm text-muted-foreground">
          We found {documentCount} unsaved document{documentCount !== 1 ? "s" : ""} from your previous
          session.
        </p>
        <p className="mb-6 text-sm text-muted-foreground">
          Would you like to restore them?
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onDiscard}
            className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            <Trash2 size={14} />
            Discard
          </button>
          <button
            onClick={onRestore}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RotateCcw size={14} />
            Restore Session
          </button>
        </div>
      </div>
    </div>
  );
}
