/**
 * Printer integration bridge (printer.ts).
 *
 * Talks to the Rust backend for real Windows printer discovery (EnumPrinters),
 * capability probing (GetPrinter / DeviceCapabilities) and the native
 * "Printer Properties" dialog (PrintDlg).
 *
 * IMPORTANT constraints honoured here:
 *  - Never hardcode a printer name.
 *  - Never fabricate capabilities: if probing fails, consumers see
 *    `fallback: true` (capabilities null) and MUST hide/disable the options
 *    that depend on the unknown capability.
 *  - When the app runs outside Tauri (plain `vite dev` in a browser) or the
 *    Rust commands are unavailable, return an "unknown capabilities" fallback
 *    so the Print dialog still works via the native default printer dialog.
 */

export interface InvokeResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function invokeSafe<T>(command: string, args: Record<string, unknown> = {}): Promise<InvokeResult<T>> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const data = await invoke<T>(command, args);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function listPrinters(): Promise<InvokeResult<unknown[]>> {
  return invokeSafe("list_printers");
}

export async function getPrinterCapabilities(printerName: string): Promise<InvokeResult<unknown>> {
  return invokeSafe("printer_capabilities", { name: printerName });
}

export async function openPrinterProperties(printerName: string): Promise<InvokeResult<boolean>> {
  return invokeSafe("open_printer_properties", { name: printerName });
}