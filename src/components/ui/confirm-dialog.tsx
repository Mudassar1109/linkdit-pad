import { motion, AnimatePresence } from "framer-motion";
import { useConfirmStore } from "@/store/useConfirmStore";
import { useI18n } from "@/store/useI18nStore";

export function ConfirmDialog() {
  const { t } = useI18n();
  const { isOpen, message, resolve, close } = useConfirmStore();

  const handleAction = (action: "save" | "discard" | "cancel") => {
    close();
    resolve?.(action);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => handleAction("cancel")}
          />
          <div className="absolute inset-6 flex items-center justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              role="dialog"
              aria-modal="true"
              aria-label={t("dialogs.confirm.title")}
              className="pointer-events-auto w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-panel"
            >
              <h2 className="text-base font-semibold text-foreground mb-2">
                {t("dialogs.confirm.title")}
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                {message}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => handleAction("cancel")}
                  className="h-8 rounded-md border border-border bg-transparent px-3 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={() => handleAction("discard")}
                  className="h-8 rounded-md border border-border bg-transparent px-3 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  {t("common.dontSave")}
                </button>
                <button
                  onClick={() => handleAction("save")}
                  className="h-8 rounded-md bg-primary px-3 text-sm text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  {t("common.save")}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
