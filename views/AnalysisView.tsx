import React, { useState, useMemo } from 'react';
import { SaleRecord, Product, PurchaseRecord, PaymentRecord, ReturnRecord, Supplier } from '../types';
import StatCard from '../components/StatCard';
import PremiumSalesChart from '../components/PremiumSalesChart';
import SupplierProfitView from '../components/SupplierProfitView';
import ProfitSimulator from '../components/ProfitSimulator';
import Icon from '../components/Icon';

interface AnalysisViewProps {
  salesHistory: SaleRecord[];
  products: Product[];
  purchaseHistory: PurchaseRecord[];
  returnHistory: ReturnRecord[];
  paymentHistory: PaymentRecord[];
  suppliers: Supplier[];
}

type Preset = 'today' | 'week' | 'month' | 'custom';

const AnalysisView: React.FC<AnalysisViewProps> = ({ 
    salesHistory, products, suppliers 
}) => {
    const [preset, setPreset] = useState<Preset>('week');
    const [activeView, setActiveView] = useState<'overview' | 'suppliers' | 'simulator'>('overview');
    
    const today = new Date();
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    const getStartDate = (p: Preset) => {
        const start = new Date(today);
        if (p === 'today') {
            start.setHours(0, 0, 0, 0);
        } else if (p === 'week') {
            start.setDate(start.getDate() - 6);
            start.setHours(0, 0, 0, 0);
        } else if (p === 'month') {
            start.setMonth(start.getMonth() - 1);
            start.setHours(0, 0, 0, 0);
        }
        return start;
    };

    const [startDate, setStartDate] = useState(getStartDate('week').toISOString().slice(0, 16));
    const [endDate, setEndDate] = useState(todayEnd.toISOString().slice(0, 16));

    const handlePresetChange = (newPreset: Preset) => {
        setPreset(newPreset);
        if (newPreset !== 'custom') {
            const newStart = getStartDate(newPreset);
            setStartDate(newStart.toISOString().slice(0, 16));
            setEndDate(todayEnd.toISOString().slice(0, 16));
        }
    };
    
    const filteredSales = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return salesHistory.filter(s => {
            const saleDate = new Date(s.date);
            return saleDate >= start && saleDate <= end;
        });
    }, [salesHistory, startDate, endDate]);

    const kpis = useMemo(() => {
        const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);
        const totalCogs = filteredSales.reduce((sum, sale) => 
            sum + sale.items.reduce((itemSum, item) => itemSum + (item.buyPrice * item.quantity), 0), 0);
        
        const totalProfit = totalRevenue - totalCogs;
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
        const transactionCount = filteredSales.length;
        const avgBasketValue = transactionCount > 0 ? totalRevenue / transactionCount : 0;

        return { totalRevenue, totalProfit, profitMargin, transactionCount, avgBasketValue };
    }, [filteredSales]);

    return (
        <div className="w-full h-full bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-300 font-sans overflow-hidden flex flex-col">
            
            {/* HEADER */}
            <header className="p-4 lg:p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                        <Icon name="chart" className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Finansal Analiz</h1>
                        <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Performans & İstatistik</p>
                    </div>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    {[
                        { id: 'overview', label: 'Genel Bakış', icon: 'reports' },
                        { id: 'suppliers', label: 'Tedarikçi Analizi', icon: 'users' },
                        { id: 'simulator', label: 'Simülatör', icon: 'ai' }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveView(tab.id as any)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeView === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            <Icon name={tab.icon as any} className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 space-y-6">
                
                {/* Filters */}
                {activeView !== 'simulator' && (
                    <div className="flex flex-col xl:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            {(['today', 'week', 'month'] as Preset[]).map(p => (
                                <button 
                                    key={p} 
                                    onClick={() => handlePresetChange(p)} 
                                    className={`px-6 py-2 rounded-lg text-[11px] font-bold transition-all ${preset === p ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
                                >
                                    {p === 'today' ? 'Bugün' : p === 'week' ? 'Bu Hafta' : 'Bu Ay'}
                                </button>
                            ))}
                            <button 
                                onClick={() => setPreset('custom')}
                                className={`px-6 py-2 rounded-lg text-[11px] font-bold transition-all ${preset === 'custom' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                Özel
                            </button>
                        </div>

                        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <input type="datetime-local" value={startDate} onChange={e => {setStartDate(e.target.value); setPreset('custom');}} className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-white outline-none px-2"/>
                            <div className="w-4 h-[2px] bg-slate-300 dark:bg-slate-700 rounded-full"></div>
                            <input type="datetime-local" value={endDate} onChange={e => {setEndDate(e.target.value); setPreset('custom');}} className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-white outline-none px-2"/>
                        </div>
                    </div>
                )}

                {/* KPI Cards */}
                {activeView === 'overview' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm border-b-4 border-b-emerald-500">
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">TOPLAM CİRO</p>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{kpis.totalRevenue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</h3>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm border-b-4 border-b-cyan-500">
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">BRÜT KÂR</p>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{kpis.totalProfit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</h3>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm border-b-4 border-b-indigo-500">
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">KÂR MARJI</p>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">%{kpis.profitMargin.toFixed(2)}</h3>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm border-b-4 border-b-violet-500">
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">SATIŞ ADEDİ</p>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{kpis.transactionCount.toLocaleString('tr-TR')}</h3>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm border-b-4 border-b-rose-500">
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">ORT. SEPET</p>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{kpis.avgBasketValue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</h3>
                        </div>
                    </div>
                )}

                {/* Content Area */}
                <div className="animate-fade-in-up">
                    {activeView === 'overview' && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-sm relative overflow-hidden group">
                            <div className="relative z-10">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-l-4 border-indigo-600 pl-4">Satış Trend Analizi</h3>
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-indigo-600 shadow-sm"></div>
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">CİRO AKIŞI</span>
                                    </div>
                                </div>
                                <div className="min-h-[350px]">
                                    <PremiumSalesChart sales={filteredSales} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeView === 'suppliers' && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-sm">
                             <SupplierProfitView sales={filteredSales} suppliers={suppliers} />
                        </div>
                    )}

                    {activeView === 'simulator' && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-sm">
                            <ProfitSimulator />
                        </div>
                    )}
                </div>

                {/* Footer Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-gradient-to-r from-indigo-600 to-indigo-800 p-8 rounded-3xl text-white flex items-center justify-between shadow-lg relative overflow-hidden">
                        <div className="relative z-10">
                            <h4 className="text-xl font-bold mb-2 tracking-tight">Performans Raporu Hazır</h4>
                            <p className="text-indigo-100 text-xs font-medium opacity-80 uppercase tracking-widest">Algoritmalarımız verilerinizi analiz etti.</p>
                        </div>
                        <button className="bg-white text-indigo-600 h-10 px-6 rounded-lg text-xs font-bold hover:bg-indigo-50 transition-all shadow-md relative z-10">PDF İNDİR</button>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
                        <p className="text-[10px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-widest mb-2 italic">STRATEJİK TAVSİYE:</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">Kâr marjınızı %20 üzerine çıkarmak için tedarikçi maliyetlerini optimize edin.</p>
                    </div>
                </div>

            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 20px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); }
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default AnalysisView;