
import React, { useMemo, useState } from 'react';
import { SaleRecord } from '../types';

interface SalesChartProps {
    sales: SaleRecord[];
}

interface TooltipData {
    x: number;
    y: number;
    label: string;
    value: number;
}

const SalesChart: React.FC<SalesChartProps> = ({ sales }) => {
    const [tooltip, setTooltip] = useState<TooltipData | null>(null);
    const chartData = useMemo(() => {
        const dataMap = new Map<string, number>();
        sales.forEach(sale => {
            const date = new Date(sale.date).toISOString().split('T')[0];
            dataMap.set(date, (dataMap.get(date) || 0) + sale.total);
        });
        return Array.from(dataMap.entries())
            .map(([date, total]) => ({ date, total }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [sales]);

    const PADDING = { top: 20, right: 20, bottom: 40, left: 60 };
    const SVG_WIDTH = 800;
    const SVG_HEIGHT = 300;
    
    const maxValue = Math.max(0, ...chartData.map(d => d.total));
    const yAxisMax = maxValue > 0 ? Math.ceil(maxValue / 1000) * 1000 : 1000;
    const numYTicks = 5;

    if (chartData.length === 0) {
        return <div className="flex items-center justify-center h-full text-slate-400">Veri yok</div>;
    }
    
    const barWidth = (SVG_WIDTH - PADDING.left - PADDING.right) / Math.max(1, chartData.length) * 0.8;
    const barGap = (SVG_WIDTH - PADDING.left - PADDING.right) / Math.max(1, chartData.length) * 0.2;

    return (
        <div className="relative w-full h-full">
            <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full h-full">
                {/* Y-Axis Grid Lines & Labels */}
                {Array.from({ length: numYTicks + 1 }).map((_, i) => {
                    const y = PADDING.top + (i * (SVG_HEIGHT - PADDING.top - PADDING.bottom)) / numYTicks;
                    const value = yAxisMax - (i * yAxisMax) / numYTicks;
                    return (
                        <g key={i}>
                            <line x1={PADDING.left} y1={y} x2={SVG_WIDTH - PADDING.right} y2={y} stroke="#e2e8f0" />
                            <text x={PADDING.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#64748b">
                                {value / 1000}k
                            </text>
                        </g>
                    );
                })}

                {/* Bars & X-Axis Labels */}
                {chartData.map((d, i) => {
                    const x = PADDING.left + i * (barWidth + barGap);
                    const barHeight = (d.total / yAxisMax) * (SVG_HEIGHT - PADDING.top - PADDING.bottom);
                    const y = SVG_HEIGHT - PADDING.bottom - barHeight;
                    const date = new Date(d.date);

                    return (
                        <g key={d.date}>
                            <rect
                                x={x}
                                y={y}
                                width={barWidth}
                                height={barHeight}
                                fill="#0ea5e9"
                                onMouseEnter={() => setTooltip({ x: x + barWidth / 2, y, label: date.toLocaleDateString('tr-TR'), value: d.total })}
                                onMouseLeave={() => setTooltip(null)}
                                className="transition-all hover:fill-cyan-400"
                            />
                            {chartData.length <= 31 && (
                                <text x={x + barWidth / 2} y={SVG_HEIGHT - PADDING.bottom + 15} textAnchor="middle" fontSize="10" fill="#64748b">
                                   {date.getDate()}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>
            {tooltip && (
                <div
                    className="absolute bg-slate-800 text-white text-xs rounded py-1 px-2 pointer-events-none transition-transform"
                    style={{ left: `${tooltip.x / SVG_WIDTH * 100}%`, top: `${tooltip.y - 10}px`, transform: `translate(-50%, -100%)` }}
                >
                    <div className="font-bold">{tooltip.label}</div>
                    <div>{tooltip.value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</div>
                </div>
            )}
        </div>
    );
};

export default SalesChart;
