use crate::modules::time_travel::engine::TimeTravelEngine;
use crate::modules::time_travel::types::StateSnapshot;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;

pub struct TimeTravelState {
    pub engines: Mutex<HashMap<String, TimeTravelEngine>>,
}

impl TimeTravelState {
    pub fn new() -> Self {
        Self {
            engines: Mutex::new(HashMap::new()),
        }
    }
}

#[tauri::command]
pub async fn tt_create_snapshot(
    state: State<'_, TimeTravelState>,
    project_path: String,
    chat_state: String,
    editor_state: String,
    label: Option<String>,
) -> Result<String, String> {
    let mut engines = state.engines.lock().map_err(|e| e.to_string())?;
    if !engines.contains_key(&project_path) {
        let engine = TimeTravelEngine::open_or_create(project_path.clone())?;
        engines.insert(project_path.clone(), engine);
    }
    
    let engine = engines.get(&project_path).unwrap();
    let id = engine.create_snapshot(project_path.clone(), &chat_state, &editor_state, label)?;
    
    // Auto-cleanup: keep last 50
    let _ = engine.cleanup_old_snapshots(project_path, 50);
    
    Ok(id)
}

#[tauri::command]
pub async fn tt_restore_snapshot(
    state: State<'_, TimeTravelState>,
    project_path: String,
    snapshot_id: String,
) -> Result<(String, String), String> {
    let mut engines = state.engines.lock().map_err(|e| e.to_string())?;
    if !engines.contains_key(&project_path) {
        let engine = TimeTravelEngine::open_or_create(project_path.clone())?;
        engines.insert(project_path.clone(), engine);
    }
    
    let engine = engines.get(&project_path).unwrap();
    engine.restore_snapshot(snapshot_id)
}

#[tauri::command]
pub async fn tt_get_timeline(
    state: State<'_, TimeTravelState>,
    project_path: String,
    limit: i32,
) -> Result<Vec<StateSnapshot>, String> {
    let mut engines = state.engines.lock().map_err(|e| e.to_string())?;
    if !engines.contains_key(&project_path) {
        let engine = TimeTravelEngine::open_or_create(project_path.clone())?;
        engines.insert(project_path.clone(), engine);
    }
    
    let engine = engines.get(&project_path).unwrap();
    engine.get_timeline(project_path, limit)
}

#[tauri::command]
pub async fn tt_clear_history(
    state: State<'_, TimeTravelState>,
    project_path: String,
) -> Result<(), String> {
    let mut engines = state.engines.lock().map_err(|e| e.to_string())?;
    if !engines.contains_key(&project_path) {
        let engine = TimeTravelEngine::open_or_create(project_path.clone())?;
        engines.insert(project_path.clone(), engine);
    }
    
    let engine = engines.get(&project_path).unwrap();
    engine.clear_history()
}
