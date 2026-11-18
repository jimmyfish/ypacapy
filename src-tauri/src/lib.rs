mod conns;
mod db;
mod fonts;
mod guard;
mod keychain;
mod mongo_shell;
mod paths;
mod settings;
mod store;

use tauri::Manager;

#[cfg(target_os = "macos")]
mod menu {
    use tauri::menu::{Menu, MenuEvent, MenuItem, PredefinedMenuItem, Submenu};
    use tauri::{AppHandle, Emitter, Manager, Runtime};

    pub const CLOSE_TAB: &str = "close_tab";
    pub const CLOSE_WINDOW: &str = "close_window";
    pub const SETTINGS: &str = "settings";
    pub const ABOUT: &str = "about";
    pub const CHECK_UPDATES: &str = "check_updates";

    /// As voidHTTP: ⌘W closes the tab (handled by the frontend), "Close Window" moves to ⇧⌘W.
    pub fn build<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
        let pkg = app.package_info();

        let app_menu = Submenu::with_items(
            app,
            pkg.name.clone(),
            true,
            &[
                // As voidHTTP: our own About dialog (the native panel takes plain text only), and the update check
                &MenuItem::with_id(app, ABOUT, format!("About {}", pkg.name), true, None::<&str>)?,
                &MenuItem::with_id(app, CHECK_UPDATES, "Check for Updates…", true, None::<&str>)?,
                &PredefinedMenuItem::separator(app)?,
                &MenuItem::with_id(app, SETTINGS, "Settings…", true, Some("CmdOrCtrl+,"))?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::services(app, None)?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::hide(app, None)?,
                &PredefinedMenuItem::hide_others(app, None)?,
                &PredefinedMenuItem::show_all(app, None)?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::quit(app, None)?,
            ],
        )?;

        let file = Submenu::with_items(
            app,
            "File",
            true,
            &[
                &MenuItem::with_id(app, CLOSE_TAB, "Close Tab", true, Some("CmdOrCtrl+W"))?,
                &MenuItem::with_id(app, CLOSE_WINDOW, "Close Window", true, Some("CmdOrCtrl+Shift+W"))?,
            ],
        )?;

        // Edit items are what make ⌘C/⌘V/⌘Z/⌘A work inside the webview on macOS.
        let edit = Submenu::with_items(
            app,
            "Edit",
            true,
            &[
                &PredefinedMenuItem::undo(app, None)?,
                &PredefinedMenuItem::redo(app, None)?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::cut(app, None)?,
                &PredefinedMenuItem::copy(app, None)?,
                &PredefinedMenuItem::paste(app, None)?,
                &PredefinedMenuItem::select_all(app, None)?,
            ],
        )?;

        let view = Submenu::with_items(app, "View", true, &[&PredefinedMenuItem::fullscreen(app, None)?])?;
        let window = Submenu::with_items(app, "Window", true, &[&PredefinedMenuItem::minimize(app, None)?, &PredefinedMenuItem::maximize(app, None)?])?;

        Menu::with_items(app, &[&app_menu, &file, &edit, &view, &window])
    }

    pub fn on_event<R: Runtime>(app: &AppHandle<R>, event: MenuEvent) {
        match event.id().as_ref() {
            CLOSE_TAB => {
                let _ = app.emit("menu:close-tab", ());
            }
            SETTINGS => {
                let _ = app.emit("menu:settings", ());
            }
            ABOUT => {
                let _ = app.emit("menu:about", ());
            }
            CHECK_UPDATES => {
                let _ = app.emit("menu:check-updates", ());
            }
            CLOSE_WINDOW => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.close();
                }
            }
            _ => {}
        }
    }
}

pub fn run() {
    let builder = tauri::Builder::default();

    #[cfg(target_os = "macos")]
    let builder = builder.menu(menu::build).on_menu_event(menu::on_event);

    builder
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(settings::SettingsState::default())
        .manage(conns::ConnLock::default())
        .manage(guard::GuardState::default())
        .manage(db::DbState::default())
        .manage(store::LocalStore::default())
        .setup(|app| {
            // ~/.config/ypacapy on first run, and the settings Rust enforces, before any command
            paths::config_dir()?;
            if let Ok(v) = settings::read_file() {
                if let Ok(mut s) = app.state::<settings::SettingsState>().0.write() {
                    *s = v;
                }
            }
            db::start_heartbeat(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            settings::load_settings,
            settings::save_settings,
            conns::list_connections,
            conns::save_connection,
            conns::delete_connection,
            conns::duplicate_connection,
            conns::touch_connection,
            conns::set_level,
            conns::set_group,
            db::test_connection,
            db::open_connection,
            db::close_connection,
            db::load_schema,
            db::table_info,
            db::table_columns,
            db::run_query,
            db::cancel_query,
            db::apply_edits,
            db::mongo::mongo_find,
            db::mongo::mongo_stats,
            guard::passphrase_status,
            guard::set_passphrase,
            guard::disable_passphrase,
            guard::reset_passphrase,
            guard::unlock_protect,
            guard::lock_protect,
            store::list_history,
            store::clear_history,
            store::list_saved,
            store::save_query,
            store::delete_saved,
            store::load_workspace,
            store::save_workspace,
            fonts::list_fonts,
            paths::config_path,
            paths::write_text_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ypacapy");
}
