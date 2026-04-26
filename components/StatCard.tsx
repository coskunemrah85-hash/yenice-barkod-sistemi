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
    <div className="bg-white/5 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 p-8 flex items-center gap-6 shadow-2xl relative overflow-hidden group hover:bg-white/10 transition-all duration-300 transform-gpu">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${color} shadow-lg shadow-black/20 group-hover:scale-110 transition-transform duration-300`}>
            <Icon name={icon as any} className="w-8 h-8" />
        </div>
        <div>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{title}</p>
            <p className="text-3xl font-black text-white tracking-tighter">{value}</p>
            {description && <p className="text-white/30 text-[10px] font-bold uppercase mt-1 tracking-widest">{description}</p>}
        </div>
        <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
    </div>
);

export default StatCard;
