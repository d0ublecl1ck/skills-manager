mod models;
mod services;
mod utils;

use services::skill_service::{
    bootstrap_skills_store, install_skill, install_skill_cli, reinstall_skill, reset_store,
    uninstall_skill,
};
use services::sync_service::{
    get_skill_description,
    sync_all_skills_distribution, sync_all_skills_distribution_with_progress,
    sync_all_to_manager_store, sync_all_to_manager_store_with_progress, sync_skill_distribution,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            bootstrap_skills_store,
            install_skill,
            install_skill_cli,
            reinstall_skill,
            sync_skill_distribution,
            sync_all_skills_distribution,
            sync_all_skills_distribution_with_progress,
            sync_all_to_manager_store,
            sync_all_to_manager_store_with_progress,
            get_skill_description,
            uninstall_skill,
            reset_store,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
