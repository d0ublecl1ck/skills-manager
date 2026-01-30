use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use crate::models::{AgentInfo, Skill};
use crate::utils::{
    agent_roots, copy_dir_all, ensure_dir, expand_tilde, generate_id, manager_store_root, now_iso,
    remove_dir_if_exists, safe_skill_dir_name, unique_skill_dir_name,
};

fn normalize_install_url(input: &str) -> String {
    let trimmed = input.trim().trim_end_matches('/');
    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        return trimmed.to_string();
    }
    if trimmed.starts_with("github.com/") {
        return format!("https://{trimmed}");
    }
    if trimmed.matches('/').count() == 1 && !trimmed.contains(' ') {
        return format!("https://github.com/{trimmed}");
    }
    trimmed.to_string()
}

fn parse_name_from_dir(dir: &Path, fallback_name: &str) -> String {
    let mut name = fallback_name.to_string();

    let candidates = [
        "SKILL.md",
        "skill.md",
        "README.md",
        "README.MD",
        "readme.md",
    ];
    let mut content: Option<String> = None;
    for file in candidates {
        let path = dir.join(file);
        if path.exists() {
            if let Ok(text) = fs::read_to_string(&path) {
                content = Some(text);
                break;
            }
        }
    }

    if let Some(text) = content {
        for line in text.lines() {
            let t = line.trim();
            if t.starts_with("# ") {
                name = t.trim_start_matches("# ").trim().to_string();
                break;
            }
        }
    }

    name
}

fn run_cmd(mut cmd: Command, label: &str) -> Result<(), String> {
    let status = cmd
        .status()
        .map_err(|e| format!("Failed to run {label}: {e}"))?;
    if !status.success() {
        return Err(format!("{label} exited with status: {status}"));
    }
    Ok(())
}

fn install_zip(url: &str, dest: &Path) -> Result<(), String> {
    let tmp_dir = std::env::temp_dir().join(format!("skills-manager-zip-{}", generate_id()));
    ensure_dir(&tmp_dir)?;
    let zip_path = tmp_dir.join("download.zip");
    let extract_dir = tmp_dir.join("extract");
    ensure_dir(&extract_dir)?;

    let mut curl = Command::new("curl");
    curl.arg("-L").arg("-o").arg(&zip_path).arg(url);
    run_cmd(curl, "curl")?;

    let mut unzip = Command::new("unzip");
    unzip.arg("-q").arg(&zip_path).arg("-d").arg(&extract_dir);
    run_cmd(unzip, "unzip")?;

    let mut top_dirs: Vec<PathBuf> = vec![];
    for entry in
        fs::read_dir(&extract_dir).map_err(|e| format!("Failed to read extract dir: {e}"))?
    {
        let entry = entry.map_err(|e| format!("Failed to read entry: {e}"))?;
        let p = entry.path();
        if p.is_dir() {
            top_dirs.push(p);
        }
    }

    let root = if top_dirs.len() == 1 {
        top_dirs.remove(0)
    } else {
        extract_dir
    };

    copy_dir_all(&root, dest)?;
    let _ = fs::remove_dir_all(&tmp_dir);
    Ok(())
}

fn install_git(url: &str, dest: &Path) -> Result<(), String> {
    let clone_url = if url.ends_with(".git") {
        url.to_string()
    } else {
        format!("{url}.git")
    };

    let mut git = Command::new("git");
    git.arg("clone")
        .arg("--depth")
        .arg("1")
        .arg(&clone_url)
        .arg(dest);
    run_cmd(git, "git clone")?;

    let _ = fs::remove_dir_all(dest.join(".git"));
    Ok(())
}

fn candidate_post_install_sources(skill_dir_name: &str) -> Vec<PathBuf> {
    [
        "~/.agents/skills", // npx skills add -g installs here
    ]
    .iter()
    .map(|root| expand_tilde(root).join(skill_dir_name))
    .collect()
}

#[tauri::command]
pub(crate) fn bootstrap_skills_store(
    skills: Vec<Skill>,
    storage_path: String,
) -> Result<(), String> {
    let dir = manager_store_root(&storage_path)?;

    for skill in skills {
        let skill_dir = dir.join(safe_skill_dir_name(&skill.name));
        if skill_dir.exists() {
            continue;
        }
        ensure_dir(&skill_dir)?;
        let skill_md = format!("# {}\n", skill.name);
        let _ = fs::write(skill_dir.join("SKILL.md"), skill_md);
    }

    Ok(())
}

#[tauri::command]
pub(crate) fn install_skill(repo_url: String, storage_path: String) -> Result<Skill, String> {
    let url = normalize_install_url(&repo_url);
    let lower = url.to_lowercase();
    let skill_id = generate_id();
    let store_dir = manager_store_root(&storage_path)?;
    let temp_dest = store_dir.join(format!(".tmp-install-{skill_id}"));
    let _ = remove_dir_if_exists(&temp_dest);

    if lower.ends_with(".zip") || lower.contains(".zip?") {
        install_zip(&url, &temp_dest)?;
    } else {
        install_git(&url, &temp_dest)?;
    }

    let fallback_name = url
        .split('/')
        .last()
        .unwrap_or("skill")
        .trim_end_matches(".git")
        .trim_end_matches(".zip");
    let meta_name = parse_name_from_dir(&temp_dest, fallback_name);
    let dir_name = unique_skill_dir_name(&store_dir, &meta_name);
    let final_dest = store_dir.join(&dir_name);

    if let Err(_e) = fs::rename(&temp_dest, &final_dest) {
        copy_dir_all(&temp_dest, &final_dest)?;
        let _ = fs::remove_dir_all(&temp_dest);
    }

    let now = now_iso();

    Ok(Skill {
        id: skill_id,
        name: dir_name,
        source_url: Some(repo_url),
        enabled_agents: vec![],
        last_sync: Some(now.clone()),
        last_update: Some(now),
    })
}

