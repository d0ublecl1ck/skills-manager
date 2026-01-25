use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};

use tauri::Emitter;

use crate::models::{
    AgentInfo, Skill, SyncAllSkillsDistributionProgressLog, SyncAllToManagerProgressLog,
};
use crate::utils::{
    agent_roots, copy_dir_all, ensure_dir, manager_store_root, now_iso, remove_dir_if_exists,
    safe_skill_dir_name,
};

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

fn extract_description_from_skill_md(content: &str) -> Option<String> {
    let trimmed = content.trim_start_matches('\u{feff}');
    if !(trimmed.starts_with("---\n") || trimmed.starts_with("---\r\n")) {
        return None;
    }

    // Parse YAML frontmatter lines: between first and second "---" delimiter lines.
    let mut frontmatter_lines: Vec<&str> = vec![];
    let mut lines = trimmed.lines();
    let first = lines.next()?;
    if first.trim_end_matches('\r') != "---" {
        return None;
    }

    for line in lines {
        let l = line.trim_end_matches('\r');
        if l == "---" {
            break;
        }
        frontmatter_lines.push(l);
    }

    // Find `description:` in frontmatter.
    let mut idx = 0usize;
    while idx < frontmatter_lines.len() {
        let raw = frontmatter_lines[idx];
        let t = raw.trim_start();
        if !t.to_ascii_lowercase().starts_with("description") {
            idx += 1;
            continue;
        }

        let mut parts = t.splitn(2, ':');
        let key = parts.next().unwrap_or("").trim().to_ascii_lowercase();
        if key != "description" {
            idx += 1;
            continue;
        }
        let rest = parts.next().unwrap_or("").trim();

        // Handle YAML block scalars: `description: |` / `description: >` (optionally with chomping indicators).
        if rest.starts_with('|') || rest.starts_with('>') {
            let mut out: Vec<String> = vec![];
            let mut block_indent: Option<usize> = None;

            for next in frontmatter_lines.iter().skip(idx + 1) {
                if next.trim().is_empty() {
                    out.push(String::new());
                    continue;
                }

                let indent = next.chars().take_while(|c| *c == ' ' || *c == '\t').count();
                if block_indent.is_none() {
                    block_indent = Some(indent);
                }

                let want = block_indent.unwrap_or(0);
                if indent < want {
                    break;
                }

                out.push(next.chars().skip(want).collect());
            }

            let joined = out.join("\n").trim().to_string();
            return if joined.is_empty() { None } else { Some(joined) };
        }

        // Single-line scalars (quoted or plain).
        let mut value = rest.to_string();
        let is_single_quoted = value.starts_with('\'') && value.ends_with('\'');
        let is_double_quoted = value.starts_with('"') && value.ends_with('"');
        if is_single_quoted || is_double_quoted {
            if value.len() >= 2 {
                value = value[1..value.len() - 1].to_string();
            }
            if is_single_quoted {
                value = value.replace("''", "'");
            }
        }

        let v = value.trim().to_string();
        return if v.is_empty() { None } else { Some(v) };
    }

    None
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
    let content =
        fs::read_to_string(path).map_err(|e| format!("Failed to read {}: {e}", path.display()))?;
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

fn sync_one_skill(
    store_root: &Path,
    skill_name: &str,
    enabled: &[String],
    agents: &[AgentInfo],
) -> Result<(), String> {
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
        if enabled.iter().any(|a| a == &agent.id) {
            for root in agent_roots(agent) {
                ensure_dir(&root)?;
                let dst = root.join(safe_skill_dir_name(skill_name));
                copy_dir_all(&src, &dst)?;
                if agent.id == "codex" {
                    if let Some(skill_md) = find_skill_md_path(&dst) {
                        ensure_skill_md_has_yaml_frontmatter(&skill_md, skill_name)?;
                    }
                }
            }
            continue;
        } else {
            for root in agent_roots(agent) {
                let dst = root.join(safe_skill_dir_name(skill_name));
                let _ = remove_dir_if_exists(&dst);
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub(crate) fn sync_skill_distribution(
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
pub(crate) async fn sync_all_skills_distribution(
    skills: Vec<Skill>,
    agents: Vec<AgentInfo>,
    storage_path: String,
) -> Result<(), String> {
    sync_all_skills_distribution_inner(None, skills, agents, storage_path).await
}

#[tauri::command]
pub(crate) async fn sync_all_skills_distribution_with_progress(
    app: tauri::AppHandle,
    skills: Vec<Skill>,
    agents: Vec<AgentInfo>,
    storage_path: String,
) -> Result<(), String> {
    sync_all_skills_distribution_inner(Some(app), skills, agents, storage_path).await
}

async fn sync_all_skills_distribution_inner(
    app: Option<tauri::AppHandle>,
    skills: Vec<Skill>,
    agents: Vec<AgentInfo>,
    storage_path: String,
) -> Result<(), String> {
    let emit = |app: &Option<tauri::AppHandle>, payload: SyncAllSkillsDistributionProgressLog| {
        if let Some(app) = app {
            let _ = app.emit("sync_all_skills_distribution:progress", payload);
        }
    };

    emit(
        &app,
        SyncAllSkillsDistributionProgressLog {
            id: "init".to_string(),
            label: "正在准备批量分发任务...".to_string(),
            status: "loading".to_string(),
            progress: 0.0,
        },
    );

    let app_for_worker = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || -> Result<(), String> {
        let store_root = manager_store_root(&storage_path)?;
        let total = skills.len().max(1) as f64;

        for (idx, skill) in skills.iter().enumerate() {
            let progress = (idx as f64 / total) * 100.0;
            emit(
                &app_for_worker,
                SyncAllSkillsDistributionProgressLog {
                    id: format!("sync-{}", skill.id),
                    label: format!("正在分发技能: {}", skill.name),
                    status: "loading".to_string(),
                    progress,
                },
            );

            sync_one_skill(&store_root, &skill.name, &skill.enabled_agents, &agents)?;

            let done_progress = ((idx + 1) as f64 / total) * 100.0;
            emit(
                &app_for_worker,
                SyncAllSkillsDistributionProgressLog {
                    id: format!("sync-{}", skill.id),
                    label: format!("正在分发技能: {}", skill.name),
                    status: "success".to_string(),
                    progress: done_progress,
                },
            );
        }

        emit(
            &app_for_worker,
            SyncAllSkillsDistributionProgressLog {
                id: "done".to_string(),
                label: "分发完成".to_string(),
                status: "success".to_string(),
                progress: 100.0,
            },
        );

        Ok(())
    })
    .await;

    match result {
        Ok(inner) => inner,
        Err(join_err) => {
            let msg = format!("分发任务异常终止: {join_err}");
            emit(
                &app,
                SyncAllSkillsDistributionProgressLog {
                    id: "error".to_string(),
                    label: msg.clone(),
                    status: "error".to_string(),
                    progress: 100.0,
                },
            );
            Err(msg)
        }
    }
}

#[tauri::command]
pub(crate) fn sync_all_to_manager_store(
    agents: Vec<AgentInfo>,
    storage_path: String,
) -> Result<Vec<Skill>, String> {
    sync_all_to_manager_store_inner(None, agents, storage_path)
}

#[tauri::command]
pub(crate) fn get_skill_description(
    skill_name: String,
    storage_path: String,
) -> Result<Option<String>, String> {
    let store_root = manager_store_root(&storage_path)?;
    let skill_dir = store_root.join(safe_skill_dir_name(&skill_name));
    let Some(path) = find_skill_md_path(&skill_dir) else {
        return Ok(None);
    };

    let content =
        fs::read_to_string(&path).map_err(|e| format!("Failed to read {}: {e}", path.display()))?;
    Ok(extract_description_from_skill_md(&content))
}

#[tauri::command]
pub(crate) fn sync_all_to_manager_store_with_progress(
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

            for agent_root in agent_roots(agent) {
                if !agent_root.exists() || !agent_root.is_dir() {
                    continue;
                }
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::utils::generate_id;

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

        let _skills =
            sync_all_to_manager_store_inner(None, agents, store_root.to_string_lossy().to_string())
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

        let dst_skill_md = codex_root
            .join(safe_skill_dir_name(skill_name))
            .join("SKILL.md");
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
            &enabled_root
                .join(safe_skill_dir_name(skill_name))
                .join("SKILL.md"),
            "# old\n",
        );
        write_file(
            &disabled_root
                .join(safe_skill_dir_name(skill_name))
                .join("SKILL.md"),
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

    #[test]
    fn sync_one_skill_copies_to_all_agent_roots() {
        let tmp = temp_test_dir("sync-one-skill-all-roots");
        let store_root = tmp.join("store");
        let current_root = tmp.join("current");
        let default_root = tmp.join("default");

        ensure_dir(&store_root).unwrap();
        ensure_dir(&current_root).unwrap();
        ensure_dir(&default_root).unwrap();

        let skill_name = "agent-browser";
        let store_skill_dir = store_root.join(safe_skill_dir_name(skill_name));
        write_file(&store_skill_dir.join("SKILL.md"), "# agent-browser\n");

        let agent = AgentInfo {
            id: "x".to_string(),
            name: "X".to_string(),
            default_path: default_root.to_string_lossy().to_string(),
            current_path: current_root.to_string_lossy().to_string(),
            enabled: true,
            icon: "test".to_string(),
        };

        sync_one_skill(&store_root, skill_name, &["x".to_string()], &[agent]).unwrap();

        for root in [current_root, default_root] {
            assert!(
                root.join(safe_skill_dir_name(skill_name))
                    .join("SKILL.md")
                    .exists(),
                "skill should be copied into {}",
                root.display()
            );
        }

        let _ = fs::remove_dir_all(&tmp);
    }

    #[test]
    fn extract_description_from_yaml_frontmatter_single_line() {
        let md = "---\nname: demo\ndescription: hello world\n---\n\n# demo\n";
        assert_eq!(
            extract_description_from_skill_md(md),
            Some("hello world".to_string())
        );
    }

    #[test]
    fn extract_description_from_yaml_frontmatter_block_scalar() {
        let md = "---\nname: demo\ndescription: |\n  line1\n  line2\n---\n\n# demo\n";
        assert_eq!(
            extract_description_from_skill_md(md),
            Some("line1\nline2".to_string())
        );
    }
}
