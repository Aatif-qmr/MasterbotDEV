use crate::modules::context::types::{ContextDocument, ContextQuery};
use rusqlite::{params, Connection, Result};

pub struct ContextRetriever {
    conn: Connection,
}

impl ContextRetriever {
    pub fn open(project_path: &str) -> Result<Self, String> {
        let mut db_path = std::path::PathBuf::from(project_path);
        db_path.push(".terax");
        db_path.push("context.db");

        let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
        Ok(Self { conn })
    }

    pub fn hybrid_search(&self, query: &ContextQuery) -> Result<Vec<ContextDocument>, String> {
        // Hybrid: FTS search for keywords + relevance score based on importance and recency
        let mut stmt = self.conn.prepare(
            "SELECT p.id, p.project_path, p.file_path, p.content_snippet, p.full_content_hash, p.language, p.importance_score, p.last_indexed 
             FROM project_files p
             JOIN project_files_fts f ON p.id = f.id
             WHERE project_files_fts MATCH ?1
             ORDER BY rank, importance_score DESC
             LIMIT 20"
        ).map_err(|e| e.to_string())?;

        let rows = stmt.query_map(params![query.query_text], |row| {
            Ok(ContextDocument {
                id: row.get(0)?,
                project_path: row.get(1)?,
                file_path: row.get(2)?,
                content_snippet: row.get(3)?,
                full_content_hash: row.get(4)?,
                language: row.get(5)?,
                importance_score: row.get(6)?,
                last_indexed: row.get(7)?,
            })
        }).map_err(|e| e.to_string())?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row.map_err(|e| e.to_string())?);
        }

        Ok(results)
    }

    pub fn get_file_content(&self, file_path: &str) -> Result<String, String> {
        let mut stmt = self.conn.prepare(
            "SELECT content FROM project_files_fts WHERE file_path = ?1"
        ).map_err(|e| e.to_string())?;
        
        let content: String = stmt.query_row(params![file_path], |row| row.get(0)).map_err(|e| e.to_string())?;
        Ok(content)
    }

    pub fn get_project_stats(&self) -> Result<crate::modules::context::types::ProjectStats, String> {
        let file_count: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM project_files",
            [],
            |row| row.get(0),
        ).map_err(|e| e.to_string())?;

        let mut stmt = self.conn.prepare(
            "SELECT language, COUNT(*) as count FROM project_files GROUP BY language ORDER BY count DESC"
        ).map_err(|e| e.to_string())?;

        let lang_rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)? as usize))
        }).map_err(|e| e.to_string())?;

        let mut languages = Vec::new();
        for row in lang_rows {
            languages.push(row.map_err(|e| e.to_string())?);
        }

        let last_index_time: i64 = self.conn.query_row(
            "SELECT MAX(last_indexed) FROM project_files",
            [],
            |row| row.get(0),
        ).unwrap_or(0);

        Ok(crate::modules::context::types::ProjectStats {
            file_count: file_count as usize,
            languages,
            last_index_time,
        })
    }
}
