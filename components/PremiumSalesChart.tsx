
import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SaleRecord } from '../types';

interface PremiumSalesChartProps {
    sales: SaleRecord[];
}

const PremiumSalesChart: React.FC<PremiumSalesChartProps> = ({ sales }) => {
    const data = useMemo(() => {
        const dataMap = new Map<string, number>();
        sales.forEach(sale => {
            const date = new Date(sale.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
            dataMap.set(date, (dataMap.get(date) || 0) + sale.total);
        });
        return Array.from(dataMap.entries())
            .map(([name, total]) => ({ name, total }));
    }, [sales]);

    return (
        <div className="w-full h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                        dy={10}
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                        tickFormatter={(val) => `${val/1000}k`}
                    />
                    <Tooltip 
                        contentStyle={{ 
                            borderRadius: '20px', 
                            border: 'none', 
                            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                            padding: '12px 16px'
                        }}
                        itemStyle={{ color: '#6366f1', fontWeight: 'bold' }}
                    />
                    <Area 
                        type="monotone" 
                        dataKey="total" 
                        stroke="#6366f1" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorTotal)" 
                        animationBegin={0}
                        animationDuration={1500}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default PremiumSalesChart;
