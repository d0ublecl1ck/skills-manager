import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';

import { uninstallSkill } from '../services/skillService';
import { syncSkillDistribution } from '../services/syncService';
import { AgentId, type AgentInfo, type Skill } from '../types';
import { useAgentStore } from './useAgentStore';
import { useSettingsStore } from './useSettingsStore';
import { useSkillStore } from './useSkillStore';

vi.mock('../services/syncService', () => ({
  syncSkillDistribution: vi.fn(() => Promise.resolve()),
}));

vi.mock('../services/skillService', () => ({
  uninstallSkill: vi.fn(() => Promise.resolve()),
}));

const TEST_AGENTS: AgentInfo[] = [
  {
    id: AgentId.CODEX,
    name: 'Codex',
    defaultPath: '~/.codex/skills/',
    currentPath: '~/.codex/skills/',
    enabled: true,
    icon: 'codex',
  },
];

describe('useSkillStore (recycle bin)', () => {
  beforeEach(() => {
    localStorage.clear();

    useAgentStore.setState({ agents: TEST_AGENTS });
    useSettingsStore.setState({ recycleBinRetentionDays: 15 });
    useSkillStore.setState({ skills: [], recycleBin: [], logs: [] });

    vi.mocked(syncSkillDistribution).mockClear();
    vi.mocked(uninstallSkill).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('removeSkill moves skill to recycleBin and removes from agents via sync(empty)', () => {
    const skill: Skill = {
      id: 's1',
      name: 'Skill One',
      enabledAgents: [AgentId.CODEX],
      sourceUrl: 'github.com/foo/bar',
    };
    useSkillStore.setState({ skills: [skill], recycleBin: [] });

    useSkillStore.getState().removeSkill('s1');

    const state = useSkillStore.getState();
    expect(state.skills).toHaveLength(0);
    expect(state.recycleBin).toHaveLength(1);
    expect(state.recycleBin[0]).toMatchObject({ id: 's1', name: 'Skill One' });
    expect(state.recycleBin[0].deletedAt).toBeTypeOf('string');

    expect(vi.mocked(syncSkillDistribution)).toHaveBeenCalledTimes(1);
    const [syncedSkill, syncedAgents] = vi.mocked(syncSkillDistribution).mock.calls[0];
    expect(syncedSkill).toMatchObject({ id: 's1', name: 'Skill One', enabledAgents: [] });
    expect(syncedAgents).toEqual(TEST_AGENTS);
  });

  it('restoreSkill moves skill back to skills and re-syncs distribution', () => {
    const skillInTrash: Skill = {
      id: 's1',
      name: 'Skill One',
      enabledAgents: [AgentId.CODEX],
      deletedAt: '2026-01-23T00:00:00Z',
    };
    useSkillStore.setState({ skills: [], recycleBin: [skillInTrash] });

    useSkillStore.getState().restoreSkill('s1');

    const state = useSkillStore.getState();
    expect(state.recycleBin).toHaveLength(0);
    expect(state.skills).toHaveLength(1);
    expect(state.skills[0]).toMatchObject({ id: 's1', name: 'Skill One', enabledAgents: [AgentId.CODEX] });
    expect('deletedAt' in state.skills[0]).toBe(false);

    expect(vi.mocked(syncSkillDistribution)).toHaveBeenCalledTimes(1);
    const [syncedSkill, syncedAgents] = vi.mocked(syncSkillDistribution).mock.calls[0];
    expect(syncedSkill).toMatchObject({ id: 's1', name: 'Skill One', enabledAgents: [AgentId.CODEX] });
    expect(syncedAgents).toEqual(TEST_AGENTS);
    expect(syncedSkill).not.toHaveProperty('deletedAt');
  });

  it('permanentlyDeleteSkill uninstalls and removes from recycleBin', () => {
    const skillInTrash: Skill = {
      id: 's1',
      name: 'Skill One',
      enabledAgents: [],
      deletedAt: '2026-01-23T00:00:00Z',
    };
    useSkillStore.setState({ recycleBin: [skillInTrash] });

    useSkillStore.getState().permanentlyDeleteSkill('s1');

    expect(useSkillStore.getState().recycleBin).toHaveLength(0);
    expect(vi.mocked(uninstallSkill)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(uninstallSkill)).toHaveBeenCalledWith(skillInTrash, TEST_AGENTS);
  });

  it('emptyRecycleBin uninstalls all and clears recycleBin', () => {
    const a: Skill = { id: 'a', name: 'A', enabledAgents: [], deletedAt: '2026-01-23T00:00:00Z' };
    const b: Skill = { id: 'b', name: 'B', enabledAgents: [], deletedAt: '2026-01-23T00:00:00Z' };
    useSkillStore.setState({ recycleBin: [a, b] });

    useSkillStore.getState().emptyRecycleBin();

    expect(useSkillStore.getState().recycleBin).toHaveLength(0);
    expect(vi.mocked(uninstallSkill)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(uninstallSkill)).toHaveBeenNthCalledWith(1, a, TEST_AGENTS);
    expect(vi.mocked(uninstallSkill)).toHaveBeenNthCalledWith(2, b, TEST_AGENTS);
  });

  it('cleanExpiredTrash removes expired entries and uninstalls them', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-24T00:00:00Z'));
    useSettingsStore.setState({ recycleBinRetentionDays: 1 });

    const expired: Skill = {
      id: 'expired',
      name: 'Expired',
      enabledAgents: [],
      deletedAt: '2026-01-22T00:00:00Z',
    };
    const kept: Skill = {
      id: 'kept',
      name: 'Kept',
      enabledAgents: [],
      deletedAt: '2026-01-23T12:00:00Z',
    };
    useSkillStore.setState({ recycleBin: [expired, kept] });

    useSkillStore.getState().cleanExpiredTrash();

    expect(useSkillStore.getState().recycleBin).toEqual([kept]);
    expect(vi.mocked(uninstallSkill)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(uninstallSkill)).toHaveBeenCalledWith(expired, TEST_AGENTS);
  });
});
