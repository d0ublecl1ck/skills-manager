
export interface SkillMetadata {
  name: string;
  description: string;
  tags: string[];
}

const getLineValue = (content: string, prefix: string) => {
  const line = content
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.toLowerCase().startsWith(prefix.toLowerCase()));
  if (!line) return null;
  const idx = line.indexOf(':');
  if (idx === -1) return null;
  return line.slice(idx + 1).trim() || null;
};

export const analyzeSkillContent = async (content: string): Promise<SkillMetadata> => {
  const name =
    getLineValue(content, 'README.md') ||
    getLineValue(content, 'name') ||
    'Unknown Skill';
  const description =
    getLineValue(content, 'description') ||
    'No description available.';

  const tags = ['local', 'skills-manager'];

  return { name, description, tags };
};

