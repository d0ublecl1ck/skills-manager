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

const makeImgPlatformIcon =
  (src: string, alt: string): React.FC<{ size?: number; className?: string }> =>
  ({ size, className }) => (
    <img
      height={size}
      width={size}
      src={src}
      alt={alt}
      className={className}
      style={{ display: 'block' }}
    />
  );

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
  [AgentId.AMP]: makeImgPlatformIcon("/platform-icons/amp.svg", "amp"),
  [AgentId.ANTIGRAVITY]: makeImgPlatformIcon("/platform-icons/antigravity.svg", "antigravity"),
  [AgentId.CLAUDE_CODE]: ClaudeIcon,
  [AgentId.CLAWDBOT]: makeImgPlatformIcon("/platform-icons/generic.svg", "clawdbot"),
  [AgentId.CLINE]: ClineIcon,
  [AgentId.CODEX]: makeImgPlatformIcon("/platform-icons/codex.svg", "codex"),
  [AgentId.COMMAND_CODE]: makeImgPlatformIcon("/platform-icons/generic.svg", "command-code"),
  [AgentId.COPILOT]: CopilotIcon,
  [AgentId.CURSOR]: makeImgPlatformIcon("/platform-icons/cursor.svg", "cursor"),
  [AgentId.DROID]: makeImgPlatformIcon("/platform-icons/generic.svg", "droid"),
  [AgentId.GEMINI_CLI]: makeImgPlatformIcon("/platform-icons/generic.svg", "gemini-cli"),
  [AgentId.GOOSE]: makeImgPlatformIcon("/platform-icons/generic.svg", "goose"),
  [AgentId.KILO_CODE]: makeImgPlatformIcon("/platform-icons/generic.svg", "kilo-code"),
  [AgentId.KIRO_CLI]: makeImgPlatformIcon("/platform-icons/generic.svg", "kiro-cli"),
  [AgentId.MCPJAM]: makeImgPlatformIcon("/platform-icons/generic.svg", "mcpjam"),
  [AgentId.OPENCODE]: makeImgPlatformIcon("/platform-icons/opencode.svg", "opencode"),
  [AgentId.OPENHANDS]: makeImgPlatformIcon("/platform-icons/generic.svg", "openhands"),
  [AgentId.PI]: makeImgPlatformIcon("/platform-icons/generic.svg", "pi"),
  [AgentId.QODER]: makeImgPlatformIcon("/platform-icons/generic.svg", "qoder"),
  [AgentId.QWEN_CODE]: makeImgPlatformIcon("/platform-icons/generic.svg", "qwen-code"),
  [AgentId.ROO_CODE]: makeImgPlatformIcon("/platform-icons/generic.svg", "roo-code"),
  [AgentId.TRAE]: makeImgPlatformIcon("/platform-icons/generic.svg", "trae"),
  [AgentId.WINDSURF]: makeImgPlatformIcon("/platform-icons/generic.svg", "windsurf"),
  [AgentId.ZENCODER]: makeImgPlatformIcon("/platform-icons/generic.svg", "zencoder"),
  [AgentId.NEOVATE]: makeImgPlatformIcon("/platform-icons/generic.svg", "neovate"),
};

