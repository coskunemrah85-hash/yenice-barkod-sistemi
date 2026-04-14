
import React from 'react';
import Icon from './Icon';
import { TabIcon } from '../types';

interface StatCardProps {
    icon: TabIcon | 'chart';
    title: string;
    value: string | number;
    description?: string;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, description, color }) => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-5 flex items-center gap-5 border border-slate-200/80 dark:border-slate-700">
        <div className={`rounded-full p-3 ${color} dark:bg-slate-700 dark:text-cyan-400`}>
            <Icon name={icon as any} className="w-7 h-7" />
        </div>
        <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{value}</p>
            {description && <p className="text-slate-400 dark:text-slate-500 text-xs">{description}</p>}
        </div>
    </div>
);

export default StatCard;
