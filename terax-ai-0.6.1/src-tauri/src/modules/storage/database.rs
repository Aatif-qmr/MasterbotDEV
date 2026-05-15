use crate::modules::storage::types::DbMessage;
use rusqlite::{params, Connection, Result};
use std::fs;
use std::path::PathBuf;

pub struct ProjectDatabase {
    conn: Connection,
}

impl ProjectDatabase {
    pub fn open_or_create(project_path: String) -> Result<Self, String> {
        let mut path = PathBuf::from(&project_path);
        path.push(".cipher");
        
        if !path.exists() {
            fs::create_dir_all(&path).map_err(|e| e.to_string())?;
        }
        
        path.push("context.db");
        
        let conn = Connection::open(path).map_err(|e| e.to_string())?;
        
        // Enable WAL mode for performance
        conn.pragma_update(None, "journal_mode", "WAL").map_err(|e| e.to_string())?;
        
        let db = Self { conn };
        db.init_schema().map_err(|e| e.to_string())?;
        
        Ok(db)
    }

    fn init_schema(&self) -> Result<()> {
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                tool_calls TEXT,
                timestamp INTEGER NOT NULL
            )",
            [],
        )?;

        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_timestamp ON messages(timestamp DESC)",
            [],
        )?;

        Ok(())
    }

    pub fn save_message(&self, msg: DbMessage) -> Result<(), String> {
        self.conn.execute(
            "INSERT OR REPLACE INTO messages (id, role, content, tool_calls, timestamp)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![msg.id, msg.role, msg.content, msg.tool_calls, msg.timestamp],
        ).map_err(|e| e.to_string())?;
        
        Ok(())
    }

    pub fn get_history(&self, limit: i32) -> Result<Vec<DbMessage>, String> {
        let mut stmt = self.conn.prepare(
            "SELECT id, role, content, tool_calls, timestamp FROM messages ORDER BY timestamp DESC LIMIT ?1"
        ).map_err(|e| e.to_string())?;
        
        let rows = stmt.query_map(params![limit], |row| {
            Ok(DbMessage {
                id: row.get(0)?,
                role: row.get(1)?,
                content: row.get(2)?,
                tool_calls: row.get(3)?,
                timestamp: row.get(4)?,
            })
        }).map_err(|e| e.to_string())?;
        
        let mut history = Vec::new();
        for row in rows {
            history.push(row.map_err(|e| e.to_string())?);
        }
        
        // Return in chronological order
        history.reverse();
        Ok(history)
    }

    pub fn clear_history(&self) -> Result<(), String> {
        self.conn.execute("DELETE FROM messages", []).map_err(|e| e.to_string())?;
        Ok(())
    }
}
