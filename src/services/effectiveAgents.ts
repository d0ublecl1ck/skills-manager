import { DEFAULT_AGENTS } from '../constants';
import type { AgentInfo } from '../types';

const normalizePath = (value: string | undefined, fallback: string) => {
  const normalized = value?.trim();
  if (normalized) return normalized;
  return fallback;
};

const normalizeOptionalPath = (value: string | undefined, fallback: string | undefined) => {
  const normalized = value?.trim();
  if (normalized) return normalized;
  const fallbackNormalized = fallback?.trim();
  return fallbackNormalized || undefined;
};

const mergeOneAgent = (fallback: AgentInfo, incoming: AgentInfo | undefined): AgentInfo => ({
  ...fallback,
  ...incoming,
  defaultPath: normalizePath(incoming?.defaultPath, fallback.defaultPath),
  currentPath: normalizePath(incoming?.currentPath, fallback.currentPath),
  enabled: typeof incoming?.enabled === 'boolean' ? incoming.enabled : fallback.enabled,
  icon: incoming?.icon || fallback.icon,
  projectPath: normalizeOptionalPath(incoming?.projectPath, fallback.projectPath),
  globalPath: normalizeOptionalPath(incoming?.globalPath, fallback.globalPath),
});

export const getEffectiveAgents = (storedAgents: AgentInfo[]): AgentInfo[] => {
  const input = Array.isArray(storedAgents) ? storedAgents : [];
  const byId = new Map(input.map((agent) => [agent.id, agent]));

  const merged = DEFAULT_AGENTS.map((fallback) =>
    mergeOneAgent(fallback, byId.get(fallback.id)),
  );

  for (const agent of input) {
    if (merged.some((existing) => existing.id === agent.id)) continue;
    merged.push(agent);
  }

  return merged;
};

