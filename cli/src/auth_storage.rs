use std::fs;
use serde::{Serialize, Deserialize};
use dirs;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AuthToken {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_at: u64,
    pub scope: Option<String>,
}

pub fn save_token(token: &AuthToken) -> Result<(), Box<dyn std::error::Error>> {
    let config_dir = dirs::home_dir().unwrap().join(".ccliconfig");
    fs::create_dir_all(&config_dir)?;
    let file_path = config_dir.join("auth.json");
    let json = serde_json::to_string_pretty(token)?;
    fs::write(file_path, json)?;
    Ok(())
}

pub fn load_token_from_file() -> Option<AuthToken> {
    let file_path = dirs::home_dir()?.join(".ccliconfig").join("auth.json");
    let json = fs::read_to_string(file_path).ok()?;
    serde_json::from_str(&json).ok()
}
