export enum AgentId {
  AMP = 'amp',
  ANTIGRAVITY = 'antigravity',
  CLAUDE_CODE = 'claude-code',
  CLINE = 'cline',
  CODEX = 'codex',
  COPILOT = 'copilot',
  CURSOR = 'cursor',
  OPENCODE = 'opencode'
}

export interface AgentInfo {
  id: AgentId;
  name: string;
  defaultPath: string;
  currentPath: string;
  enabled: boolean;
  icon: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  author: string;
  source: 'github' | 'local' | 'registry';
  sourceUrl?: string;
  tags: string[];
  enabledAgents: AgentId[];
  lastSync?: string;
  isAdopted: boolean; // 是否已纳入管理
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

