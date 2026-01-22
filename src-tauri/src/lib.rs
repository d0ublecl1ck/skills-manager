use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Skill {
    id: String,
    name: String,
    description: String,
    author: String,
    source: String,
    #[serde(default)]
    source_url: Option<String>,
    #[serde(default)]
    tags: Vec<String>,
    #[serde(default)]
    enabled_agents: Vec<String>,
    #[serde(default)]
    last_sync: Option<String>,
    is_adopted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AgentInfo {
    id: String,
    name: String,
    default_path: String,
    current_path: String,
    enabled: bool,
    icon: String,
}

fn now_iso() -> String {
    // ISO-ish; good enough for logs/UI.
    // Example: 2026-01-23T02:15:34Z
    let now = chrono::Utc::now();
    now.to_rfc3339_opts(chrono::SecondsFormat::Secs, true)
}

fn app_store_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {e}"))?;
    Ok(base.join("skills-store"))
}

fn skills_store_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app_store_root(app)?.join("skills"))
}

fn home_dir() -> Option<PathBuf> {
    std::env::var("HOME")
        .ok()
        .map(PathBuf::from)
        .or_else(|| std::env::var("USERPROFILE").ok().map(PathBuf::from))
}

fn expand_tilde(path: &str) -> PathBuf {
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

fn safe_skill_dir_name(name: &str) -> String {
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

fn ensure_dir(path: &Path) -> Result<(), String> {
    fs::create_dir_all(path).map_err(|e| format!("Failed to create dir {}: {e}", path.display()))
}

fn remove_dir_if_exists(path: &Path) -> Result<(), String> {
    if path.exists() {
        fs::remove_dir_all(path)
            .map_err(|e| format!("Failed to remove dir {}: {e}", path.display()))?;
    }
    Ok(())
}

fn copy_dir_all(from: &Path, to: &Path) -> Result<(), String> {
    remove_dir_if_exists(to)?;
    ensure_dir(to)?;

    for entry in fs::read_dir(from).map_err(|e| format!("Failed to read dir {}: {e}", from.display()))?
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

fn parse_metadata_from_dir(dir: &Path, fallback_name: &str) -> (String, String, Vec<String>) {
    let mut name = fallback_name.to_string();
    let mut description = "No description available.".to_string();
    let mut tags: Vec<String> = vec![];

    let candidates = ["SKILL.md", "README.md", "README.MD"];
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
        for line in text.lines() {
            let t = line.trim();
            if t.is_empty() || t.starts_with('#') {
                continue;
            }
            description = t.to_string();
            break;
        }
        for line in text.lines() {
            let t = line.trim();
            if t.to_lowercase().starts_with("tags:") {
                let rest = t.splitn(2, ':').nth(1).unwrap_or("").trim();
                tags = rest
                    .split(',')
                    .map(|s| s.trim())
                    .filter(|s| !s.is_empty())
                    .map(|s| s.to_string())
                    .collect();
                break;
            }
        }
    }

    if tags.is_empty() {
        tags = vec!["local".to_string(), "skills-manager".to_string()];
    }

    (name, description, tags)
}

fn generate_id() -> String {
    let ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let pid = std::process::id();
    format!("{ms:x}{pid:x}")
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
    unzip
        .arg("-q")
        .arg(&zip_path)
        .arg("-d")
        .arg(&extract_dir);
    run_cmd(unzip, "unzip")?;

    let mut top_dirs: Vec<PathBuf> = vec![];
    for entry in fs::read_dir(&extract_dir)
        .map_err(|e| format!("Failed to read extract dir: {e}"))?
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

#[tauri::command]
fn bootstrap_skills_store(app: tauri::AppHandle, skills: Vec<Skill>) -> Result<(), String> {
    let dir = skills_store_dir(&app)?;
    ensure_dir(&dir)?;

    for skill in skills {
        let skill_dir = dir.join(&skill.id);
        if skill_dir.exists() {
            continue;
        }
        ensure_dir(&skill_dir)?;
        let skill_md = format!("# {}\n\n{}\n", skill.name, skill.description);
        let _ = fs::write(skill_dir.join("SKILL.md"), skill_md);
    }

    Ok(())
}

#[tauri::command]
fn install_skill(app: tauri::AppHandle, repo_url: String) -> Result<Skill, String> {
    let url = normalize_install_url(&repo_url);
    let lower = url.to_lowercase();
    let skill_id = generate_id();
    let store_dir = skills_store_dir(&app)?;
    ensure_dir(&store_dir)?;
    let dest = store_dir.join(&skill_id);

    if lower.ends_with(".zip") || lower.contains(".zip?") {
        install_zip(&url, &dest)?;
    } else {
        install_git(&url, &dest)?;
    }

    let fallback_name = url
        .split('/')
        .last()
        .unwrap_or("skill")
        .trim_end_matches(".git")
        .trim_end_matches(".zip");
    let (name, description, tags) = parse_metadata_from_dir(&dest, fallback_name);

    let author = if url.contains("github.com/") {
        url.split('/')
            .nth(3)
            .unwrap_or("GitHub")
            .to_string()
    } else {
        "网络资源".to_string()
    };

    let source = if url.contains("github.com/") {
        "github".to_string()
    } else {
        "registry".to_string()
    };

    Ok(Skill {
        id: skill_id,
        name,
        description,
        author,
        source,
        source_url: Some(repo_url),
        tags,
        enabled_agents: vec![],
        last_sync: Some(now_iso()),
        is_adopted: true,
    })
}

fn skill_dest_for_agent(agent: &AgentInfo, skill_name: &str) -> PathBuf {
    expand_tilde(&agent.current_path).join(safe_skill_dir_name(skill_name))
}

fn sync_one_skill(app: &tauri::AppHandle, skill_id: &str, skill_name: &str, enabled: &[String], agents: &[AgentInfo]) -> Result<(), String> {
    let store_dir = skills_store_dir(app)?;
    let src = store_dir.join(skill_id);
    if !src.exists() {
        return Err(format!(
            "Skill store not found for id={skill_id} at {}",
            src.display()
        ));
    }

    for agent in agents {
        let dst = skill_dest_for_agent(agent, skill_name);
        if agent.enabled && enabled.iter().any(|a| a == &agent.id) {
            ensure_dir(&expand_tilde(&agent.current_path))?;
            copy_dir_all(&src, &dst)?;
        } else {
            let _ = remove_dir_if_exists(&dst);
        }
    }

    Ok(())
}

#[tauri::command]
fn sync_skill_distribution(
    app: tauri::AppHandle,
    skill_id: String,
    skill_name: String,
    enabled_agents: Vec<String>,
    agents: Vec<AgentInfo>,
) -> Result<(), String> {
    sync_one_skill(&app, &skill_id, &skill_name, &enabled_agents, &agents)
}

#[tauri::command]
fn sync_all_skills_distribution(app: tauri::AppHandle, skills: Vec<Skill>, agents: Vec<AgentInfo>) -> Result<(), String> {
    for skill in skills {
        sync_one_skill(&app, &skill.id, &skill.name, &skill.enabled_agents, &agents)?;
    }
    Ok(())
}

#[tauri::command]
fn uninstall_skill(app: tauri::AppHandle, skill_id: String, skill_name: String, agents: Vec<AgentInfo>) -> Result<(), String> {
    let store_dir = skills_store_dir(&app)?;
    let src = store_dir.join(&skill_id);
    let _ = remove_dir_if_exists(&src);

    for agent in agents {
        let dst = skill_dest_for_agent(&agent, &skill_name);
        let _ = remove_dir_if_exists(&dst);
    }

    Ok(())
}

#[tauri::command]
fn reset_store(app: tauri::AppHandle) -> Result<(), String> {
    let root = app_store_root(&app)?;
    remove_dir_if_exists(&root)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            bootstrap_skills_store,
            install_skill,
            sync_skill_distribution,
            sync_all_skills_distribution,
            uninstall_skill,
            reset_store
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
