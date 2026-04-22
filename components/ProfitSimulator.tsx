
import React, { useState } from 'react';
import Icon from './Icon';

const ProfitSimulator: React.FC = () => {
    const [expectedSales, setExpectedSales] = useState<number>(100000);
    const [margin, setMargin] = useState<number>(25);
    const [fixedCosts, setFixedCosts] = useState<number>(15000);

    const projectedProfit = (expectedSales * (margin / 100)) - fixedCosts;
    const breakEven = fixedCosts / (margin / 100);

    return (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
                <Icon name="chart" className="w-48 h-48" />
            </div>
            
            <div className="relative z-10">
                <h3 className="text-xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                        <Icon name="ai" className="w-6 h-6 text-cyan-400" />
                    </div>
                    Kâr/Zarar Simülatörü
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hedef Ciro</label>
                        <input 
                            type="range" min="0" max="1000000" step="5000"
                            value={expectedSales} 
                            onChange={(e) => setExpectedSales(Number(e.target.value))}
                            className="w-full accent-cyan-500"
                        />
                        <div className="text-2xl font-black">{expectedSales.toLocaleString('tr-TR')} ₺</div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ortalama Kâr Marjı (%)</label>
                        <input 
                            type="range" min="0" max="100" step="1"
                            value={margin} 
                            onChange={(e) => setMargin(Number(e.target.value))}
                            className="w-full accent-emerald-500"
                        />
                        <div className="text-2xl font-black">%{margin}</div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sabit Giderler (Kira, Personel vb.)</label>
                        <input 
                            type="range" min="0" max="100000" step="1000"
                            value={fixedCosts} 
                            onChange={(e) => setFixedCosts(Number(e.target.value))}
                            className="w-full accent-rose-500"
                        />
                        <div className="text-2xl font-black">{fixedCosts.toLocaleString('tr-TR')} ₺</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center border-t border-white/10 pt-8">
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Tahmini Net Kâr</p>
                        <div className={`text-4xl font-black ${projectedProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {projectedProfit.toLocaleString('tr-TR')} ₺
                        </div>
                    </div>
                    
                    <div className="p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Başa Baş Noktası (Minimum Ciro Gereksinimi)</p>
                        <div className="text-2xl font-black text-cyan-400">
                            {breakEven.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ₺
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfitSimulator;
