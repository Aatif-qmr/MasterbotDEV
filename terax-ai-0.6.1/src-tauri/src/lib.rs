mod modules;

use modules::{fs, net, pty, secrets, shell, graphify, optimizer, core, auth, storage};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_window_state::StateFlags;

#[tauri::command]
async fn open_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    let window_label = "settings";

    if let Some(window) = app.get_webview_window(window_label) {
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    WebviewWindowBuilder::new(&app, window_label, WebviewUrl::App("settings.html".into()))
        .title("Settings")
        .inner_size(800.0, 600.0)
        .center()
        .resizable(true)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg(target_os = "linux")]
fn apply_wayland_webkit_workaround() {
    let desktop = std::env::var("XDG_CURRENT_DESKTOP").unwrap_or_default();
    let is_wayland = std::env::var("WAYLAND_DISPLAY").is_ok();
    let affected = is_wayland
        && (desktop.contains("Hyprland")
            || desktop.contains("sway")
            || desktop.contains("Wayfire")
            || desktop.contains("River")
            || desktop.contains("niri"));

    if !affected {
        return;
    }
    log::info!("wlroots compositor detected ({desktop}); disabling DMA-BUF renderer");
    unsafe { std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1") };
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    apply_wayland_webkit_workaround();

    tauri::Builder::default()
        .plugin(tauri_plugin_keychain::init())
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(StateFlags::all() & !StateFlags::VISIBLE)
                .build(),
        )
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(tauri_plugin_log::log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            modules::init(app)?;
            Ok(())
        })
        .manage(pty::PtyState::default())
        .manage(core::watcher::WatcherService::new())
        .invoke_handler(tauri::generate_handler![
                    pty::pty_open,
                    pty::pty_write,
                    pty::pty_resize,
                    pty::pty_close,
                    fs::tree::list_subdirs,
                    fs::tree::fs_read_dir,
                    fs::file::fs_read_file,
                    fs::file::fs_write_file,
                    fs::file::fs_stat,
                    fs::mutate::fs_create_file,
                    fs::mutate::fs_create_dir,
                    fs::mutate::fs_rename,
                    fs::mutate::fs_delete,
                    fs::search::fs_search,
                    fs::grep::fs_grep,
                    fs::grep::fs_glob,
                    shell::shell_run_command,
                    shell::shell_session_open,
                    shell::shell_session_run,
                    shell::shell_session_close,
                    shell::shell_bg_spawn,
                    shell::shell_bg_logs,
                    shell::shell_bg_kill,
                    shell::shell_bg_list,
                    open_settings_window,
                    secrets::secrets_get,
                    secrets::secrets_set,
                    secrets::secrets_delete,
                    secrets::secrets_get_all,
                    net::http_ping,
                    graphify::commands::generate_project_graph,
                    optimizer::analyze_file_complexity,
                    core::watcher::watch_project,
                    core::watcher::unwatch_project,
                    auth::commands::oauth_start_flow,
                    auth::commands::oauth_handle_callback,
                    auth::commands::oauth_get_token,
                    auth::commands::oauth_clear,
                    storage::commands::storage_get_context,
                    storage::commands::storage_save_message,
                    storage::commands::storage_get_history,
                    storage::commands::storage_clear_project,
                    storage::commands::storage_migrate_from_localstorage,
                ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
