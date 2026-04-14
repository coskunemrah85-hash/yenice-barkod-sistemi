
import React from 'react';
import { View, TabIcon, CompanyInfo } from '../types';
import DashboardButton from '../components/DashboardButton';
import Icon from '../components/Icon';

interface PurchaseMenuViewProps {
  onNavigate: (view: View, label: string, icon: TabIcon, payload?: any) => void;
  companyInfo: CompanyInfo;
}

const PurchaseMenuView: React.FC<PurchaseMenuViewProps> = ({ onNavigate, companyInfo }) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-4xl p-10 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4 mb-10 border-b border-slate-100 dark:border-slate-700 pb-6">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-2xl">
            <Icon name="purchase" className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">Satın Alma Menüsü</h2>
            <p className="text-slate-500 dark:text-slate-400">Satın alma işlemlerinizi ve eksik listelerinizi buradan yönetebilirsiniz.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <DashboardButton
            iconName="purchase"
            label="Satın Alma İşlemi"
            onClick={() => onNavigate(View.PURCHASE, 'Satın Alma', 'purchase')}
            color="amber"
          />
          <DashboardButton
            iconName="list-bullet"
            label="Eksik Listesi Oluştur"
            onClick={() => onNavigate(View.PURCHASE, 'Satın Alma', 'purchase', { initialAction: 'MISSING_LIST' })}
            color="blue"
          />
          {companyInfo.aiEnabled && (
            <DashboardButton
              iconName="ai"
              label="Akıllı Satın Alma (AI/PDF/Excel)"
              onClick={() => onNavigate(View.PURCHASE, 'Satın Alma', 'purchase', { initialAction: 'AI_PURCHASE' })}
              color="pink"
            />
          )}
          {!companyInfo.aiEnabled && (
             <DashboardButton
                iconName="excel"
                label="Excel ile Satın Al"
                onClick={() => onNavigate(View.PURCHASE, 'Satın Alma', 'purchase', { initialAction: 'EXCEL_PURCHASE' })}
                color="green"
            />
          )}
        </div>

        <div className="mt-12 p-6 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-600">
            <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-2">Hızlı Bilgi</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">
                Satın alma işlemi ile stoklarınıza yeni ürünler ekleyebilir, eksik listesi ile tedarikçilerinizden sipariş geçeceğiniz ürünleri belirleyebilirsiniz.
            </p>
        </div>
      </div>
    </div>
  );
};

export default PurchaseMenuView;
