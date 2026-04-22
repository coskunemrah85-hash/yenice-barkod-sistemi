
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
        <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
            {/* --- Premium Sticky Header --- */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b dark:border-slate-700 p-6 z-10">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter uppercase italic flex items-center gap-3">
                            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30">
                                <Icon name="chart" className="w-6 h-6 text-white" />
                            </div>
                            Finansal Yönetici Paneli
                        </h1>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">İşletme Verimliliği ve Stratejik Analiz</p>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl border dark:border-slate-700">
                        <button 
                            onClick={() => setActiveView('overview')}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'overview' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Genel Bakış
                        </button>
                        <button 
                            onClick={() => setActiveView('suppliers')}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'suppliers' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Tedarikçi Analizi
                        </button>
                        <button 
                            onClick={() => setActiveView('simulator')}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'simulator' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Simülatör
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto p-6 lg:p-10 custom-scrollbar">
                <div className="max-w-7xl mx-auto space-y-10">
                    
                    {/* --- Filter & Dates Section --- */}
                    {activeView !== 'simulator' && (
                        <div className="flex flex-col lg:flex-row justify-between items-center gap-6 animate-fade-in">
                            <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700 shadow-sm">
                                {(['today', 'week', 'month'] as Preset[]).map(p => (
                                    <button 
                                        key={p} 
                                        onClick={() => handlePresetChange(p)} 
                                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${preset === p ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                    >
                                        {p === 'today' ? 'Bugün' : p === 'week' ? 'Bu Hafta' : 'Bu Ay'}
                                    </button>
                                ))}
                                <button 
                                    onClick={() => setPreset('custom')}
                                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${preset === 'custom' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                >
                                    Özel
                                </button>
                            </div>

                            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-2xl border dark:border-slate-700 shadow-sm">
                                <input type="datetime-local" value={startDate} onChange={e => {setStartDate(e.target.value); setPreset('custom');}} className="bg-transparent border-none text-[11px] font-bold text-slate-600 dark:text-slate-300 focus:ring-0 outline-none"/>
                                <div className="w-4 h-[2px] bg-slate-300 dark:bg-slate-600 rounded-full"></div>
                                <input type="datetime-local" value={endDate} onChange={e => {setEndDate(e.target.value); setPreset('custom');}} className="bg-transparent border-none text-[11px] font-bold text-slate-600 dark:text-slate-300 focus:ring-0 outline-none"/>
                            </div>
                        </div>
                    )}

                    {/* --- KPI Grid --- */}
                    {activeView === 'overview' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 animate-slide-up">
                            <StatCard icon="finance" title="Toplam Ciro" value={kpis.totalRevenue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" />
                            <StatCard icon="reports" title="Brüt Kâr" value={kpis.totalProfit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} color="bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600" />
                            <StatCard icon="tag" title="Kâr Marjı" value={`%${kpis.profitMargin.toFixed(2)}`} color="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600" />
                            <StatCard icon="new-sale" title="Satış Adedi" value={kpis.transactionCount.toLocaleString('tr-TR')} color="bg-violet-100 dark:bg-violet-900/30 text-violet-600" />
                            <StatCard icon="sales-management" title="Ort. Sepet" value={kpis.avgBasketValue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} color="bg-rose-100 dark:bg-rose-900/30 text-rose-600" />
                        </div>
                    )}

                    {/* --- Content Area --- */}
                    <div className="animate-fade-in-down">
                        {activeView === 'overview' && (
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border dark:border-slate-700 shadow-2xl overflow-hidden relative group">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.02] -mr-16 -mt-16 group-hover:opacity-[0.05] transition-opacity">
                                    <Icon name="chart" className="w-64 h-64" />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-center mb-8">
                                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-l-4 border-indigo-600 pl-4">Satış Trend Analizi</h3>
                                        <div className="flex gap-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-indigo-600 shadow-lg shadow-indigo-500/50"></div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase">Ciro</span>
                                            </div>
                                        </div>
                                    </div>
                                    <PremiumSalesChart sales={filteredSales} />
                                </div>
                            </div>
                        )}

                        {activeView === 'suppliers' && (
                            <SupplierProfitView sales={filteredSales} suppliers={suppliers} />
                        )}

                        {activeView === 'simulator' && (
                            <ProfitSimulator />
                        )}
                    </div>

                    {/* --- Dashboard Footer / Tips --- */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-gradient-to-r from-indigo-600 to-violet-600 p-8 rounded-[2rem] text-white flex items-center justify-between shadow-xl shadow-indigo-500/20">
                            <div>
                                <h4 className="text-xl font-bold mb-2 tracking-tight">Akıllı Performans Özetini Gör</h4>
                                <p className="text-indigo-100 text-xs italic">Verileriniz otomatik olarak analiz ediliyor.</p>
                            </div>
                            <button className="bg-white text-indigo-600 px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-105 transition-all">Detay indir</button>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border dark:border-slate-700 shadow-xl flex flex-col justify-center">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 italic">Dashboard Tavsiyesi:</p>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Kâr marjınızın %20 üzerine çıkması için tedarikçi maliyetlerini optimize edin.</p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AnalysisView;