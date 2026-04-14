
import React, { useMemo, useState } from 'react';
import { SaleRecord } from '../types';

interface PaymentMethodChartProps {
    sales: SaleRecord[];
}

const COLORS = {
    'Nakit': '#10b981',
    'Kredi Kartı': '#3b82f6',
};

const getArcPath = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = { x: x + radius * Math.cos(startAngle), y: y + radius * Math.sin(startAngle) };
    const end = { x: x + radius * Math.cos(endAngle), y: y + radius * Math.sin(endAngle) };
    const largeArcFlag = endAngle - startAngle <= Math.PI ? '0' : '1';
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} L ${x} ${y} Z`;
};

const PaymentMethodChart: React.FC<PaymentMethodChartProps> = ({ sales }) => {
    const paymentData = useMemo(() => {
        const paymentMap = new Map<string, number>();
        sales.forEach(sale => {
            const method = sale.paymentMethod || 'Bilinmiyor';
            paymentMap.set(method, (paymentMap.get(method) || 0) + sale.total);
        });

        const total = Array.from(paymentMap.values()).reduce((sum, v) => sum + v, 0);
        if (total === 0) return [];
        
        return Array.from(paymentMap.entries())
            .map(([name, value]) => ({ name, value, percentage: (value / total) * 100 }))
            .sort((a, b) => b.value - a.value);
    }, [sales]);

    if (paymentData.length === 0) {
        return <div className="flex items-center justify-center h-full text-slate-400">Veri yok</div>;
    }

    let startAngle = -Math.PI / 2;
    const chartSlices = paymentData.map(data => {
        const angle = (data.percentage / 100) * 2 * Math.PI;
        const endAngle = startAngle + angle;
        const path = getArcPath(100, 100, 80, startAngle, endAngle);
        startAngle = endAngle;
        return { ...data, path };
    });

    return (
        <div className="w-full h-full flex flex-col md:flex-row items-center justify-center gap-4">
            <svg viewBox="0 0 200 200" width="150" height="150">
                {chartSlices.map((slice, i) => (
                    <path
                        key={slice.name}
                        d={slice.path}
                        fill={COLORS[slice.name as keyof typeof COLORS] || '#94a3b8'}
                    />
                ))}
            </svg>
            <div className="text-sm space-y-2">
                {paymentData.map((data, i) => (
                    <div key={data.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[data.name as keyof typeof COLORS] || '#94a3b8' }}></div>
                        <div>
                            <span className="font-medium text-slate-600">{data.name}</span>
                            <span className="ml-2 font-bold text-slate-800">{data.percentage.toFixed(1)}%</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PaymentMethodChart;
