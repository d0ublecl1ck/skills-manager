import React from 'react';

import { AgentId, type AgentInfo } from '../types';

type PlatformIconDef =
  | { kind: 'component'; component: React.FC<{ size?: number; className?: string }> }
  | { kind: 'img'; src: string; alt: string };

export interface PlatformDefinition {
  id: AgentId;
  name: string;
  icon: PlatformIconDef;
  iconKey: string;
  defaultEnabled: boolean;
  globalPaths: string[];
  projectPath: string;
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

export const PLATFORM_REGISTRY: PlatformDefinition[] = [
  {
    id: AgentId.AMP,
    name: 'Amp',
    icon: { kind: 'img', src: '/platform-icons/amp.svg', alt: 'amp' },
    iconKey: 'amp',
    defaultEnabled: false,
    globalPaths: ['~/.config/agents/skills/'],
    projectPath: '.agents/skills/',
  },
  {
    id: AgentId.ANTIGRAVITY,
    name: 'Antigravity',
    icon: { kind: 'img', src: '/platform-icons/antigravity.svg', alt: 'antigravity' },
    iconKey: 'antigravity',
    defaultEnabled: false,
    globalPaths: ['~/.gemini/antigravity/skills/'],
    projectPath: '.agent/skills/',
  },
  {
    id: AgentId.CLAUDE_CODE,
    name: 'Claude Code',
    icon: { kind: 'img', src: '/platform-icons/claude-code.svg', alt: 'claude-code' },
    iconKey: 'claudecode',
    defaultEnabled: true,
    globalPaths: ['~/.claude/skills/'],
    projectPath: '.claude/skills/',
  },
  {
    id: AgentId.CLAWDBOT,
    name: 'Clawdbot',
    icon: { kind: 'img', src: '/platform-icons/clawdbot.svg', alt: 'clawdbot' },
    iconKey: 'clawdbot',
    defaultEnabled: false,
    globalPaths: ['~/.clawdbot/skills/'],
    projectPath: 'skills/',
  },
  {
    id: AgentId.CLINE,
    name: 'Cline',
    icon: { kind: 'img', src: '/platform-icons/cline.svg', alt: 'cline' },
    iconKey: 'cline',
    defaultEnabled: false,
    globalPaths: ['~/.cline/skills/'],
    projectPath: '.cline/skills/',
  },
  {
    id: AgentId.CODEBUDDY,
    name: 'CodeBuddy',
    icon: { kind: 'img', src: '/platform-icons/codebuddy.svg', alt: 'codebuddy' },
    iconKey: 'codebuddy',
    defaultEnabled: false,
    globalPaths: ['~/.codebuddy/skills/'],
    projectPath: '.codebuddy/skills/',
  },
  {
    id: AgentId.CODEX,
    name: 'Codex',
    icon: { kind: 'img', src: '/platform-icons/codex.svg', alt: 'codex' },
    iconKey: 'codex',
    defaultEnabled: true,
    globalPaths: ['~/.codex/skills/', '~/.codex/skills/.system/'],
    projectPath: '.codex/skills/',
  },
  {
    id: AgentId.COPILOT,
    name: 'GitHub Copilot',
    icon: { kind: 'img', src: '/platform-icons/copilot.svg', alt: 'copilot' },
    iconKey: 'copilot',
    defaultEnabled: false,
    globalPaths: ['~/.copilot/skills/'],
    projectPath: '.github/skills/',
  },
  {
    id: AgentId.CURSOR,
    name: 'Cursor',
    icon: { kind: 'img', src: '/platform-icons/cursor.svg', alt: 'cursor' },
    iconKey: 'cursor',
    defaultEnabled: false,
    globalPaths: ['~/.cursor/skills/'],
    projectPath: '.cursor/skills/',
  },
  {
    id: AgentId.DROID,
    name: 'Droid',
    icon: { kind: 'img', src: '/platform-icons/droid.svg', alt: 'droid' },
    iconKey: 'droid',
    defaultEnabled: false,
    globalPaths: ['~/.factory/skills/'],
    projectPath: '.factory/skills/',
  },
  {
    id: AgentId.GEMINI_CLI,
    name: 'Gemini CLI',
    icon: { kind: 'img', src: '/platform-icons/gemini-cli.svg', alt: 'gemini-cli' },
    iconKey: 'gemini',
    defaultEnabled: false,
    globalPaths: ['~/.gemini/skills/'],
    projectPath: '.gemini/skills/',
  },
  {
    id: AgentId.GOOSE,
    name: 'Goose',
    icon: { kind: 'img', src: '/platform-icons/goose.svg', alt: 'goose' },
    iconKey: 'goose',
    defaultEnabled: false,
    globalPaths: ['~/.config/goose/skills/'],
    projectPath: '.goose/skills/',
  },
  {
    id: AgentId.KILO_CODE,
    name: 'Kilo Code',
    icon: { kind: 'img', src: '/platform-icons/kilo-code.svg', alt: 'kilo-code' },
    iconKey: 'kilocode',
    defaultEnabled: false,
    globalPaths: ['~/.kilocode/skills/'],
    projectPath: '.kilocode/skills/',
  },
  {
    id: AgentId.KIRO_CLI,
    name: 'Kiro CLI',
    icon: { kind: 'img', src: '/platform-icons/kiro-cli.svg', alt: 'kiro-cli' },
    iconKey: 'kiro',
    defaultEnabled: false,
    globalPaths: ['~/.kiro/skills/'],
    projectPath: '.kiro/skills/',
  },
  {
    id: AgentId.OPENCODE,
    name: 'OpenCode',
    icon: { kind: 'img', src: '/platform-icons/opencode.svg', alt: 'opencode' },
    iconKey: 'opencode',
    defaultEnabled: false,
    globalPaths: ['~/.config/opencode/skills/'],
    projectPath: '.opencode/skills/',
  },
  {
    id: AgentId.QODER,
    name: 'Qoder',
    icon: { kind: 'img', src: '/platform-icons/qoder.svg', alt: 'qoder' },
    iconKey: 'qoder',
    defaultEnabled: false,
    globalPaths: ['~/.qoder/skills/'],
    projectPath: '.qoder/skills/',
  },
  {
    id: AgentId.QWEN_CODE,
    name: 'Qwen Code',
    icon: { kind: 'img', src: '/platform-icons/qwen-code.svg', alt: 'qwen-code' },
    iconKey: 'qwen',
    defaultEnabled: false,
    globalPaths: ['~/.qwen/skills/'],
    projectPath: '.qwen/skills/',
  },
  {
    id: AgentId.ROO_CODE,
    name: 'Roo Code',
    icon: { kind: 'img', src: '/platform-icons/roo-code.svg', alt: 'roo-code' },
    iconKey: 'roo',
    defaultEnabled: false,
    globalPaths: ['~/.roo/skills/'],
    projectPath: '.roo/skills/',
  },
  {
    id: AgentId.TRAE,
    name: 'Trae',
    icon: { kind: 'img', src: '/platform-icons/trae.svg', alt: 'trae' },
    iconKey: 'trae',
    defaultEnabled: false,
    globalPaths: ['~/.trae/skills/'],
    projectPath: '.trae/skills/',
  },
  {
    id: AgentId.WINDSURF,
    name: 'Windsurf',
    icon: { kind: 'img', src: '/platform-icons/windsurf.svg', alt: 'windsurf' },
    iconKey: 'windsurf',
    defaultEnabled: false,
    globalPaths: ['~/.codeium/windsurf/skills/'],
    projectPath: '.windsurf/skills/',
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
  defaultPath: p.globalPaths[1] ?? p.globalPaths[0] ?? '',
  currentPath: p.globalPaths[0] ?? '',
  enabled: p.defaultEnabled,
  icon: p.iconKey,
  projectPath: p.projectPath,
  globalPath: p.globalPaths[0] ?? '',
}));
