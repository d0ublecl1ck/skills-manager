import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Dashboard from './Dashboard';
import { useAgentStore } from '../stores/useAgentStore';
import { useSkillStore } from '../stores/useSkillStore';
import { AgentId, type AgentInfo, type Skill } from '../types';

const TEST_AGENTS: AgentInfo[] = [
  {
    id: AgentId.CODEX,
    name: 'Codex',
    defaultPath: '~/.codex/skills/.system/',
    currentPath: '~/.codex/skills/',
    enabled: true,
    icon: 'codex',
  },
  {
    id: AgentId.CLAUDE_CODE,
    name: 'Claude Code',
    defaultPath: '~/.claude/skills/',
    currentPath: '~/.claude/skills/',
    enabled: true,
    icon: 'claudecode',
  },
];

const TEST_SKILLS: Skill[] = [
  { id: 's1', name: 'Bravo', enabledAgents: [AgentId.CODEX], lastSync: '2026-01-04T10:00:00Z' },
  { id: 's2', name: 'Alpha', enabledAgents: [AgentId.CODEX, AgentId.CLAUDE_CODE], lastSync: '2026-01-03T10:00:00Z' },
  { id: 's3', name: 'Charlie', enabledAgents: [AgentId.CLAUDE_CODE], lastSync: '2025-12-30T10:00:00Z' },
  { id: 's4', name: 'Delta', enabledAgents: [], lastSync: undefined },
];

describe('Dashboard (sorting)', () => {
  beforeEach(() => {
    localStorage.clear();
    useAgentStore.setState({ agents: TEST_AGENTS });
    useSkillStore.setState({ skills: TEST_SKILLS, recycleBin: [], logs: [] });
  });

  afterEach(() => {
    cleanup();
  });

  it('默认按最近同步倒序排列', () => {
    render(<Dashboard />);
    const skillTitles = screen
      .getAllByRole('heading', { level: 3 })
      .map((node) => node.textContent);
    expect(skillTitles).toEqual(['Bravo', 'Alpha', 'Charlie', 'Delta']);
  });

  it('切换为名称 (A-Z) 后按名称字母表排序', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    await user.selectOptions(screen.getByRole('combobox', { name: '排序' }), 'name_asc');

    const skillTitles = screen
      .getAllByRole('heading', { level: 3 })
      .map((node) => node.textContent);
    expect(skillTitles).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta']);
  });

  it('排序与 Agent 平台过滤联动', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    const codexTab = screen.getByText('Codex').closest('button');
    expect(codexTab).toBeTruthy();
    await user.click(codexTab as HTMLButtonElement);
    await user.selectOptions(screen.getByRole('combobox', { name: '排序' }), 'name_desc');

    const skillTitles = screen
      .getAllByRole('heading', { level: 3 })
      .map((node) => node.textContent);
    expect(skillTitles).toEqual(['Bravo', 'Alpha']);
  });
});
