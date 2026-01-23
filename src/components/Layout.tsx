
import React from 'react';
import Sidebar from './Sidebar';
import { ICONS } from '../constants';
import FeedbackModal from './FeedbackModal';
import SyncModal from './SyncModal';
import { useUIStore } from '../stores/useUIStore';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const setFeedbackModalOpen = useUIStore(state => state.setFeedbackModalOpen);

  const handleFeedbackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setFeedbackModalOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-[#fafafa]">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <header className="h-14 bg-white/80 backdrop-blur-md border-b border-[#eaeaea] sticky top-0 z-20 flex items-center justify-end px-8">
          <div className="flex items-center gap-6">
            <nav className="flex items-center gap-5 text-[13px] text-slate-500 font-medium">
              <a 
                href="#" 
                onClick={handleFeedbackClick}
                className="hover:text-black transition-colors"
              >
                意见反馈
              </a>
              <div className="w-px h-4 bg-slate-200"></div>
              <a 
                href="https://github.com/d0ublecl1ck/skills-manager" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-black transition-colors flex items-center"
                title="GitHub 源代码"
                aria-label="GitHub 源代码"
              >
                <ICONS.Github size={18} />
              </a>
            </nav>
          </div>
        </header>
        <div className="p-10 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
      <FeedbackModal />
      <SyncModal />
    </div>
  );
};

export default Layout;
