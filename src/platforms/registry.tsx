import React from 'react';

import { AgentId, type AgentInfo } from '../types';
import { ClaudeIcon } from '../assets/icons/ClaudeIcon';
import { ClineIcon } from '../assets/icons/ClineIcon';
import { CopilotIcon } from '../assets/icons/CopilotIcon';

type PlatformIconDef =
  | { kind: 'component'; component: React.FC<{ size?: number; className?: string }> }
  | { kind: 'img'; src: string; alt: string };

export interface PlatformDefinition {
  id: AgentId;
  name: string;
  icon: PlatformIconDef;
  iconKey: string;
  defaultEnabled: boolean;
  defaultPath: string;
  suggestedPaths: string[];
}

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

const iconFor = (def: PlatformDefinition): React.FC<{ size?: number; className?: string }> => {
  if (def.icon.kind === 'component') return def.icon.component;
  return makeImgPlatformIcon(def.icon.src, def.icon.alt);
};

const GENERIC_ICON = { kind: 'img' as const, src: '/platform-icons/generic.svg', alt: 'generic' };

export const PLATFORM_REGISTRY: PlatformDefinition[] = [
  {
    id: AgentId.AMP,
    name: 'Amp',
    icon: { kind: 'img', src: '/platform-icons/amp.svg', alt: 'amp' },
    iconKey: 'amp',
    defaultEnabled: false,
    defaultPath: '~/.config/agents/skills/',
    suggestedPaths: ['.agents/skills/', '~/.config/agents/skills/'],
  },
  {
    id: AgentId.ANTIGRAVITY,
    name: 'Antigravity',
    icon: { kind: 'img', src: '/platform-icons/antigravity.svg', alt: 'antigravity' },
    iconKey: 'antigravity',
    defaultEnabled: false,
    defaultPath: '~/.gemini/antigravity/skills/',
    suggestedPaths: ['.agent/skills/', '~/.gemini/antigravity/skills/'],
  },
  {
    id: AgentId.CLAUDE_CODE,
    name: 'Claude Code',
    icon: { kind: 'component', component: ClaudeIcon },
    iconKey: 'claudecode',
    defaultEnabled: true,
    defaultPath: '~/.claude/skills/',
    suggestedPaths: ['.claude/skills/', '~/.claude/skills/'],
  },
  {
    id: AgentId.CLAWDBOT,
    name: 'Clawdbot',
    icon: GENERIC_ICON,
    iconKey: 'clawdbot',
    defaultEnabled: false,
    defaultPath: '~/.clawdbot/skills/',
    suggestedPaths: ['skills/', '~/.clawdbot/skills/'],
  },
  {
    id: AgentId.CLINE,
    name: 'Cline',
    icon: { kind: 'component', component: ClineIcon },
    iconKey: 'cline',
    defaultEnabled: false,
    defaultPath: '~/.cline/skills/',
    suggestedPaths: ['.cline/skills/', '~/.cline/skills/'],
  },
  {
    id: AgentId.CODEX,
    name: 'Codex',
    icon: { kind: 'img', src: '/platform-icons/codex.svg', alt: 'codex' },
    iconKey: 'codex',
    defaultEnabled: true,
    defaultPath: '~/.codex/skills/',
    suggestedPaths: ['.codex/skills/', '~/.codex/skills/'],
  },
  {
    id: AgentId.COMMAND_CODE,
    name: 'Command Code',
    icon: GENERIC_ICON,
    iconKey: 'commandcode',
    defaultEnabled: false,
    defaultPath: '~/.commandcode/skills/',
    suggestedPaths: ['.commandcode/skills/', '~/.commandcode/skills/'],
  },
  {
    id: AgentId.COPILOT,
    name: 'GitHub Copilot',
    icon: { kind: 'component', component: CopilotIcon },
    iconKey: 'copilot',
    defaultEnabled: false,
    defaultPath: '~/.copilot/skills/',
    suggestedPaths: ['.github/skills/', '~/.copilot/skills/'],
  },
  {
    id: AgentId.CURSOR,
    name: 'Cursor',
    icon: { kind: 'img', src: '/platform-icons/cursor.svg', alt: 'cursor' },
    iconKey: 'cursor',
    defaultEnabled: false,
    defaultPath: '~/.cursor/skills/',
    suggestedPaths: ['.cursor/skills/', '~/.cursor/skills/'],
  },
  {
    id: AgentId.DROID,
    name: 'Droid',
    icon: GENERIC_ICON,
    iconKey: 'droid',
    defaultEnabled: false,
    defaultPath: '~/.factory/skills/',
    suggestedPaths: ['.factory/skills/', '~/.factory/skills/'],
  },
  {
    id: AgentId.GEMINI_CLI,
    name: 'Gemini CLI',
    icon: GENERIC_ICON,
    iconKey: 'gemini',
    defaultEnabled: false,
    defaultPath: '~/.gemini/skills/',
    suggestedPaths: ['.gemini/skills/', '~/.gemini/skills/'],
  },
  {
    id: AgentId.GOOSE,
    name: 'Goose',
    icon: GENERIC_ICON,
    iconKey: 'goose',
    defaultEnabled: false,
    defaultPath: '~/.config/goose/skills/',
    suggestedPaths: ['.goose/skills/', '~/.config/goose/skills/'],
  },
  {
    id: AgentId.KILO_CODE,
    name: 'Kilo Code',
    icon: GENERIC_ICON,
    iconKey: 'kilocode',
    defaultEnabled: false,
    defaultPath: '~/.kilocode/skills/',
    suggestedPaths: ['.kilocode/skills/', '~/.kilocode/skills/'],
  },
  {
    id: AgentId.KIRO_CLI,
    name: 'Kiro CLI',
    icon: GENERIC_ICON,
    iconKey: 'kiro',
    defaultEnabled: false,
    defaultPath: '~/.kiro/skills/',
    suggestedPaths: ['.kiro/skills/', '~/.kiro/skills/'],
  },
  {
    id: AgentId.MCPJAM,
    name: 'MCPJam',
    icon: GENERIC_ICON,
    iconKey: 'mcpjam',
    defaultEnabled: false,
    defaultPath: '~/.mcpjam/skills/',
    suggestedPaths: ['.mcpjam/skills/', '~/.mcpjam/skills/'],
  },
  {
    id: AgentId.OPENCODE,
    name: 'OpenCode',
    icon: { kind: 'img', src: '/platform-icons/opencode.svg', alt: 'opencode' },
    iconKey: 'opencode',
    defaultEnabled: false,
    defaultPath: '~/.config/opencode/skills/',
    suggestedPaths: ['.opencode/skills/', '~/.config/opencode/skills/'],
  },
  {
    id: AgentId.OPENHANDS,
    name: 'OpenHands',
    icon: GENERIC_ICON,
    iconKey: 'openhands',
    defaultEnabled: false,
    defaultPath: '~/.openhands/skills/',
    suggestedPaths: ['.openhands/skills/', '~/.openhands/skills/'],
  },
  {
    id: AgentId.PI,
    name: 'Pi',
    icon: GENERIC_ICON,
    iconKey: 'pi',
    defaultEnabled: false,
    defaultPath: '~/.pi/agent/skills/',
    suggestedPaths: ['.pi/skills/', '~/.pi/agent/skills/'],
  },
  {
    id: AgentId.QODER,
    name: 'Qoder',
    icon: GENERIC_ICON,
    iconKey: 'qoder',
    defaultEnabled: false,
    defaultPath: '~/.qoder/skills/',
    suggestedPaths: ['.qoder/skills/', '~/.qoder/skills/'],
  },
  {
    id: AgentId.QWEN_CODE,
    name: 'Qwen Code',
    icon: GENERIC_ICON,
    iconKey: 'qwen',
    defaultEnabled: false,
    defaultPath: '~/.qwen/skills/',
    suggestedPaths: ['.qwen/skills/', '~/.qwen/skills/'],
  },
  {
    id: AgentId.ROO_CODE,
    name: 'Roo Code',
    icon: GENERIC_ICON,
    iconKey: 'roo',
    defaultEnabled: false,
    defaultPath: '~/.roo/skills/',
    suggestedPaths: ['.roo/skills/', '~/.roo/skills/'],
  },
  {
    id: AgentId.TRAE,
    name: 'Trae',
    icon: GENERIC_ICON,
    iconKey: 'trae',
    defaultEnabled: false,
    defaultPath: '~/.trae/skills/',
    suggestedPaths: ['.trae/skills/', '~/.trae/skills/'],
  },
  {
    id: AgentId.WINDSURF,
    name: 'Windsurf',
    icon: GENERIC_ICON,
    iconKey: 'windsurf',
    defaultEnabled: false,
    defaultPath: '~/.codeium/windsurf/skills/',
    suggestedPaths: ['.windsurf/skills/', '~/.codeium/windsurf/skills/'],
  },
  {
    id: AgentId.ZENCODER,
    name: 'Zencoder',
    icon: GENERIC_ICON,
    iconKey: 'zencoder',
    defaultEnabled: false,
    defaultPath: '~/.zencoder/skills/',
    suggestedPaths: ['.zencoder/skills/', '~/.zencoder/skills/'],
  },
  {
    id: AgentId.NEOVATE,
    name: 'Neovate',
    icon: GENERIC_ICON,
    iconKey: 'neovate',
    defaultEnabled: false,
    defaultPath: '~/.neovate/skills/',
    suggestedPaths: ['.neovate/skills/', '~/.neovate/skills/'],
  },
];

export const PLATFORM_BY_ID = Object.fromEntries(
  PLATFORM_REGISTRY.map((p) => [p.id, p])
) as Record<AgentId, PlatformDefinition>;

export const PLATFORM_ICONS = Object.fromEntries(
  PLATFORM_REGISTRY.map((p) => [p.id, iconFor(p)])
) as Record<AgentId, React.FC<{ size?: number; className?: string }>>;

export const DEFAULT_AGENTS: AgentInfo[] = PLATFORM_REGISTRY.map((p) => ({
  id: p.id,
  name: p.name,
  defaultPath: p.defaultPath,
  currentPath: p.defaultPath,
  enabled: p.defaultEnabled,
  icon: p.iconKey,
  suggestedPaths: p.suggestedPaths,
}));

