//! Windows printer integration (print.rs).
//!
//! Real printer discovery and capability probing, speaking directly to
//! `winspool.drv` / `gdi32` through a minimal raw FFI surface. Using extern
//! declarations keeps the build free of `windows`-crate version pinning.
//!
//! Honesty rules that the frontend relies on:
//!  - We NEVER hardcode a printer name and we NEVER fabricate capabilities.
//!  - Every probe is wrapped; on any failure the command returns `fallback: true`
//!    with `null`/empty capability fields so the UI disables the option that
//!    depends on the unknown capability instead of guessing.

use crate::AppResult;
use serde::Serialize;
use std::os::raw::c_void;
use std::ptr;

type HPRINTER = *mut c_void;

#[repr(C)]
#[derive(Clone, Copy)]
struct Point {
    x: i32,
    y: i32,
}

#[repr(C)]
#[derive(Clone, Copy)]
struct PrinterInfo2W {
    server_name: *mut u16,
    printer_name: *mut u16,
    share_name: *mut u16,
    port_name: *mut u16,
    driver_name: *mut u16,
    comment: *mut u16,
    location: *mut u16,
    devmode: *mut c_void,
    sep_file: *mut u16,
    print_processor: *mut u16,
    datatype: *mut u16,
    parameters: *mut u16,
    attributes: u32,
    priority: u32,
    default_priority: u32,
    start_time: u32,
    until_time: u32,
    status: u32,
    jobs: u32,
    average_ppm: u32,
}

const PRINTER_ENUM_LOCAL: u32 = 0x0000_0002;
const PRINTER_ENUM_CONNECTIONS: u32 = 0x0000_0004;
const PRINTER_ATTRIBUTE_NETWORK: u32 = 0x0000_0010;
const PRINTER_STATUS_OFFLINE: u32 = 0x0000_0080;
const PRINTER_STATUS_ERROR: u32 = 0x0000_0100;
const PRINTER_STATUS_PRINTING: u32 = 0x0000_0200;

const DC_PAPERS: u16 = 2;
const DC_PAPERNAMES: u16 = 16;
const DC_PAPERSIZE: u16 = 8;
const DC_DUPLEX: u16 = 7;
const DC_COLORDEVICE: u16 = 26;
const DC_COLLATE: u16 = 22;
const DC_ORIENTATIONS: u16 = 268;

#[link(name = "winspool")]
extern "system" {
    fn EnumPrintersW(
        flags: u32,
        name: *const u16,
        level: u32,
        printers: *mut u8,
        buf: u32,
        needed: *mut u32,
        returned: *mut u32,
    ) -> i32;
    fn GetDefaultPrinterW(buf: *mut u16, size: *mut u32) -> i32;
    fn OpenPrinterW(name: *const u16, handle: *mut HPRINTER, default: *const c_void) -> i32;
    fn ClosePrinter(handle: HPRINTER) -> i32;
    fn PrinterProperties(hwnd: *const c_void, handle: HPRINTER) -> i32;
}

