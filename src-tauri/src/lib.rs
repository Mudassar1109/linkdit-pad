mod commands;
mod db;
mod error;

use error::AppError;

/// Application entry point invoked from `main.rs`. Wires together the
/// Tauri plugins (filesystem, dialog, key-value store) and exposes the
/// Rust command surface consumed by the React frontend via `invoke()`.
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            db::init(app.handle()).map_err(|e| e.to_string())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::open_document,
            commands::save_document,
            commands::list_recent_files,
            commands::app_version,
        ])
        .run(tauri::generate_context!())
        .expect("error while running LinkDit Pad");
}

pub type AppResult<T> = Result<T, AppError>;
