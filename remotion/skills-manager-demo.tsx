import React, {useMemo} from 'react';
import {AbsoluteFill, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

type Rect = {x: number; y: number; width: number; height: number; r?: number};

const uiSize = {width: 1200, height: 760};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const glow = (hex: string, alpha: number) => {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const Highlight: React.FC<{rect: Rect; color: string; inFrame: number}> = ({rect, color, inFrame}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const appear = spring({
    frame: frame - inFrame,
    fps,
    config: {damping: 200},
  });
  const pulse = 0.65 + 0.35 * Math.sin((frame - inFrame) / fps * 3.2 * Math.PI);

  return (
    <div
      style={{
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        borderRadius: rect.r ?? 14,
        border: `2px solid ${glow(color, 0.85)}`,
        boxShadow: `0 0 ${18 * appear}px ${glow(color, 0.25 + 0.25 * pulse)}`,
        opacity: clamp01(appear) * (0.6 + 0.4 * pulse),
        background: `linear-gradient(135deg, ${glow(color, 0.10)}, transparent 60%)`,
        pointerEvents: 'none',
      }}
    />
  );
};

const Callout: React.FC<{
  title: string;
  subtitle: string;
  color: string;
  x: number;
  y: number;
  inFrame: number;
}> = ({title, subtitle, color, x, y, inFrame}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const t = spring({
    frame: frame - inFrame,
    fps,
    config: {damping: 200},
  });

  const opacity = interpolate(t, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const translateY = interpolate(t, [0, 1], [10, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translateY(${translateY}px)`,
        opacity,
        padding: '10px 12px',
        borderRadius: 14,
        background: 'rgba(11, 15, 23, 0.72)',
        border: `1px solid ${glow(color, 0.55)}`,
        boxShadow: `0 16px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06) inset`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        width: 220,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 6,
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: `linear-gradient(135deg, ${glow(color, 1)}, ${glow('#ffffff', 0.35)})`,
            boxShadow: `0 0 0 4px ${glow(color, 0.14)}`,
            flex: '0 0 auto',
          }}
        />
        <div style={{fontSize: 16, fontWeight: 800, color: '#ffffff', letterSpacing: -0.2}}>{title}</div>
      </div>
      <div style={{fontSize: 12.5, fontWeight: 600, lineHeight: 1.35, color: 'rgba(226, 232, 240, 0.86)'}}>
        {subtitle}
      </div>
    </div>
  );
};

const TopLabel: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const t = spring({frame: frame + Math.round(0.4 * fps), fps, config: {damping: 200}});
  const opacity = interpolate(t, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const translateY = interpolate(t, [0, 1], [-8, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <div
      style={{
        position: 'absolute',
        left: 26,
        top: 18,
        transform: `translateY(${translateY}px)`,
        opacity,
        display: 'flex',
        alignItems: 'baseline',
        gap: 10,
      }}
    >
      <div style={{fontSize: 18, fontWeight: 900, color: '#ffffff', letterSpacing: -0.3}}>Skills Manager</div>
      <div style={{fontSize: 12, fontWeight: 700, color: 'rgba(203, 213, 225, 0.8)'}}>Scan · Toggle · Install</div>
    </div>
  );
};

export const SkillsManagerDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const f = (seconds: number) => Math.round(seconds * fps);

  const card = useMemo(() => {
    const marginX = 20;
    const marginBottom = 20;
    const marginTop = 54;
    return {
      x: marginX,
      y: marginTop,
      width: width - marginX * 2,
      height: height - marginTop - marginBottom,
      r: 18,
    } satisfies Rect;
  }, [height, width]);

  const scaleIn = spring({
    frame,
    fps,
    config: {damping: 200},
    durationInFrames: f(1.2),
  });
  const cardTranslateY = interpolate(scaleIn, [0, 1], [10, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const cardOpacity = interpolate(scaleIn, [0, 1], [0.72, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const floatY = Math.sin(frame / fps * 1.1) * 1.6;

  const uiScale = card.width / uiSize.width;

  const rectInUi = (r: Rect): Rect => ({
    x: card.x + r.x * uiScale,
    y: card.y + r.y * uiScale,
    width: r.width * uiScale,
    height: r.height * uiScale,
    r: (r.r ?? 14) * uiScale,
  });

  const highlightScan = rectInUi({x: 305, y: 170, width: 720, height: 56, r: 14});
  const highlightTabs = rectInUi({x: 300, y: 262, width: 360, height: 40, r: 12});
  const highlightActions = rectInUi({x: 735, y: 62, width: 430, height: 56, r: 14});

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0b0f17',
        backgroundImage:
          'radial-gradient(900px 520px at 25% 20%, rgba(59,130,246,0.20), transparent 60%), radial-gradient(900px 520px at 80% 35%, rgba(168,85,247,0.18), transparent 55%), radial-gradient(900px 520px at 70% 85%, rgba(34,197,94,0.16), transparent 55%)',
      }}
    >
      <TopLabel />

      <div
        style={{
          position: 'absolute',
          left: card.x,
          top: card.y,
          width: card.width,
          height: card.height,
          transform: `translateY(${cardTranslateY + floatY}px) scale(${interpolate(scaleIn, [0, 1], [0.985, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })})`,
          opacity: cardOpacity,
          borderRadius: card.r,
          overflow: 'hidden',
          boxShadow: '0 22px 70px rgba(0,0,0,0.55)',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <Img
          src={staticFile('remotion/ui.png')}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center top',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(11,15,23,0.06) 0%, rgba(11,15,23,0.00) 26%, rgba(11,15,23,0.10) 100%)',
          }}
        />
      </div>

      <Sequence from={f(0.6)} durationInFrames={f(2.3)}>
        <Highlight rect={highlightScan} color="#3b82f6" inFrame={f(0.6)} />
        <Callout
          title="Scan"
          subtitle="一键搜集本地 skills，统一纳入中心库。"
          color="#3b82f6"
          x={44}
          y={90}
          inFrame={f(0.6)}
        />
      </Sequence>

      <Sequence from={f(2.8)} durationInFrames={f(2.3)}>
        <Highlight rect={highlightTabs} color="#22c55e" inFrame={f(2.8)} />
        <Callout
          title="Toggle"
          subtitle="按平台开关分发：开启=复制，关闭=移除。"
          color="#22c55e"
          x={44}
          y={132}
          inFrame={f(2.8)}
        />
      </Sequence>

      <Sequence from={f(4.65)} durationInFrames={f(1.35)}>
        <Highlight rect={highlightActions} color="#a855f7" inFrame={f(4.65)} />
        <Callout
          title="Install"
          subtitle="从 GitHub / Zip 直接安装并同步。"
          color="#a855f7"
          x={width - 44 - 220}
          y={96}
          inFrame={f(4.65)}
        />
      </Sequence>

      <div
        style={{
          position: 'absolute',
          left: 22,
          right: 22,
          bottom: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'rgba(148, 163, 184, 0.75)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.25,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              background: glow('#22c55e', 0.9),
              boxShadow: `0 0 0 4px ${glow('#22c55e', 0.14)}`,
            }}
          />
          <div>LOCAL-FIRST</div>
        </div>
        <div>skills-manager</div>
      </div>
    </AbsoluteFill>
  );
};
