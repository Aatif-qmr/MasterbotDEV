use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ContextDocument {
    pub id: String,
    pub project_path: String,
    pub file_path: String,
    pub content_snippet: String, // First 2KB for preview
    pub full_content_hash: String, // For change detection
    pub language: String, // "typescript", "rust", etc.
    pub importance_score: f32, // Heuristic: README > src > test
    pub last_indexed: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ContextQuery {
    pub query_text: String,
    pub max_tokens: i32,
    pub file_filters: Option<Vec<String>>, // e.g., ["*.ts", "!*.test.ts"]
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectStats {
    pub file_count: usize,
    pub languages: Vec<(String, usize)>,
    pub last_index_time: i64,
}
