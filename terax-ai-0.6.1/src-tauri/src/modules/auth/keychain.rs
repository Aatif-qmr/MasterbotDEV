use crate::modules::auth::types::AuthToken;
use keyring::Entry;

const SERVICE: &str = "com.aatifqmr.cipher.auth";
const TOKEN_KEY: &str = "google_oauth_token";

pub fn save_token(token: &AuthToken) -> Result<(), String> {
    log::info!("Saving OAuth token to keychain");
    let entry = Entry::new(SERVICE, TOKEN_KEY).map_err(|e| {
        let err = format!("Failed to create keychain entry: {}", e);
        log::error!("{}", err);
        err
    })?;
    
    let data = serde_json::to_string(token).map_err(|e| {
        let err = format!("Failed to serialize token: {}", e);
        log::error!("{}", err);
        err
    })?;
    
    entry.set_password(&data).map_err(|e| {
        let err = format!("Failed to write to keychain: {}. Ensure app is entitled.", e);
        log::error!("{}", err);
        err
    })
}

pub fn get_token() -> Result<Option<AuthToken>, String> {
    log::info!("Retrieving OAuth token from keychain");
    let entry = match Entry::new(SERVICE, TOKEN_KEY) {
        Ok(e) => e,
        Err(e) => {
            log::warn!("Failed to access keychain entry: {}. This is expected on first launch or if unentitled.", e);
            return Ok(None);
        }
    };

    match entry.get_password() {
        Ok(data) => {
            let token: AuthToken = serde_json::from_str(&data).map_err(|e| {
                log::error!("Failed to deserialize stored token: {}", e);
                e.to_string()
            })?;
            Ok(Some(token))
        }
        Err(keyring::Error::NoEntry) => {
            log::info!("No OAuth token found in keychain.");
            Ok(None)
        },
        Err(e) => {
            log::error!("Keychain read error: {}", e);
            Err(e.to_string())
        },
    }
}

pub fn clear_token() -> Result<(), String> {
    log::info!("Clearing OAuth token from keychain");
    let entry = Entry::new(SERVICE, TOKEN_KEY).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(_) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => {
            log::error!("Failed to delete keychain entry: {}", e);
            Err(e.to_string())
        },
    }
}

