use std::fs;
use std::path::{Path, PathBuf};

use crate::utils::{copy_dir_all, ensure_dir, expand_tilde};

fn canonicalize_if_possible(path: &Path) -> Option<PathBuf> {
    fs::canonicalize(path).ok()
}

fn is_same_path(a: &Path, b: &Path) -> bool {
    if a == b {
        return true;
    }
    match (canonicalize_if_possible(a), canonicalize_if_possible(b)) {
        (Some(ac), Some(bc)) => ac == bc,
        _ => false,
    }
}

fn prevent_nested_move(from: &Path, to: &Path) -> Result<(), String> {
    let from_canon = canonicalize_if_possible(from).unwrap_or_else(|| from.to_path_buf());
    let to_canon = canonicalize_if_possible(to).unwrap_or_else(|| to.to_path_buf());

    if to_canon.starts_with(&from_canon) && !is_same_path(&from_canon, &to_canon) {
        return Err(format!(
            "Destination is inside source directory (from: {}, to: {})",
            from.display(),
            to.display()
        ));
    }
    Ok(())
}

fn ensure_directory_empty_or_no_conflicts(from: &Path, to: &Path) -> Result<(), String> {
    if !to.exists() {
        return Ok(());
    }
    if !to.is_dir() {
        return Err(format!("Destination is not a directory: {}", to.display()));
    }

    let mut conflicts: Vec<String> = vec![];
    for entry in fs::read_dir(from).map_err(|e| format!("Failed to read dir {}: {e}", from.display()))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {e}"))?;
        let name = entry.file_name();
        let dst = to.join(&name);
        if dst.exists() {
            conflicts.push(name.to_string_lossy().to_string());
        }
    }

    if !conflicts.is_empty() {
        conflicts.sort();
        return Err(format!(
            "Destination already contains conflicting entries: {}",
            conflicts.join(", ")
        ));
    }
    Ok(())
}

fn move_dir_contents(from: &Path, to: &Path) -> Result<(), String> {
    if !from.exists() {
        ensure_dir(to)?;
        return Ok(());
    }
    if !from.is_dir() {
        return Err(format!("Source is not a directory: {}", from.display()));
    }

    ensure_dir(to)?;
    if is_same_path(from, to) {
        return Ok(());
    }

    prevent_nested_move(from, to)?;
    ensure_directory_empty_or_no_conflicts(from, to)?;

    for entry in fs::read_dir(from).map_err(|e| format!("Failed to read dir {}: {e}", from.display()))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {e}"))?;
        let src = entry.path();
        let dst = to.join(entry.file_name());
        let file_type = entry
            .file_type()
            .map_err(|e| format!("Failed to read file type for {}: {e}", src.display()))?;

        if let Err(_e) = fs::rename(&src, &dst) {
            if file_type.is_dir() {
                copy_dir_all(&src, &dst)?;
                fs::remove_dir_all(&src).map_err(|e| {
                    format!("Failed to remove source dir {} after copy: {e}", src.display())
                })?;
            } else {
                fs::copy(&src, &dst).map_err(|e| {
                    format!(
                        "Failed to copy file {} -> {}: {e}",
                        src.display(),
                        dst.display()
                    )
                })?;
                fs::remove_file(&src).map_err(|e| {
                    format!("Failed to remove source file {} after copy: {e}", src.display())
                })?;
            }
        }
    }

    let _ = fs::remove_dir(from);
    Ok(())
}

#[tauri::command]
pub(crate) fn select_manager_store_directory() -> Result<Option<String>, String> {
    let picked = rfd::FileDialog::new()
        .set_title("选择本地中心库目录")
        .pick_folder();
    Ok(picked.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub(crate) async fn migrate_manager_store(
    from_storage_path: String,
    to_storage_path: String,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let from = expand_tilde(&from_storage_path);
        let to = expand_tilde(&to_storage_path);
        move_dir_contents(&from, &to)
    })
    .await
    .map_err(|e| format!("migrate_manager_store task join error: {e}"))?
}

#[cfg(test)]
mod tests {
    use super::*;

    fn unique_test_root(label: &str) -> PathBuf {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();
        std::env::temp_dir().join(format!(
            "skills-manager-test-storage-{label}-{nanos}-{}",
            std::process::id()
        ))
    }

    #[test]
    fn move_dir_contents_moves_files_and_dirs() {
        let root = unique_test_root("moves");
        let from = root.join("from");
        let to = root.join("to");
        ensure_dir(&from).unwrap();
        ensure_dir(&from.join("a")).unwrap();
        fs::write(from.join("a").join("x.txt"), "hi").unwrap();
        fs::write(from.join("b.txt"), "yo").unwrap();

        move_dir_contents(&from, &to).unwrap();

        assert!(to.join("a").join("x.txt").exists());
        assert!(to.join("b.txt").exists());
        assert!(!from.join("b.txt").exists());

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn move_dir_contents_rejects_nested_destination() {
        let root = unique_test_root("nested");
        let from = root.join("from");
        let to = from.join("inner");
        ensure_dir(&from).unwrap();
        ensure_dir(&to).unwrap();

        let err = move_dir_contents(&from, &to).unwrap_err();
        assert!(err.to_lowercase().contains("inside source"));

        let _ = fs::remove_dir_all(&root);
    }
}

