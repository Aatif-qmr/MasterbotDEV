use crate::modules::time_travel::types::StateSnapshot;
use rusqlite::{params, Connection, Result};
use std::fs;
use std::path::PathBuf;
use std::io::Read;

pub struct TimeTravelEngine {
    conn: Connection,
}

impl TimeTravelEngine {
    pub fn open_or_create(project_path: String) -> Result<Self, String> {
        let mut path = PathBuf::from(&project_path);
        path.push(".cipher");
        
        if !path.exists() {
            fs::create_dir_all(&path).map_err(|e| e.to_string())?;
        }
        
        path.push("snapshots.db");
        
        let conn = Connection::open(path).map_err(|e| e.to_string())?;
        
        // WAL mode for performance
        conn.pragma_update(None, "journal_mode", "WAL").map_err(|e| e.to_string())?;
        
        let engine = Self { conn };
        engine.init_schema().map_err(|e| e.to_string())?;
        
        Ok(engine)
    }

    fn init_schema(&self) -> Result<()> {
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS snapshots (
                id TEXT PRIMARY KEY,
                project_path TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                chat_state BLOB NOT NULL,
                editor_state BLOB NOT NULL,
                label TEXT
            )",
            [],
        )?;

        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS commands (
                id TEXT PRIMARY KEY,
                project_path TEXT NOT NULL,
                snapshot_id TEXT NOT NULL,
                command_type TEXT NOT NULL,
                payload TEXT NOT NULL,
                inverse_payload TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                FOREIGN KEY(snapshot_id) REFERENCES snapshots(id)
            )",
            [],
        )?;

        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_snapshot_timestamp ON snapshots(timestamp DESC)",
            [],
        )?;

        Ok(())
    }

    pub fn create_snapshot(
        &self, 
        project_path: String,
        chat_json: &str,
        editor_json: &str,
        label: Option<String>
    ) -> Result<String, String> {
        let id = uuid::Uuid::new_v4().to_string();
        let timestamp = chrono::Utc::now().timestamp_millis();
        
        // Compress JSON using zstd
        let chat_compressed = zstd::encode_all(chat_json.as_bytes(), 3).map_err(|e| e.to_string())?;
        let editor_compressed = zstd::encode_all(editor_json.as_bytes(), 3).map_err(|e| e.to_string())?;
        
        self.conn.execute(
            "INSERT INTO snapshots (id, project_path, timestamp, chat_state, editor_state, label)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, project_path, timestamp, chat_compressed, editor_compressed, label],
        ).map_err(|e| e.to_string())?;
        
        Ok(id)
    }

    pub fn restore_snapshot(&self, snapshot_id: String) -> Result<(String, String), String> {
        let mut stmt = self.conn.prepare(
            "SELECT chat_state, editor_state FROM snapshots WHERE id = ?1"
        ).map_err(|e| e.to_string())?;
        
        let (chat_compressed, editor_compressed): (Vec<u8>, Vec<u8>) = stmt.query_row(params![snapshot_id], |row| {
            Ok((row.get(0)?, row.get(1)?))
        }).map_err(|e| e.to_string())?;
        
        // Decompress
        let mut chat_decoder = zstd::Decoder::new(&chat_compressed[..]).map_err(|e| e.to_string())?;
        let mut chat_json = String::new();
        chat_decoder.read_to_string(&mut chat_json).map_err(|e| e.to_string())?;
        
        let mut editor_decoder = zstd::Decoder::new(&editor_compressed[..]).map_err(|e| e.to_string())?;
        let mut editor_json = String::new();
        editor_decoder.read_to_string(&mut editor_json).map_err(|e| e.to_string())?;
        
        Ok((chat_json, editor_json))
    }

    pub fn get_timeline(&self, project_path: String, limit: i32) -> Result<Vec<StateSnapshot>, String> {
        let mut stmt = self.conn.prepare(
            "SELECT id, project_path, timestamp, label FROM snapshots WHERE project_path = ?1 ORDER BY timestamp DESC LIMIT ?2"
        ).map_err(|e| e.to_string())?;
        
        let rows = stmt.query_map(params![project_path, limit], |row| {
            Ok(StateSnapshot {
                id: row.get(0)?,
                project_path: row.get(1)?,
                timestamp: row.get(2)?,
                chat_state: Vec::new(), // Don't fetch blobs for timeline list
                editor_state: Vec::new(),
                label: row.get(3)?,
            })
        }).map_err(|e| e.to_string())?;
        
        let mut timeline = Vec::new();
        for row in rows {
            timeline.push(row.map_err(|e| e.to_string())?);
        }
        
        Ok(timeline)
    }

    pub fn cleanup_old_snapshots(&self, project_path: String, max_count: i32) -> Result<(), String> {
        self.conn.execute(
            "DELETE FROM snapshots WHERE project_path = ?1 AND id NOT IN (
                SELECT id FROM snapshots WHERE project_path = ?1 ORDER BY timestamp DESC LIMIT ?2
            )",
            params![project_path, max_count],
        ).map_err(|e| e.to_string())?;
        
        Ok(())
    }

    pub fn clear_history(&self) -> Result<(), String> {
        self.conn.execute("DELETE FROM snapshots", []).map_err(|e| e.to_string())?;
        self.conn.execute("DELETE FROM commands", []).map_err(|e| e.to_string())?;
        Ok(())
    }
}
