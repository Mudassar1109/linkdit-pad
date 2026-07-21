use serde::Serialize;
use thiserror::Error;

/// Unified error type for LinkDit Pad's Rust backend. Every command
/// returns `AppResult<T>` so failures surface as typed, readable
/// messages in the frontend rather than opaque panics.
#[derive(Debug, Error)]
pub enum AppError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("Serialization error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error("{0}")]
    Message(String),
}

// Tauri requires command errors to implement `Serialize`.
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
