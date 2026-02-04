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
import { syncAllToManagerStore } from './services/syncService';
import { useAgentStore } from './stores/useAgentStore';
import { useSettingsStore } from './stores/useSettingsStore';
import { useSkillStore } from './stores/useSkillStore';

const STARTUP_SCAN_SESSION_KEY = 'skills-manager:startup-scan';

const App: React.FC = () => {
  useEffect(() => {
    let cancelled = false;

    bootstrapSkillsStore(useSkillStore.getState().skills).catch(console.error);

    // 启动自动扫描：把 Agent 中新增但未纳入管理的技能复制到中心库，并加入列表。
    void (async () => {
      try {
        if (sessionStorage.getItem(STARTUP_SCAN_SESSION_KEY) === '1') return;
        sessionStorage.setItem(STARTUP_SCAN_SESSION_KEY, '1');
      } catch {
        // ignore
      }

      try {
        const settings = useSettingsStore.getState();
        if (!settings.hasCompletedOnboarding) {
          settings.setHasCompletedOnboarding(true);
        }

        const agents = useAgentStore.getState().agents;
        const synced = await syncAllToManagerStore(agents);
        if (cancelled) return;

        const { skills, recycleBin, mergeSkills, addLog } = useSkillStore.getState();
        const tracked = new Set(
          [...skills, ...recycleBin].map((s) => s.name.trim().toLowerCase()),
        );
        const untracked = synced.filter((s) => !tracked.has(s.name.trim().toLowerCase()));
        if (untracked.length === 0) return;

        mergeSkills(untracked);
        addLog({
          action: 'sync',
          skillId: '启动扫描',
          status: 'success',
          message: `启动扫描发现 ${untracked.length} 个未纳入技能，已复制到中心库并加入管理。`,
        });
      } catch (e) {
        console.error(e);
        useSkillStore.getState().addLog({
          action: 'sync',
          skillId: '启动扫描',
          status: 'error',
          message: `启动扫描失败: ${e instanceof Error ? e.message : '未知错误'}`,
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
      <ToastHost />
    </Router>
  );
};

export default App;
