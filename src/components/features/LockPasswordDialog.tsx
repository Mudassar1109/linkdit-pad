import { useEffect, useState } from "react";
import { Lock, LockKeyholeOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useLockStore } from "@/store/useLockStore";
import { getFocusedPaneTabId, useEditorStore } from "@/store/useEditorStore";
import { useToastStore } from "@/store/useToastStore";

export function LockPasswordDialog() {
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
          setError("Enter the password to unlock this document.");
          setBusy(false);
          return;
        }
        const result = await unlock(targetId, password);
        if (result === "ok") {
          useToastStore.getState().show("success", "Document unlocked. You can edit it now.");
          close();
        } else if (result === "incorrect") {
          setError("Incorrect password. Please try again.");
        } else {
          useToastStore.getState().show("info", "This document is not password protected.");
          close();
        }
      } else {
        if (!password) {
          setError("Enter a password to lock this document.");
          setBusy(false);
          return;
        }
        if (password !== confirm) {
          setError("Passwords do not match.");
          setBusy(false);
          return;
        }
        if (password.length < 4) {
          setError("Password must be at least 4 characters.");
          setBusy(false);
          return;
        }
        const ok = await lock(targetId, tab?.meta.title ?? "Untitled", password);
        if (ok) {
          useToastStore.getState().show("success", "Document locked. Editing is disabled until unlocked.");
          close();
        } else {
          setError("Could not lock the document.");
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const title = tab?.meta.title ?? "Document";

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isUnlock ? <LockKeyholeOpen size={18} /> : <Lock size={18} />}
            {isUnlock ? `Unlock "${title}"` : `Lock "${title}"`}
          </DialogTitle>
          <DialogDescription>
            {isUnlock
              ? "Enter the password to unlock this document for editing."
              : "Set a password. The document becomes read-only until unlocked. The password is stored as a secure local hash only."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label htmlFor="lock-password" className="mb-1 block text-xs font-medium text-muted-foreground">
              Password
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
                Confirm Password
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
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={busy}
            className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isUnlock ? <LockKeyholeOpen size={14} /> : <Lock size={14} />}
            {isUnlock ? "Unlock" : "Lock Document"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}