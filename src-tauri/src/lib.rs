mod commands;
mod db;
mod error;
mod print;

use error::AppError;
use tauri::{Emitter, Manager};

/// Application entry point invoked from `main.rs`. Wires together the
/// Tauri plugins (filesystem, dialog, key-value store, single-instance)
/// and exposes the Rust command surface consumed by the React frontend via
/// `invoke()`.
///
/// `.ldp` files delivered by the OS (double-click on an associated document,
/// or a second launch while the app is running) are captured here and
/// forwarded to the main window via the `linkdit://open-file` event plus a
/// `take_pending_open_path` command that the frontend polls on startup.
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(path) = commands::extract_open_path(&argv) {
                if let Ok(mut pending) = commands::PENDING_OPEN_PATH.lock() {
                    *pending = Some(path.clone());
                }
                let _ = app.emit("linkdit://open-file", path);
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.set_focus();
                }
            }
        }))
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            db::init(app.handle()).map_err(|e| e.to_string())?;

            let args = std::env::args().collect::<Vec<_>>();
            if let Some(path) = commands::extract_open_path(&args) {
                if let Ok(mut pending) = commands::PENDING_OPEN_PATH.lock() {
                    *pending = Some(path);
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::open_document,
            commands::save_document,
            commands::list_recent_files,
            commands::app_version,
            commands::take_pending_open_path,
            print::list_printers,
            print::printer_capabilities,
            print::open_printer_properties,
        ])
        .run(tauri::generate_context!())
        .expect("error while running LinkDit Pad");
}

pub type AppResult<T> = Result<T, AppError>;