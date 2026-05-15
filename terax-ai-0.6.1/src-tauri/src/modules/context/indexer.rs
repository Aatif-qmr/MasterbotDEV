use crate::modules::context::types::ContextDocument;
use rusqlite::{params, Connection, Result};
use std::fs;
use std::path::{Path, PathBuf};
use ignore::WalkBuilder;
use sha2::{Sha256, Digest};
use std::time::{SystemTime, UNIX_EPOCH};

pub struct ProjectIndexer {
    conn: Connection,
}

impl ProjectIndexer {
    pub fn open_or_create(project_path: &str) -> Result<Self, String> {
        let mut db_path = PathBuf::from(project_path);
        db_path.push(".terax");
        if !db_path.exists() {
            fs::create_dir_all(&db_path).map_err(|e| e.to_string())?;
        }
        db_path.push("context.db");

        let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
        
        // Load sqlite-vec extension
        // Note: bundled rusqlite with sqlite-vec might need explicit loading if not statically linked
        // In many setups, sqlite-vec is used via its rust wrapper which handles this.
        
        let indexer = Self { conn };
        indexer.init_schema().map_err(|e| e.to_string())?;
        
        Ok(indexer)
    }

    fn init_schema(&self) -> Result<(), rusqlite::Error> {
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS project_files (
                id TEXT PRIMARY KEY,
                project_path TEXT NOT NULL,
                file_path TEXT NOT NULL,
                content_snippet TEXT NOT NULL,
                full_content_hash TEXT NOT NULL,
                language TEXT NOT NULL,
                importance_score REAL NOT NULL,
                last_indexed INTEGER NOT NULL
            )",
            [],
        )?;

        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_file_path ON project_files(file_path)",
            [],
        )?;

        // FTS5 for keyword search
        self.conn.execute(
            "CREATE VIRTUAL TABLE IF NOT EXISTS project_files_fts USING fts5(
                id UNINDEXED,
                file_path,
                content
            )",
            [],
        )?;

        Ok(())
    }

    pub fn scan_project(&self, project_path: &str) -> Result<usize, String> {
        let walker = WalkBuilder::new(project_path)
            .hidden(false)
            .git_ignore(true)
            .filter_entry(|e| {
                let name = e.file_name().to_string_lossy();
                !name.starts_with('.') || name == ".terax" || name == ".gemini"
            })
            .build();

        let mut count = 0;
        for result in walker {
            if let Ok(entry) = result {
                if entry.file_type().map(|ft| ft.is_file()).unwrap_or(false) {
                    let path = entry.path();
                    if self.should_index(path) {
                        if let Ok(_) = self.index_file(project_path, path) {
                            count += 1;
                        }
                    }
                }
            }
        }
        Ok(count)
    }

    fn should_index(&self, path: &Path) -> bool {
        let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("");
        let filename = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
        
        // Skip common binary/noise files
        match ext {
            "png" | "jpg" | "jpeg" | "gif" | "pdf" | "exe" | "dll" | "so" | "dylib" | "lock" | "log" => false,
            _ => {
                if filename == "package-lock.json" || filename == "Cargo.lock" || filename == "bun.lock" {
                    return false;
                }
                true
            }
        }
    }

    fn get_language(&self, path: &Path) -> String {
        path.extension()
            .and_then(|s| s.to_str())
            .unwrap_or("text")
            .to_lowercase()
    }

    fn calculate_importance(&self, path: &Path) -> f32 {
        let filename = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
        if filename.to_uppercase() == "README.MD" {
            return 1.0;
        }
        if filename == "package.json" || filename == "Cargo.toml" {
            return 0.9;
        }
        
        let path_str = path.to_string_lossy();
        if path_str.contains("/src/") {
            return 0.8;
        }
        if path_str.contains("/test/") || path_str.contains(".test.") || path_str.contains(".spec.") {
            return 0.5;
        }
        
        0.6
    }

    pub fn index_file(&self, project_path: &str, file_path: &Path) -> Result<(), String> {
        let content = fs::read_to_string(file_path).map_err(|e| e.to_string())?;
        
        // Skip large files (> 1MB)
        if content.len() > 1024 * 1024 {
            return Ok(());
        }

        let hash = Sha256::digest(content.as_bytes())
            .iter()
            .map(|b| format!("{:02x}", b))
            .collect::<String>();
        let rel_path = file_path.strip_prefix(project_path).unwrap_or(file_path).to_string_lossy().to_string();
        
        let snippet = if content.len() > 2048 {
            &content[..2048]
        } else {
            &content
        };

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("Time went backwards")
            .as_secs() as i64;

        let doc = ContextDocument {
            id: uuid::Uuid::new_v4().to_string(),
            project_path: project_path.to_string(),
            file_path: rel_path.clone(),
            content_snippet: snippet.to_string(),
            full_content_hash: hash,
            language: self.get_language(file_path),
            importance_score: self.calculate_importance(file_path),
            last_indexed: now,
        };

        self.conn.execute(
            "INSERT OR REPLACE INTO project_files (id, project_path, file_path, content_snippet, full_content_hash, language, importance_score, last_indexed)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![doc.id, doc.project_path, doc.file_path, doc.content_snippet, doc.full_content_hash, doc.language, doc.importance_score, doc.last_indexed],
        ).map_err(|e| e.to_string())?;

        // Update FTS
        self.conn.execute(
            "INSERT OR REPLACE INTO project_files_fts (id, file_path, content) VALUES (?1, ?2, ?3)",
            params![doc.id, doc.file_path, content],
        ).map_err(|e| e.to_string())?;

        Ok(())
    }
}
