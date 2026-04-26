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
        <div className="w-full h-full bg-[#020617] text-slate-300 font-sans overflow-hidden flex flex-col transform-gpu">
            
            {/* 🌌 PREMIUM GLASS HEADER */}
            <header className="p-8 border-b border-white/5 bg-white/[0.02] backdrop-blur-3xl flex items-center justify-between shrink-0 z-20">
                <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
                        <Icon name="chart" className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tighter uppercase underline decoration-indigo-500 decoration-4 underline-offset-4">FİNANSAL <span className="text-indigo-400">ANALİZ</span></h1>
                        <p className="text-[9px] font-black text-indigo-400/50 uppercase tracking-[0.3em]">Gerçek Zamanlı Veri & Stratejik Öngörü</p>
                    </div>
                </div>

                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                    {[
                        { id: 'overview', label: 'Genel Bakış', icon: 'reports' },
                        { id: 'suppliers', label: 'Tedarikçi Analizi', icon: 'users' },
                        { id: 'simulator', label: 'Profit Simulator', icon: 'ai' }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveView(tab.id as any)}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeView === tab.id ? 'bg-indigo-600 text-white shadow-xl' : 'text-white/40 hover:text-white'}`}
                        >
                            <Icon name={tab.icon as any} className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-10">
                
                {/* --- Filter & Dates Section --- */}
                {activeView !== 'simulator' && (
                    <div className="flex flex-col xl:flex-row justify-between items-center gap-8">
                        <div className="flex items-center gap-2 p-1 bg-white/5 rounded-2xl border border-white/10 shadow-2xl">
                            {(['today', 'week', 'month'] as Preset[]).map(p => (
                                <button 
                                    key={p} 
                                    onClick={() => handlePresetChange(p)} 
                                    className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${preset === p ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-white/30 hover:bg-white/5 hover:text-white'}`}
                                >
                                    {p === 'today' ? 'Bugün' : p === 'week' ? 'Bu Hafta' : 'Bu Ay'}
                                </button>
                            ))}
                            <button 
                                onClick={() => setPreset('custom')}
                                className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${preset === 'custom' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-white/30 hover:bg-white/5 hover:text-white'}`}
                            >
                                Özel
                            </button>
                        </div>

                        <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/10 shadow-2xl">
                            <input type="datetime-local" value={startDate} onChange={e => {setStartDate(e.target.value); setPreset('custom');}} className="bg-transparent border-none text-xs font-black text-white/70 focus:ring-0 outline-none p-2"/>
                            <div className="w-4 h-[2px] bg-white/10 rounded-full"></div>
                            <input type="datetime-local" value={endDate} onChange={e => {setEndDate(e.target.value); setPreset('custom');}} className="bg-transparent border-none text-xs font-black text-white/70 focus:ring-0 outline-none p-2"/>
                        </div>
                    </div>
                )}

                {/* --- KPI Grid --- */}
                {activeView === 'overview' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
                        <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden group hover:bg-white/10 transition-all border-b-4 border-b-emerald-500/50">
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">TOPLAM CİRO</p>
                            <h3 className="text-2xl font-black text-white">{kpis.totalRevenue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</h3>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden group hover:bg-white/10 transition-all border-b-4 border-b-cyan-500/50">
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">BRÜT KÂR</p>
                            <h3 className="text-2xl font-black text-white">{kpis.totalProfit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</h3>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden group hover:bg-white/10 transition-all border-b-4 border-b-indigo-500/50">
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">KÂR MARJI</p>
                            <h3 className="text-2xl font-black text-white">%{kpis.profitMargin.toFixed(2)}</h3>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden group hover:bg-white/10 transition-all border-b-4 border-b-violet-500/50">
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">SATIŞ ADEDİ</p>
                            <h3 className="text-2xl font-black text-white">{kpis.transactionCount.toLocaleString('tr-TR')}</h3>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden group hover:bg-white/10 transition-all border-b-4 border-b-rose-500/50">
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">ORT. SEPET</p>
                            <h3 className="text-2xl font-black text-white">{kpis.avgBasketValue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</h3>
                        </div>
                    </div>
                )}

                {/* --- Content Area --- */}
                <div className="animate-fade-in-down">
                    {activeView === 'overview' && (
                        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-12 rounded-[4rem] shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-[0.02] -mr-16 -mt-16 group-hover:opacity-[0.05] transition-opacity">
                                <Icon name="chart" className="w-96 h-96" />
                            </div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-center mb-12">
                                    <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] border-l-8 border-indigo-600 pl-6">Satış Trend Analizi (Görsel Grafik)</h3>
                                    <div className="flex gap-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded-full bg-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
                                            <span className="text-[11px] font-black text-white/40 uppercase tracking-widest">CIRO AKIŞI</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="min-h-[400px]">
                                    <PremiumSalesChart sales={filteredSales} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeView === 'suppliers' && (
                        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-12 rounded-[4rem] shadow-2xl">
                             <SupplierProfitView sales={filteredSales} suppliers={suppliers} />
                        </div>
                    )}

                    {activeView === 'simulator' && (
                        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-12 rounded-[4rem] shadow-2xl">
                            <ProfitSimulator />
                        </div>
                    )}
                </div>

                {/* --- Dashboard Footer / Tips --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 bg-gradient-to-r from-indigo-600 to-violet-600 p-12 rounded-[3.5rem] text-white flex items-center justify-between shadow-2xl shadow-indigo-600/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[100px] -mr-32 -mt-32"></div>
                        <div className="relative z-10">
                            <h4 className="text-3xl font-black mb-4 tracking-tighter uppercase">Performans Raporu Hazır</h4>
                            <p className="text-indigo-100 text-sm font-bold uppercase tracking-widest opacity-70 italic">Algoritmalarımız verilerinizi stratejik olarak analiz etti.</p>
                        </div>
                        <button className="bg-white text-indigo-600 h-16 px-12 rounded-2xl text-[12px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-black/20 relative z-10">DETAYLI PDF İNDİR</button>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-10 rounded-[3.5rem] shadow-2xl flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-rose-500/50"></div>
                        <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-3 italic">STRATEJİK TAVSİYE:</p>
                        <p className="text-lg font-black text-white tracking-tight">Kâr marjınızı %20 üzerine çıkarmak için tedarikçi maliyetlerini optimize edin.</p>
                    </div>
                </div>

            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 20px; }
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in-down { animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
};

export default AnalysisView;