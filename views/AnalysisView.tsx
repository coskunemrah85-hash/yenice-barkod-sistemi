

import React, { useState, useMemo } from 'react';
import { SaleRecord, Product, PurchaseRecord, PaymentRecord, ReturnRecord } from '../types';
import StatCard from '../components/StatCard';
import SalesChart from '../components/SalesChart';
import CategoryChart from '../components/CategoryChart';
import BrandChart from '../components/BrandChart';
import PaymentMethodChart from '../components/PaymentMethodChart';

interface AnalysisViewProps {
  salesHistory: SaleRecord[];
  products: Product[];
  purchaseHistory: PurchaseRecord[];
  returnHistory: ReturnRecord[];
  paymentHistory: PaymentRecord[];
}

type Preset = 'today' | 'week' | 'month' | 'custom';

const AnalysisView: React.FC<AnalysisViewProps> = ({ salesHistory, products, purchaseHistory, returnHistory, paymentHistory }) => {
    const [preset, setPreset] = useState<Preset>('week');
    
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
        <div className="w-full h-full flex flex-col gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200/80 shadow-xl">
            <header className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-purple-500">Analiz Paneli</h1>
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2 p-1 bg-slate-200 rounded-lg">
                        {(['today', 'week', 'month'] as Preset[]).map(p => (
                            <button key={p} onClick={() => handlePresetChange(p)} className={`px-2 py-1 rounded-md text-xs font-semibold transition ${preset === p ? 'bg-white shadow' : 'text-slate-600'}`}>
                                {p === 'today' ? 'Bugün' : p === 'week' ? 'Bu Hafta' : 'Bu Ay'}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                         <input type="datetime-local" value={startDate} onChange={e => {setStartDate(e.target.value); setPreset('custom');}} className="input-style"/>
                         <span className="font-semibold text-slate-500">-</span>
                         <input type="datetime-local" value={endDate} onChange={e => {setEndDate(e.target.value); setPreset('custom');}} className="input-style"/>
                    </div>
                </div>
            </header>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <StatCard icon="finance" title="Toplam Ciro" value={kpis.totalRevenue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} color="bg-green-100 text-green-700" />
                <StatCard icon="reports" title="Brüt Kâr" value={kpis.totalProfit.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} color="bg-cyan-100 text-cyan-700" />
                <StatCard icon="tag" title="Kâr Marjı" value={`%${kpis.profitMargin.toFixed(2)}`} color="bg-blue-100 text-blue-700" />
                <StatCard icon="new-sale" title="İşlem Sayısı" value={kpis.transactionCount.toLocaleString('tr-TR')} color="bg-indigo-100 text-indigo-700" />
                <StatCard icon="sales-management" title="Ort. Sepet Tutarı" value={kpis.avgBasketValue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} color="bg-rose-100 text-rose-700" />
            </div>

            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 overflow-hidden">
                <div className="lg:col-span-2 xl:col-span-3 bg-white p-4 rounded-lg border shadow-sm flex flex-col">
                    <h3 className="text-lg font-semibold text-slate-700 mb-2 px-2">Ciro Zaman Çizelgesi</h3>
                    <div className="flex-grow">
                        <SalesChart sales={filteredSales} />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col">
                    <h3 className="text-lg font-semibold text-slate-700 mb-2 px-2">Kategori Bazında Satış Dağılımı</h3>
                    <div className="flex-grow">
                        <CategoryChart sales={filteredSales} products={products} />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col">
                    <h3 className="text-lg font-semibold text-slate-700 mb-2 px-2">Marka Performansı</h3>
                    <div className="flex-grow">
                        <BrandChart sales={filteredSales} />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col">
                    <h3 className="text-lg font-semibold text-slate-700 mb-2 px-2">Ödeme Yöntemi Dağılımı</h3>
                    <div className="flex-grow">
                         <PaymentMethodChart sales={filteredSales} />
                    </div>
                </div>
            </div>

            <style>{`
                .input-style { background-color: white; border: 1px solid #cbd5e1; border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.9rem; transition: all 0.2s; }
                .input-style:focus { outline: none; box-shadow: 0 0 0 2px #e0f2fe, 0 0 0 4px #0ea5e9; border-color: #0ea5e9; }
            `}</style>
        </div>
    );
};

export default AnalysisView;