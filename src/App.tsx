import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MarketplacePage from './pages/MarketplacePage';
import AgentsPage from './pages/AgentsPage';
import SettingsPage from './pages/SettingsPage';
import RecycleBinPage from './pages/RecycleBinPage';
import OnboardingModal from './components/OnboardingModal';
import ToastHost from './components/ToastHost';
import DistributionModal from './components/DistributionModal';
import { bootstrapSkillsStore } from './services/skillService';
import { detectStartupUntrackedSkills } from './services/syncService';
import { getEffectiveAgents } from './services/effectiveAgents';
import { useAgentStore } from './stores/useAgentStore';
import { useSettingsStore } from './stores/useSettingsStore';
import { useSkillStore } from './stores/useSkillStore';
import { useUIStore } from './stores/useUIStore';
import StartupDetectModal from './components/StartupDetectModal';

const App: React.FC = () => {
  useEffect(() => {
    let cancelled = false;

    // 启动自动检测：发现 Agent 新技能后弹窗勾选，同步到中心库。
    void (async () => {
      try {
        const settings = useSettingsStore.getState();
        if (!settings.hasCompletedOnboarding) {
          settings.setHasCompletedOnboarding(true);
        }

        const storage = settings.storagePath;
        const currentSkills = useSkillStore.getState().skills;
        const hydratedSkills = await bootstrapSkillsStore(currentSkills);
        if (cancelled) return;

        useSkillStore.getState().setSkills(hydratedSkills);
        const bootstrapSample = hydratedSkills.slice(0, 8).map((skill) => skill.name).join('、');
        console.info('[startup-detect] bootstrap', {
          storage,
          hydratedCount: hydratedSkills.length,
          sampleSkills: hydratedSkills.slice(0, 8).map((skill) => skill.name),
        });
        useSkillStore.getState().addLog({
          action: 'sync',
          skillId: '启动检测调试',
          status: 'success',
          message: `中心库加载完成: storage=${storage}; loaded=${hydratedSkills.length}${bootstrapSample ? `; sample=${bootstrapSample}` : ''}`,
        });

        const agents = getEffectiveAgents(useAgentStore.getState().agents);
        const agentSummary = agents
          .map((agent) => `${agent.id}:${agent.currentPath}`)
          .join(' | ');

        console.info('[startup-detect] begin', {
          storage,
          agents: agents.map((agent) => ({
            id: agent.id,
            currentPath: agent.currentPath,
            defaultPath: agent.defaultPath,
          })),
        });
        useSkillStore.getState().addLog({
          action: 'sync',
          skillId: '启动检测调试',
          status: 'success',
          message: `启动检测开始: storage=${storage}; agents=${agentSummary}`,
        });

        const detected = await detectStartupUntrackedSkills(agents);
        if (cancelled) return;

        const sampleSkills = detected.slice(0, 8).map((skill) => skill.name).join('、');
        console.info('[startup-detect] done', {
          storage,
          detectedCount: detected.length,
          sampleSkills: detected.slice(0, 8).map((skill) => skill.name),
        });
        useSkillStore.getState().addLog({
          action: 'sync',
          skillId: '启动检测调试',
          status: 'success',
          message: `启动检测结果: detected=${detected.length}${sampleSkills ? `; sample=${sampleSkills}` : ''}`,
        });

        if (detected.length === 0) return;

        useUIStore.getState().openStartupDetectModal(detected);

        useSkillStore.getState().addLog({
          action: 'sync',
          skillId: '启动检测',
          status: 'success',
          message: `启动检测发现 ${detected.length} 个新技能，等待确认同步。`,
        });
      } catch (e) {
        console.error(e);
        useSkillStore.getState().addLog({
          action: 'sync',
          skillId: '启动检测',
          status: 'error',
          message: `启动检测失败: ${e instanceof Error ? e.message : '未知错误'}`,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/recycle-bin" element={<RecycleBinPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
      <OnboardingModal />
      <DistributionModal />
      <StartupDetectModal />
      <ToastHost />
    </Router>
  );
};

export default App;