#[tauri::command]
pub(crate) async fn reinstall_skill(
    skill_id: String,
    skill_name: String,
    repo_url: String,
    enabled_agents: Vec<String>,
    storage_path: String,
) -> Result<Skill, String> {
    tauri::async_runtime::spawn_blocking(move || {
        if repo_url.trim().is_empty() {
            return Err("repoUrl is empty".to_string());
        }

        let store_dir = manager_store_root(&storage_path)?;
        ensure_dir(&store_dir)?;

        let safe_name = safe_skill_dir_name(&skill_name);
        if safe_name.trim().is_empty() {
            return Err("skillName is empty".to_string());
        }

        let url = normalize_install_url(&repo_url);

        let mut npx = Command::new("npx");
        npx.arg("skills")
            .arg("add")
            .arg(&url)
            .arg("--skill")
            .arg(&safe_name)
            .arg("-g")
            .arg("-y");
        run_cmd(npx, "npx skills add")?;

        let temp_dest = store_dir.join(format!(".tmp-reinstall-{}", generate_id()));
        let _ = remove_dir_if_exists(&temp_dest);

        let mut copied = false;
        for src in candidate_post_install_sources(&safe_name) {
            if src.exists() && src.is_dir() {
                copy_dir_all(&src, &temp_dest)?;
                copied = true;
                break;
            }
        }

        if !copied {
            return Err(format!(
                "Installed skill directory not found under known locations (expected ~/.agents/skills/{0})",
                safe_name
            ));
        }

        let final_dest = store_dir.join(&safe_name);
        let _ = remove_dir_if_exists(&final_dest);

        if let Err(_e) = fs::rename(&temp_dest, &final_dest) {
            copy_dir_all(&temp_dest, &final_dest)?;
            let _ = fs::remove_dir_all(&temp_dest);
        }

        let now = now_iso();

        Ok(Skill {
            id: skill_id,
            name: safe_name,
            source_url: Some(repo_url),
            enabled_agents,
            last_sync: Some(now.clone()),
            last_update: Some(now),
        })
    })
    .await
    .map_err(|e| format!("reinstall_skill task join error: {e}"))?
}

#[tauri::command]
pub(crate) async fn install_skill_cli(
    repo_url: String,
    skill_name: String,
    storage_path: String,
) -> Result<Skill, String> {
    tauri::async_runtime::spawn_blocking(move || {
        if skill_name.trim().is_empty() {
            return Err("skillName is empty".to_string());
        }

        let url = normalize_install_url(&repo_url);
        let desired_name = safe_skill_dir_name(&skill_name);

        let mut npx = Command::new("npx");
        npx.arg("skills")
            .arg("add")
            .arg(&url)
            .arg("--skill")
            .arg(&desired_name)
            .arg("-g")
            .arg("-y");
        run_cmd(npx, "npx skills add")?;

        let store_root = manager_store_root(&storage_path)?;
        let store_dest = store_root.join(&desired_name);

        let mut copied = false;
        for src in candidate_post_install_sources(&desired_name) {
            if src.exists() && src.is_dir() {
                copy_dir_all(&src, &store_dest)?;
                copied = true;
                break;
            }
        }

        if !copied {
            return Err(format!(
                "Installed skill directory not found under known locations (expected ~/.agents/skills/{0})",
                desired_name
            ));
        }

        let now = now_iso();

        Ok(Skill {
            id: generate_id(),
            name: desired_name,
            source_url: Some(repo_url),
            enabled_agents: vec![],
            last_sync: Some(now.clone()),
            last_update: Some(now),
        })
    })
    .await
    .map_err(|e| format!("install_skill_cli task join error: {e}"))?
}

#[tauri::command]
pub(crate) fn uninstall_skill(
    skill_id: String,
    skill_name: String,
    agents: Vec<AgentInfo>,
    storage_path: String,
) -> Result<(), String> {
    let _ = skill_id;
    let store_root = expand_tilde(&storage_path);
    let src = store_root.join(safe_skill_dir_name(&skill_name));
    let _ = remove_dir_if_exists(&src);

    for agent in agents {
        for root in agent_roots(&agent) {
            let dst = root.join(safe_skill_dir_name(&skill_name));
            let _ = remove_dir_if_exists(&dst);
        }
    }

    Ok(())
}

#[tauri::command]
pub(crate) fn reset_store(storage_path: String) -> Result<(), String> {
    let root = expand_tilde(&storage_path);
    remove_dir_if_exists(&root)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_install_url_normalizes_github_urls() {
        assert_eq!(
            normalize_install_url("github.com/foo/bar"),
            "https://github.com/foo/bar"
        );
        assert_eq!(
            normalize_install_url("foo/bar"),
            "https://github.com/foo/bar"
        );
        assert_eq!(
            normalize_install_url("https://github.com/foo/bar/"),
            "https://github.com/foo/bar"
        );
        assert_eq!(
            normalize_install_url("https://github.com/affaan-m/everything-claude-code/tree/main/skills/security-review/"),
            "https://github.com/affaan-m/everything-claude-code/tree/main/skills/security-review"
        );
        assert_eq!(normalize_install_url("http://example.com/x"), "http://example.com/x");
    }

    #[test]
    fn candidate_post_install_sources_prefers_agents_dir_first() {
        let sources = candidate_post_install_sources("demo-skill");
        assert_eq!(sources.len(), 1);
        assert!(sources[0].to_string_lossy().contains("/.agents/skills/demo-skill"));
    }
}
