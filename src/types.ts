export enum AgentId {
  AMP = 'amp',
  ANTIGRAVITY = 'antigravity',
  CLAUDE_CODE = 'claude-code',
  CLAWDBOT = 'clawdbot',
  CLINE = 'cline',
  CODEX = 'codex',
  COPILOT = 'copilot',
  CURSOR = 'cursor',
  DROID = 'droid',
  GEMINI_CLI = 'gemini-cli',
  GOOSE = 'goose',
  KILO_CODE = 'kilo-code',
  KIRO_CLI = 'kiro-cli',
  OPENCODE = 'opencode',
  QODER = 'qoder',
  QWEN_CODE = 'qwen-code',
  ROO_CODE = 'roo-code',
  TRAE = 'trae',
  WINDSURF = 'windsurf',
}

export interface AgentInfo {
  id: AgentId;
  name: string;
  defaultPath: string;
  currentPath: string;
  enabled: boolean;
  icon: string;
  projectPath?: string;
  globalPath?: string;
}

export interface Skill {
  id: string;
  name: string;
  sourceUrl?: string;
  installSource?: 'platform' | 'external';
  isAdopted?: boolean;
  description?: string;
  author?: string;
  tags?: string[];
  enabledAgents: AgentId[];
  lastSync?: string;
  lastUpdate?: string;
  deletedAt?: string;
}

export interface OperationLog {
  id: string;
  timestamp: string;
  action: 'install' | 'uninstall' | 'enable' | 'disable' | 'sync' | 'backup';
  skillId: string;
  agentId?: AgentId;
  status: 'success' | 'error';
  message: string;
}
