use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Emitter;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Skill {
    id: String,
    name: String,
    #[serde(default)]
    source_url: Option<String>,
    #[serde(default)]
    enabled_agents: Vec<String>,
    #[serde(default)]
    last_sync: Option<String>,
    #[serde(default)]
    last_update: Option<String>,
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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SyncAllToManagerProgressLog {
    id: String,
    label: String,
    status: String,
    progress: f64,
}

fn now_iso() -> String {
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

fn manager_store_root(storage_path: &str) -> Result<PathBuf, String> {
    let trimmed = storage_path.trim();
    if trimmed.is_empty() {
        return Err("storagePath is empty".to_string());
    }
    let root = expand_tilde(trimmed);
    ensure_dir(&root)?;
    Ok(root)
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

fn unique_skill_dir_name(root: &Path, desired: &str) -> String {
    let base = safe_skill_dir_name(desired);
    let mut candidate = base.clone();
    let mut idx = 2;
    while root.join(&candidate).exists() {
        candidate = format!("{base}-{idx}");
        idx += 1;
    }
    candidate
}

fn dir_contains_skill_md(dir: &Path) -> bool {
    let entries = match fs::read_dir(dir) {
        Ok(v) => v,
        Err(_) => return false,
    };

    for entry in entries.flatten() {
        let file_type = match entry.file_type() {
            Ok(v) => v,
            Err(_) => continue,
        };
        if !file_type.is_file() {
            continue;
        }
        let name = entry.file_name().to_string_lossy().to_string();
        if name.eq_ignore_ascii_case("skill.md") {
            return true;
        }
    }

    false
}

fn find_skill_md_path(dir: &Path) -> Option<PathBuf> {
    let entries = fs::read_dir(dir).ok()?;
    for entry in entries.flatten() {
        let file_type = entry.file_type().ok()?;
        if !file_type.is_file() {
            continue;
        }
        let name = entry.file_name().to_string_lossy().to_string();
        if name.eq_ignore_ascii_case("skill.md") {
            return Some(entry.path());
        }
    }
    None
}

fn skill_md_starts_with_yaml_frontmatter(content: &str) -> bool {
    let trimmed = content.trim_start_matches('\u{feff}');
    trimmed.starts_with("---\n") || trimmed.starts_with("---\r\n")
}

fn yaml_single_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct SkillMdQuality {
    has_yaml_frontmatter: bool,
    bytes: u64,
}

fn skill_md_quality(dir: &Path) -> SkillMdQuality {
    let Some(path) = find_skill_md_path(dir) else {
        return SkillMdQuality {
            has_yaml_frontmatter: false,
            bytes: 0,
        };
    };

    let bytes = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
    let content = fs::read_to_string(&path).unwrap_or_default();
    let has_yaml_frontmatter = skill_md_starts_with_yaml_frontmatter(&content);

    SkillMdQuality {
        has_yaml_frontmatter,
        bytes,
    }
}

fn should_replace_skill_dir(candidate_src: &Path, existing_dst: &Path) -> bool {
    let src_q = skill_md_quality(candidate_src);
    let dst_q = skill_md_quality(existing_dst);

    match (src_q.has_yaml_frontmatter, dst_q.has_yaml_frontmatter) {
        (true, false) => return true,
        (false, true) => return false,
        _ => {}
    }

    src_q.bytes > dst_q.bytes
}

fn ensure_skill_md_has_yaml_frontmatter(path: &Path, skill_name: &str) -> Result<(), String> {
    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read {}: {e}", path.display()))?;
    if skill_md_starts_with_yaml_frontmatter(&content) {
        return Ok(());
    }

    let name = skill_name.trim();
    let yaml_name = if name.is_empty() {
        yaml_single_quote("skill")
    } else {
        yaml_single_quote(name)
    };

    let new_content = format!("---\nname: {yaml_name}\n---\n\n{content}");
    fs::write(path, new_content).map_err(|e| format!("Failed to write {}: {e}", path.display()))
}

fn find_skill_roots(root: &Path) -> Vec<PathBuf> {
    let mut roots: Vec<PathBuf> = vec![];
    let mut stack: Vec<PathBuf> = vec![root.to_path_buf()];

    while let Some(dir) = stack.pop() {
        if !dir.is_dir() {
            continue;
        }

        if dir_contains_skill_md(&dir) {
            roots.push(dir);
            continue;
        }

        let entries = match fs::read_dir(&dir) {
            Ok(v) => v,
            Err(_) => continue,
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }
            let name = entry.file_name().to_string_lossy().to_string();
            if name.is_empty() || name.starts_with('.') {
                continue;
            }
            stack.push(path);
        }
    }

    roots
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

fn parse_name_from_dir(dir: &Path, fallback_name: &str) -> String {
    let mut name = fallback_name.to_string();

    let candidates = ["SKILL.md", "skill.md", "README.md", "README.MD", "readme.md"];
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
fn bootstrap_skills_store(skills: Vec<Skill>, storage_path: String) -> Result<(), String> {
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
fn install_skill(repo_url: String, storage_path: String) -> Result<Skill, String> {
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

fn skill_dest_for_agent(agent: &AgentInfo, skill_name: &str) -> PathBuf {
    expand_tilde(&agent.current_path).join(safe_skill_dir_name(skill_name))
}

fn sync_one_skill(store_root: &Path, skill_name: &str, enabled: &[String], agents: &[AgentInfo]) -> Result<(), String> {
    let src = store_root.join(safe_skill_dir_name(skill_name));
    if !src.exists() {
        return Err(format!(
            "Skill store not found for name={skill_name} at {}",
            src.display(),
        ));
    }

    for agent in agents {
        if !agent.enabled {
            continue;
        }
        let dst = skill_dest_for_agent(agent, skill_name);
        if enabled.iter().any(|a| a == &agent.id) {
            ensure_dir(&expand_tilde(&agent.current_path))?;
            copy_dir_all(&src, &dst)?;
            if agent.id == "codex" {
                if let Some(skill_md) = find_skill_md_path(&dst) {
                    ensure_skill_md_has_yaml_frontmatter(&skill_md, skill_name)?;
                }
            }
            continue;
        } else {
            let _ = remove_dir_if_exists(&dst);
        }
    }

    Ok(())
}

#[tauri::command]
fn sync_skill_distribution(
    skill_id: String,
    skill_name: String,
    enabled_agents: Vec<String>,
    agents: Vec<AgentInfo>,
    storage_path: String,
) -> Result<(), String> {
    let _ = skill_id;
    let store_root = manager_store_root(&storage_path)?;
    sync_one_skill(&store_root, &skill_name, &enabled_agents, &agents)
}

#[tauri::command]
fn sync_all_skills_distribution(skills: Vec<Skill>, agents: Vec<AgentInfo>, storage_path: String) -> Result<(), String> {
    let store_root = manager_store_root(&storage_path)?;
    for skill in skills {
        sync_one_skill(&store_root, &skill.name, &skill.enabled_agents, &agents)?;
    }
    Ok(())
}

#[tauri::command]
fn uninstall_skill(skill_id: String, skill_name: String, agents: Vec<AgentInfo>, storage_path: String) -> Result<(), String> {
    let _ = skill_id;
    let store_root = expand_tilde(&storage_path);
    let src = store_root.join(safe_skill_dir_name(&skill_name));
    let _ = remove_dir_if_exists(&src);

    for agent in agents {
        let dst = skill_dest_for_agent(&agent, &skill_name);
        let _ = remove_dir_if_exists(&dst);
    }

    Ok(())
}

#[tauri::command]
fn reset_store(storage_path: String) -> Result<(), String> {
    let root = expand_tilde(&storage_path);
    remove_dir_if_exists(&root)
}

#[tauri::command]
fn sync_all_to_manager_store(agents: Vec<AgentInfo>, storage_path: String) -> Result<Vec<Skill>, String> {
    sync_all_to_manager_store_inner(None, agents, storage_path)
}

#[tauri::command]
fn sync_all_to_manager_store_with_progress(
    app: tauri::AppHandle,
    agents: Vec<AgentInfo>,
    storage_path: String,
) -> Result<Vec<Skill>, String> {
    sync_all_to_manager_store_inner(Some(app), agents, storage_path)
}

fn sync_all_to_manager_store_inner(
    app: Option<tauri::AppHandle>,
    agents: Vec<AgentInfo>,
    storage_path: String,
) -> Result<Vec<Skill>, String> {
    let emit = |payload: SyncAllToManagerProgressLog| {
        if let Some(app) = &app {
            let _ = app.emit("sync_all_to_manager_store:progress", payload);
        }
    };

    emit(SyncAllToManagerProgressLog {
        id: "init".to_string(),
        label: "正在初始化中心库索引...".to_string(),
        status: "loading".to_string(),
        progress: 0.0,
    });

    let result = (|| -> Result<Vec<Skill>, String> {
        let store_root = manager_store_root(&storage_path)?;
        let mut found: BTreeMap<String, BTreeSet<String>> = BTreeMap::new();

        emit(SyncAllToManagerProgressLog {
            id: "init".to_string(),
            label: "正在初始化中心库索引...".to_string(),
            status: "success".to_string(),
            progress: 15.0,
        });

        let total = agents.len().max(1) as f64;
        for (idx, agent) in agents.iter().enumerate() {
            let id = format!("extract-{}", agent.id);
            let start_progress = 15.0 + (idx as f64 / total) * 70.0;
            emit(SyncAllToManagerProgressLog {
                id: id.clone(),
                label: format!("正在从 {} 目录提取技能资产...", agent.name),
                status: "loading".to_string(),
                progress: start_progress,
            });

            let agent_root = expand_tilde(&agent.current_path);
            if agent_root.exists() && agent_root.is_dir() {
                for skill_root in find_skill_roots(&agent_root) {
                    let name = skill_root
                        .file_name()
                        .map(|s| s.to_string_lossy().to_string())
                        .unwrap_or_default();
                    if name.is_empty() || name.starts_with('.') {
                        continue;
                    }

                    let key = safe_skill_dir_name(&name);
                    let dst = store_root.join(&key);
                    if !dst.exists() || should_replace_skill_dir(&skill_root, &dst) {
                        copy_dir_all(&skill_root, &dst)?;
                    }

                    found.entry(key).or_default().insert(agent.id.clone());
                }
            }

            let done_progress = 15.0 + ((idx + 1) as f64 / total) * 70.0;
            emit(SyncAllToManagerProgressLog {
                id: id.clone(),
                label: format!("正在从 {} 目录提取技能资产...", agent.name),
                status: "success".to_string(),
                progress: done_progress,
            });
        }

        emit(SyncAllToManagerProgressLog {
            id: "merge".to_string(),
            label: "正在进行资产去重与元数据合并...".to_string(),
            status: "loading".to_string(),
            progress: 90.0,
        });

        let now = now_iso();
        let mut skills: Vec<Skill> = vec![];
        for entry in fs::read_dir(&store_root)
            .map_err(|e| format!("Failed to read manager store {}: {e}", store_root.display()))?
        {
            let entry = entry.map_err(|e| format!("Failed to read entry: {e}"))?;
            let file_type = entry
                .file_type()
                .map_err(|e| format!("Failed to read file type: {e}"))?;
            if !file_type.is_dir() {
                continue;
            }
            let name = entry.file_name().to_string_lossy().to_string();
            if name.is_empty() || name.starts_with('.') {
                continue;
            }

            let enabled_agents = found
                .get(&name)
                .map(|s| s.iter().cloned().collect())
                .unwrap_or_else(Vec::new);

            skills.push(Skill {
                id: name.clone(),
                name: name.clone(),
                source_url: None,
                enabled_agents,
                last_sync: Some(now.clone()),
                last_update: Some(now.clone()),
            });
        }

        emit(SyncAllToManagerProgressLog {
            id: "merge".to_string(),
            label: "正在进行资产去重与元数据合并...".to_string(),
            status: "success".to_string(),
            progress: 100.0,
        });

        Ok(skills)
    })();

    match result {
        Ok(skills) => Ok(skills),
        Err(err) => {
            emit(SyncAllToManagerProgressLog {
                id: "error".to_string(),
                label: format!("同步失败: {err}"),
                status: "error".to_string(),
                progress: 100.0,
            });
            Err(err)
        }
    }
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
            sync_all_to_manager_store,
            sync_all_to_manager_store_with_progress,
            uninstall_skill,
            reset_store
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_test_dir(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("skills-manager-{name}-{}", generate_id()));
        ensure_dir(&dir).expect("create temp dir");
        dir
    }

    fn write_file(path: &Path, content: &str) {
        if let Some(parent) = path.parent() {
            ensure_dir(parent).expect("create parent dir");
        }
        fs::write(path, content).expect("write file");
    }

    fn agent(id: &str, name: &str, root: &Path, enabled: bool) -> AgentInfo {
        AgentInfo {
            id: id.to_string(),
            name: name.to_string(),
            default_path: root.to_string_lossy().to_string(),
            current_path: root.to_string_lossy().to_string(),
            enabled,
            icon: "test".to_string(),
        }
    }

    #[test]
    fn sync_all_prefers_skill_with_yaml_frontmatter() {
        let tmp = temp_test_dir("sync-all-prefers-frontmatter");
        let store_root = tmp.join("store");
        let agent_a_root = tmp.join("agent-a");
        let agent_b_root = tmp.join("agent-b");

        ensure_dir(&store_root).unwrap();
        ensure_dir(&agent_a_root).unwrap();
        ensure_dir(&agent_b_root).unwrap();

        let skill_dir = "agent-browser";
        write_file(
            &agent_a_root.join(skill_dir).join("SKILL.md"),
            "# agent-browser\n\n---\n",
        );
        write_file(
            &agent_b_root.join(skill_dir).join("SKILL.md"),
            "---\nname: agent-browser\n---\n\n# agent-browser\n",
        );

        let agents = vec![
            agent("a", "A", &agent_a_root, true),
            agent("b", "B", &agent_b_root, true),
        ];

        let _skills = sync_all_to_manager_store_inner(
            None,
            agents,
            store_root.to_string_lossy().to_string(),
        )
        .unwrap();

        let content = fs::read_to_string(store_root.join(skill_dir).join("SKILL.md")).unwrap();
        assert!(
            content.starts_with("---\n") || content.starts_with("---\r\n"),
            "store should keep the version with YAML frontmatter"
        );

        let _ = fs::remove_dir_all(&tmp);
    }

    #[test]
    fn sync_one_skill_adds_yaml_frontmatter_for_codex() {
        let tmp = temp_test_dir("sync-one-skill-frontmatter");
        let store_root = tmp.join("store");
        let codex_root = tmp.join("codex");

        ensure_dir(&store_root).unwrap();
        ensure_dir(&codex_root).unwrap();

        let skill_name = "agent-browser";
        let store_skill_dir = store_root.join(safe_skill_dir_name(skill_name));
        write_file(
            &store_skill_dir.join("SKILL.md"),
            "# agent-browser\n\n---\n",
        );

        let agents = vec![agent("codex", "Codex", &codex_root, true)];
        sync_one_skill(&store_root, skill_name, &["codex".to_string()], &agents).unwrap();

        let dst_skill_md = codex_root.join(safe_skill_dir_name(skill_name)).join("SKILL.md");
        let content = fs::read_to_string(dst_skill_md).unwrap();
        assert!(
            content.starts_with("---\n") || content.starts_with("---\r\n"),
            "Codex target should have YAML frontmatter"
        );
        assert!(
            content.contains("name: 'agent-browser'")
                || content.contains("name: \"agent-browser\"")
                || content.contains("name: agent-browser"),
            "YAML frontmatter should contain name"
        );

        let _ = fs::remove_dir_all(&tmp);
    }

    #[test]
    fn sync_one_skill_skips_disabled_agents() {
        let tmp = temp_test_dir("sync-one-skill");
        let store_root = tmp.join("store");
        let enabled_root = tmp.join("enabled-agent");
        let disabled_root = tmp.join("disabled-agent");

        ensure_dir(&store_root).unwrap();
        ensure_dir(&enabled_root).unwrap();
        ensure_dir(&disabled_root).unwrap();

        let skill_name = "My Skill";
        let store_skill_dir = store_root.join(safe_skill_dir_name(skill_name));
        write_file(&store_skill_dir.join("SKILL.md"), "# My Skill\n");

        // Create pre-existing folders in both agents to ensure removal/copy behavior is observable.
        write_file(
            &enabled_root.join(safe_skill_dir_name(skill_name)).join("SKILL.md"),
            "# old\n",
        );
        write_file(
            &disabled_root.join(safe_skill_dir_name(skill_name)).join("SKILL.md"),
            "# keep\n",
        );

        let agents = vec![
            agent("enabled", "Enabled", &enabled_root, true),
            agent("disabled", "Disabled", &disabled_root, false),
        ];

        // Skill is not enabled for the enabled agent -> should be removed there.
        // Disabled agent should remain untouched.
        sync_one_skill(&store_root, skill_name, &[], &agents).unwrap();

        assert!(
            !enabled_root.join(safe_skill_dir_name(skill_name)).exists(),
            "enabled agent folder should be removed when not selected"
        );
        assert!(
            disabled_root.join(safe_skill_dir_name(skill_name)).exists(),
            "disabled agent folder should not be touched"
        );

        let _ = fs::remove_dir_all(&tmp);
    }
}
