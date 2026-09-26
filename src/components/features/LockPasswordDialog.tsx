import { useEffect, useState } from "react";
import { Lock, LockKeyholeOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useLockStore } from "@/store/useLockStore";
import { getFocusedPaneTabId, useEditorStore } from "@/store/useEditorStore";
import { useToastStore } from "@/store/useToastStore";
import { useI18n } from "@/store/useI18nStore";

export function LockPasswordDialog() {
  const { t } = useI18n();
  const dialog = useLockStore((s) => s.dialog);
  const closeDialog = useLockStore((s) => s.closeDialog);
  const lock = useLockStore((s) => s.lock);
  const unlock = useLockStore((s) => s.unlock);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const targetId = getFocusedPaneTabId(useEditorStore.getState());
  const tab = targetId ? useEditorStore.getState().tabs[targetId] : undefined;

  useEffect(() => {
    setPassword("");
    setConfirm("");
    setError(null);
    setBusy(false);
  }, [dialog]);

  const close = () => {
    closeDialog();
  };

  if (!dialog) return null;

  const isUnlock = dialog === "unlock";

  const handleSubmit = async () => {
    if (!targetId) return;
    setBusy(true);
    setError(null);
    try {
      if (isUnlock) {
        if (!password) {
          setError(t("dialogs.lock.unlockDescription"));
          setBusy(false);
          return;
        }
        const result = await unlock(targetId, password);
        if (result === "ok") {
          useToastStore.getState().show("success", t("dialogs.lock.toastUnlocked"));
          close();
        } else if (result === "incorrect") {
          setError(t("dialogs.lock.incorrectPassword"));
        } else {
          useToastStore.getState().show("info", t("toast.notPasswordProtected"));
          close();
        }
      } else {
        if (!password) {
          setError(t("dialogs.lock.promptText"));
          setBusy(false);
          return;
        }
        if (password !== confirm) {
          setError(t("dialogs.lock.passwordsDontMatch"));
          setBusy(false);
          return;
        }
        if (password.length < 4) {
          setError(t("dialogs.lock.passwordTooShort"));
          setBusy(false);
          return;
        }
        const ok = await lock(targetId, tab?.meta.title ?? t("common.untitled"), password);
        if (ok) {
          useToastStore.getState().show("success", t("dialogs.lock.toastLocked"));
          close();
        } else {
          setError(t("dialogs.lock.lockError"));
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isUnlock ? <LockKeyholeOpen size={18} /> : <Lock size={18} />}
            {isUnlock ? t("dialogs.lock.unlockTitle") : t("dialogs.lock.lockTitle")}
          </DialogTitle>
          <DialogDescription>
            {isUnlock
              ? t("dialogs.lock.unlockDescription")
              : t("dialogs.lock.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label htmlFor="lock-password" className="mb-1 block text-xs font-medium text-muted-foreground">
              {t("dialogs.lock.password")}
            </label>
            <input
              id="lock-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {!isUnlock && (
            <div>
              <label htmlFor="lock-confirm" className="mb-1 block text-xs font-medium text-muted-foreground">
                {t("dialogs.lock.confirmPassword")}
              </label>
              <input
                id="lock-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={close}
            className="h-8 rounded-md border border-border bg-transparent px-3 text-sm text-foreground hover:bg-muted transition-colors"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={busy}
            className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isUnlock ? <LockKeyholeOpen size={14} /> : <Lock size={14} />}
            {isUnlock ? t("dialogs.lock.unlock") : t("dialogs.lock.lock")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}