use crate::modules::auth::types::AuthToken;
use tauri::AppHandle;
use tauri_plugin_keychain::KeychainExt;

const SERVICE: &str = "com.terax.ai.oauth";
const TOKEN_KEY: &str = "google_oauth_token";

pub fn save_token(app: &AppHandle, token: &AuthToken) -> Result<(), String> {
    let keychain = app.keychain();
    let data = serde_json::to_string(token).map_err(|e| e.to_string())?;
    keychain.set(SERVICE, TOKEN_KEY, data.as_bytes()).map_err(|e| e.to_string())
}

pub fn get_token(app: &AppHandle) -> Result<Option<AuthToken>, String> {
    let keychain = app.keychain();
    match keychain.get(SERVICE, TOKEN_KEY).map_err(|e| e.to_string())? {
        Some(bytes) => {
            let data = String::from_utf8(bytes).map_err(|e| e.to_string())?;
            let token: AuthToken = serde_json::from_str(&data).map_err(|e| e.to_string())?;
            Ok(Some(token))
        }
        None => Ok(None),
    }
}

pub fn clear_token(app: &AppHandle) -> Result<(), String> {
    let keychain = app.keychain();
    keychain.delete(SERVICE, TOKEN_KEY).map_err(|e| e.to_string())
}
