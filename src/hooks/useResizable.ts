import { useCallback, useRef } from "react";

interface UseResizableOptions {
  initialSize: number;
  minSize: number;
  maxSize: number;
  direction: "left" | "right";
  onResize?: (size: number) => void;
}

export function useResizable({ initialSize, minSize, maxSize, direction, onResize }: UseResizableOptions) {
  const sizeRef = useRef(initialSize);
  const startXRef = useRef(0);
  const startSizeRef = useRef(initialSize);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startXRef.current = e.clientX;
    startSizeRef.current = sizeRef.current;

    const handleMouseMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startXRef.current;
      const newSize = direction === "left"
        ? Math.max(minSize, Math.min(maxSize, startSizeRef.current - delta))
        : Math.max(minSize, Math.min(maxSize, startSizeRef.current + delta));
      sizeRef.current = newSize;
      onResize?.(newSize);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [direction, minSize, maxSize, onResize]);

  return { handleMouseDown, sizeRef };
}
