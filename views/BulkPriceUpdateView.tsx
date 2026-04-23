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
  
  // Detailed Filters
  const [filterMarka, setFilterMarka] = useState<string>('');
  const [filterModel, setFilterModel] = useState<string>('');
  const [filterGrup, setFilterGrup] = useState<string>('');
  const [filterRenk, setFilterRenk] = useState<string>('');
  const [filterBeden, setFilterBeden] = useState<string>('');

  // UI States
  const [updateValue, setUpdateValue] = useState<string>('');
  const [updateType, setUpdateType] = useState<'percent' | 'amount'>('amount');
  const [operation, setOperation] = useState<'increase' | 'decrease' | 'set'>('set');
  const [targetType, setTargetType] = useState<'price' | 'buyPrice'>('price');
  
  // Filtered Products for the Middle Section
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (p.isDeleted) return false;
      
      const search = sidebarSearch.toLowerCase().trim();
      const matchesSearch = !search || 
        p.barcode.includes(search) || 
        (p.name || '').toLowerCase().includes(search) || 
        (p.stokKodu || '').toLowerCase().includes(search) ||
        (p.anaStokKodu || '').toLowerCase().includes(search) ||
        (p.marka || '').toLowerCase().includes(search) ||
        (p.model || '').toLowerCase().includes(search) ||
        (p.group || '').toLowerCase().includes(search);

      const matchesMarka = !filterMarka || (p.marka || '').toLowerCase() === filterMarka.toLowerCase();
      const matchesModel = !filterModel || (p.model || '').toLowerCase() === filterModel.toLowerCase();
      const matchesGrup = !filterGrup || (p.group || '').toLowerCase() === filterGrup.toLowerCase();
      const matchesRenk = !filterRenk || (p.renk || '').toLowerCase() === filterRenk.toLowerCase();
      const matchesBeden = !filterBeden || (p.beden || '').toLowerCase() === filterBeden.toLowerCase();

      return matchesSearch && matchesMarka && matchesModel && matchesGrup && matchesRenk && matchesBeden;
    });
  }, [products, sidebarSearch, filterMarka, filterModel, filterGrup, filterRenk, filterBeden]);

  const prepareUpdate = () => {
    if (filteredProducts.length === 0) return alert("⚠️ Güncellenecek ürün bulunamadı.");
    const val = Number(updateValue);
    if (isNaN(val) || val <= 0) return alert("⚠️ Geçerli bir değer giriniz.");

    const updates = filteredProducts.map(p => {
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

    onUpdateProducts(updates);
    setUpdateValue('');
  };

  return (
    <div className="flex w-full h-full bg-[#020617] text-slate-300 overflow-hidden font-sans relative">
      {/* 🟢 1. BÖLÜM: FİLTRELEME (SOL) */}
      <aside className="w-[400px] flex-shrink-0 bg-[#0f172a]/40 border-r border-white/5 flex flex-col">
        <div className="p-8 flex flex-col h-full">
            <div className="mb-8">
                <h3 className="text-[11px] font-black text-cyan-500 uppercase tracking-[0.3em] mb-1 italic">FILTER <span className="text-white">ENGINE</span></h3>
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">DETAYLI ÜRÜN FİLTRELEME</p>
            </div>
            
            <div className="space-y-6 overflow-y-auto custom-scrollbar pr-2 pb-10">
                {/* Arama */}
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">GENEL ARAMA</label>
                    <div className="relative">
                        <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input 
                            type="text" 
                            value={sidebarSearch}
                            onChange={e => setSidebarSearch(e.target.value)}
                            placeholder="Barkod, isim veya kod..."
                            className="w-full h-12 pl-12 pr-4 bg-slate-900/50 border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:border-cyan-500/50 transition-all font-mono"
                        />
                    </div>
                </div>

                {/* Marka Filtresi */}
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">MARKA</label>
                    <select 
                        value={filterMarka}
                        onChange={e => { setFilterMarka(e.target.value); setFilterModel(''); }}
                        className="w-full h-12 bg-slate-900 border border-white/10 rounded-xl px-4 text-xs font-bold text-white outline-none focus:border-cyan-500/50 appearance-none"
                    >
                        <option value="">Tüm Markalar</option>
                        {definitions.brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                </div>

                {/* Model Filtresi */}
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">MODEL</label>
                    <select 
                        value={filterModel}
                        onChange={e => setFilterModel(e.target.value)}
                        className="w-full h-12 bg-slate-900 border border-white/10 rounded-xl px-4 text-xs font-bold text-white outline-none focus:border-cyan-500/50 appearance-none"
                    >
                        <option value="">Tüm Modeller</option>
                        {definitions.models
                          .filter(m => !filterMarka || definitions.brands.find(b => b.name === filterMarka)?.id === m.brandId)
                          .map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                </div>

                {/* Grup Filtresi */}
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">GRUP</label>
                    <select 
                        value={filterGrup}
                        onChange={e => setFilterGrup(e.target.value)}
                        className="w-full h-12 bg-slate-900 border border-white/10 rounded-xl px-4 text-xs font-bold text-white outline-none focus:border-cyan-500/50 appearance-none"
                    >
                        <option value="">Tüm Gruplar</option>
                        {definitions.groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                    </select>
                </div>

                {/* Renk Filtresi */}
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">RENK</label>
                    <select 
                        value={filterRenk}
                        onChange={e => setFilterRenk(e.target.value)}
                        className="w-full h-12 bg-slate-900 border border-white/10 rounded-xl px-4 text-xs font-bold text-white outline-none focus:border-cyan-500/50 appearance-none"
                    >
                        <option value="">Tüm Renkler</option>
                        {definitions.colors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                </div>

                {/* Beden Filtresi */}
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">BEDEN</label>
                    <select 
                        value={filterBeden}
                        onChange={e => setFilterBeden(e.target.value)}
                        className="w-full h-12 bg-slate-900 border border-white/10 rounded-xl px-4 text-xs font-bold text-white outline-none focus:border-cyan-500/50 appearance-none"
                    >
                        <option value="">Tüm Bedenler</option>
                        {definitions.sizes.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                </div>

                {/* Filtreleri Sıfırla */}
                <button 
                    onClick={() => {
                        setSidebarSearch('');
                        setFilterMarka('');
                        setFilterModel('');
                        setFilterGrup('');
                        setFilterRenk('');
                        setFilterBeden('');
                    }}
                    className="w-full py-4 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all mt-4"
                >
                    FİLTRELERİ TEMİZLE
                </button>
            </div>
            
            <div className="mt-auto pt-6 border-t border-white/5">
                <div className="bg-cyan-600/10 border border-cyan-500/20 rounded-2xl p-6 text-center">
                    <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-1">Eşleşen Ürün Sayısı</p>
                    <p className="text-3xl font-black text-white">{filteredProducts.length}</p>
                </div>
            </div>
        </div>
      </aside>

      {/* 🔵 2. BÖLÜM: ÜRÜN LİSTESİ (ORTA) */}
      <section className="flex-1 flex flex-col bg-[#020617] border-r border-white/5 overflow-hidden">
        <div className="p-10 border-b border-white/5 bg-slate-950/20 backdrop-blur-md flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-black text-white tracking-tighter uppercase mb-1">
                    {filteredProducts.length > 0 ? 'FİLTRELENEN ÜRÜNLER' : 'ÜRÜN SEÇİNİZ'}
                </h1>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                    {filteredProducts.length} ÜRÜN GÜNCELLENECEK
                </p>
            </div>
            {filteredProducts.length > 0 && (
                <div className="flex gap-4">
                    <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                        <p className="text-[8px] font-black text-emerald-500 uppercase leading-none mb-1">ORT. SATIŞ</p>
                        <p className="text-sm font-black text-white">
                            {(filteredProducts.reduce((acc, p) => acc + p.price, 0) / filteredProducts.length).toFixed(2)} ₺
                        </p>
                    </div>
                </div>
            )}
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar p-8 pr-10">
            {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 animate-fade-in">
                    {filteredProducts.map((p, idx) => (
                        <div key={p.barcode} className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex items-center justify-between group hover:bg-white/[0.04] transition-all hover:border-cyan-500/30">
                            <div className="flex items-center gap-6">
                                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-[10px] font-black text-slate-600 group-hover:text-cyan-500 transition-colors shrink-0">
                                    #{idx + 1}
                                </div>
                                <div>
                                    <div className="flex items-center gap-4 mb-3">
                                        <span className="text-lg font-black text-white uppercase line-clamp-1 tracking-tighter">{p.name}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-[13px] font-black text-cyan-400 uppercase tracking-[0.15em] bg-cyan-500/10 px-3 py-1 rounded-lg">{p.marka}</span>
                                        <span className="w-2 h-2 bg-white/10 rounded-full"></span>
                                        <span className="text-[13px] font-bold text-slate-500 font-mono tracking-[0.25em]">{p.barcode}</span>
                                        <span className="text-[13px] font-black text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-lg">[{p.renk} / {p.beden}]</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-16">
                                <div className="text-right">
                                    <p className="text-[12px] font-black text-slate-600 uppercase mb-2 tracking-[0.2em]">ALIŞ</p>
                                    <p className="text-2xl font-black text-indigo-400 tabular-nums leading-none">{p.buyPrice.toFixed(2)} ₺</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[12px] font-black text-slate-600 uppercase mb-2 tracking-[0.2em]">SATIŞ</p>
                                    <p className="text-2xl font-black text-emerald-400 tabular-nums leading-none">{p.price.toFixed(2)} ₺</p>
                                </div>
                                <div className="text-right bg-white/[0.04] px-8 py-4 rounded-[2rem] border border-white/5 shadow-2xl">
                                    <p className="text-[11px] font-black text-slate-500 uppercase mb-2 tracking-[0.3em]">KÂR (TL / %)</p>
                                    <div className="flex items-center gap-4 justify-end">
                                        <span className={`text-xl font-black tabular-nums leading-none ${(p.price - p.buyPrice) >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                                            {(p.price - p.buyPrice).toFixed(2)} ₺
                                        </span>
                                        <span className={`text-[14px] font-black px-4 py-1.5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.3)] ${(p.price - p.buyPrice) >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                            %{p.buyPrice > 0 ? (((p.price - p.buyPrice) / p.buyPrice) * 100).toFixed(0) : '100'}
                                        </span>
                                    </div>
                                </div>
                                <div className={`w-20 h-20 rounded-[2rem] flex flex-col items-center justify-center border-2 shadow-[0_20px_60px_rgba(0,0,0,0.4)] ${p.stock <= 5 ? 'bg-rose-500/20 border-rose-500/40 text-rose-500' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                                    <span className="text-[11px] font-black leading-none mb-2 uppercase opacity-40">STOK</span>
                                    <span className="text-2xl font-black leading-none tabular-nums">{p.stock}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-20 opacity-20">
                    <Icon name="search" className="w-24 h-24 text-slate-600 mb-6" />
                    <h2 className="text-2xl font-black text-white uppercase tracking-widest">Filtreye Uygun Ürün Bulunamadı</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest mt-2">Sol taraftaki kriterleri değiştirerek ürünleri listeleyin</p>
                </div>
            )}
        </div>
      </section>

      {/* 🟠 3. BÖLÜM: FİYAT DEĞİŞİKLİĞİ (SAĞ) */}
      <aside className="w-[450px] flex-shrink-0 bg-slate-950/20 border-l border-white/5 flex flex-col p-10">
        <div className="mb-12">
            <h2 className="text-[11px] font-black text-cyan-500 uppercase tracking-[0.4em] mb-2 flex items-center gap-3">
                <Icon name="refresh" className="w-5 h-5" /> FİYAT MİMARI
            </h2>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">TOPLU GÜNCELLEME SİHİRBAZI</p>
        </div>

        {filteredProducts.length === 0 ? (
            <div className="flex-grow flex flex-col items-center justify-center text-center bg-white/[0.01] rounded-[3rem] border border-dashed border-white/5 p-10 opacity-30">
                <Icon name="exclamation-circle" className="w-12 h-12 mb-4" />
                <p className="text-[11px] font-black uppercase tracking-widest px-4">Fiyatları yönetmek için önce kriterlerinize uygun ürünleri listeleyin</p>
            </div>
        ) : (
            <div className="flex-grow flex flex-col space-y-10 animate-fade-in">
                {/* Step 1: Target */}
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">1. HEDEF FİYAT</label>
                    <div className="grid grid-cols-2 gap-3 bg-white/5 p-2 rounded-2xl border border-white/5">
                        <button onClick={() => setTargetType('price')} className={`py-4 text-[11px] font-black uppercase rounded-xl transition-all ${targetType === 'price' ? 'bg-cyan-600 text-white shadow-xl shadow-cyan-900/20' : 'text-slate-600 hover:text-white'}`}>Satış Fiyatı</button>
                        <button onClick={() => setTargetType('buyPrice')} className={`py-4 text-[11px] font-black uppercase rounded-xl transition-all ${targetType === 'buyPrice' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/20' : 'text-slate-600 hover:text-white'}`}>Alış Fiyatı</button>
                    </div>
                </div>

                {/* Step 2: Operation */}
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">2. İŞLEM TİPİ</label>
                    <div className="grid grid-cols-3 gap-2 bg-white/5 p-2 rounded-2xl border border-white/5">
                        <button onClick={() => setOperation('increase')} className={`py-4 text-[10px] font-black uppercase rounded-xl transition-all ${operation === 'increase' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/20' : 'text-slate-600 hover:text-white'}`}>ARTIR (+)</button>
                        <button onClick={() => setOperation('decrease')} className={`py-4 text-[10px] font-black uppercase rounded-xl transition-all ${operation === 'decrease' ? 'bg-rose-600 text-white shadow-xl shadow-rose-900/20' : 'text-slate-600 hover:text-white'}`}>DÜŞÜR (-)</button>
                        <button onClick={() => setOperation('set')} className={`py-4 text-[10px] font-black uppercase rounded-xl transition-all ${operation === 'set' ? 'bg-white/20 text-white' : 'text-slate-600 hover:text-white'}`}>FİKSLE (=)</button>
                    </div>
                </div>

                {/* Step 3: Value Type & Input */}
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">3. DEĞİŞİM MİKTARI</label>
                    <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5 mb-3">
                        <button onClick={() => setUpdateType('percent')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${updateType === 'percent' ? 'bg-white/10 text-white' : 'text-slate-600'}`}>Yüzde (%)</button>
                        <button onClick={() => setUpdateType('amount')} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${updateType === 'amount' ? 'bg-white/10 text-white' : 'text-slate-600'}`}>Tutar (₺)</button>
                    </div>
                    <div className="relative group">
                        <div className="absolute inset-0 bg-cyan-600/5 blur-2xl group-hover:bg-cyan-600/10 transition-all rounded-full"></div>
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-white/10 pointer-events-none">
                            {updateType === 'percent' ? '%' : '₺'}
                        </span>
                        <input 
                            type="number" 
                            value={updateValue}
                            onChange={e => setUpdateValue(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && updateValue && Number(updateValue) > 0) {
                                    prepareUpdate();
                                }
                            }}
                            placeholder="0.00"
                            className="w-full h-24 bg-slate-900 border-2 border-white/10 focus:border-cyan-500 rounded-3xl px-12 text-5xl font-black text-white outline-none transition-all font-mono relative z-10 shadow-2xl"
                        />
                    </div>
                </div>

                <div className="mt-auto">
                    <button 
                        onClick={prepareUpdate}
                        disabled={!updateValue || Number(updateValue) <= 0}
                        className="w-full h-24 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-[2.5rem] font-black uppercase text-base tracking-[0.5em] shadow-[0_20px_50px_rgba(6,182,212,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-6"
                    >
                        <Icon name="refresh" className="w-8 h-8" />
                        GÜNCELLE
                    </button>
                    <p className="text-center text-[9px] font-bold text-slate-700 uppercase tracking-widest mt-6 italic">Filtrelenen {filteredProducts.length} ürünün tamamı güncellenecektir</p>
                </div>
            </div>
        )}
      </aside>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #06b6d4; }
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.4s cubic-bezier(0,0,0.2,1); }
      `}</style>
    </div>
  );
};

export default BulkPriceUpdateView;
