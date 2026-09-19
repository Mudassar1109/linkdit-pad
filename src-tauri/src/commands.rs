use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

use crate::db::Db;
use crate::error::AppError;
use crate::AppResult;

/// Holds a `.ldp` file path delivered through the OS (double-click file
/// association or a command-line argument) until the frontend is ready to
/// pick it up. It is also set by the single-instance callback so the second
/// launch’s argument survives even if the running window hasn’t finished
/// registering its event listener yet.
pub(crate) static PENDING_OPEN_PATH: Mutex<Option<String>> = Mutex::new(None);

/// Extracts the first `.ldp` file path from a command-line argument list.
/// The leading executable argument (argv[0]) and any stray quotes are ignored.
pub(crate) fn extract_open_path(args: &[String]) -> Option<String> {
    args.iter()
        .map(|a| a.trim_matches('"').to_string())
        .find(|a| a.to_lowercase().ends_with(".ldp"))
}

/// Returns and clears the pending file path captured at application startup.
/// The frontend polls this once on mount so the window can open the document
/// that launched the app (e.g. double-clicking an associated `.ldp` file).
#[tauri::command]
pub fn take_pending_open_path() -> Option<String> {
    PENDING_OPEN_PATH
        .lock()
        .ok()
        .and_then(|mut guard| guard.take())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DocumentPayload {
    pub id: String,
    pub title: String,
    pub file_path: Option<String>,
    pub content: String,
    pub mode: String,
    pub direction: String,
}

#[derive(Debug, Serialize)]
pub struct RecentFile {
    pub path: String,
    pub title: String,
    pub last_opened_at: String,
    pub is_pinned: bool,
}

/// Reads a document from disk by absolute path.
#[tauri::command]
pub fn open_document(path: String) -> AppResult<String> {
    std::fs::read_to_string(&path).map_err(AppError::from)
}

/// Persists a document's content to disk and upserts its record in
/// SQLite (title, mode, direction, timestamps) plus the recent-files
/// index used by the sidebar.
#[tauri::command]
pub fn save_document(db: State<'_, Db>, payload: DocumentPayload) -> AppResult<()> {
    if let Some(path) = &payload.file_path {
        std::fs::write(path, &payload.content)?;
    }

    let now = Utc::now().to_rfc3339();
    let conn = db.0.lock().map_err(|_| AppError::Message("DB lock poisoned".into()))?;

    conn.execute(
        r#"
        INSERT INTO documents (id, title, file_path, content, mode, direction, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)
        ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            file_path = excluded.file_path,
            content = excluded.content,
            mode = excluded.mode,
            direction = excluded.direction,
            updated_at = excluded.updated_at
        "#,
        rusqlite::params![
            payload.id,
            payload.title,
            payload.file_path,
            payload.content,
            payload.mode,
            payload.direction,
            now
        ],
    )?;

    if let Some(path) = &payload.file_path {
        conn.execute(
            r#"
            INSERT INTO recent_files (path, title, last_opened_at, is_pinned)
            VALUES (?1, ?2, ?3, 0)
            ON CONFLICT(path) DO UPDATE SET
                title = excluded.title,
                last_opened_at = excluded.last_opened_at
            "#,
            rusqlite::params![path, payload.title, now],
        )?;
    }

    Ok(())
}

/// Returns the most recently opened files, newest first.
#[tauri::command]
pub fn list_recent_files(db: State<'_, Db>) -> AppResult<Vec<RecentFile>> {
    let conn = db.0.lock().map_err(|_| AppError::Message("DB lock poisoned".into()))?;
    let mut stmt = conn.prepare(
        "SELECT path, title, last_opened_at, is_pinned FROM recent_files ORDER BY last_opened_at DESC LIMIT 50",
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(RecentFile {
            path: row.get(0)?,
            title: row.get(1)?,
            last_opened_at: row.get(2)?,
            is_pinned: row.get::<_, i64>(3)? != 0,
        })
    })?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row?);
    }
    Ok(results)
}

#[tauri::command]
pub fn app_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}
