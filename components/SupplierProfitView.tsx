
import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell, PieChart, Pie } from 'recharts';
import { SaleRecord, Supplier } from '../types';

interface SupplierProfitViewProps {
    sales: SaleRecord[];
    suppliers: Supplier[];
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4'];

const SupplierProfitView: React.FC<SupplierProfitViewProps> = ({ sales, suppliers }) => {
    const supplierStats = useMemo(() => {
        const stats: Record<string, { name: string, revenue: number, cost: number, profit: number }> = {};
        
        sales.forEach(sale => {
            sale.items.forEach(item => {
                const sId = item.supplierId || 'unknown';
                if (!stats[sId]) {
                    const sName = suppliers.find(s => s.id === sId)?.name || 'Bilinmeyen';
                    stats[sId] = { name: sName, revenue: 0, cost: 0, profit: 0 };
                }
                const rev = item.price * item.quantity;
                const cost = item.buyPrice * item.quantity;
                stats[sId].revenue += rev;
                stats[sId].cost += cost;
                stats[sId].profit += (rev - cost);
            });
        });

        return Object.values(stats).sort((a, b) => b.profit - a.profit);
    }, [sales, suppliers]);

    const pieData = supplierStats.slice(0, 5).map(s => ({
        name: s.name,
        value: s.profit
    }));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Tedarikçi Kâr Dağılımı</h3>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((_entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: number) => value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                            />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Tedarikçi Performans (Ciro vs Kâr)</h3>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={supplierStats.slice(0, 7)}>
                            <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                            <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} />
                            <Tooltip 
                                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="revenue" name="Ciro" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="profit" name="Kâr" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default SupplierProfitView;
