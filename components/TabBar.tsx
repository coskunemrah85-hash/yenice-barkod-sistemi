import React from 'react';
import { Tab, View } from '../types';
import Icon from './Icon';

interface TabBarProps {
    tabs: Tab[];
    activeTabId: View;
    onTabClick: (tabId: View) => void;
    onCloseTab: (tabId: View) => void;
}

const tabColorStyles: Record<string, { active: string; inactive: string; hoverClose: string }> = {
    [View.DASHBOARD]: { active: 'border-blue-500 text-blue-700', inactive: 'bg-blue-100/50 text-blue-700 hover:bg-blue-100/80', hoverClose: 'hover:bg-blue-200/70' },
    [View.SALE]: { active: 'border-green-500 text-green-700', inactive: 'bg-green-100/50 text-green-700 hover:bg-green-100/80', hoverClose: 'hover:bg-green-200/70' },
    [View.RETURN]: { active: 'border-red-500 text-red-700', inactive: 'bg-red-100/50 text-red-700 hover:bg-red-100/80', hoverClose: 'hover:bg-red-200/70' },
    [View.PRODUCTS]: { active: 'border-purple-500 text-purple-700', inactive: 'bg-purple-100/50 text-purple-700 hover:bg-purple-100/80', hoverClose: 'hover:bg-purple-200/70' },
    [View.REPORTS]: { active: 'border-indigo-500 text-indigo-700', inactive: 'bg-indigo-100/50 text-indigo-700 hover:bg-indigo-100/80', hoverClose: 'hover:bg-indigo-200/70' },
    [View.DEFINITIONS]: { active: 'border-pink-500 text-pink-700', inactive: 'bg-pink-100/50 text-pink-700 hover:bg-pink-100/80', hoverClose: 'hover:bg-pink-200/70' },
    [View.PURCHASE]: { active: 'border-amber-500 text-amber-700', inactive: 'bg-amber-100/50 text-amber-700 hover:bg-amber-100/80', hoverClose: 'hover:bg-amber-200/70' },
    [View.FINANCE]: { active: 'border-lime-500 text-lime-700', inactive: 'bg-lime-100/50 text-lime-700 hover:bg-lime-100/80', hoverClose: 'hover:bg-lime-200/70' },
    [View.USER_MANAGEMENT]: { active: 'border-sky-500 text-sky-700', inactive: 'bg-sky-100/50 text-sky-700 hover:bg-sky-100/80', hoverClose: 'hover:bg-sky-200/70' },
    [View.STORAGE_MANAGEMENT]: { active: 'border-gray-500 text-gray-700', inactive: 'bg-gray-200/60 text-gray-700 hover:bg-gray-200', hoverClose: 'hover:bg-gray-300/70' },
    [View.SETTINGS]: { active: 'border-slate-500 text-slate-700', inactive: 'bg-slate-200/60 text-slate-700 hover:bg-slate-200', hoverClose: 'hover:bg-slate-300/70' },
    [View.REMOTE_ACCESS]: { active: 'border-teal-500 text-teal-700', inactive: 'bg-teal-100/50 text-teal-700 hover:bg-teal-100/80', hoverClose: 'hover:bg-teal-200/70' },
    [View.STOCK_COUNT]: { active: 'border-orange-500 text-orange-700', inactive: 'bg-orange-100/50 text-orange-700 hover:bg-orange-100/80', hoverClose: 'hover:bg-orange-200/70' },
    [View.ANALYSIS]: { active: 'border-violet-500 text-violet-700', inactive: 'bg-violet-100/50 text-violet-700 hover:bg-violet-100/80', hoverClose: 'hover:bg-violet-200/70' },
};

const defaultColors = { active: 'border-cyan-500 text-cyan-700', inactive: 'bg-slate-200/70 text-slate-500 hover:bg-slate-300/60', hoverClose: 'hover:bg-slate-400/50' };


const TabBar: React.FC<TabBarProps> = ({ tabs, activeTabId, onTabClick, onCloseTab }) => {
    return (
        <div className="flex-shrink-0 bg-white border-b border-slate-200 px-4 pt-2 flex items-end gap-1">
            {tabs.map(tab => {
                const isActive = activeTabId === tab.id;
                const colors = tabColorStyles[tab.id] || defaultColors;

                const baseClasses = 'flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors cursor-pointer rounded-t-lg';
                const activeClasses = `bg-slate-100 font-semibold ${colors.active}`;
                const inactiveClasses = `border-transparent ${colors.inactive}`;

                return (
                    <div
                        key={tab.id}
                        onClick={() => onTabClick(tab.id)}
                        className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
                    >
                        <Icon name={tab.icon} className="w-5 h-5" />
                        <span className="text-sm">{tab.label}</span>
                        {tab.id !== View.DASHBOARD && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCloseTab(tab.id);
                                }}
                                className={`ml-2 p-1 rounded-full transition-colors ${colors.hoverClose}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default TabBar;