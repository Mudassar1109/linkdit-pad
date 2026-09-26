import { FileText, RotateCcw, Trash2 } from "lucide-react";
import { useI18n } from "@/store/useI18nStore";

interface RecoveryDialogProps {
  documentCount: number;
  onRestore: () => void;
  onDiscard: () => void;
}

export function RecoveryDialog({ documentCount, onRestore, onDiscard }: RecoveryDialogProps) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-xl border bg-card p-6 shadow-2xl">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/20">
            <FileText className="text-warning" size={20} />
          </div>
          <h2 className="text-lg font-semibold">{t("dialogs.recovery.title")}</h2>
        </div>

        <p className="mb-1 text-sm text-muted-foreground">
          {t("dialogs.recovery.foundDocs", { count: documentCount })}
        </p>
        <p className="mb-6 text-sm text-muted-foreground">
          {t("dialogs.recovery.restorePrompt")}
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onDiscard}
            className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            <Trash2 size={14} />
            {t("dialogs.recovery.discard")}
          </button>
          <button
            onClick={onRestore}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-accent-hover active:bg-accent-active"
          >
            <RotateCcw size={14} />
            {t("dialogs.recovery.restoreSession")}
          </button>
        </div>
      </div>
    </div>
  );
}
