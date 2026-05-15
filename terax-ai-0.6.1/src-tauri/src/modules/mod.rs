use tauri::Manager;

pub mod auth;
pub mod core;
pub mod fs;
pub mod graphify;
pub mod optimizer;
pub mod pty;
pub mod secrets;
pub mod shell;
pub mod net;
pub mod storage;
pub mod time_travel;

pub fn init<R: tauri::Runtime>(app: &tauri::App<R>) -> Result<(), Box<dyn std::error::Error>> {
    app.manage(secrets::SecretsState::default());
    app.manage(auth::commands::AuthState::new());
    app.manage(storage::commands::StorageState::new());
    app.manage(time_travel::commands::TimeTravelState::new());
    Ok(())
}
