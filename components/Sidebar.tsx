
import React from 'react';
import { View } from '../types';
import Header from './Header';
import Icon from './Icon';

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

const NavItem: React.FC<{
  view: View;
  label: string;
  icon: 'dashboard' | 'new-sale' | 'products' | 'reports';
  currentView: View;
  onClick: () => void;
}> = ({ view, label, icon, currentView, onClick }) => {
  const isActive = view === currentView;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-all duration-200 ${
        isActive
          ? 'bg-cyan-100 text-cyan-800'
          : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-800'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon name={icon} className={`w-6 h-6 mr-4 flex-shrink-0 ${isActive ? 'text-cyan-600' : 'text-slate-500'}`} />
      <span className="font-semibold">{label}</span>
    </button>
  );
};


const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  return (
    <aside className="w-72 bg-white/70 backdrop-blur-lg border-r border-slate-200/80 flex flex-col p-4 flex-shrink-0 shadow-lg">
      <div className="px-2 mb-8">
        {/* FIX: Pass the required 'companyName' prop to the Header component. */}
        <Header companyName="Yenice İç Giyim" />
      </div>
      <nav className="flex-grow space-y-2">
        <NavItem
          view={View.DASHBOARD}
          label="Gösterge Paneli"
          icon="dashboard"
          currentView={currentView}
          onClick={() => onNavigate(View.DASHBOARD)}
        />
        <NavItem
          view={View.SALE}
          label="Satış Ekranı"
          icon="new-sale"
          currentView={currentView}
          onClick={() => onNavigate(View.SALE)}
        />
        <NavItem
          view={View.PRODUCTS}
          label="Ürünler & Stok"
          icon="products"
          currentView={currentView}
          onClick={() => onNavigate(View.PRODUCTS)}
        />
        <NavItem
          view={View.REPORTS}
          label="Raporlar & Analiz"
          icon="reports"
          currentView={currentView}
          onClick={() => onNavigate(View.REPORTS)}
        />
      </nav>
      <div className="mt-auto text-center text-xs text-slate-400">
        <p>Yenice İç Giyim Satış Programı</p>
        <p>v1.0.1</p>
      </div>
    </aside>
  );
};

export default Sidebar;