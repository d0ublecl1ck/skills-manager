import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MarketplacePage from './pages/MarketplacePage';
import AgentsPage from './pages/AgentsPage';
import SettingsPage from './pages/SettingsPage';
import OnboardingModal from './components/OnboardingModal';
import { bootstrapSkillsStore } from './services/tauriClient';
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
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
      <OnboardingModal />
    </Router>
  );
};

export default App;
