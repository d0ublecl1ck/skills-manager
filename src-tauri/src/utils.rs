use std::fs;
use std::path::{Path, PathBuf};
use std::collections::HashSet;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::models::AgentInfo;

pub(crate) fn now_iso() -> String {
    // ISO-ish; good enough for logs/UI.
    // Example: 2026-01-23T02:15:34Z
    let now = chrono::Utc::now();
    now.to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
}

fn home_dir() -> Option<PathBuf> {
    std::env::var("HOME")
        .ok()
        .map(PathBuf::from)
        .or_else(|| std::env::var("USERPROFILE").ok().map(PathBuf::from))
}

pub(crate) fn expand_tilde(path: &str) -> PathBuf {
    let trimmed = path.trim();
    if trimmed == "~" {
        return home_dir().unwrap_or_else(|| PathBuf::from("~"));
    }
    if let Some(rest) = trimmed.strip_prefix("~/") {
        if let Some(home) = home_dir() {
            return home.join(rest);
        }
    }
    if let Some(rest) = trimmed.strip_prefix("~\\") {
        if let Some(home) = home_dir() {
            return home.join(rest);
        }
    }
    PathBuf::from(trimmed)
}

pub(crate) fn manager_store_root(storage_path: &str) -> Result<PathBuf, String> {
    let trimmed = storage_path.trim();
    if trimmed.is_empty() {
        return Err("storagePath is empty".to_string());
    }
    let root = expand_tilde(trimmed);
    ensure_dir(&root)?;
    Ok(root)
}

pub(crate) fn safe_skill_dir_name(name: &str) -> String {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return "skill".to_string();
    }
    trimmed
        .replace(['/', '\\'], "-")
        .replace("..", "")
        .trim()
        .to_string()
}

pub(crate) fn unique_skill_dir_name(root: &Path, desired: &str) -> String {
    let base = safe_skill_dir_name(desired);
    let mut candidate = base.clone();
    let mut idx = 2;
    while root.join(&candidate).exists() {
        candidate = format!("{base}-{idx}");
        idx += 1;
    }
    candidate
}

pub(crate) fn ensure_dir(path: &Path) -> Result<(), String> {
    fs::create_dir_all(path).map_err(|e| format!("Failed to create dir {}: {e}", path.display()))
}

pub(crate) fn remove_dir_if_exists(path: &Path) -> Result<(), String> {
    if path.exists() {
        fs::remove_dir_all(path)
            .map_err(|e| format!("Failed to remove dir {}: {e}", path.display()))?;
    }
    Ok(())
}

