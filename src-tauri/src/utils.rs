use std::fs;
use std::path::{Path, PathBuf};
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
    remove_dir_if_exists(to)?;
    ensure_dir(to)?;

    for entry in
        fs::read_dir(from).map_err(|e| format!("Failed to read dir {}: {e}", from.display()))?
    {
        let entry = entry.map_err(|e| format!("Failed to read entry: {e}"))?;
        let file_type = entry
            .file_type()
            .map_err(|e| format!("Failed to read file type: {e}"))?;
        let src_path = entry.path();
        let dst_path = to.join(entry.file_name());

        if file_type.is_dir() {
            copy_dir_all(&src_path, &dst_path)?;
        } else if file_type.is_file() {
            fs::copy(&src_path, &dst_path).map_err(|e| {
                format!(
                    "Failed to copy file {} -> {}: {e}",
                    src_path.display(),
                    dst_path.display()
                )
            })?;
        }
    }

    Ok(())
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
    if agent.id == "codex" {
        push("~/.codex/skills/.system/");
    }

    roots
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::sync::Mutex;

    static ENV_LOCK: Mutex<()> = Mutex::new(());

    fn agent(id: &str, current_path: &str, default_path: &str) -> AgentInfo {
        AgentInfo {
            id: id.to_string(),
            name: id.to_string(),
            default_path: default_path.to_string(),
            current_path: current_path.to_string(),
            enabled: true,
            icon: "test".to_string(),
        }
    }

    #[test]
    fn agent_roots_adds_codex_system_dir() {
        let _guard = ENV_LOCK.lock().unwrap();

        let tmp_home =
            std::env::temp_dir().join(format!("skills-manager-test-home-{}", std::process::id()));
        let _ = fs::remove_dir_all(&tmp_home);
        ensure_dir(&tmp_home).unwrap();

        let old_home = std::env::var("HOME").ok();
        std::env::set_var("HOME", &tmp_home);

        let a = agent("codex", "~/some/current", "~/some/default");
        let roots = agent_roots(&a);

        if let Some(v) = old_home {
            std::env::set_var("HOME", v);
        } else {
            std::env::remove_var("HOME");
        }

        assert!(
            roots.contains(&tmp_home.join(".codex/skills/.system/")),
            "codex roots should include ~/.codex/skills/.system/"
        );
    }

    #[test]
    fn agent_roots_does_not_add_system_dir_for_other_agents() {
        let _guard = ENV_LOCK.lock().unwrap();

        let tmp_home = std::env::temp_dir().join(format!(
            "skills-manager-test-home-{}-2",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&tmp_home);
        ensure_dir(&tmp_home).unwrap();

        let old_home = std::env::var("HOME").ok();
        std::env::set_var("HOME", &tmp_home);

        let a = agent("cursor", "~/some/current", "~/some/default");
        let roots = agent_roots(&a);

        if let Some(v) = old_home {
            std::env::set_var("HOME", v);
        } else {
            std::env::remove_var("HOME");
        }

        assert!(
            !roots.contains(&tmp_home.join(".codex/skills/.system/")),
            "non-codex roots should not include ~/.codex/skills/.system/"
        );
    }
}
