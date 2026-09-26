import { useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { clampBillboard, MIN_CROP, type CropBox } from "./imageTools";
import { useI18nStore } from "@/store/useI18nStore";

export type CropResizeHandle = "tl" | "tc" | "tr" | "ml" | "mr" | "bl" | "bc" | "br";

const HANDLE_ORDER: CropResizeHandle[] = ["tl", "tc", "tr", "ml", "mr", "bl", "bc", "br"];

interface CropOverlayProps {
  src: string;
  anchorRef: RefObject<HTMLImageElement | null>;
  onApply: (boxPx: CropBox) => void;
  onCancel: () => void;
  processing?: boolean;
}

export function CropOverlay({ src, anchorRef, onApply, onCancel, processing = false }: CropOverlayProps) {
  const t = useI18nStore((s) => s.t);
  const [box, setBox] = useState<CropBox>({ x: 0, y: 0, w: 0, h: 0 });
  const [imgW, setImgW] = useState(0);
  const [imgH, setImgH] = useState(0);
  const dragRef = useRef<{
    mode: "move" | CropResizeHandle;
    startX: number;
    startY: number;
    box: CropBox;
  } | null>(null);

  useLayoutEffect(() => {
    const el = anchorRef.current;
    const w = el?.getBoundingClientRect().width ?? 0;
    const h = el?.getBoundingClientRect().height ?? 0;
    setImgW(w);
    setImgH(h);
    setBox({ x: 0, y: 0, w, h });
  }, [anchorRef]);

  const applyDrag = (clientX: number, clientY: number) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = clientX - drag.startX;
    const dy = clientY - drag.startY;
    const b = drag.box;
    if (drag.mode === "move") {
      setBox({
        x: clampBillboard(b.x + dx, 0, imgW - b.w),
        y: clampBillboard(b.y + dy, 0, imgH - b.h),
        w: b.w,
        h: b.h,
      });
      return;
    }
    const dirX = drag.mode.includes("r") ? 1 : drag.mode.includes("l") ? -1 : 0;
    const dirY = drag.mode.includes("b") ? 1 : drag.mode.includes("t") ? -1 : 0;
    let { x, y, w, h } = b;
    if (dirX === -1) {
      w = b.w - dx;
      x = b.x + dx;
    } else if (dirX === 1) {
      w = b.w + dx;
    }
    if (dirY === -1) {
      h = b.h - dy;
      y = b.y + dy;
    } else if (dirY === 1) {
      h = b.h + dy;
    }
    if (w < MIN_CROP) {
      if (dirX === -1) x = b.x + (b.w - MIN_CROP);
      w = MIN_CROP;
    }
    if (h < MIN_CROP) {
      if (dirY === -1) y = b.y + (b.h - MIN_CROP);
      h = MIN_CROP;
    }
    x = clampBillboard(x, 0, imgW - w);
    y = clampBillboard(y, 0, imgH - h);
    setBox({ x, y, w, h });
  };

  const onPointerDown = (
    e: ReactPointerEvent,
    mode: "move" | CropResizeHandle
  ) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, box };
    const onMove = (ev: PointerEvent) => applyDrag(ev.clientX, ev.clientY);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      dragRef.current = null;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  if (imgW <= 0 || imgH <= 0) {
    return <div className="lp-crop-overlay" aria-hidden="true" />;
  }

  return (
    <div
      className="lp-crop-overlay"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <img draggable={false} src={src} alt="" className="lp-crop-image" />
      <div
        className="lp-crop-rect"
        style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
        onPointerDown={(e) => onPointerDown(e, "move")}
      >
        {HANDLE_ORDER.map((h) => (
          <span
            key={h}
            className={`lp-crop-handle lp-crop-handle-${h}`}
            onPointerDown={(e) => onPointerDown(e, h)}
          />
        ))}
      </div>
      <div className="lp-crop-actions">
        <button type="button" className="lp-crop-actions-cancel" onClick={onCancel}>
          {t("image.cancelCrop")}
        </button>
        <button type="button" className="lp-crop-actions-apply" disabled={processing} onClick={() => onApply(box)}>
          {processing ? "…" : t("image.applyCrop")}
        </button>
      </div>
    </div>
  );
}