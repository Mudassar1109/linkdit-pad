use rusqlite::Connection;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

use crate::error::AppError;

/// Wraps the single SQLite connection shared across commands.
/// LinkDit Pad's data model (documents, recent files, tags,
/// version history) grows here in Phase 3.
pub struct Db(pub Mutex<Connection>);

pub fn init(app: &AppHandle) -> Result<(), AppError> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Message(e.to_string()))?;
    std::fs::create_dir_all(&app_dir)?;

    let db_path = app_dir.join("linkdit.sqlite");
    let conn = Connection::open(db_path)?;

    conn.execute_batch(
        r#"
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS documents (
            id            TEXT PRIMARY KEY,
            title         TEXT NOT NULL,
            file_path     TEXT UNIQUE,
            content       TEXT NOT NULL DEFAULT '',
            mode          TEXT NOT NULL DEFAULT 'plain',
            direction     TEXT NOT NULL DEFAULT 'ltr',
            is_pinned     INTEGER NOT NULL DEFAULT 0,
            created_at    TEXT NOT NULL,
            updated_at    TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS recent_files (
            path            TEXT PRIMARY KEY,
            title           TEXT NOT NULL,
            last_opened_at  TEXT NOT NULL,
            is_pinned       INTEGER NOT NULL DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents (updated_at DESC);
        "#,
    )?;

    app.manage(Db(Mutex::new(conn)));
    Ok(())
}
