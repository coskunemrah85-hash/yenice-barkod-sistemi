
import React, { useMemo } from 'react';
import { SaleRecord } from '../types';

interface BrandChartProps {
    sales: SaleRecord[];
}

const BrandChart: React.FC<BrandChartProps> = ({ sales }) => {
    const brandData = useMemo(() => {
        const brandMap = new Map<string, number>();
        sales.forEach(sale => {
            sale.items.forEach(item => {
                const brand = item.marka || 'Diğer';
                brandMap.set(brand, (brandMap.get(brand) || 0) + item.price * item.quantity);
            });
        });

        return Array.from(brandMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 7); // Show top 7 brands
    }, [sales]);

    const PADDING_LEFT = 80;
    const PADDING_RIGHT = 60;
    const SVG_WIDTH = 400;
    const SVG_HEIGHT = 250;
    const BAR_HEIGHT = 20;
    const BAR_GAP = 10;
    
    const maxValue = Math.max(0, ...brandData.map(d => d.value));

    if (brandData.length === 0) {
        return <div className="flex items-center justify-center h-full text-slate-400">Veri yok</div>;
    }

    return (
        <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full h-full">
            {brandData.map((d, i) => {
                const y = i * (BAR_HEIGHT + BAR_GAP);
                const barWidth = maxValue > 0 ? (d.value / maxValue) * (SVG_WIDTH - PADDING_LEFT - PADDING_RIGHT) : 0;
                
                return (
                    <g key={d.name} transform={`translate(0, ${y})`}>
                        <text x={PADDING_LEFT - 8} y={BAR_HEIGHT / 2 + 4} textAnchor="end" fontSize="11" fill="#475569" className="font-medium truncate">{d.name}</text>
                        <rect x={PADDING_LEFT} y="0" width={barWidth} height={BAR_HEIGHT} fill="#6366f1" rx="3" ry="3"/>
                        <text x={PADDING_LEFT + barWidth + 5} y={BAR_HEIGHT / 2 + 4} fontSize="11" fill="#4f46e5" className="font-bold">
                            {d.value.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};

export default BrandChart;