export const DEFAULT_AGENTS: AgentInfo[] = [
  {
    id: AgentId.AMP,
    name: 'Amp',
    defaultPath: '~/.config/agents/skills/',
    currentPath: '~/.config/agents/skills/',
    suggestedPaths: ['.agents/skills/', '~/.config/agents/skills/'],
    enabled: false,
    icon: 'amp'
  },
  {
    id: AgentId.ANTIGRAVITY,
    name: 'Antigravity',
    defaultPath: '~/.gemini/antigravity/skills/',
    currentPath: '~/.gemini/antigravity/skills/',
    suggestedPaths: ['.agent/skills/', '~/.gemini/antigravity/skills/'],
    enabled: false,
    icon: 'antigravity'
  },
  {
    id: AgentId.CLAUDE_CODE,
    name: 'Claude Code',
    defaultPath: '~/.claude/skills/',
    currentPath: '~/.claude/skills/',
    suggestedPaths: ['.claude/skills/', '~/.claude/skills/'],
    enabled: true,
    icon: 'claudecode'
  },
  {
    id: AgentId.CLAWDBOT,
    name: 'Clawdbot',
    defaultPath: '~/.clawdbot/skills/',
    currentPath: '~/.clawdbot/skills/',
    suggestedPaths: ['skills/', '~/.clawdbot/skills/'],
    enabled: false,
    icon: 'clawdbot'
  },
  {
    id: AgentId.CLINE,
    name: 'Cline',
    defaultPath: '~/.cline/skills/',
    currentPath: '~/.cline/skills/',
    suggestedPaths: ['.cline/skills/', '~/.cline/skills/'],
    enabled: false,
    icon: 'cline'
  },
  {
    id: AgentId.CODEX,
    name: 'Codex',
    defaultPath: '~/.codex/skills/',
    currentPath: '~/.codex/skills/',
    suggestedPaths: ['.codex/skills/', '~/.codex/skills/'],
    enabled: true,
    icon: 'codex'
  },
  {
    id: AgentId.COMMAND_CODE,
    name: 'Command Code',
    defaultPath: '~/.commandcode/skills/',
    currentPath: '~/.commandcode/skills/',
    suggestedPaths: ['.commandcode/skills/', '~/.commandcode/skills/'],
    enabled: false,
    icon: 'commandcode'
  },
  {
    id: AgentId.COPILOT,
    name: 'GitHub Copilot',
    defaultPath: '~/.copilot/skills/',
    currentPath: '~/.copilot/skills/',
    suggestedPaths: ['.github/skills/', '~/.copilot/skills/'],
    enabled: false,
    icon: 'copilot'
  },
  {
    id: AgentId.CURSOR,
    name: 'Cursor',
    defaultPath: '~/.cursor/skills/',
    currentPath: '~/.cursor/skills/',
    suggestedPaths: ['.cursor/skills/', '~/.cursor/skills/'],
    enabled: false,
    icon: 'cursor'
  },
  {
    id: AgentId.DROID,
    name: 'Droid',
    defaultPath: '~/.factory/skills/',
    currentPath: '~/.factory/skills/',
    suggestedPaths: ['.factory/skills/', '~/.factory/skills/'],
    enabled: false,
    icon: 'droid'
  },
  {
    id: AgentId.GEMINI_CLI,
    name: 'Gemini CLI',
    defaultPath: '~/.gemini/skills/',
    currentPath: '~/.gemini/skills/',
    suggestedPaths: ['.gemini/skills/', '~/.gemini/skills/'],
    enabled: false,
    icon: 'gemini'
  },
  {
    id: AgentId.GOOSE,
    name: 'Goose',
    defaultPath: '~/.config/goose/skills/',
    currentPath: '~/.config/goose/skills/',
    suggestedPaths: ['.goose/skills/', '~/.config/goose/skills/'],
    enabled: false,
    icon: 'goose'
  },
  {
    id: AgentId.KILO_CODE,
    name: 'Kilo Code',
    defaultPath: '~/.kilocode/skills/',
    currentPath: '~/.kilocode/skills/',
    suggestedPaths: ['.kilocode/skills/', '~/.kilocode/skills/'],
    enabled: false,
    icon: 'kilocode'
  },
  {
    id: AgentId.KIRO_CLI,
    name: 'Kiro CLI',
    defaultPath: '~/.kiro/skills/',
    currentPath: '~/.kiro/skills/',
    suggestedPaths: ['.kiro/skills/', '~/.kiro/skills/'],
    enabled: false,
    icon: 'kiro'
  },
  {
    id: AgentId.MCPJAM,
    name: 'MCPJam',
    defaultPath: '~/.mcpjam/skills/',
    currentPath: '~/.mcpjam/skills/',
    suggestedPaths: ['.mcpjam/skills/', '~/.mcpjam/skills/'],
    enabled: false,
    icon: 'mcpjam'
  },
  {
    id: AgentId.OPENCODE,
    name: 'OpenCode',
    defaultPath: '~/.config/opencode/skills/',
    currentPath: '~/.config/opencode/skills/',
    suggestedPaths: ['.opencode/skills/', '~/.config/opencode/skills/'],
    enabled: false,
    icon: 'opencode'
  },
  {
    id: AgentId.OPENHANDS,
    name: 'OpenHands',
    defaultPath: '~/.openhands/skills/',
    currentPath: '~/.openhands/skills/',
    suggestedPaths: ['.openhands/skills/', '~/.openhands/skills/'],
    enabled: false,
    icon: 'openhands'
  },
  {
    id: AgentId.PI,
    name: 'Pi',
    defaultPath: '~/.pi/agent/skills/',
    currentPath: '~/.pi/agent/skills/',
    suggestedPaths: ['.pi/skills/', '~/.pi/agent/skills/'],
    enabled: false,
    icon: 'pi'
  },
  {
    id: AgentId.QODER,
    name: 'Qoder',
    defaultPath: '~/.qoder/skills/',
    currentPath: '~/.qoder/skills/',
    suggestedPaths: ['.qoder/skills/', '~/.qoder/skills/'],
    enabled: false,
    icon: 'qoder'
  },
  {
    id: AgentId.QWEN_CODE,
    name: 'Qwen Code',
    defaultPath: '~/.qwen/skills/',
    currentPath: '~/.qwen/skills/',
    suggestedPaths: ['.qwen/skills/', '~/.qwen/skills/'],
    enabled: false,
    icon: 'qwen'
  },
  {
    id: AgentId.ROO_CODE,
    name: 'Roo Code',
    defaultPath: '~/.roo/skills/',
    currentPath: '~/.roo/skills/',
    suggestedPaths: ['.roo/skills/', '~/.roo/skills/'],
    enabled: false,
    icon: 'roo'
  },
  {
    id: AgentId.TRAE,
    name: 'Trae',
    defaultPath: '~/.trae/skills/',
    currentPath: '~/.trae/skills/',
    suggestedPaths: ['.trae/skills/', '~/.trae/skills/'],
    enabled: false,
    icon: 'trae'
  },
  {
    id: AgentId.WINDSURF,
    name: 'Windsurf',
    defaultPath: '~/.codeium/windsurf/skills/',
    currentPath: '~/.codeium/windsurf/skills/',
    suggestedPaths: ['.windsurf/skills/', '~/.codeium/windsurf/skills/'],
    enabled: false,
    icon: 'windsurf'
  },
  {
    id: AgentId.ZENCODER,
    name: 'Zencoder',
    defaultPath: '~/.zencoder/skills/',
    currentPath: '~/.zencoder/skills/',
    suggestedPaths: ['.zencoder/skills/', '~/.zencoder/skills/'],
    enabled: false,
    icon: 'zencoder'
  },
  {
    id: AgentId.NEOVATE,
    name: 'Neovate',
    defaultPath: '~/.neovate/skills/',
    currentPath: '~/.neovate/skills/',
    suggestedPaths: ['.neovate/skills/', '~/.neovate/skills/'],
    enabled: false,
    icon: 'neovate'
  },
];
