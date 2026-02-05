import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import SkillCard from './SkillCard';
import { AgentId, type AgentInfo, type Skill } from '../types';
import { useAgentStore } from '../stores/useAgentStore';
import { useSkillStore } from '../stores/useSkillStore';
import { useToastStore } from '../stores/useToastStore';

vi.mock('../services/skillMdService', () => ({
  getSkillDescriptionFromMd: vi.fn(async () => null),
}));

vi.mock('../services/syncService', () => ({
  syncAllSkillsDistribution: vi.fn(() => Promise.resolve()),
  syncAllSkillsDistributionWithProgress: vi.fn(() => Promise.resolve()),
  syncSkillDistribution: vi.fn(() => Promise.resolve()),
}));

const TEST_AGENTS: AgentInfo[] = [
  {
    id: AgentId.CODEX,
    name: 'Codex',
    defaultPath: '~/.codex/skills/.system/',
    currentPath: '~/.codex/skills/',
    enabled: true,
    icon: 'codex',
  },
];

describe('SkillCard', () => {
  beforeEach(() => {
    localStorage.clear();
    useAgentStore.setState({ agents: TEST_AGENTS });
    useSkillStore.setState({ skills: [], recycleBin: [], logs: [] });
    useToastStore.getState().clearToasts();
  });

  afterEach(() => {
    cleanup();
  });

  it('平台受控技能点击“覆盖重装”会调用 reInstallSkill', async () => {
    const reInstallSkill = vi.fn(async () => {});
    useSkillStore.setState({ reInstallSkill });

    const skill: Skill = {
      id: 'test-skill',
      name: 'Test Skill',
      enabledAgents: [],
      sourceUrl: 'github.com/foo/bar',
      installSource: 'platform',
      isAdopted: true,
    };

    render(<SkillCard skill={skill} />);
    expect(screen.getByText('来自 GitHub')).toBeTruthy();
    const user = userEvent.setup();

    await user.click(screen.getByTitle('检查并执行更新'));

    expect(reInstallSkill).toHaveBeenCalledTimes(1);
    expect(reInstallSkill).toHaveBeenCalledWith('test-skill');
  });

  it('外部识别技能点击更新会打开收编引导弹窗', async () => {
    const reInstallSkill = vi.fn(async () => {});
    useSkillStore.setState({ reInstallSkill });

    const skill: Skill = {
      id: 'ext-1',
      name: 'External Skill',
      enabledAgents: [],
      installSource: 'external',
      isAdopted: false,
    };

    render(<SkillCard skill={skill} />);
    expect(screen.queryByText(/^来自 /)).toBeNull();
    const user = userEvent.setup();

    await user.click(screen.getByTitle('绑定来源后开启自动更新'));

    expect(screen.getByText('绑定来源引导')).toBeTruthy();
    expect(reInstallSkill).not.toHaveBeenCalled();
  });

  it('外部识别技能允许开关 Agent', async () => {
    const toggleAgent = vi.fn();
    useSkillStore.setState({ toggleAgent });

    const skill: Skill = {
      id: 'ext-toggle-1',
      name: 'External Toggle Skill',
      enabledAgents: [],
      installSource: 'external',
      isAdopted: false,
    };

    render(<SkillCard skill={skill} />);
    const user = userEvent.setup();

    await user.click(screen.getByTitle('Codex'));

    expect(toggleAgent).toHaveBeenCalledTimes(1);
    expect(toggleAgent).toHaveBeenCalledWith('ext-toggle-1', AgentId.CODEX);
    expect(screen.queryByText('绑定来源引导')).toBeNull();
  });

  it('根据 sourceUrl 域名显示来源名称', () => {
    useSkillStore.setState({ reInstallSkill: vi.fn(async () => {}) });

    const vercelSkill: Skill = {
      id: 'vercel-1',
      name: 'Vercel Skill',
      enabledAgents: [],
      sourceUrl: 'https://vercel.com/xxskill',
      installSource: 'platform',
      isAdopted: true,
    };

    render(<SkillCard skill={vercelSkill} />);
    expect(screen.getByText('来自 Vercel')).toBeTruthy();
  });

  it('移入垃圾箱后会 toast 提示', async () => {
    const user = userEvent.setup();

    const skill: Skill = {
      id: 's1',
      name: 'demo-skill',
      enabledAgents: [],
    };
    useSkillStore.setState({ skills: [skill], recycleBin: [], logs: [] });

    render(<SkillCard skill={skill} />);

    await user.click(screen.getByRole('button', { name: '移动到垃圾箱' }));
    await user.click(await screen.findByRole('button', { name: '移入垃圾箱' }));

    expect(useToastStore.getState().toasts[0]?.message).toBe('"demo-skill" 已移入垃圾箱');
    expect(useSkillStore.getState().recycleBin.some((s) => s.id === 's1')).toBe(true);
  });

  it('列表视图使用三段式紧凑布局并启用平台开关滚动容器', async () => {
    const manyAgents: AgentInfo[] = [
      ...TEST_AGENTS,
      {
        id: AgentId.CLAUDE_CODE,
        name: 'Claude Code',
        defaultPath: '~/.claude/skills/',
        currentPath: '~/.claude/skills/',
        enabled: true,
        icon: 'claudecode',
      },
      {
        id: AgentId.CURSOR,
        name: 'Cursor',
        defaultPath: '~/.cursor/rules/',
        currentPath: '~/.cursor/rules/',
        enabled: true,
        icon: 'cursor',
      },
      {
        id: AgentId.CLINE,
        name: 'Cline',
        defaultPath: '~/.cline/skills/',
        currentPath: '~/.cline/skills/',
        enabled: true,
        icon: 'cline',
      },
    ];
    useAgentStore.setState({ agents: manyAgents });

    const skill: Skill = {
      id: 'compact-layout',
      name: 'Compact Layout Skill',
      enabledAgents: [AgentId.CODEX, AgentId.CLAUDE_CODE],
      installSource: 'platform',
      isAdopted: true,
    };

    render(<SkillCard skill={skill} viewMode="list" />);

    const card = screen.getByTestId('skill-card');
    expect(card).toHaveAttribute('data-layout', 'compact');
    expect(screen.getByText('Managed')).toBeTruthy();

    const switches = screen.getByTestId('compact-agent-switches');
    expect(switches).toHaveAttribute('data-scrollable', 'true');
    expect(switches.className).toContain('max-w-[240px]');
    expect(switches.className).toContain('overflow-x-auto');
  });
});
