import React, { useMemo, useEffect } from 'react';
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
  persistenceState?: any;
  setPersistenceState?: (state: any) => void;
}

const BulkPriceUpdateView: React.FC<BulkPriceUpdateViewProps> = ({ products, definitions, onUpdateProducts, onNavigate, persistenceState, setPersistenceState }) => {
  
  // Persistence Helper
  const updateState = (updates: any) => {
    if (setPersistenceState && persistenceState) {
        setPersistenceState({ ...persistenceState, ...updates });
    }
  };

  const {
    sidebarSearch, filterMarka, filterModel, filterGrup, filterRenk, filterBeden,
    filterBarcode, filterAnaStokKodu, filterStokKodu, selectedBarcodes: selectedBarcodesArr,
    updateValue, updateType, operation, targetType
  } = persistenceState || {};

  const selectedBarcodes = useMemo(() => new Set(selectedBarcodesArr || []), [selectedBarcodesArr]);

  const isFilterActive = sidebarSearch || filterMarka || filterModel || filterGrup || filterRenk || filterBeden || filterBarcode || filterAnaStokKodu || filterStokKodu;

  const filteredProducts = useMemo(() => {
    if (!isFilterActive) return [];
    return products.filter(p => {
      if (p.isDeleted) return false;
      const search = (sidebarSearch || '').toLowerCase().trim();
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
      const matchesBarcode = !filterBarcode || p.barcode.includes(filterBarcode.trim());
      const matchesAnaStok = !filterAnaStokKodu || (p.anaStokKodu || '').toLowerCase().includes(filterAnaStokKodu.toLowerCase().trim());
      const matchesStokKodu = !filterStokKodu || (p.stokKodu || '').toLowerCase().includes(filterStokKodu.toLowerCase().trim());

      return matchesSearch && matchesMarka && matchesModel && matchesGrup && matchesRenk && matchesBeden && matchesBarcode && matchesAnaStok && matchesStokKodu;
    });
  }, [products, sidebarSearch, filterMarka, filterModel, filterGrup, filterRenk, filterBeden, filterBarcode, filterAnaStokKodu, filterStokKodu, isFilterActive]);

  const toggleSelectAll = () => {
    if (selectedBarcodes.size === filteredProducts.length) {
      updateState({ selectedBarcodes: [] });
    } else {
      updateState({ selectedBarcodes: filteredProducts.map(p => p.barcode) });
    }
  };

  const toggleSelect = (barcode: string) => {
    const newSelection = new Set(selectedBarcodes);
    if (newSelection.has(barcode)) newSelection.delete(barcode);
    else newSelection.add(barcode);
    updateState({ selectedBarcodes: Array.from(newSelection) });
  };

  const prepareUpdate = () => {
    if (selectedBarcodes.size === 0) return alert("⚠️ Lütfen güncellenecek ürünleri seçin.");
    const val = Number(updateValue);
    if (isNaN(val) || val <= 0) return alert("⚠️ Geçerli bir değer giriniz.");

    const updatesToApply = filteredProducts.filter(p => selectedBarcodes.has(p.barcode));
    const updates = updatesToApply.map(p => {
        const currentVal = Number(p[targetType]) || 0;
        let newVal = currentVal;
        if (operation === 'set') newVal = val;
        else {
            const change = (updateType || 'amount') === 'percent' ? currentVal * (val / 100) : val;
            newVal = (operation || 'set') === 'increase' ? (currentVal + change) : (currentVal - change);
        }
        return {
            barcode: p.barcode,
            updates: { [targetType || 'price']: Math.max(0, Number(newVal.toFixed(2))) }
        };
    });
    onUpdateProducts(updates);
    updateState({ updateValue: '' });
  };

  const sortedDefinitions = useMemo(() => {
    const sortFn = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'tr');
    return {
      brands: [...definitions.brands].sort(sortFn),
      groups: [...definitions.groups].sort(sortFn),
      colors: [...definitions.colors].sort(sortFn),
      sizes: [...definitions.sizes].sort(sortFn),
      models: [...definitions.models].sort(sortFn),
    };
  }, [definitions]);

  return (
    <div className="flex w-full h-full bg-slate-50 dark:bg-[#020617] overflow-hidden font-sans text-[11px]">
      
      <aside className="w-64 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-white/5 flex flex-col p-2.5 gap-2 overflow-hidden">
        <div className="mb-0.5 flex justify-between items-center">
          <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
            <Icon name="search" className="w-3 h-3" /> GELİŞMİŞ FİLTRE
          </h3>
          <button onClick={() => updateState({ sidebarSearch: '', filterMarka: '', filterModel: '', filterGrup: '', filterRenk: '', filterBeden: '', filterBarcode: '', filterAnaStokKodu: '', filterStokKodu: '', selectedBarcodes: [] })} className="text-[8px] font-black text-rose-500 hover:underline uppercase">SIFIRLA</button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-1">
          <div className="space-y-0.5">
            <label className="text-[9px] font-bold text-slate-500 uppercase">Hızlı Arama</label>
            <input type="text" value={sidebarSearch || ''} onChange={e => updateState({ sidebarSearch: e.target.value, selectedBarcodes: [] })} placeholder="İsim, marka, kod..." className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg text-xs outline-none focus:border-indigo-500" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase">Barkod</label>
              <input type="text" value={filterBarcode || ''} onChange={e => updateState({ filterBarcode: e.target.value, selectedBarcodes: [] })} className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg text-xs outline-none" />
            </div>
            <div className="space-y-0.5">
              <label className="text-[9px] font-bold text-slate-500 uppercase">Ana Stok</label>
              <input type="text" value={filterAnaStokKodu || ''} onChange={e => updateState({ filterAnaStokKodu: e.target.value, selectedBarcodes: [] })} className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg text-xs outline-none" />
            </div>
            <div className="space-y-0.5 col-span-2">
              <label className="text-[9px] font-bold text-slate-500 uppercase">Stok Kodu</label>
              <input type="text" value={filterStokKodu || ''} onChange={e => updateState({ filterStokKodu: e.target.value, selectedBarcodes: [] })} className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg text-xs outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {[
              { label: 'Marka', value: filterMarka || '', setter: (v: string) => updateState({ filterMarka: v, filterModel: '', selectedBarcodes: [] }), options: sortedDefinitions.brands },
              { label: 'Model', value: filterModel || '', setter: (v: string) => updateState({ filterModel: v, selectedBarcodes: [] }), options: sortedDefinitions.models.filter(m => !filterMarka || sortedDefinitions.brands.find(b => b.name === filterMarka)?.id === m.brandId) },
              { label: 'Grup', value: filterGrup || '', setter: (v: string) => updateState({ filterGrup: v, selectedBarcodes: [] }), options: sortedDefinitions.groups },
            ].map(f => (
              <div key={f.label} className="space-y-0.5">
                <label className="text-[9px] font-bold text-slate-500 uppercase">{f.label}</label>
                <select value={f.value} onChange={e => f.setter(e.target.value)} className="w-full h-7 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg px-2 text-xs outline-none">
                  <option value="">Tümü</option>
                  {f.options.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Renk', value: filterRenk || '', setter: (v: string) => updateState({ filterRenk: v, selectedBarcodes: [] }), options: sortedDefinitions.colors },
              { label: 'Beden', value: filterBeden || '', setter: (v: string) => updateState({ filterBeden: v, selectedBarcodes: [] }), options: sortedDefinitions.sizes },
            ].map(f => (
              <div key={f.label} className="space-y-0.5">
                <label className="text-[9px] font-bold text-slate-500 uppercase">{f.label}</label>
                <select value={f.value} onChange={e => f.setter(e.target.value)} className="w-full h-7 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-lg px-2 text-xs outline-none">
                  <option value="">Tümü</option>
                  {f.options.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto p-2 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-center">
          <p className="text-[9px] font-black text-indigo-500 uppercase mb-0.5">Seçilen</p>
          <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">{selectedBarcodes.size} / {filteredProducts.length}</p>
        </div>
      </aside>

      <section className="flex-1 flex flex-col bg-white dark:bg-[#020617] border-r border-slate-200 dark:border-white/5 overflow-hidden">
        <div className="h-12 flex items-center justify-between px-4 border-b border-slate-200 dark:border-white/5 shrink-0 bg-white/50 dark:bg-slate-950/20 backdrop-blur">
          <h1 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">ÜRÜN LİSTESİ</h1>
          {isFilterActive && (
              <span className="text-[9px] font-bold text-slate-400 italic">
                {filteredProducts.length > 100 ? `İlk 100 gösteriliyor (Toplam: ${filteredProducts.length})` : `${filteredProducts.length} ürün bulundu`}
              </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {!isFilterActive ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-30">
              <Icon name="search" className="w-12 h-12 mb-4 text-slate-400" />
              <p className="text-sm font-black uppercase tracking-widest text-slate-500">Lütfen filtre uygulayın</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-[9px] font-black text-slate-500 uppercase z-10 shadow-sm">
                <tr>
                  <th className="p-3 border-b dark:border-white/5 w-10">
                    <input type="checkbox" checked={filteredProducts.length > 0 && selectedBarcodes.size === filteredProducts.length} onChange={toggleSelectAll} className="w-4 h-4 rounded border-slate-300 accent-indigo-500 cursor-pointer" />
                  </th>
                  <th className="p-2 border-b dark:border-white/5">Ürün</th>
                  <th className="p-2 border-b dark:border-white/5">Kodlar</th>
                  <th className="p-2 border-b dark:border-white/5 text-right">Alış</th>
                  <th className="p-2 border-b dark:border-white/5 text-right">Satış</th>
                  <th className="p-2 border-b dark:border-white/5 text-right">Kâr (%)</th>
                  <th className="p-2 border-b dark:border-white/5 text-center">Stok</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.slice(0, 100).map((p) => {
                  const profit = p.price - p.buyPrice;
                  const profitPercent = p.buyPrice > 0 ? (profit / p.buyPrice) * 100 : 100;
                  const isSelected = selectedBarcodes.has(p.barcode);
                  return (
                    <tr key={p.barcode} onClick={() => toggleSelect(p.barcode)} className={`hover:bg-slate-50 dark:hover:bg-white/[0.02] border-b dark:border-white/5 transition-colors cursor-pointer group ${isSelected ? 'bg-indigo-500/5' : ''}`}>
                      <td className="p-3" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(p.barcode)} className="w-4 h-4 rounded border-slate-300 accent-indigo-500 cursor-pointer" />
                      </td>
                      <td className="p-2">
                        <div className="font-black text-slate-800 dark:text-white truncate max-w-[150px]">{p.name}</div>
                        <div className="text-[9px] text-indigo-500 font-bold">{p.marka} / {p.group}</div>
                      </td>
                      <td className="p-2">
                        <div className="text-[9px] text-slate-500 font-mono">B: {p.barcode}</div>
                        <div className="text-[9px] text-slate-400 font-mono">A: {p.anaStokKodu || '-'} / S: {p.stokKodu || '-'}</div>
                      </td>
                      <td className="p-2 text-right font-bold text-slate-600 dark:text-slate-400 tabular-nums">{p.buyPrice.toFixed(2)}</td>
                      <td className="p-2 text-right font-black text-emerald-500 tabular-nums">{p.price.toFixed(2)}</td>
                      <td className="p-2 text-right">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${profit >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          %{profitPercent.toFixed(0)}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <span className={`font-bold ${p.stock <= 5 ? 'text-rose-500' : 'text-slate-500'}`}>{p.stock}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <aside className="w-72 flex-shrink-0 bg-slate-50 dark:bg-slate-950/20 p-4 flex flex-col gap-5">
        <div className="mb-1">
          <h2 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
            <Icon name="refresh" className="w-4 h-4" /> FİYAT MİMARI
          </h2>
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Sadece Seçili Ürünleri Günceller</p>
        </div>

        {selectedBarcodes.size > 0 ? (
          <div className="flex flex-col gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">1. Hedef</label>
              <div className="grid grid-cols-2 gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-white/5">
                <button onClick={() => updateState({ targetType: 'price' })} className={`py-2 rounded-md text-[9px] font-black transition-all ${targetType === 'price' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500'}`}>SATIŞ</button>
                <button onClick={() => updateState({ targetType: 'buyPrice' })} className={`py-2 rounded-md text-[9px] font-black transition-all ${targetType === 'buyPrice' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500'}`}>ALIŞ</button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">2. İşlem</label>
              <div className="grid grid-cols-3 gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-white/5">
                <button onClick={() => updateState({ operation: 'increase' })} className={`py-2 rounded-md text-[9px] font-black transition-all ${operation === 'increase' ? 'bg-emerald-500 text-white' : 'text-slate-500'}`}>ARTIR</button>
                <button onClick={() => updateState({ operation: 'decrease' })} className={`py-2 rounded-md text-[9px] font-black transition-all ${operation === 'decrease' ? 'bg-rose-500 text-white' : 'text-slate-500'}`}>DÜŞÜR</button>
                <button onClick={() => updateState({ operation: 'set' })} className={`py-2 rounded-md text-[9px] font-black transition-all ${operation === 'set' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>FİKS</button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">3. Miktar</label>
              <div className="flex gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-white/5">
                <button onClick={() => updateState({ updateType: 'percent' })} className={`flex-1 py-1.5 rounded-md text-[9px] font-black ${updateType === 'percent' ? 'bg-slate-200 dark:bg-white/10 text-indigo-500' : 'text-slate-500'}`}>Yüzde (%)</button>
                <button onClick={() => updateState({ updateType: 'amount' })} className={`flex-1 py-1.5 rounded-md text-[9px] font-black ${updateType === 'amount' ? 'bg-slate-200 dark:bg-white/10 text-indigo-500' : 'text-slate-500'}`}>Tutar (₺)</button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-black text-slate-300 dark:text-white/10 pointer-events-none">{updateType === 'percent' ? '%' : '₺'}</span>
                <input 
                  type="number" 
                  value={updateValue || ''}
                  onChange={e => updateState({ updateValue: e.target.value })}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && updateValue && Number(updateValue) > 0) prepareUpdate();
                  }}
                  placeholder="0.00"
                  className="w-full h-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-10 text-3xl font-black text-slate-800 dark:text-white outline-none focus:border-indigo-500 transition-all font-mono"
                />
              </div>
            </div>

            <button onClick={prepareUpdate} disabled={!updateValue || Number(updateValue) <= 0} className="w-full h-16 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl font-black uppercase text-sm tracking-widest flex flex-col items-center justify-center gap-1 mt-4">
              <div className="flex items-center gap-2"><Icon name="refresh" className="w-4 h-4" /> GÜNCELLE</div>
              <span className="text-[8px] opacity-60">{selectedBarcodes.size} Ürün İşleme Alınacak</span>
            </button>
          </div>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center text-center p-5 opacity-30 border border-dashed border-slate-300 dark:border-white/10 rounded-2xl">
            <Icon name="exclamation-circle" className="w-8 h-8 mb-2" />
            <p className="text-[9px] font-bold uppercase tracking-tighter">Lütfen listeden güncellenecek ürünleri seçin</p>
          </div>
        )}
      </aside>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; }
      `}</style>
    </div>
  );
};

export default BulkPriceUpdateView;
