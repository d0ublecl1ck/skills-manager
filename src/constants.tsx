import React from 'react';
import { AgentId, AgentInfo } from './types';
import { 
  Github, 
  Search, 
  RefreshCw, 
  Settings, 
  LayoutGrid, 
  ShoppingBag, 
  Globe, 
  Lightbulb,
  Zap,
  Plus
} from 'lucide-react';
import { ClaudeIcon } from './assets/icons/ClaudeIcon';
import { ClineIcon } from './assets/icons/ClineIcon';
import { CopilotIcon } from './assets/icons/CopilotIcon';

export const ICONS = {
  Github,
  Search,
  Sync: RefreshCw,
  Settings,
  Grid: LayoutGrid,
  Market: ShoppingBag,
  Globe,
  LightBulb: Lightbulb,
  Logo: Zap,
  Plus
};

export const PLATFORM_ICONS: Record<AgentId, React.FC<{ size?: number; className?: string }>> = {
  [AgentId.AMP]: ({ size, className }) => (
    <img
      height={size}
      width={size}
      src="/platform-icons/amp.svg"
      alt="amp"
      className={className}
      style={{ display: 'block' }}
    />
  ),
  [AgentId.ANTIGRAVITY]: ({ size, className }) => (
    <img
      height={size}
      width={size}
      src="/platform-icons/antigravity.png"
      alt="antigravity"
      className={className}
      style={{ display: 'block' }}
    />
  ),
  [AgentId.CLAUDE_CODE]: ClaudeIcon,
  [AgentId.CLINE]: ClineIcon,
  [AgentId.CODEX]: ({ size, className }) => (
    <img
      height={size}
      width={size}
      src="/platform-icons/codex.svg"
      alt="codex"
      className={className}
      style={{ display: 'block' }}
    />
  ),
  [AgentId.COPILOT]: CopilotIcon,
  [AgentId.CURSOR]: ({ size, className }) => (
    <img
      height={size}
      width={size}
      src="/platform-icons/cursor.svg"
      alt="cursor"
      className={className}
      style={{ display: 'block' }}
    />
  ),
  [AgentId.OPENCODE]: ({ size, className }) => (
    <img
      height={size}
      width={size}
      src="/platform-icons/opencode.svg"
      alt="opencode"
      className={className}
      style={{ display: 'block' }}
    />
  ),
};

export const DEFAULT_AGENTS: AgentInfo[] = [
  {
    id: AgentId.AMP,
    name: 'Amp',
    defaultPath: '~/.agents/skills/',
    currentPath: '~/.agents/skills/',
    enabled: false,
    icon: 'amp'
  },
  {
    id: AgentId.ANTIGRAVITY,
    name: 'Antigravity',
    defaultPath: '~/.agent/skills/',
    currentPath: '~/.agent/skills/',
    enabled: false,
    icon: 'antigravity'
  },
  {
    id: AgentId.CLAUDE_CODE,
    name: 'Claude Code',
    defaultPath: '~/.claude/skills/',
    currentPath: '~/.claude/skills/',
    enabled: true,
    icon: 'claudecode'
  },
  {
    id: AgentId.CLINE,
    name: 'Cline',
    defaultPath: '~/.cline/skills/',
    currentPath: '~/.cline/skills/',
    enabled: false,
    icon: 'cline'
  },
  {
    id: AgentId.CODEX,
    name: 'Codex',
    defaultPath: '~/.codex/skills/',
    currentPath: '~/.codex/skills/',
    enabled: true,
    icon: 'codex'
  },
  {
    id: AgentId.COPILOT,
    name: 'Copilot',
    defaultPath: '~/.copilot/skills/',
    currentPath: '~/.copilot/skills/',
    enabled: false,
    icon: 'copilot'
  },
  {
    id: AgentId.CURSOR,
    name: 'Cursor',
    defaultPath: '~/.cursor/skills/',
    currentPath: '~/.cursor/skills/',
    enabled: false,
    icon: 'cursor'
  },
  {
    id: AgentId.OPENCODE,
    name: 'OpenCode',
    defaultPath: '~/.opencode/skill/',
    currentPath: '~/.opencode/skill/',
    enabled: false,
    icon: 'opencode'
  }
];
