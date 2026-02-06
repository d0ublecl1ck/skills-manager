import { describe, expect, it } from 'vitest';

import { getEffectiveAgents } from './effectiveAgents';
import { AgentId, type AgentInfo } from '../types';

describe('getEffectiveAgents', () => {
  it('fills missing platform entries from defaults', () => {
    const stored: AgentInfo[] = [
      {
        id: AgentId.CODEX,
        name: 'Codex',
        defaultPath: '~/.codex/skills/.system/',
        currentPath: '~/.codex/skills/',
        enabled: true,
        icon: 'codex',
      },
    ];

    const effective = getEffectiveAgents(stored);
    const claude = effective.find((agent) => agent.id === AgentId.CLAUDE_CODE);
    expect(claude).toBeDefined();
    expect(claude?.currentPath).toBe('~/.claude/skills/');
  });

  it('keeps user customized paths when present', () => {
    const stored: AgentInfo[] = [
      {
        id: AgentId.CLAUDE_CODE,
        name: 'Claude Code',
        defaultPath: '~/.claude/skills/',
        currentPath: '/tmp/custom-claude-skills',
        enabled: false,
        icon: 'claudecode',
      },
    ];

    const effective = getEffectiveAgents(stored);
    const claude = effective.find((agent) => agent.id === AgentId.CLAUDE_CODE);
    expect(claude?.currentPath).toBe('/tmp/custom-claude-skills');
    expect(claude?.enabled).toBe(false);
  });
});

