import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Crop,
  Lock,
  Maximize,
  Trash2,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18nStore } from "@/store/useI18nStore";

export interface ImageToolbarAttrs {
  width?: number;
  height?: number;
  dataAspectLocked?: boolean;
  dataAlign?: "left" | "center" | "right";
  dataDisplay?: "block" | "inline";
}

interface ImageToolbarProps {
  anchor: HTMLElement | null;
  width: number;
  height: number;
  aspectLocked: boolean;
  align: string;
  display: string;
  onChange: (attrs: ImageToolbarAttrs) => void;
  onCrop: () => void;
  onDelete: () => void;
}

export function ImageToolbar({
  anchor,
  width,
  height,
  aspectLocked,
  align,
  display,
  onChange,
  onCrop,
  onDelete,
}: ImageToolbarProps) {
  const t = useI18nStore((s) => s.t);
  const barRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const posRef = useRef<{ top: number; left: number } | null>(null);

  const recompute = () => {
    if (!anchor) {
      if (posRef.current !== null) {
        posRef.current = null;
        setPos(null);
      }
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const barH = barRef.current?.offsetHeight ?? 92;
    let top = Math.round(rect.bottom + 8);
    if (top + barH > Math.round(window.innerHeight) - 8) {
      top = Math.max(8, Math.round(rect.top - barH - 8));
    }
    const left = Math.min(Math.max(8, Math.round(rect.left)), Math.max(8, Math.round(window.innerWidth) - 8));
    const cur = posRef.current;
    if (!cur || cur.top !== top || cur.left !== left) {
      const next = { top, left };
      posRef.current = next;
      setPos(next);
    }
  };

  useLayoutEffect(() => {
    recompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor, width, height]);

  useEffect(() => {
    if (!anchor) return;
    const onScroll = () => recompute();
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor, width, height]);

  if (!anchor || !pos) return null;

  const commit = (attrs: ImageToolbarAttrs) => onChange(attrs);

  return createPortal(
    <div
      ref={barRef}
      className="lp-image-toolbar"
      style={{ top: pos.top, left: pos.left }}
      role="toolbar"
      aria-label={t("image.toolbar")}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="lp-image-toolbar-row">
        <label className="lp-image-toolbar-field" title={t("image.width")}>
          <span className="lp-image-toolbar-field-text" aria-hidden="true">W</span>
          <input
            key={`w-${width}`}
            type="number"
            min={20}
            defaultValue={Math.round(width) || ""}
            aria-label={t("image.width")}
            aria-describedby="lp-image-toolbar-width-hint"
            className="lp-image-toolbar-input"
            onBlur={(e) => {
              const v = Number(e.target.value);
              if (v > 0) commit({ width: Math.round(v) });
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const v = Number((e.target as HTMLInputElement).value);
              if (v > 0) commit({ width: Math.round(v) });
              (e.target as HTMLInputElement).blur();
            }}
          />
        </label>
        <label className="lp-image-toolbar-field" title={t("image.height")}>
          <span className="lp-image-toolbar-field-text" aria-hidden="true">H</span>
          <input
            key={`h-${height}`}
            type="number"
            min={20}
            defaultValue={Math.round(height) || ""}
            aria-label={t("image.height")}
            className="lp-image-toolbar-input"
            onBlur={(e) => {
              const v = Number(e.target.value);
              if (v > 0) commit({ height: Math.round(v) });
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const v = Number((e.target as HTMLInputElement).value);
              if (v > 0) commit({ height: Math.round(v) });
              (e.target as HTMLInputElement).blur();
            }}
          />
        </label>
        <Button
          size="icon"
          variant="ghost"
          className="lp-image-toolbar-btn"
          aria-pressed={aspectLocked}
          title={aspectLocked ? t("image.lockAspect") : t("image.unlockAspect")}
          onClick={() => commit({ dataAspectLocked: !aspectLocked })}
        >
          {aspectLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
        </Button>
      </div>
      <div className="lp-image-toolbar-row">
        <div className="lp-image-toolbar-group" role="group" aria-label={t("image.align")}>
          <Button
            size="icon"
            variant="ghost"
            className="lp-image-toolbar-btn"
            aria-pressed={align === "left"}
            title={t("image.alignLeft")}
            onClick={() => commit({ dataAlign: "left" })}
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="lp-image-toolbar-btn"
            aria-pressed={align === "center"}
            title={t("image.alignCenter")}
            onClick={() => commit({ dataAlign: "center" })}
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="lp-image-toolbar-btn"
            aria-pressed={align === "right"}
            title={t("image.alignRight")}
            onClick={() => commit({ dataAlign: "right" })}
          >
            <AlignRight className="h-4 w-4" />
          </Button>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="lp-image-toolbar-btn"
          aria-pressed={display === "inline"}
          title={display === "inline" ? t("image.displayInline") : t("image.displayBlock")}
          onClick={() => commit({ dataDisplay: display === "inline" ? "block" : "inline" })}
        >
          <Maximize className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="lp-image-toolbar-btn"
          title={t("image.crop")}
          onClick={onCrop}
        >
          <Crop className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="lp-image-toolbar-btn lp-image-toolbar-btn-danger"
          title={t("image.delete")}
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div id="lp-image-toolbar-width-hint" hidden>{t("image.width")}</div>
    </div>,
    document.body
  );
}