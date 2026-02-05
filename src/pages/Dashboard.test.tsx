import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
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

  it('支持切换为列表视图并持久化到本地存储', async () => {
    const user = userEvent.setup();
    render(<Dashboard />);

    expect(screen.getByTestId('skills-container')).toHaveAttribute('data-view-mode', 'grid');
    expect(screen.getByRole('button', { name: '网格视图' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: '列表视图' }));

    await waitFor(() => {
      expect(screen.getByTestId('skills-container')).toHaveAttribute('data-view-mode', 'list');
      expect(screen.getByRole('button', { name: '列表视图' })).toHaveAttribute('aria-pressed', 'true');
      expect(localStorage.getItem('skills-manager:dashboard-view-mode')).toBe('list');
    });

    const firstSkillCard = screen.getAllByTestId('skill-card')[0];
    expect(firstSkillCard).toHaveAttribute('data-layout', 'compact');
    expect(screen.queryByText('暂无描述')).toBeNull();
  });

  it('会从本地存储恢复列表视图模式', () => {
    localStorage.setItem('skills-manager:dashboard-view-mode', 'list');

    render(<Dashboard />);

    const skillsContainer = screen.getByTestId('skills-container');
    expect(skillsContainer).toHaveAttribute('data-view-mode', 'list');
    expect(screen.getByRole('button', { name: '列表视图' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('切回网格视图会同步写入本地存储', async () => {
    localStorage.setItem('skills-manager:dashboard-view-mode', 'list');

    const user = userEvent.setup();
    render(<Dashboard />);

    await user.click(screen.getByRole('button', { name: '网格视图' }));

    await waitFor(() => {
      expect(screen.getByTestId('skills-container')).toHaveAttribute('data-view-mode', 'grid');
      expect(localStorage.getItem('skills-manager:dashboard-view-mode')).toBe('grid');
    });
  });

  it('本地存储为非法值时默认回退为网格视图', () => {
    localStorage.setItem('skills-manager:dashboard-view-mode', 'unexpected-value');

    render(<Dashboard />);

    expect(screen.getByTestId('skills-container')).toHaveAttribute('data-view-mode', 'grid');
    expect(screen.getByRole('button', { name: '网格视图' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('网格视图会保留描述信息展示', () => {
    render(<Dashboard />);

    const firstSkillCard = screen.getAllByTestId('skill-card')[0];
    expect(firstSkillCard).toHaveAttribute('data-layout', 'default');
    expect(screen.getAllByText('暂无描述').length).toBeGreaterThan(0);
  });
});
