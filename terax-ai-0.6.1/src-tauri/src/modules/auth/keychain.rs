use crate::modules::auth::types::AuthToken;
use keyring::Entry;

const SERVICE: &str = "com.terax.ai.oauth";
const TOKEN_KEY: &str = "google_oauth_token";

pub fn save_token(token: &AuthToken) -> Result<(), String> {
    let entry = Entry::new(SERVICE, TOKEN_KEY).map_err(|e| e.to_string())?;
    let data = serde_json::to_string(token).map_err(|e| e.to_string())?;
    entry.set_password(&data).map_err(|e| e.to_string())
}

pub fn get_token() -> Result<Option<AuthToken>, String> {
    let entry = Entry::new(SERVICE, TOKEN_KEY).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(data) => {
            let token: AuthToken = serde_json::from_str(&data).map_err(|e| e.to_string())?;
            Ok(Some(token))
        }
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

pub fn clear_token() -> Result<(), String> {
    let entry = Entry::new(SERVICE, TOKEN_KEY).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(_) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}
