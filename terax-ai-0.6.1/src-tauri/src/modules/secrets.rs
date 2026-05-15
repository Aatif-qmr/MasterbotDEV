//! Secret storage using local JSON files.
//! Replaces native keyring implementations to ensure zero OS keychain footprint.

use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

#[derive(Default)]
pub struct SecretsState {
    cache: Mutex<Option<HashMap<String, String>>>,
}

fn key(service: &str, account: &str) -> String {
    format!("{}::{}", service, account)
}

fn store_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("secrets.json"))
}

fn read_store(app: &AppHandle) -> Result<HashMap<String, String>, String> {
    let path = store_path(app)?;
    if !path.exists() {
        return Ok(HashMap::new());
    }
    let bytes = fs::read(&path).map_err(|e| e.to_string())?;
    serde_json::from_slice::<HashMap<String, String>>(&bytes).map_err(|e| e.to_string())
}

fn write_store(app: &AppHandle, map: &HashMap<String, String>) -> Result<(), String> {
    use std::io::Write;

    let path = store_path(app)?;
    let tmp = path.with_extension("json.tmp");
    let bytes = serde_json::to_vec(map).map_err(|e| e.to_string())?;

    let mut f = fs::OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(&tmp)
        .map_err(|e| e.to_string())?;
    f.write_all(&bytes).map_err(|e| e.to_string())?;
    f.sync_all().map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())?;
    Ok(())
}

fn with_store<F, R>(
    app: &AppHandle,
    state: &SecretsState,
    f: F,
) -> Result<R, String>
where
    F: FnOnce(&mut HashMap<String, String>) -> R,
{
    let mut guard = state.cache.lock().map_err(|e| e.to_string())?;
    if guard.is_none() {
        *guard = Some(read_store(app)?);
    }
    let map = guard.as_mut().expect("cache initialized above");
    Ok(f(map))
}

#[tauri::command]
pub async fn secrets_get(
    app: AppHandle,
    state: tauri::State<'_, SecretsState>,
    service: String,
    account: String,
) -> Result<Option<String>, String> {
    let _ = state; // capture
    let key = key(&service, &account);
    with_store(&app, &state, |m| m.get(&key).cloned())
}

#[tauri::command]
pub async fn secrets_set(
    app: AppHandle,
    state: tauri::State<'_, SecretsState>,
    service: String,
    account: String,
    password: String,
) -> Result<(), String> {
    let key = key(&service, &account);
    with_store(&app, &state, |m| {
        m.insert(key, password);
    })?;
    let snapshot = {
        let guard = state.cache.lock().map_err(|e| e.to_string())?;
        guard.as_ref().cloned().unwrap_or_default()
    };
    write_store(&app, &snapshot)
}

#[tauri::command]
pub async fn secrets_delete(
    app: AppHandle,
    state: tauri::State<'_, SecretsState>,
    service: String,
    account: String,
) -> Result<(), String> {
    let key = key(&service, &account);
    with_store(&app, &state, |m| {
        m.remove(&key);
    })?;
    let snapshot = {
        let guard = state.cache.lock().map_err(|e| e.to_string())?;
        guard.as_ref().cloned().unwrap_or_default()
    };
    write_store(&app, &snapshot)
}

/// Batch read — single IPC roundtrip for the cold-boot fan-out.
#[tauri::command]
pub async fn secrets_get_all(
    app: AppHandle,
    state: tauri::State<'_, SecretsState>,
    service: String,
    accounts: Vec<String>,
) -> Result<Vec<Option<String>>, String> {
    with_store(&app, &state, |m| {
        accounts
            .iter()
            .map(|a| m.get(&key(&service, a)).cloned())
            .collect()
    })
}
