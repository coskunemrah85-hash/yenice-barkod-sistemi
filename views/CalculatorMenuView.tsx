import React from 'react';
import { View, TabIcon } from '../types';
import DashboardButton from '../components/DashboardButton';
import Icon from '../components/Icon';

interface CalculatorMenuViewProps {
  onNavigate: (view: View, label: string, icon: TabIcon, payload?: any) => void;
}

const CalculatorMenuView: React.FC<CalculatorMenuViewProps> = ({ onNavigate }) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <div className="w-full max-w-2xl p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-cyan-500/10 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-center mb-8">
          <Icon name="list-bullet" className="w-8 h-8 text-cyan-600 dark:text-cyan-400 mr-3" />
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">Hesap Makinesi Menüsü</h2>
        </div>
        
        <p className="text-center text-slate-600 dark:text-slate-400 mb-12 text-lg">
          Aşağıdaki araçlardan birini seçin
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Hesap Makinesi */}
          <button
            onClick={() => onNavigate(View.CALCULATOR, 'Hesap Makinesi', 'list-bullet')}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-2 border-orange-200 dark:border-orange-700 p-8 text-center transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/20 hover:scale-105"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-orange-500 transition-opacity duration-300"></div>
            <Icon name="list-bullet" className="w-16 h-16 text-orange-600 dark:text-orange-400 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-2xl font-bold text-orange-800 dark:text-orange-200 mb-2">Hesap Makinesi</h3>
            <p className="text-orange-700 dark:text-orange-300 text-sm">
              Hızlı matematik işlemleri ve hesaplamalar yapın
            </p>
          </button>

          {/* Para Sayma */}
          <button
            onClick={() => onNavigate(View.MONEY_COUNTER, 'Para Sayma', 'list-bullet')}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-2 border-green-200 dark:border-green-700 p-8 text-center transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20 hover:scale-105"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-green-500 transition-opacity duration-300"></div>
            <Icon name="finance" className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
            <h3 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-2">Para Sayma</h3>
            <p className="text-green-700 dark:text-green-300 text-sm">
              Kasada bulunan nakit parayı kolayca sayın ve kaydedin
            </p>
          </button>
        </div>

        <div className="mt-12 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300 text-center">
            💡 <strong>İpucu:</strong> Para sayma aracı kasada bulunan nakit parayı hızlıca saymanızı ve kaydınızı tutmanızı sağlar.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CalculatorMenuView;
