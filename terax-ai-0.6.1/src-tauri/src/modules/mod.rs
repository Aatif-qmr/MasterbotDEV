use tauri::Manager;

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
pub mod context;
pub mod autocomplete;

pub fn init<R: tauri::Runtime>(app: &tauri::App<R>) -> Result<(), Box<dyn std::error::Error>> {
    app.manage(secrets::SecretsState::default());
    app.manage(storage::commands::StorageState::new());
    app.manage(time_travel::commands::TimeTravelState::new());
    app.manage(context::commands::ContextState::new());
    Ok(())
}
