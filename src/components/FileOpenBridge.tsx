import { useEffect } from "react";
import { isLdpPath, openLdpPath } from "@/lib/ldpOpen";

/**
 * Functional-only bridge for OS-delivered `.ldp` documents. Renders nothing.
 *
 * Registers the incoming-file plumbing that is not part of the editor UI:
 * - `linkdit://open-file` events emitted by the Rust backend (second launch
 *   of a single instance, or a dropped/associated file).
 * - Native drag-and-drop of `.ldp` files onto the application window.
 * - The pending file path captured in Rust when the app was launched with an
 *   associated document as a command-line argument (first launch).
 *
 * Everything is guarded so the app still works when it is loaded outside the
 * Tauri runtime (plain browser preview).
 */
export function FileOpenBridge() {
  useEffect(() => {
    let disposed = false;
    const unlisteners: Array<() => void> = [];

    (async () => {
      try {
        const [{ listen }, { getCurrentWebview }, { invoke }] = await Promise.all([
          import("@tauri-apps/api/event"),
          import("@tauri-apps/api/webview"),
          import("@tauri-apps/api/core"),
        ]);
        if (disposed) return;

        const unlistenEvent = await listen<string>("linkdit://open-file", (event) => {
          if (!disposed) void openLdpPath(event.payload);
        });
        unlisteners.push(unlistenEvent);

        const unlistenDrop = await getCurrentWebview().onDragDropEvent((event) => {
          if (disposed || event.payload.type !== "drop") return;
          for (const path of event.payload.paths) {
            if (isLdpPath(path)) void openLdpPath(path);
          }
        });
        unlisteners.push(unlistenDrop);

        const pending = await invoke<string | null>("take_pending_open_path");
        if (pending) {
          setTimeout(() => {
            if (!disposed) void openLdpPath(pending);
          }, 400);
        }
      } catch {
        // Not running inside the Tauri runtime (browser preview): the
        // OS-level file delivery channels are unavailable, so there is
        // nothing to listen for.
      }
    })();

    return () => {
      disposed = true;
      for (const unlisten of unlisteners) unlisten();
    };
  }, []);

  return null;
}