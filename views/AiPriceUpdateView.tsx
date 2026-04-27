import React, { useState, useRef } from 'react';
import Icon from '../components/Icon';
import { Product, View, TabIcon } from '../types';
import { extractPriceUpdatesFromContent } from '../services/geminiService';

interface AiPriceUpdateViewProps {
  products: Product[];
  onUpdateProducts: (products: Product[]) => void;
  onNavigate: (view: View, label: string, icon: TabIcon) => void;
}

interface PriceUpdate {
    barcode?: string;
    stokKodu?: string;
    name?: string;
    newBuyPrice: number;
    currentBuyPrice?: number;
    matchedProduct?: Product;
    status: 'matched' | 'not-found' | 'multiple-matches';
}

const AiPriceUpdateView: React.FC<AiPriceUpdateViewProps> = ({ products, onUpdateProducts, onNavigate }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [updates, setUpdates] = useState<PriceUpdate[]>([]);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsProcessing(true);
        setError(null);
        setUpdates([]);
        try {
            const extractedUpdates = await extractPriceUpdatesFromContent(file, "Excel dosyasındaki ürünlerin yeni alış fiyatlarını ayıkla.");
            const processedUpdates: PriceUpdate[] = extractedUpdates.map(update => {
                let matched: Product | undefined;
                let status: PriceUpdate['status'] = 'not-found';
                if (update.barcode) matched = products.find(p => p.barcode === update.barcode && !p.isDeleted);
                if (!matched && update.stokKodu) matched = products.find(p => p.stokKodu === update.stokKodu && !p.isDeleted);
                if (!matched && update.name) {
                    const matches = products.filter(p => p.name.toLowerCase().includes(update.name!.toLowerCase()) && !p.isDeleted);
                    if (matches.length === 1) matched = matches[0];
                    else if (matches.length > 1) status = 'multiple-matches';
                }
                if (matched) status = 'matched';
                return { ...update, currentBuyPrice: matched?.buyPrice, matchedProduct: matched, status };
            });
            setUpdates(processedUpdates);
        } catch (err: any) {
            setError(err.message || "Dosya işlenirken bir hata oluştu.");
        } finally {
            setIsProcessing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handlePriceChange = (index: number, newPrice: number) => {
        const newUpdates = [...updates];
        newUpdates[index].newBuyPrice = newPrice;
        setUpdates(newUpdates);
    };

    const handleApplyUpdates = () => {
        const matchedUpdates = updates.filter(u => u.status === 'matched' && u.matchedProduct);
        if (matchedUpdates.length === 0) return alert("Güncellenecek eşleşmiş ürün bulunamadı.");
        const updatedProducts = products.map(product => {
            const update = matchedUpdates.find(u => u.matchedProduct?.barcode === product.barcode);
            if (update) return { ...product, buyPrice: update.newBuyPrice, isDeleted: false };
            return product;
        });
        onUpdateProducts(updatedProducts);
        alert(`${matchedUpdates.length} ürünün alış fiyatı başarıyla güncellendi.`);
        setUpdates([]);
    };

    const handleManualMatch = (index: number) => {
        const barcode = prompt("Lütfen eşleştirmek istediğiniz ürünün barkodunu girin:");
        if (!barcode) return;
        const product = products.find(p => p.barcode === barcode && !p.isDeleted);
        if (!product) return alert("Ürün bulunamadı.");
        const newUpdates = [...updates];
        newUpdates[index] = { ...newUpdates[index], matchedProduct: product, currentBuyPrice: product.buyPrice, status: 'matched' };
        setUpdates(newUpdates);
    };

    return (
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#020617] overflow-hidden text-[11px]">
            <header className="h-12 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-cyan-500/10 text-cyan-500 rounded-lg">
                        <Icon name="ai" className="w-4 h-4" />
                    </div>
                    <div>
                        <h1 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">AI FİYAT GÜNCELLEME</h1>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => onNavigate(View.AI_MENU, 'Yapay Zeka', 'ai')} className="px-3 py-1.5 text-[9px] font-black uppercase text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">GERİ DÖN</button>
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        disabled={isProcessing}
                        className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-30 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                    >
                        {isProcessing ? <Icon name="refresh" className="w-3 h-3 animate-spin" /> : <><Icon name="excel" className="w-3 h-3" /> DOSYA YÜKLE</>}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx,.xls,.csv" />
                </div>
            </header>

            <main className="flex-1 p-3 overflow-hidden flex flex-col gap-3">
                {error && <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-2 rounded-lg font-bold flex items-center gap-2"><Icon name="exclamation-triangle" className="w-3 h-3" /> {error}</div>}

                {updates.length > 0 ? (
                    <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <div className="h-8 px-4 border-b dark:border-white/5 bg-slate-50 dark:bg-slate-950 flex items-center justify-between shrink-0">
                                <span className="text-[9px] font-bold text-slate-400 italic">
                                    {updates.length > 100 ? `İlk 100 satır gösteriliyor (Toplam: ${updates.length})` : `${updates.length} satır yüklendi`}
                                </span>
                            </div>
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 dark:bg-slate-950 sticky top-0 z-10 border-b dark:border-white/5 text-[9px] font-black text-slate-500 uppercase">
                                    <tr>
                                        <th className="p-2">DURUM</th>
                                        <th className="p-2">ÜRÜN BİLGİSİ</th>
                                        <th className="p-2 text-right">ESKİ</th>
                                        <th className="p-2 text-right">YENİ</th>
                                        <th className="p-2 text-center">FARK</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-white/5">
                                    {updates.slice(0, 100).map((update, index) => (
                                        <tr key={index} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                            <td className="p-2">
                                                {update.status === 'matched' ? (
                                                    <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">EŞLEŞTİ</span>
                                                ) : update.status === 'multiple-matches' ? (
                                                    <button onClick={() => handleManualMatch(index)} className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full hover:bg-amber-500/20">SEÇİM GEREKLİ</button>
                                                ) : (
                                                    <button onClick={() => handleManualMatch(index)} className="text-[9px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full hover:bg-rose-500/20">EŞLEŞTİR</button>
                                                )}
                                            </td>
                                            <td className="p-2">
                                                <div className="font-black text-slate-800 dark:text-white truncate max-w-[200px]">{update.name || update.matchedProduct?.name || 'Bilinmeyen'}</div>
                                                <div className="text-[9px] text-slate-400 font-mono">{update.barcode || update.stokKodu || update.matchedProduct?.barcode}</div>
                                            </td>
                                            <td className="p-2 text-right text-slate-500 tabular-nums">{update.currentBuyPrice ? `${update.currentBuyPrice.toFixed(2)} ₺` : '-'}</td>
                                            <td className="p-2 text-right">
                                                <input 
                                                    type="number" 
                                                    value={update.newBuyPrice} 
                                                    onChange={(e) => handlePriceChange(index, parseFloat(e.target.value))} 
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleApplyUpdates();
                                                    }}
                                                    className="w-16 text-right font-black bg-slate-50 dark:bg-slate-950 border dark:border-white/10 rounded px-1 py-0.5 outline-none focus:border-cyan-500" 
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                {update.currentBuyPrice && (
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${update.newBuyPrice > update.currentBuyPrice ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                        {update.newBuyPrice > update.currentBuyPrice ? '↑' : '↓'}
                                                        {Math.abs(((update.newBuyPrice - update.currentBuyPrice) / update.currentBuyPrice) * 100).toFixed(1)}%
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <footer className="h-12 px-4 bg-slate-50 dark:bg-slate-950 border-t dark:border-white/5 flex justify-between items-center shrink-0">
                            <div className="text-[10px] font-bold text-slate-500 uppercase">
                                <strong className="text-emerald-500">{updates.filter(u => u.status === 'matched').length}</strong> ÜRÜN HAZIR
                            </div>
                            <button onClick={handleApplyUpdates} className="px-6 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95">DEĞİŞİKLİKLERİ UYGULA</button>
                        </footer>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-white/10">
                        <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-full"><Icon name="excel" className="w-8 h-8 opacity-20" /></div>
                        <div className="text-center">
                            <p className="font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">DOSYA YÜKLENMEDİ</p>
                            <p className="text-[10px] uppercase opacity-50 mt-1">Fiyat listesini yükleyerek başlayın</p>
                        </div>
                        <button onClick={() => fileInputRef.current?.click()} className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-lg text-[9px] font-black uppercase tracking-widest">DOSYA SEÇ</button>
                    </div>
                )}
            </main>
            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; } .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; }`}</style>
        </div>
    );
};

export default AiPriceUpdateView;
