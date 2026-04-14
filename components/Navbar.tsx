
import React from 'react';
import { View, AITask, TabIcon, User, CompanyInfo, Tab } from '../types';
import Header from './Header';
import Icon from './Icon';
import Clock from './Clock';
import AiTaskRunner from './AiTaskRunner';

interface NavbarProps {
  onNavigate: (view: View, label: string, icon: TabIcon, payload?: any) => void;
  aiTasks: AITask[];
  onReviewAiTask: (taskId: string) => void;
  onDismissAiTask: (taskId: string) => void;
  currentUser: User;
  onLogout: () => void;
  companyInfo: CompanyInfo;
  openTabs: Tab[];
  activeTabId: View;
  onTabClick: (view: View) => void;
  onCloseTab: (view: View) => void;
  onOpenManual?: () => void;
}

const NavButton: React.FC<{ onClick: () => void; icon: TabIcon; label: string; colorClasses: string; }> = ({ onClick, icon, label, colorClasses }) => (
        <button
        onClick={onClick}
        className={`flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${colorClasses}`}
    >
        <Icon name={icon} className="w-5 h-5" />
        <span>{label}</span>
    </button>
);


const Navbar: React.FC<NavbarProps> = ({ onNavigate, aiTasks, onReviewAiTask, onDismissAiTask, currentUser, companyInfo, openTabs, activeTabId, onTabClick, onCloseTab, onOpenManual }) => {
  return (
    <header className="w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg border-b border-slate-200/80 dark:border-slate-800 px-4 flex items-center justify-between shadow-sm flex-shrink-0 z-20">
      <div className="flex items-end gap-4">
        <div className="flex items-center gap-4 py-2">
            <Header companyName={companyInfo.name} />
        </div>
        
        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 self-center"></div>

        <div className="flex items-end gap-1">
          {openTabs.map(tab => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => onTabClick(tab.id)}
                className={`flex items-center gap-2 pl-2 pr-1.5 py-1.5 rounded-t-md text-xs font-semibold transition-colors relative border-x border-t cursor-pointer ${
                  isActive
                    ? `bg-slate-100 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-white -mb-[1px] border-b border-b-slate-100 dark:border-b-slate-800` // Overlap effect
                    : `bg-slate-200/60 dark:bg-slate-800/40 border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700`
                }`}
              >
                <Icon name={tab.icon} className={`w-4 h-4 ${isActive ? 'text-cyan-600' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.id !== View.DASHBOARD && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.id);
                    }}
                    className="ml-1 p-1 rounded-full text-slate-400 hover:bg-red-200 hover:text-red-700 transition-colors"
                    title={`${tab.label} sekmesini kapat`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-3 py-2">
        {companyInfo.aiEnabled && (
          <AiTaskRunner 
              tasks={aiTasks}
              onReview={onReviewAiTask}
              onDismiss={onDismissAiTask}
          />
        )}
        <Clock />
        <div className="h-8 w-px bg-slate-300 dark:bg-slate-700"></div>
        <div className="bg-cyan-100 dark:bg-cyan-900/30 border border-cyan-200 dark:border-cyan-800 rounded-lg p-1 px-1.5 flex items-center gap-2">
          <div className="text-right">
            <p className="font-semibold text-xs text-cyan-800 dark:text-cyan-300">{currentUser.name}</p>
            <p className="text-[10px] text-cyan-600 dark:text-cyan-400">{currentUser.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
