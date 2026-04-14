
import React, { useMemo, useState } from 'react';
import { SaleRecord, Product } from '../types';

interface CategoryChartProps {
    sales: SaleRecord[];
    products: Product[];
}

const COLORS = ['#0ea5e9', '#6366f1', '#ec4899', '#f97316', '#10b981', '#8b5cf6', '#f59e0b'];

const getArcPath = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = {
        x: x + radius * Math.cos(startAngle),
        y: y + radius * Math.sin(startAngle),
    };
    const end = {
        x: x + radius * Math.cos(endAngle),
        y: y + radius * Math.sin(endAngle),
    };
    const largeArcFlag = endAngle - startAngle <= Math.PI ? '0' : '1';
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
};

const CategoryChart: React.FC<CategoryChartProps> = ({ sales, products }) => {
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

    const categoryData = useMemo(() => {
        const categoryMap = new Map<string, number>();
        sales.forEach(sale => {
            sale.items.forEach(item => {
                const product = products.find(p => p.barcode === item.barcode);
                const category = product?.group || 'Diğer';
                categoryMap.set(category, (categoryMap.get(category) || 0) + item.price * item.quantity);
            });
        });

        const total = Array.from(categoryMap.values()).reduce((sum, v) => sum + v, 0);
        if (total === 0) return [];
        
        return Array.from(categoryMap.entries())
            .map(([name, value]) => ({ name, value, percentage: (value / total) * 100 }))
            .sort((a, b) => b.value - a.value);
    }, [sales, products]);

    if (categoryData.length === 0) {
        return <div className="flex items-center justify-center h-full text-slate-400">Veri yok</div>;
    }

    let startAngle = -Math.PI / 2;
    const chartSlices = categoryData.map(data => {
        const angle = (data.percentage / 100) * 2 * Math.PI;
        const endAngle = startAngle + angle;
        const path = getArcPath(100, 100, 80, startAngle, endAngle);
        const innerPath = getArcPath(100, 100, 50, startAngle, endAngle);
        startAngle = endAngle;
        return { ...data, path: `${path} L 100 100 Z`, fullPath: `${path} ${innerPath.replace('M', 'L')} Z` };
    });

    const hoveredData = hoveredCategory ? categoryData.find(d => d.name === hoveredCategory) : null;
    
    return (
        <div className="w-full h-full flex flex-col md:flex-row items-center justify-center gap-4">
            <div className="relative">
                <svg viewBox="0 0 200 200" width="200" height="200">
                    {chartSlices.map((slice, i) => (
                        <path
                            key={slice.name}
                            d={slice.fullPath}
                            fill={COLORS[i % COLORS.length]}
                            onMouseEnter={() => setHoveredCategory(slice.name)}
                            onMouseLeave={() => setHoveredCategory(null)}
                            className="transition-transform duration-200"
                            style={{ transform: hoveredCategory === slice.name ? 'scale(1.05)' : 'scale(1)', transformOrigin: 'center' }}
                        />
                    ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    {hoveredData ? (
                        <>
                            <span className="text-2xl font-bold text-slate-800">{hoveredData.percentage.toFixed(1)}%</span>
                            <span className="text-sm text-slate-500 max-w-[80px] text-center truncate">{hoveredData.name}</span>
                        </>
                    ) : (
                         <span className="text-lg font-bold text-slate-600">Kategoriler</span>
                    )}
                </div>
            </div>
            <div className="text-sm space-y-2">
                {categoryData.map((data, i) => (
                    <div key={data.name} className="flex items-center gap-2" onMouseEnter={() => setHoveredCategory(data.name)} onMouseLeave={() => setHoveredCategory(null)}>
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                        <span className="flex-grow w-24 truncate font-medium text-slate-600">{data.name}</span>
                        <span className="font-bold text-slate-800">{data.percentage.toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CategoryChart;
