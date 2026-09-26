import { useEffect, useState } from "react";
import {
  Camera,
  Check,
  Copy,
  Download,
  ImageOff,
  Loader2,
  Share2,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToastStore } from "@/store/useToastStore";
import { useI18n } from "@/store/useI18nStore";
import {
  captureEditorToBlob,
  copyScreenshotPng,
  focusedScreenshotTitle,
  saveScreenshotPng,
  screenshotFileName,
  type ScreenshotMode,
} from "@/lib/screenshot";

interface ScreenshotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScreenshotDialog({ open, onOpenChange }: ScreenshotDialogProps) {
  const { t } = useI18n();
  const toast = useToastStore((s) => s.show);
  const [mode, setMode] = useState<ScreenshotMode | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setMode(null);
      setBlob(null);
      setError(null);
      setCopied(false);
    }
  }, [open]);

  useEffect(() => {
    if (!blob) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  const capture = async (m: ScreenshotMode) => {
    setMode(m);
    setBusy(true);
    setError(null);
    setBlob(null);
    setCopied(false);
    try {
      const next = await captureEditorToBlob(m);
      setBlob(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!blob) return;
    try {
      const name = screenshotFileName(focusedScreenshotTitle());
      const saved = await saveScreenshotPng(blob, name);
      if (saved) {
        toast("success", t("dialogs.screenshot.saved"));
        onOpenChange(false);
      }
    } catch (e) {
      toast("error", e instanceof Error ? e.message : t("dialogs.screenshot.saveError"));
    }
  };

  const handleCopy = async () => {
    if (!blob) return;
    try {
      await copyScreenshotPng(blob);
      setCopied(true);
      toast("success", t("dialogs.screenshot.copied"));
    } catch (e) {
      toast("error", e instanceof Error ? e.message : t("dialogs.screenshot.copyError"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera size={18} className="text-primary" />
            {t("dialogs.screenshot.title")}
          </DialogTitle>
          <DialogDescription>
            {t("dialogs.screenshot.description")}
          </DialogDescription>
        </DialogHeader>

        {!busy && !blob && !error && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="flex-col gap-2 py-6"
              onClick={() => capture("visible")}
            >
              <span className="text-lg font-semibold">{t("dialogs.screenshot.visibleArea")}</span>
              <span className="text-xs text-muted-foreground">{t("dialogs.screenshot.modeVisibleCaption")}</span>
            </Button>
            <Button
              variant="outline"
              className="flex-col gap-2 py-6"
              onClick={() => capture("entire")}
            >
              <span className="text-lg font-semibold">{t("dialogs.screenshot.fullDocument")}</span>
              <span className="text-xs text-muted-foreground">{t("dialogs.screenshot.modeFullCaption")}</span>
            </Button>
          </div>
        )}

        {busy && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
            <Loader2 size={28} className="animate-spin text-primary" />
            <span className="text-sm">{t("dialogs.screenshot.capturing")}</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/40 p-6 text-center">
            <ImageOff size={24} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setError(null);
                setBlob(null);
              }}
            >
              {t("dialogs.screenshot.chooseArea")}
            </Button>
          </div>
        )}

        {blob && previewUrl && (
          <>
            <div className="max-h-[55vh] overflow-auto rounded-lg border border-border bg-muted/30 p-2">
              <img
                src={previewUrl}
                alt={t("dialogs.screenshot.previewAlt")}
                className="mx-auto h-auto max-w-full rounded"
              />
            </div>
            <div className="mt-3 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => capture(mode === "visible" ? "entire" : "visible")}
              >
                {mode === "visible" ? t("dialogs.screenshot.fullDocument") : t("dialogs.screenshot.visibleArea")}
              </Button>
              <span className="px-2 text-xs text-muted-foreground">
                {mode === "visible" ? t("dialogs.screenshot.visibleArea") : t("dialogs.screenshot.fullDocument")}
              </span>
            </div>
          </>
        )}

        {blob && (
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              <X size={14} /> {t("common.cancel")}
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopy} disabled={copied}>
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? t("dialogs.screenshot.copiedLabel") : t("dialogs.screenshot.copy")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled
              title={t("dialogs.screenshot.shareTooltip")}
            >
              <Share2 size={14} /> {t("dialogs.screenshot.share")}
            </Button>
            <Button variant="default" size="sm" onClick={handleSave}>
              <Download size={14} /> {t("dialogs.screenshot.save")}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}