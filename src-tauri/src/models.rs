use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Skill {
    pub(crate) id: String,
    pub(crate) name: String,
    #[serde(default)]
    pub(crate) source_url: Option<String>,
    #[serde(default)]
    pub(crate) enabled_agents: Vec<String>,
    #[serde(default)]
    pub(crate) last_sync: Option<String>,
    #[serde(default)]
    pub(crate) last_update: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct StartupDetectedSkill {
    pub(crate) id: String,
    pub(crate) name: String,
    #[serde(default)]
    pub(crate) source_agent_ids: Vec<String>,
    #[serde(default)]
    pub(crate) source_agent_names: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AgentInfo {
    pub(crate) id: String,
    pub(crate) name: String,
    pub(crate) default_path: String,
    pub(crate) current_path: String,
    pub(crate) enabled: bool,
    pub(crate) icon: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SyncAllToManagerProgressLog {
    pub(crate) id: String,
    pub(crate) label: String,
    pub(crate) status: String,
    pub(crate) progress: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SyncAllSkillsDistributionProgressLog {
    pub(crate) id: String,
    pub(crate) label: String,
    pub(crate) status: String,
    pub(crate) progress: f64,
}
