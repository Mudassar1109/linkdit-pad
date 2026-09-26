import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { CropOverlay, type CropResizeHandle } from "./CropOverlay";
import { ImageToolbar, type ImageToolbarAttrs } from "./ImageToolbar";
import {
  clamp,
  cropToDataUrl,
  editorContentWidth,
  MIN_IMAGE_SIZE,
  type CropBox,
} from "./imageTools";
import { useI18nStore } from "@/store/useI18nStore";
import { useToastStore } from "@/store/useToastStore";

const HANDLE_POSITIONS: CropResizeHandle[] = ["tl", "tc", "tr", "ml", "mr", "bl", "bc", "br"];

export function ImageNodeView({ node, selected, editor, getPos, updateAttributes, deleteNode }: NodeViewProps) {
  const t = useI18nStore((s) => s.t);

  const src = (node.attrs.src as string | null | undefined) ?? "";
  const alt = (node.attrs.alt as string | null | undefined) ?? "";
  const title = (node.attrs.title as string | null | undefined) ?? "";
  const attrW = (node.attrs.width as number | null | undefined) ?? null;
  const attrH = (node.attrs.height as number | null | undefined) ?? null;
  const align = (node.attrs.dataAlign as string | undefined) ?? "left";
  const display = (node.attrs.dataDisplay as string | undefined) ?? "block";
  const aspectLocked = (node.attrs.dataAspectLocked as boolean | undefined) !== false;

  const imgRef = useRef<HTMLImageElement | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [cropActive, setCropActive] = useState(false);
  const [cropping, setCropping] = useState(false);
  const cropRef = useRef(false);
  const editableBeforeRef = useRef(true);

  const styleW = attrW;
  const styleH = attrH;
  const toolbarW = attrW ?? natural?.w ?? 0;
  const toolbarH = attrH ?? natural?.h ?? 0;

  const handleLoad = () => {
    const el = imgRef.current;
    if (!el) return;
    setNatural({
      w: el.naturalWidth || el.clientWidth || 0,
      h: el.naturalHeight || el.clientHeight || 0,
    });
    setLoadFailed(false);
  };

  const handleError = () => {
    setLoadFailed(true);
    setNatural(null);
  };

  useEffect(() => {
    setNatural(null);
    setLoadFailed(false);
  }, [src]);

  useEffect(() => {
    if (!selected && !cropActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      if (cropRef.current) {
        exitCrop();
      } else {
        const pos = getPos();
        const to = pos + node.nodeSize;
        editor.chain().focus().setTextSelection(to).run();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, cropActive, node, editor]);

  const exitCrop = () => {
    cropRef.current = false;
    setCropActive(false);
    if (!editor.isDestroyed && !editor.isEditable) {
      editor.setEditable(editableBeforeRef.current === true);
    }
  };

  const enterCrop = () => {
    if (!src || !imgRef.current) return;
    editableBeforeRef.current = editor.isEditable;
    cropRef.current = true;
    setCropActive(true);
    editor.setEditable(false);
  };

  useEffect(() => {
    return () => {
      if (cropRef.current && !editor.isDestroyed && !editor.isEditable) {
        editor.setEditable(editableBeforeRef.current === true);
      }
    };
  }, [editor]);

  const onWrapperPointerDown = (e: ReactPointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest && target.closest(".lp-image-handle, .lp-crop-overlay")) return;
    const pos = getPos();
    if (Number.isInteger(pos) && pos >= 0) {
      editor.commands.setNodeSelection(pos);
    }
  };

  const onHandlePointerDown = (e: ReactPointerEvent<HTMLButtonElement>, handlePos: CropResizeHandle) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = getPos();
    if ((e.button === 0 || e.pointerType !== "mouse") && !selected) {
      if (Number.isInteger(pos) && pos >= 0) {
        editor.commands.setNodeSelection(pos);
      }
    }
    if (cropRef.current) return;
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const startW = rect.width;
    const startH = rect.height;
    if (startW < 1 || startH < 1) return;
    const aspect = startW / startH;
    const maxW = editorContentWidth(editor);
    const ox = e.clientX;
    const oy = e.clientY;
    const dirX = handlePos.includes("r") ? 1 : handlePos.includes("l") ? -1 : 0;
    const dirY = handlePos.includes("b") ? 1 : handlePos.includes("t") ? -1 : 0;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - ox;
      const dy = ev.clientY - oy;
      const el = imgRef.current;
      if (!el) return;
      const a = aspect > 0 ? aspect : 1;
      let w: number;
      let h: number;
      if (aspectLocked && aspect > 0) {
        if (dirY !== 0 && dirX === 0) {
          h = startH + dy;
          w = h * a;
        } else {
          w = startW + dx;
          h = w / a;
        }
      } else {
        w = startW + (dirX !== 0 ? dx : 0);
        h = startH + (dirY !== 0 ? dy : 0);
      }
      w = clamp(w, MIN_IMAGE_SIZE, maxW);
      h = clamp(h, MIN_IMAGE_SIZE, aspect > 0 && maxW / a > MIN_IMAGE_SIZE ? maxW / a : maxW);
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const el = imgRef.current;
      if (!el) return;
      const w = parseFloat(el.style.width);
      const h = parseFloat(el.style.height);
      if (w > 0 && h > 0) {
        updateAttributes({ width: Math.round(w), height: Math.round(h) });
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const onToolbarChange = (attrs: ImageToolbarAttrs) => {
    const maxW = editorContentWidth(editor);
    const curW = attrW ?? natural?.w;
    const curH = attrH ?? natural?.h;
    const aspect = curW && curH ? curW / curH : undefined;
    const locked = attrs.dataAspectLocked ?? aspectLocked;
    const out: Record<string, unknown> = { ...attrs };
    if (attrs.width !== undefined || attrs.height !== undefined) {
      let w = attrs.width ?? curW ?? maxW;
      let h = attrs.height ?? curH ?? (aspect ? w / aspect : w);
      if (locked && aspect && aspect > 0) {
        if (attrs.height !== undefined && attrs.width === undefined) {
          w = h * aspect;
        }
        w = clamp(w, MIN_IMAGE_SIZE, maxW);
        h = w / aspect;
      } else {
        w = clamp(w, MIN_IMAGE_SIZE, maxW);
        h = clamp(h, MIN_IMAGE_SIZE, aspect && aspect > 0 ? Math.max(maxW / aspect, MIN_IMAGE_SIZE) : maxW);
      }
      out.width = Math.round(w);
      out.height = Math.round(h);
    }
    updateAttributes(out);
  };

  const onCropApply = async (boxPx: CropBox) => {
    const el = imgRef.current;
    const nw = natural?.w ?? el?.naturalWidth ?? 0;
    const nh = natural?.h ?? el?.naturalHeight ?? 0;
    if (!el || !src || nw <= 0 || nh <= 0 || boxPx.w < 1 || boxPx.h < 1) {
      useToastStore.getState().show("error", t("image.cropError"));
      exitCrop();
      return;
    }
    const rect = el.getBoundingClientRect();
    const scaleX = nw / rect.width;
    const scaleY = nh / rect.height;
    const bitmap: CropBox = {
      x: boxPx.x * scaleX,
      y: boxPx.y * scaleY,
      w: boxPx.w * scaleX,
      h: boxPx.h * scaleY,
    };
    setCropping(true);
    try {
      const newSrc = await cropToDataUrl(src, bitmap);
      updateAttributes({
        src: newSrc,
        width: Math.max(1, Math.round(boxPx.w)),
        height: Math.max(1, Math.round(boxPx.h)),
      });
      exitCrop();
    } catch (err) {
      const unavail = err instanceof Error && err.message === "image-load-failed";
      useToastStore
        .getState()
        .show("error", unavail ? t("image.cropUnavailable") : t("image.cropError"));
      exitCrop();
    } finally {
      setCropping(false);
    }
  };

  const maxW = editorContentWidth(editor);
  const containerClamped = styleW != null && styleW > maxW;

  return (
    <NodeViewWrapper
      className={`lp-image ${selected && !cropActive ? "lp-image-selected" : ""} ${containerClamped ? "lp-image-clamped" : ""}`}
      data-align={align}
      data-display={display}
      data-aspect-locked={aspectLocked ? "true" : "false"}
      onPointerDown={onWrapperPointerDown}
    >
      {loadFailed ? (
        <div className="lp-image-broken" role="img" aria-label={t("image.loadFailed")}>
          <span>{t("image.loadFailed")}</span>
        </div>
      ) : (
        <img
          ref={imgRef}
          src={src}
          alt={alt || t("image.altFallback")}
          title={title ?? undefined}
          data-align={align}
          data-display={display}
          style={styleW ? { width: `${styleW}px`, height: styleH ? `${styleH}px` : undefined } : undefined}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

      {cropActive && imgRef.current && (
        <CropOverlay
          src={src}
          anchorRef={imgRef}
          processing={cropping}
          onApply={(box) => void onCropApply(box)}
          onCancel={exitCrop}
        />
      )}

      {selected && !cropActive && !loadFailed && (
        <>
          {HANDLE_POSITIONS.map((pos) => (
            <button
              key={pos}
              type="button"
              aria-label={`${t("image.resizeHandle")} ${pos}`}
              className={`lp-image-handle lp-image-handle-${pos}`}
              onPointerDown={(e) => onHandlePointerDown(e, pos)}
              onDragStart={(e) => e.preventDefault()}
            />
          ))}
          <div className="lp-image-toolbar-anchor" aria-hidden="true" />
          <ImageToolbar
            anchor={imgRef.current}
            width={toolbarW}
            height={toolbarH}
            aspectLocked={aspectLocked}
            align={align}
            display={display}
            onChange={onToolbarChange}
            onCrop={enterCrop}
            onDelete={deleteNode}
          />
        </>
      )}
    </NodeViewWrapper>
  );
}