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
import { bootstrapSkillsStore } from './services/skillService';
import { useSkillStore } from './stores/useSkillStore';

const App: React.FC = () => {
  useEffect(() => {
    bootstrapSkillsStore(useSkillStore.getState().skills).catch(console.error);
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
      <ToastHost />
    </Router>
  );
};

export default App;
