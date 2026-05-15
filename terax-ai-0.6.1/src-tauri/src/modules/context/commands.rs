use crate::modules::context::indexer::ProjectIndexer;
use crate::modules::context::retriever::ContextRetriever;
use crate::modules::context::types::{ContextDocument, ContextQuery, ProjectStats};
use std::collections::HashMap;
use std::sync::Mutex;

pub struct ContextState {
    pub indexers: Mutex<HashMap<String, String>>, // Project path -> ID mapping if needed, or just status
}

impl ContextState {
    pub fn new() -> Self {
        Self {
            indexers: Mutex::new(HashMap::new()),
        }
    }
}

#[tauri::command]
pub async fn ctx_index_project(project_path: String) -> Result<usize, String> {
    let indexer = ProjectIndexer::open_or_create(&project_path)?;
    indexer.scan_project(&project_path)
}

#[tauri::command]
pub async fn ctx_update_files(project_path: String, paths: Vec<String>) -> Result<(), String> {
    let indexer = ProjectIndexer::open_or_create(&project_path)?;
    for path in paths {
        let full_path = std::path::PathBuf::from(path);
        indexer.index_file(&project_path, &full_path)?;
    }
    Ok(())
}

#[tauri::command]
pub async fn ctx_search(project_path: String, query: String, limit: i32) -> Result<Vec<ContextDocument>, String> {
    let retriever = ContextRetriever::open(&project_path)?;
    let q = ContextQuery {
        query_text: query,
        max_tokens: limit * 1000, // Heuristic token budget
        file_filters: None,
    };
    retriever.hybrid_search(&q)
}

#[tauri::command]
pub async fn ctx_get_file_context(project_path: String, file_path: String) -> Result<String, String> {
    let retriever = ContextRetriever::open(&project_path)?;
    retriever.get_file_content(&file_path)
}

#[tauri::command]
pub async fn ctx_get_project_summary(project_path: String) -> Result<ProjectStats, String> {
    let retriever = ContextRetriever::open(&project_path)?;
    retriever.get_project_stats()
}