pub(crate) fn copy_dir_all(from: &Path, to: &Path) -> Result<(), String> {
    fn copy_dir_all_inner(from: &Path, to: &Path, stack: &mut HashSet<PathBuf>) -> Result<(), String> {
        if !from.exists() {
            return Err(format!("Source dir does not exist: {}", from.display()));
        }
        if !from.is_dir() {
            return Err(format!("Source is not a dir: {}", from.display()));
        }

        let canon = fs::canonicalize(from).map_err(|e| {
            format!("Failed to canonicalize {}: {e}", from.display())
        })?;
        if !stack.insert(canon.clone()) {
            return Err(format!("Symlink cycle detected at {}", from.display()));
        }

        remove_dir_if_exists(to)?;
        ensure_dir(to)?;

        for entry in fs::read_dir(from)
            .map_err(|e| format!("Failed to read dir {}: {e}", from.display()))?
        {
            let entry = entry.map_err(|e| format!("Failed to read entry: {e}"))?;
            let file_type = entry
                .file_type()
                .map_err(|e| format!("Failed to read file type: {e}"))?;
            let src_path = entry.path();
            let dst_path = to.join(entry.file_name());

            if file_type.is_dir() {
                copy_dir_all_inner(&src_path, &dst_path, stack)?;
                continue;
            }
            if file_type.is_file() {
                fs::copy(&src_path, &dst_path).map_err(|e| {
                    format!(
                        "Failed to copy file {} -> {}: {e}",
                        src_path.display(),
                        dst_path.display()
                    )
                })?;
                continue;
            }

            // Dereference symlinks and copy the target content (copy-based distribution; no symlinks in output).
            if file_type.is_symlink() {
                let meta = fs::metadata(&src_path).map_err(|e| {
                    format!("Failed to stat symlink target {}: {e}", src_path.display())
                })?;
                if meta.is_dir() {
                    copy_dir_all_inner(&src_path, &dst_path, stack)?;
                } else if meta.is_file() {
                    fs::copy(&src_path, &dst_path).map_err(|e| {
                        format!(
                            "Failed to copy symlink file target {} -> {}: {e}",
                            src_path.display(),
                            dst_path.display()
                        )
                    })?;
                }
            }
        }

        stack.remove(&canon);
        Ok(())
    }

    let mut stack: HashSet<PathBuf> = HashSet::new();
    copy_dir_all_inner(from, to, &mut stack)
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
            "skills-manager-test-{label}-{nanos}-{}",
            std::process::id()
        ))
    }

    #[cfg(unix)]
    fn symlink_dir(src: &Path, dst: &Path) -> std::io::Result<()> {
        std::os::unix::fs::symlink(src, dst)
    }

    #[cfg(windows)]
    fn symlink_dir(src: &Path, dst: &Path) -> std::io::Result<()> {
        std::os::windows::fs::symlink_dir(src, dst)
    }

    #[cfg(unix)]
    fn symlink_file(src: &Path, dst: &Path) -> std::io::Result<()> {
        std::os::unix::fs::symlink(src, dst)
    }

    #[cfg(windows)]
    fn symlink_file(src: &Path, dst: &Path) -> std::io::Result<()> {
        std::os::windows::fs::symlink_file(src, dst)
    }

    #[test]
    fn copy_dir_all_dereferences_symlinks() {
        let root = unique_test_root("dereference");
        let src = root.join("src");
        let dst = root.join("dst");

        ensure_dir(&src).unwrap();
        ensure_dir(&src.join("real")).unwrap();
        fs::write(src.join("real").join("hello.txt"), "hi").unwrap();

        if symlink_dir(&src.join("real"), &src.join("linkdir")).is_err() {
            let _ = fs::remove_dir_all(&root);
            return;
        }
        if symlink_file(&src.join("real").join("hello.txt"), &src.join("linkfile")).is_err() {
            let _ = fs::remove_dir_all(&root);
            return;
        }

        copy_dir_all(&src, &dst).unwrap();

        assert_eq!(
            fs::read_to_string(dst.join("linkdir").join("hello.txt")).unwrap(),
            "hi"
        );
        assert_eq!(fs::read_to_string(dst.join("linkfile")).unwrap(), "hi");

        let md_file = fs::symlink_metadata(dst.join("linkfile")).unwrap();
        assert!(!md_file.file_type().is_symlink());

        let md_dir = fs::symlink_metadata(dst.join("linkdir")).unwrap();
        assert!(!md_dir.file_type().is_symlink());
        assert!(dst.join("linkdir").is_dir());

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn copy_dir_all_detects_symlink_cycles() {
        let root = unique_test_root("cycle");
        let src = root.join("src");
        let dst = root.join("dst");
        ensure_dir(&src).unwrap();
        ensure_dir(&src.join("a")).unwrap();
        fs::write(src.join("a").join("hello.txt"), "hi").unwrap();

        if symlink_dir(&src.join("a"), &src.join("a").join("loop")).is_err() {
            let _ = fs::remove_dir_all(&root);
            return;
        }

        let err = copy_dir_all(&src, &dst).unwrap_err();
        assert!(err.to_lowercase().contains("symlink cycle"));

        let _ = fs::remove_dir_all(&root);
    }
}

pub(crate) fn generate_id() -> String {
    let ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let pid = std::process::id();
    format!("{ms:x}{pid:x}")
}

pub(crate) fn agent_roots(agent: &AgentInfo) -> Vec<PathBuf> {
    let mut roots: Vec<PathBuf> = vec![];

    let mut push = |candidate: &str| {
        let trimmed = candidate.trim();
        if trimmed.is_empty() {
            return;
        }
        let p = expand_tilde(trimmed);
        if roots.iter().any(|v| v == &p) {
            return;
        }
        roots.push(p);
    };

    push(&agent.current_path);
    push(&agent.default_path);

    roots
}
