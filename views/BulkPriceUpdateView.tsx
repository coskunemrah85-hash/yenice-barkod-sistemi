import React, { useState, useMemo } from 'react';
import { Product, Brand, Model, Group, Color, Size, View, TabIcon } from '../types';
import Icon from '../components/Icon';

interface BulkPriceUpdateViewProps {
  products: Product[];
  definitions: {
    brands: Brand[];
    groups: Group[];
    colors: Color[];
    sizes: Size[];
    models: Model[];
  };
  onUpdateProducts: (updates: { barcode: string, updates: Partial<Product> }[]) => void;
  onNavigate?: (view: View, label: string, icon: TabIcon) => void;
}

const BulkPriceUpdateView: React.FC<BulkPriceUpdateViewProps> = ({ products, definitions, onUpdateProducts, onNavigate }) => {
  
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [selectedAnaStokKodu, setSelectedAnaStokKodu] = useState<string | null>(null);
  
  // UI States
  const [updateValue, setUpdateValue] = useState<string>('');
  const [updateType, setUpdateType] = useState<'percent' | 'amount'>('amount');
  const [operation, setOperation] = useState<'increase' | 'decrease' | 'set'>('set');
  const [targetType, setTargetType] = useState<'price' | 'buyPrice'>('price');
  
  // Confirmation Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<{ barcode: string, updates: Partial<Product> }[]>([]);

  // 1. Group products by Ana Stok Kodu
  const groupedProducts = useMemo(() => {
    const groups: { [key: string]: Product[] } = {};
    products.forEach(p => {
      if (p.isDeleted) return;
      const key = p.anaStokKodu || p.model || 'DİĞER';
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return groups;
  }, [products]);

  // 2. Filter groups for sidebar
  const sidebarGroups = useMemo(() => {
    const search = sidebarSearch.toLowerCase().trim();
    if (!search) return Object.keys(groupedProducts).slice(0, 15);
    
    return Object.keys(groupedProducts).filter(k => {
        const groupItems = groupedProducts[k];
        return k.toLowerCase().includes(search) || 
               groupItems.some(p => p.barcode.includes(search) || p.name.toLowerCase().includes(search) || p.stokKodu?.toLowerCase().includes(search));
    }).slice(0, 30);
  }, [groupedProducts, sidebarSearch]);

  const activeGroupItems = selectedAnaStokKodu ? groupedProducts[selectedAnaStokKodu] || [] : [];
  
  const prepareUpdate = () => {
    if (!selectedAnaStokKodu || activeGroupItems.length === 0) return;
    const val = Number(updateValue);
    if (isNaN(val) || val <= 0) return alert("⚠️ Geçerli bir değer giriniz.");

    const updates = activeGroupItems.map(p => {
        const currentVal = Number(p[targetType]) || 0;
        let newVal = currentVal;
        
        if (operation === 'set') {
            newVal = val;
        } else {
            const change = updateType === 'percent' ? currentVal * (val / 100) : val;
            newVal = operation === 'increase' ? (currentVal + change) : (currentVal - change);
        }

        return {
            barcode: p.barcode,
            updates: { [targetType]: Math.max(0, Number(newVal.toFixed(2))) }
        };
    });

    setPendingUpdates(updates);
    setIsModalOpen(true);
  };

  const confirmAndApply = () => {
    onUpdateProducts(pendingUpdates);
    setIsModalOpen(false);
    setUpdateValue('');
    alert("✅ Değişiklikler başarıyla uygulandı.");
  };

  // Profit Calculation for Modal
  const profitAnalysis = useMemo(() => {
    if (pendingUpdates.length === 0 || activeGroupItems.length === 0) return { margin: 0, sale: 0, buy: 0 };
    
    // Use first item as proxy for group pricing
    const firstItem = activeGroupItems[0];
    const update = pendingUpdates.find(u => u.barcode === firstItem.barcode);
    
    const finalSale = update?.updates.price ?? firstItem.price;
    const finalBuy = update?.updates.buyPrice ?? firstItem.buyPrice;
    
    const profit = finalSale - finalBuy;
    const margin = finalBuy > 0 ? (profit / finalBuy) * 100 : 100;
    
    return { margin, sale: finalSale, buy: finalBuy };
  }, [pendingUpdates, activeGroupItems]);

  return (
    <div className="flex w-full h-full bg-[#020617] text-slate-300 overflow-hidden font-sans relative">
      
      {/* 🔴 ONAY MODALI (MERKEZİ) */}
      {isModalOpen && (
        <div className="absolute inset-0 z-[100] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-8 animate-fade-in">
            <div className="bg-[#0f172a] border border-white/10 w-full max-w-lg rounded-[3rem] p-10 shadow-[0_0_100px_rgba(6,182,212,0.15)] overflow-hidden relative">
                <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12"><Icon name="tag" className="w-40 h-40" /></div>
                
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2 italic">GRUP <span className="text-cyan-400">GÜNCELLEME ONAYI</span></h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-8 border-b border-white/5 pb-4">Seçili Grupta {pendingUpdates.length} varyasyon güncellenecektir.</p>

                <div className="space-y-6 mb-10">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                            <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Yeni Alış</p>
                            <p className="text-2xl font-black text-indigo-400 tabular-nums">{profitAnalysis.buy.toFixed(2)} ₺</p>
                        </div>
                        <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                            <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Yeni Satış</p>
                            <p className="text-2xl font-black text-emerald-400 tabular-nums">{profitAnalysis.sale.toFixed(2)} ₺</p>
                        </div>
                    </div>

                    <div className="p-6 bg-gradient-to-r from-cyan-600/10 to-indigo-600/10 rounded-[2rem] border border-white/5 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">HEdeflenen Kâr Oranı</p>
                            <div className="flex items-center gap-2">
                                <span className={`text-4xl font-black tabular-nums ${profitAnalysis.margin > 20 ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}`}>
                                    %{profitAnalysis.margin.toFixed(0)}
                                </span>
                                {profitAnalysis.margin <= 0 && <span className="text-[9px] font-black text-rose-500 uppercase leading-none">Zararda!</span>}
                            </div>
                        </div>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${profitAnalysis.margin > 20 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                            <Icon name={profitAnalysis.margin > 20 ? 'check' : 'exclamation-circle'} className="w-8 h-8" />
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button onClick={() => setIsModalOpen(false)} className="flex-1 h-16 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all">İPTAL</button>
                    <button onClick={confirmAndApply} className="flex-[1.5] h-16 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-black uppercase text-xs tracking-[0.3em] shadow-xl shadow-cyan-900/40 active:scale-95 transition-all">DEĞİŞİKLİĞİ UYGULA</button>
                </div>
            </div>
        </div>
      )}

      {/* 🟢 SOL SİDEBAR */}
      <aside className="w-80 flex-shrink-0 bg-[#0f172a]/50 border-r border-white/5 flex flex-col">
        <div className="p-6">
            <h3 className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.3em] mb-4">Ürün Grupları</h3>
            <div className="relative mb-6">
                <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                    type="text" 
                    value={sidebarSearch}
                    onChange={e => setSidebarSearch(e.target.value)}
                    placeholder="Barkod/Model tarat..."
                    className="w-full h-12 pl-11 pr-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-700 font-mono"
                />
            </div>
            <div className="space-y-2 overflow-y-auto custom-scrollbar h-[calc(100vh-250px)] px-1">
                {sidebarGroups.map(k => (
                    <button 
                        key={k}
                        onClick={() => setSelectedAnaStokKodu(k)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all active:scale-95 group ${
                            selectedAnaStokKodu === k 
                            ? 'bg-cyan-600 border-cyan-400 shadow-xl shadow-cyan-900/40' 
                            : 'bg-white/5 border-white/5 hover:bg-white/[0.08] hover:border-white/10'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className={`text-[9px] font-black uppercase ${selectedAnaStokKodu === k ? 'text-white' : 'text-slate-600'}`}>KOD: {k.slice(0, 8)}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${selectedAnaStokKodu === k ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400'}`}>
                                {groupedProducts[k].length} Varyasyon
                            </span>
                        </div>
                        <h4 className={`text-xs font-black truncate uppercase tracking-tight ${selectedAnaStokKodu === k ? 'text-white' : 'text-slate-200 group-hover:text-cyan-400'}`}>{k}</h4>
                        <p className={`text-[9px] font-bold mt-1 truncate ${selectedAnaStokKodu === k ? 'text-cyan-100/50' : 'text-slate-500'}`}>
                            {groupedProducts[k][0]?.name}
                        </p>
                    </button>
                ))}
            </div>
        </div>
      </aside>

      {/* 🔵 ANA PANEL */}
      <main className="flex-1 flex flex-col p-8 gap-8 overflow-y-auto custom-scrollbar">
        {selectedAnaStokKodu ? (
            <div className="flex flex-col gap-8 animate-fade-in max-w-6xl mx-auto w-full">
                
                {/* ÜST BİLGİ KARTI */}
                <div className="grid grid-cols-12 gap-6 items-center bg-white/[0.03] p-8 rounded-[3rem] border border-white/5 relative overflow-hidden group">
                    <div className="col-span-12 lg:col-span-8 flex items-center gap-8">
                         <div className="w-24 h-24 bg-gradient-to-tr from-cyan-600 to-indigo-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl relative overflow-hidden shrink-0">
                            <Icon name="products" className="w-10 h-10 relative z-10" />
                            <div className="absolute inset-0 bg-white/20 group-hover:scale-150 transition-transform duration-700"></div>
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-cyan-600 uppercase tracking-[0.4em] mb-2">Seçili Ürün Grubu</p>
                            <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2 line-clamp-1">{selectedAnaStokKodu}</h1>
                            <div className="flex gap-4">
                                <span className="bg-white/5 px-4 py-1 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest border border-white/5 italic">"{activeGroupItems[0]?.name}"</span>
                                <span className="bg-emerald-500/10 px-4 py-1 rounded-full text-[10px] font-black text-emerald-500 uppercase tracking-widest border border-emerald-500/10 italic">{activeGroupItems[0]?.marka}</span>
                            </div>
                         </div>
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-8 items-start">
                    
                    {/* KONTROL PANELİ (İŞLEM SİHİRBAZI) */}
                    <div className="col-span-12 lg:col-span-8 space-y-8">
                        <section className="bg-[#0f172a] p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
                            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-10 flex items-center gap-3">
                                <Icon name="refresh" className="w-5 h-5 text-emerald-400" /> FİYATLANDIRMA SİHİRBAZI
                            </h2>

                            <div className="grid grid-cols-2 gap-10 mb-10">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block px-1">1. Hedef Alan</label>
                                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                                        <button onClick={() => setTargetType('price')} className={`flex-1 py-4 text-[10px] font-black uppercase rounded-xl transition-all ${targetType === 'price' ? 'bg-cyan-600 text-white shadow-xl shadow-cyan-900/40' : 'text-slate-600 hover:text-white'}`}>Satış Fiyatı</button>
                                        <button onClick={() => setTargetType('buyPrice')} className={`flex-1 py-4 text-[10px] font-black uppercase rounded-xl transition-all ${targetType === 'buyPrice' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/40' : 'text-slate-600 hover:text-white'}`}>Alış Fiyatı</button>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block px-1">2. İşlem Tipi</label>
                                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                                        <button onClick={() => setOperation('increase')} className={`flex-1 py-4 text-[10px] font-black uppercase rounded-xl transition-all ${operation === 'increase' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/40' : 'text-slate-600 hover:text-white'}`}>Artır (+)</button>
                                        <button onClick={() => setOperation('decrease')} className={`flex-1 py-4 text-[10px] font-black uppercase rounded-xl transition-all ${operation === 'decrease' ? 'bg-rose-600 text-white shadow-xl shadow-rose-900/40' : 'text-slate-600 hover:text-white'}`}>Düşür (-)</button>
                                        <button onClick={() => setOperation('set')} className={`flex-1 py-4 text-[10px] font-black uppercase rounded-xl transition-all ${operation === 'set' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/40' : 'text-slate-600 hover:text-white'}`}>Fiksle (=)</button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-10 items-end mb-12">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block px-1">3. Değişim Türü</label>
                                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                                        <button onClick={() => setUpdateType('amount')} className={`flex-1 py-4 text-[10px] font-black uppercase rounded-xl transition-all ${updateType === 'amount' ? 'bg-white/20 text-white shadow-lg' : 'text-slate-600'}`}>Tutar (₺)</button>
                                        <button onClick={() => setUpdateType('percent')} className={`flex-1 py-4 text-[10px] font-black uppercase rounded-xl transition-all ${updateType === 'percent' ? 'bg-white/20 text-white shadow-lg' : 'text-slate-600'}`}>Yüzde (%)</button>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block px-1">4. Giriş Değeri</label>
                                    <div className="relative">
                                        {updateType === 'amount' ? <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-white/20">₺</span> : <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl font-black text-white/20">%</span>}
                                        <input 
                                            type="number" 
                                            value={updateValue}
                                            onChange={e => setUpdateValue(e.target.value)}
                                            placeholder="0"
                                            className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-10 text-3xl font-black text-white outline-none focus:border-cyan-500/50 transition-all font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={prepareUpdate}
                                className="w-full h-20 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-[2.5rem] font-black uppercase text-sm tracking-[0.4em] shadow-2xl shadow-emerald-900/20 active:scale-95 transition-all flex items-center justify-center gap-4"
                            >
                                <Icon name="refresh" className="w-6 h-6" />
                                GRUP FİYATINI DEĞİŞTİR
                            </button>
                        </section>
                    </div>

                    {/* VARYASYON ÖZETİ (SAĞ) */}
                    <div className="col-span-12 lg:col-span-4 space-y-6 max-h-[700px] flex flex-col">
                         <h2 className="text-xs font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                             <Icon name="list-bullet" className="w-4 h-4" /> VARYASYON DETAYI
                         </h2>
                         <div className="flex-grow overflow-y-auto custom-scrollbar space-y-3 pr-2">
                             {activeGroupItems.map(p => (
                                <div key={p.barcode} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex justify-between items-center group hover:bg-white/[0.04] transition-all">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[11px] font-black text-white uppercase">{p.renk || 'Std'}</span>
                                            <span className="w-1 h-1 bg-white/10 rounded-full"></span>
                                            <span className="text-[11px] font-black text-cyan-400">{p.beden || 'Std'}</span>
                                        </div>
                                        <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest truncate">{p.barcode}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-white tabular-nums">{p.price.toFixed(2)} ₺</p>
                                        <p className={`text-[8px] font-black p-0.5 rounded shadow-inner ${p.stock < 5 ? 'text-rose-500 bg-rose-500/10' : 'text-slate-500'}`}>STOK: {p.stock}</p>
                                    </div>
                                </div>
                             ))}
                         </div>
                    </div>

                </div>
            </div>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-32 h-32 bg-white/5 rounded-[3rem] flex items-center justify-center mb-8 border border-white/5 animate-bounce-slow">
                    <Icon name="search" className="w-12 h-12 text-slate-800" />
                </div>
                <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4 italic">BİR GRUP <span className="text-cyan-500 underline decoration-indigo-500 decoration-4">SEÇİLMELİ</span></h2>
                <p className="max-w-xs text-slate-500 font-bold uppercase tracking-widest text-[10px] leading-relaxed">Sol taraftan bir kod seçin veya barkod okutarak varyasyonları dökün.</p>
            </div>
        )}
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #020617; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6366f1; }
        
        @keyframes bounce-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow { animation: bounce-slow 3s infinite ease-in-out; }
      `}</style>
    </div>
  );
};

export default BulkPriceUpdateView;
