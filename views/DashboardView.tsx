
import React from 'react';
import { View, TabIcon, User, SaleRecord, Product, CompanyInfo } from '../types';
import DashboardButton from '../components/DashboardButton';

interface DashboardViewProps {
  onNavigate: (view: View, label: string, icon: TabIcon) => void;
  onOpenManual: () => void;
  currentUser: User;
  salesHistory: SaleRecord[];
  products: Product[];
  companyInfo: CompanyInfo;
}

const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onOpenManual, currentUser, companyInfo }) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-6xl p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-cyan-500/10 border border-slate-200 dark:border-slate-700">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 text-center tracking-tight">Hızlı İşlemler Menüsü</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <DashboardButton
              iconName="new-sale"
              label="Satış Ekranı"
              onClick={() => onNavigate(View.SALE, 'Satış Ekranı', 'new-sale')}
              color="green"
            />
            <DashboardButton
              iconName="back"
              label="İade İşlemi"
              onClick={() => onNavigate(View.RETURN, 'İade Ekranı', 'back')}
              color="rose"
            />
            <DashboardButton
              iconName="products"
              label="Stok Yönetimi"
              onClick={() => onNavigate(View.PRODUCTS, 'Stok Yönetimi', 'products')}
              color="purple"
            />
             <DashboardButton
              iconName="refresh"
              label="Stok Sayım Modu"
              onClick={() => onNavigate(View.STOCK_COUNT, 'Stok Sayım', 'refresh')}
              color="orange"
            />
            <DashboardButton
              iconName="reports"
              label="Raporlar"
              onClick={() => onNavigate(View.REPORTS, 'Raporlar', 'reports')}
              color="indigo"
            />
             <DashboardButton
              iconName="chart"
              label="Analiz Paneli"
              onClick={() => onNavigate(View.ANALYSIS, 'Analiz Paneli', 'chart')}
              color="violet"
            />
            <DashboardButton
              iconName="ai"
              label="Yapay Zeka"
              onClick={() => onNavigate(View.AI_MENU, 'Yapay Zeka', 'ai')}
              color="cyan"
            />
            <DashboardButton
              iconName="excel"
              label="Excel İşlemleri"
              onClick={() => onNavigate(View.EXCEL_OPERATIONS, 'Excel İşlemleri', 'excel')}
              color="green"
            />
            <DashboardButton
              iconName="tag"
              label="Tanımlar"
              onClick={() => onNavigate(View.DEFINITIONS, 'Tanımlar', 'tag')}
              color="pink"
            />
            <DashboardButton
              iconName="settings"
              label="Ayarlar"
              onClick={() => onNavigate(View.SETTINGS, 'Ayarlar', 'settings')}
              color="slate"
            />
             <DashboardButton
              iconName="purchase"
              label="Satın Alma"
              onClick={() => onNavigate(View.PURCHASE_MENU, 'Satın Alma', 'purchase')}
              color="amber"
            />
            <DashboardButton
              iconName="finance"
              label="Finans Yönetimi"
              onClick={() => onNavigate(View.FINANCE, 'Finans Yönetimi', 'finance')}
              color="lime"
            />
             <DashboardButton
              iconName="database"
              label="Veri Yönetimi"
              onClick={() => onNavigate(View.STORAGE_MANAGEMENT, 'Veri Yönetimi', 'database')}
              color="gray"
            />
            {currentUser.role === 'admin' && (
              <>
                <DashboardButton
                  iconName="users"
                  label="Kullanıcı Yönetimi"
                  onClick={() => onNavigate(View.USER_MANAGEMENT, 'Kullanıcı Yönetimi', 'users')}
                  color="sky"
                />
                <DashboardButton
                  iconName="sales-management"
                  label="Uzaktan Erişim"
                  onClick={() => onNavigate(View.REMOTE_ACCESS, 'Uzaktan Erişim', 'sales-management')}
                  color="teal"
                />
              </>
            )}
            <DashboardButton
              iconName="help"
              label="Kullanma Kılavuzu"
              onClick={onOpenManual}
              color="amber"
            />
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
