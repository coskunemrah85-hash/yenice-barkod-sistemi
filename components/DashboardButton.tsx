
import React from 'react';
import Icon from './Icon';

interface DashboardButtonProps {
  iconName: 'new-sale' | 'products' | 'reports' | 'settings' | 'supplier' | 'purchase' | 'sales-management' | 'finance' | 'excel' | 'tools' | 'users' | 'database' | 'tag' | 'refresh' | 'chart' | 'back' | 'list-bullet' | 'ai' | 'help' | 'barcode' | 'customer' | 'calculator-menu';
  label: string;
  onClick: () => void;
  color?: 'cyan' | 'green' | 'purple' | 'indigo' | 'slate' | 'amber' | 'lime' | 'orange' | 'violet' | 'pink' | 'gray' | 'sky' | 'teal' | 'rose' | 'blue' | 'red';
}

const DashboardButton: React.FC<DashboardButtonProps> = ({ iconName, label, onClick, color = 'cyan' }) => {
  const colorClasses = {
    cyan: { shadow: 'hover:shadow-cyan-500/10', ring: 'focus:ring-cyan-500', bg: 'bg-cyan-100/70', hoverBg: 'group-hover:bg-cyan-200/70', text: 'text-cyan-600' },
    green: { shadow: 'hover:shadow-green-500/10', ring: 'focus:ring-green-500', bg: 'bg-green-100/70', hoverBg: 'group-hover:bg-green-200/70', text: 'text-green-600' },
    purple: { shadow: 'hover:shadow-purple-500/10', ring: 'focus:ring-purple-500', bg: 'bg-purple-100/70', hoverBg: 'group-hover:bg-purple-200/70', text: 'text-purple-600' },
    indigo: { shadow: 'hover:shadow-indigo-500/10', ring: 'focus:ring-indigo-500', bg: 'bg-indigo-100/70', hoverBg: 'group-hover:bg-indigo-200/70', text: 'text-indigo-600' },
    slate: { shadow: 'hover:shadow-slate-500/10', ring: 'focus:ring-slate-500', bg: 'bg-slate-200/70', hoverBg: 'group-hover:bg-slate-300/70', text: 'text-slate-600' },
    amber: { shadow: 'hover:shadow-amber-500/10', ring: 'focus:ring-amber-500', bg: 'bg-amber-100/70', hoverBg: 'group-hover:bg-amber-200/70', text: 'text-amber-600' },
    lime: { shadow: 'hover:shadow-lime-500/10', ring: 'focus:ring-lime-500', bg: 'bg-lime-100/70', hoverBg: 'group-hover:bg-lime-200/70', text: 'text-lime-600' },
    orange: { shadow: 'hover:shadow-orange-500/10', ring: 'focus:ring-orange-500', bg: 'bg-orange-100/70', hoverBg: 'group-hover:bg-orange-200/70', text: 'text-orange-600' },
    violet: { shadow: 'hover:shadow-violet-500/10', ring: 'focus:ring-violet-500', bg: 'bg-violet-100/70', hoverBg: 'group-hover:bg-violet-200/70', text: 'text-violet-600' },
    pink: { shadow: 'hover:shadow-pink-500/10', ring: 'focus:ring-pink-500', bg: 'bg-pink-100/70', hoverBg: 'group-hover:bg-pink-200/70', text: 'text-pink-600' },
    gray: { shadow: 'hover:shadow-gray-500/10', ring: 'focus:ring-gray-500', bg: 'bg-gray-200/70', hoverBg: 'group-hover:bg-gray-300/70', text: 'text-gray-600' },
    sky: { shadow: 'hover:shadow-sky-500/10', ring: 'focus:ring-sky-500', bg: 'bg-sky-100/70', hoverBg: 'group-hover:bg-sky-200/70', text: 'text-sky-600' },
    teal: { shadow: 'hover:shadow-teal-500/10', ring: 'focus:ring-teal-500', bg: 'bg-teal-100/70', hoverBg: 'group-hover:bg-teal-200/70', text: 'text-teal-600' },
    rose: { shadow: 'hover:shadow-rose-500/10', ring: 'focus:ring-rose-500', bg: 'bg-rose-100/70', hoverBg: 'group-hover:bg-rose-200/70', text: 'text-rose-600' },
    blue: { shadow: 'hover:shadow-blue-500/10', ring: 'focus:ring-blue-500', bg: 'bg-blue-100/70', hoverBg: 'group-hover:bg-blue-200/70', text: 'text-blue-600' },
    red: { shadow: 'hover:shadow-red-500/10', ring: 'focus:ring-red-500', bg: 'bg-red-100/70', hoverBg: 'group-hover:bg-red-200/70', text: 'text-red-600' },
  };

  const selectedColor = colorClasses[color] || colorClasses.cyan;

  return (
    <button
      onClick={onClick}
      className={`bg-white dark:bg-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 border border-slate-200 dark:border-slate-700 hover:border-cyan-500/50 hover:shadow-2xl hover:shadow-cyan-500/10 focus:outline-none focus:ring-2 ${selectedColor.ring} transform hover:-translate-y-1 group w-full h-full min-h-[110px]`}
    >
      <div className={`${selectedColor.bg} dark:bg-slate-700 ${selectedColor.hoverBg} dark:group-hover:bg-slate-600 p-4 rounded-2xl mb-3 transition-colors`}>
        <Icon name={iconName} className={`w-8 h-8 ${selectedColor.text} dark:text-cyan-300 transition-transform group-hover:scale-110 group-hover:rotate-3`} />
      </div>
      <span className="text-[13px] font-black text-slate-700 dark:text-slate-200 leading-tight">{label}</span>
    </button>
  );
};

export default DashboardButton;
