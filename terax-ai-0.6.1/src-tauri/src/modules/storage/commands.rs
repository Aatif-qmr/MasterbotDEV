use crate::modules::storage::database::ProjectDatabase;
use crate::modules::storage::types::{DbMessage, ProjectContext};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;

pub struct StorageState {
    pub connections: Mutex<HashMap<String, ProjectDatabase>>,
}

impl StorageState {
    pub fn new() -> Self {
        Self {
            connections: Mutex::new(HashMap::new()),
        }
    }
}

#[tauri::command]
pub async fn storage_get_context(
    state: State<'_, StorageState>,
    project_path: String,
) -> Result<ProjectContext, String> {
    let mut connections = state.connections.lock().map_err(|e| e.to_string())?;
    
    if !connections.contains_key(&project_path) {
        let db = ProjectDatabase::open_or_create(project_path.clone())?;
        connections.insert(project_path.clone(), db);
    }
    
    let mut db_path = std::path::PathBuf::from(&project_path);
    db_path.push(".terax");
    db_path.push("context.db");
    
    Ok(ProjectContext {
        project_path,
        db_path: db_path.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub async fn storage_save_message(
    state: State<'_, StorageState>,
    project_path: String,
    message: DbMessage,
) -> Result<(), String> {
    let connections = state.connections.lock().map_err(|e| e.to_string())?;
    let db = connections.get(&project_path).ok_or("Database not initialized for this project")?;
    db.save_message(message)
}

#[tauri::command]
pub async fn storage_get_history(
    state: State<'_, StorageState>,
    project_path: String,
    limit: i32,
) -> Result<Vec<DbMessage>, String> {
    let connections = state.connections.lock().map_err(|e| e.to_string())?;
    let db = connections.get(&project_path).ok_or("Database not initialized for this project")?;
    db.get_history(limit)
}

#[tauri::command]
pub async fn storage_clear_project(
    state: State<'_, StorageState>,
    project_path: String,
) -> Result<(), String> {
    let connections = state.connections.lock().map_err(|e| e.to_string())?;
    let db = connections.get(&project_path).ok_or("Database not initialized for this project")?;
    db.clear_history()
}

#[tauri::command]
pub async fn storage_migrate_from_localstorage(
    state: State<'_, StorageState>,
    project_path: String,
    legacy_data: Vec<DbMessage>,
) -> Result<(), String> {
    // Ensure DB is open
    let mut connections = state.connections.lock().map_err(|e| e.to_string())?;
    if !connections.contains_key(&project_path) {
        let db = ProjectDatabase::open_or_create(project_path.clone())?;
        connections.insert(project_path.clone(), db);
    }
    
    let db = connections.get(&project_path).unwrap();
    for msg in legacy_data {
        db.save_message(msg)?;
    }
    
    Ok(())
}
