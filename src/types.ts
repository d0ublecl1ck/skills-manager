export enum AgentId {
  AMP = 'amp',
  ANTIGRAVITY = 'antigravity',
  CLAUDE_CODE = 'claude-code',
  CLAWDBOT = 'clawdbot',
  CLINE = 'cline',
  CODEX = 'codex',
  COMMAND_CODE = 'command-code',
  COPILOT = 'copilot',
  CURSOR = 'cursor',
  DROID = 'droid',
  GEMINI_CLI = 'gemini-cli',
  GOOSE = 'goose',
  KILO_CODE = 'kilo-code',
  KIRO_CLI = 'kiro-cli',
  MCPJAM = 'mcpjam',
  OPENCODE = 'opencode',
  OPENHANDS = 'openhands',
  PI = 'pi',
  QODER = 'qoder',
  QWEN_CODE = 'qwen-code',
  ROO_CODE = 'roo-code',
  TRAE = 'trae',
  WINDSURF = 'windsurf',
  ZENCODER = 'zencoder',
  NEOVATE = 'neovate',
}

export interface AgentInfo {
  id: AgentId;
  name: string;
  defaultPath: string;
  currentPath: string;
  enabled: boolean;
  icon: string;
  suggestedPaths?: string[];
}

export interface Skill {
  id: string;
  name: string;
  sourceUrl?: string;
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
