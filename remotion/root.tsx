import type React from 'react';
import {Composition} from 'remotion';

import {SkillsManagerDemo} from './skills-manager-demo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SkillsManagerDemo"
        component={SkillsManagerDemo}
        durationInFrames={6 * 30}
        fps={30}
        width={900}
        height={520}
      />
    </>
  );
};
