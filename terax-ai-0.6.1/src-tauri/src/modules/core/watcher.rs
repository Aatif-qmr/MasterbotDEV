use notify::{Watcher, RecursiveMode, RecommendedWatcher, Event, EventKind};
use std::path::Path;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};
use serde::Serialize;
use std::collections::HashMap;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileChangedPayload {
    pub path: String,
    pub event_type: String,
}

pub struct WatcherService {
    watchers: Arc<Mutex<HashMap<String, RecommendedWatcher>>>,
}

impl WatcherService {
    pub fn new() -> Self {
        Self {
            watchers: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn start_watching(&self, path: String, app_handle: AppHandle) -> Result<(), String> {
        let mut watchers = self.watchers.lock().map_err(|e| e.to_string())?;
        
        if watchers.contains_key(&path) {
            return Ok(());
        }

        let app_handle_clone = app_handle.clone();
        let path_clone = path.clone();

        let mut watcher = RecommendedWatcher::new(move |res: notify::Result<Event>| {
            if let Ok(event) = res {
                let event_type = match event.kind {
                    EventKind::Create(_) => "create",
                    EventKind::Modify(_) => "modify",
                    EventKind::Remove(_) => "remove",
                    _ => "other",
                };

                for path in event.paths {
                    if let Some(path_str) = path.to_str() {
                        let _ = app_handle_clone.emit("file-changed", FileChangedPayload {
                            path: path_str.to_string(),
                            event_type: event_type.to_string(),
                        });
                    }
                }
            }
        }, notify::Config::default()).map_err(|e| e.to_string())?;

        watcher.watch(Path::new(&path), RecursiveMode::Recursive).map_err(|e| e.to_string())?;
        watchers.insert(path_clone, watcher);

        Ok(())
    }

    pub fn stop_watching(&self, path: &str) -> Result<(), String> {
        let mut watchers = self.watchers.lock().map_err(|e| e.to_string())?;
        watchers.remove(path);
        Ok(())
    }
}

#[tauri::command]
pub async fn watch_project(
    path: String,
    app_handle: AppHandle,
    state: State<'_, WatcherService>,
) -> Result<(), String> {
    state.start_watching(path, app_handle)
}

#[tauri::command]
pub async fn unwatch_project(
    path: String,
    state: State<'_, WatcherService>,
) -> Result<(), String> {
    state.stop_watching(&path)
}