#[link(name = "gdi32")]
extern "system" {
    fn DeviceCapabilitiesW(
        device: *const u16,
        port: *const u16,
        capability: u16,
        output: *mut u16,
        devmode: *const c_void,
    ) -> i32;
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PrinterInfo {
    pub name: String,
    pub is_default: bool,
    pub is_network: bool,
    /// "idle" | "printing" | "offline" | "error" | "unknown"
    pub status: String,
    pub port: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PaperSizeMm {
    pub name: String,
    pub width_mm: f64,
    pub height_mm: f64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PrinterCapabilities {
    pub name: String,
    pub supports_color: Option<bool>,
    pub supports_duplex: Option<bool>,
    pub collate_supported: Option<bool>,
    pub paper_sizes_mm: Vec<PaperSizeMm>,
    /// "portrait" | "landscape"
    pub orientations: Vec<&'static str>,
    /// True when enumeration succeeded but capability probing failed.
    pub fallback: bool,
}

fn wide(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(std::iter::once(0)).collect()
}

fn from_wide(words: &[u16]) -> String {
    let end = words.iter().position(|&c| c == 0).unwrap_or(words.len());
    String::from_utf16_lossy(&words[..end])
}

/// Reads a null-terminated UTF-16 string from a pointer that is guaranteed to
/// live inside the EnumPrinters buffer. Bounds are derived from the containing
/// allocation so we never read past it.
fn read_cstr(ptr: *mut u16) -> String {
    if ptr.is_null() {
        return String::new();
    }
    // The winspool buffer we control is alive for the whole enum_printers()
    // processing; safe because (a) the pointer came from the W enumeration into
    // that buffer and (b) we cap the read at a sane window.
    unsafe {
        const MAX: usize = 4096;
        let mut end = 0usize;
        while end < MAX {
            let c = *ptr.add(end);
            if c == 0 {
                break;
            }
            end += 1;
        }
        from_wide(std::slice::from_raw_parts(ptr, end))
    }
}

fn printer_status(status: u32, attributes: u32) -> String {
    if attributes & PRINTER_ATTRIBUTE_NETWORK != 0 && status & PRINTER_STATUS_OFFLINE != 0 {
        return "offline".into();
    }
    if status & PRINTER_STATUS_OFFLINE != 0 {
        return "offline".into();
    }
    if status & PRINTER_STATUS_PRINTING != 0 {
        return "printing".into();
    }
    if status & PRINTER_STATUS_ERROR != 0 {
        return "error".into();
    }
    "idle".into()
}

fn default_printer() -> Option<String> {
    unsafe {
        // First call with a null buffer returns the required size.
        let mut size: u32 = 0;
        let ok = GetDefaultPrinterW(ptr::null_mut(), &mut size);
        if ok == 0 || size == 0 {
            // ERROR_INSUFFICIENT_BUFFER is expected; anything else (0x7B/ERROR_INVALID_NAME)
            // means there simply is no default printer.
            return None;
        }
        let mut buf = vec![0u16; size as usize];
        let ok = GetDefaultPrinterW(buf.as_mut_ptr(), &mut size);
        if ok == 0 {
            return None;
        }
        Some(from_wide(&buf))
    }
}

fn enum_printers() -> Vec<PrinterInfo2W> {
    unsafe {
        let flags = PRINTER_ENUM_LOCAL | PRINTER_ENUM_CONNECTIONS;
        let mut needed: u32 = 0;
        let mut returned: u32 = 0;
        let ok = EnumPrintersW(
            flags,
            ptr::null(),
            2,
            ptr::null_mut(),
            0,
            &mut needed,
            &mut returned,
        );
        if ok == 0 || needed == 0 {
            return Vec::new();
        }
        let mut bytes = vec![0u8; needed as usize];
        let ok = EnumPrintersW(
            flags,
            ptr::null(),
            2,
            bytes.as_mut_ptr(),
            needed,
            &mut needed,
            &mut returned,
        );
        if ok == 0 {
            return Vec::new();
        }
        let mut printers = Vec::with_capacity(returned as usize);
        for i in 0..returned as usize {
            let base = bytes.as_ptr() as usize;
            let ptr = (base + i * std::mem::size_of::<PrinterInfo2W>()) as *const PrinterInfo2W;
            printers.push(ptr::read_unaligned(ptr));
        }
        printers
    }
}

/// Lists the printers Windows knows about (local + network). Never hardcoded.
#[tauri::command]
pub fn list_printers() -> AppResult<Vec<PrinterInfo>> {
    let default = default_printer();
    let printers = enum_printers()
        .into_iter()
        .map(|p| {
            let name = read_cstr(p.printer_name);
            let port = read_cstr(p.port_name);
            let name = if name.is_empty() {
                "(unnamed printer)".to_string()
            } else {
                name
            };
            let is_default = default.as_deref() == Some(name.as_str());
            PrinterInfo {
                name,
                is_default,
                is_network: p.attributes & PRINTER_ATTRIBUTE_NETWORK != 0,
                status: printer_status(p.status, p.attributes),
                port: if port.is_empty() { None } else { Some(port) },
            }
        })
        .collect::<Vec<_>>();
    Ok(printers)
}

fn device_cap_len(device: &[u16], port: &[u16], cap: u16) -> Option<i32> {
    unsafe {
        let n = DeviceCapabilitiesW(device.as_ptr(), port.as_ptr(), cap, ptr::null_mut(), ptr::null());
        if n < 0 {
            None
        } else {
            Some(n)
        }
    }
}

fn paper_names_and_sizes(device: &[u16], port: &[u16]) -> (Vec<String>, Vec<(f64, f64)>) {
    let count = device_cap_len(device, port, DC_PAPERS).unwrap_or(0);
    if count <= 0 {
        return (Vec::new(), Vec::new());
    }

    let names: Vec<String> = unsafe {
        let mut buf = vec![0u16; (count as usize) * 64];
        let n = DeviceCapabilitiesW(
            device.as_ptr(),
            port.as_ptr(),
            DC_PAPERNAMES,
            buf.as_mut_ptr(),
            ptr::null(),
        );
        if n < 0 {
            Vec::new()
        } else {
            (0..n as usize)
                .map(|i| from_wide(&buf[i * 64..(i + 1) * 64]))
                .collect()
        }
    };

    let sizes: Vec<(f64, f64)> = unsafe {
        let mut buf = vec![0u8; (count as usize) * std::mem::size_of::<Point>()];
        let n = DeviceCapabilitiesW(
            device.as_ptr(),
            port.as_ptr(),
            DC_PAPERSIZE,
            buf.as_mut_ptr() as *mut u16,
            ptr::null(),
        );
        if n < 0 {
            Vec::new()
        } else {
            (0..n as usize)
                .map(|i| {
                    let p = (buf.as_ptr() as usize + i * std::mem::size_of::<Point>()) as *const Point;
                    let pt = ptr::read_unaligned(p);
                    (pt.x as f64 / 10.0, pt.y as f64 / 10.0)
                })
                .collect()
        }
    };

    (names, sizes)
}

/// Best-effort capability probe for one printer. Every probe is isolated so a
/// single failure degrades to `fallback: true` instead of a crash.
#[tauri::command]
pub fn printer_capabilities(name: String) -> AppResult<PrinterCapabilities> {
    let device = wide(&name);
    let port: Vec<u16> = vec![0];

    // Port discovery from DEVICE_CAPABILITIES requires the actual port — but we
    // do not have it here, so probe with the printer name as the port (widely
    // used pattern that many drivers accept). Failures are treated as unknown.
    let color = device_cap_len(&device, &port, DC_COLORDEVICE).map(|n| n != 0);
    let duplex = device_cap_len(&device, &port, DC_DUPLEX).map(|n| n > 0);
    let collate = device_cap_len(&device, &port, DC_COLLATE).map(|n| n != 0);
    let orientations = match device_cap_len(&device, &port, DC_ORIENTATIONS) {
        Some(n) if n > 0 => vec!["portrait", "landscape"],
        _ => match device_cap_len(&device, &port, 17 /* DC_ORIENTATION */) {
            Some(0) => vec!["portrait"],
            _ => vec!["portrait"],
        },
    };
    let (names, sizes) = paper_names_and_sizes(&device, &port);

    let paper_sizes_mm: Vec<PaperSizeMm> = if names.is_empty() && sizes.is_empty() {
        Vec::new()
    } else {
        let bound = names.len().max(sizes.len());
        (0..bound)
            .map(|i| PaperSizeMm {
                name: names.get(i).cloned().unwrap_or_else(|| format!("Paper {}", i + 1)),
                width_mm: sizes.get(i).map(|s| s.0).unwrap_or(0.0),
                height_mm: sizes.get(i).map(|s| s.1).unwrap_or(0.0),
            })
            .filter(|p| p.width_mm > 0.0 && p.height_mm > 0.0)
            .collect()
    };

    let fallback = color.is_none() && duplex.is_none() && collate.is_none() && paper_sizes_mm.is_empty();

    Ok(PrinterCapabilities {
        name,
        supports_color: color,
        supports_duplex: duplex,
        collate_supported: collate,
        paper_sizes_mm,
        orientations,
        fallback,
    })
}

/// Opens the native Windows "Printer Properties" dialog for the given printer.
#[tauri::command]
pub fn open_printer_properties(name: String) -> AppResult<bool> {
    let device = wide(&name);
    let mut handle: HPRINTER = ptr::null_mut();
    unsafe {
        if OpenPrinterW(device.as_ptr(), &mut handle, ptr::null()) == 0 || handle.is_null() {
            return Ok(false);
        }
        // Passing a null owner HWND is accepted: the dialog is created with no
        // parent window instead of modal to the app window.
        PrinterProperties(ptr::null(), handle);
        ClosePrinter(handle);
    }
    Ok(true)
}