
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

                if (update.barcode) {
                    matched = products.find(p => p.barcode === update.barcode && !p.isDeleted);
                }
                
                if (!matched && update.stokKodu) {
                    matched = products.find(p => p.stokKodu === update.stokKodu && !p.isDeleted);
                }

                if (!matched && update.name) {
                    const matches = products.filter(p => p.name.toLowerCase().includes(update.name!.toLowerCase()) && !p.isDeleted);
                    if (matches.length === 1) {
                        matched = matches[0];
                    } else if (matches.length > 1) {
                        status = 'multiple-matches';
                    }
                }

                if (matched) {
                    status = 'matched';
                }

                return {
                    ...update,
                    currentBuyPrice: matched?.buyPrice,
                    matchedProduct: matched,
                    status
                };
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
        if (matchedUpdates.length === 0) {
            alert("Güncellenecek eşleşmiş ürün bulunamadı.");
            return;
        }

        const updatedProducts = products.map(product => {
            const update = matchedUpdates.find(u => u.matchedProduct?.barcode === product.barcode);
            if (update) {
                return { 
                    ...product, 
                    buyPrice: update.newBuyPrice,
                    isDeleted: false // "Sisteme aktif edip"
                };
            }
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
        if (!product) {
            alert("Ürün bulunamadı.");
            return;
        }

        const newUpdates = [...updates];
        newUpdates[index] = {
            ...newUpdates[index],
            matchedProduct: product,
            currentBuyPrice: product.buyPrice,
            status: 'matched'
        };
        setUpdates(newUpdates);
    };

    return (
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
            <header className="p-4 bg-white border-b flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-100 text-cyan-600 rounded-lg">
                        <Icon name="ai" className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">AI Fiyat Güncelleme</h1>
                        <p className="text-xs text-slate-500">Excel listesinden alış fiyatlarını otomatik güncelle.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => onNavigate(View.AI_MENU, 'Yapay Zeka', 'ai')}
                        className="btn-secondary text-xs"
                    >
                        Geri Dön
                    </button>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                        className="btn-primary text-xs"
                    >
                        {isProcessing ? (
                            <Icon name="refresh" className="w-4 h-4 animate-spin" />
                        ) : (
                            <><Icon name="excel" className="w-4 h-4 mr-1" /> Dosya Yükle</>
                        )}
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                        accept=".xlsx,.xls,.csv"
                    />
                </div>
            </header>

            <main className="flex-1 p-4 overflow-hidden flex flex-col gap-4">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2">
                        <Icon name="exclamation-triangle" className="w-4 h-4" />
                        {error}
                    </div>
                )}

                {updates.length > 0 ? (
                    <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 sticky top-0 z-10 border-b">
                                    <tr>
                                        <th className="p-2 text-xs font-bold text-slate-600">Durum</th>
                                        <th className="p-2 text-xs font-bold text-slate-600">Ürün Bilgisi</th>
                                        <th className="p-2 text-xs font-bold text-slate-600 text-right">Eski Fiyat</th>
                                        <th className="p-2 text-xs font-bold text-slate-600 text-right">Yeni Fiyat</th>
                                        <th className="p-2 text-xs font-bold text-slate-600 text-center">Değişim</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {updates.map((update, index) => (
                                        <tr key={index} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-2">
                                                {update.status === 'matched' ? (
                                                    <span className="flex items-center gap-1 text-green-600 text-[10px] font-bold bg-green-50 px-1.5 py-0.5 rounded-full">
                                                        <Icon name="check" className="w-3 h-3" /> Eşleşti
                                                    </span>
                                                ) : update.status === 'multiple-matches' ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="flex items-center gap-1 text-amber-600 text-[10px] font-bold bg-amber-50 px-1.5 py-0.5 rounded-full w-fit">
                                                            <Icon name="exclamation-triangle" className="w-3 h-3" /> Çoklu Eşleşme
                                                        </span>
                                                        <button 
                                                            onClick={() => handleManualMatch(index)}
                                                            className="text-[9px] text-cyan-600 hover:underline font-bold text-left"
                                                        >
                                                            Manuel Seç
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="flex items-center gap-1 text-red-600 text-[10px] font-bold bg-red-50 px-1.5 py-0.5 rounded-full w-fit">
                                                            <Icon name="trash" className="w-3 h-3" /> Bulunamadı
                                                        </span>
                                                        <button 
                                                            onClick={() => handleManualMatch(index)}
                                                            className="text-[9px] text-cyan-600 hover:underline font-bold text-left"
                                                        >
                                                            Manuel Eşleştir
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-2">
                                                <div className="text-xs font-bold text-slate-800">{update.name || update.matchedProduct?.name || 'Bilinmeyen Ürün'}</div>
                                                <div className="text-[10px] text-slate-500">{update.barcode || update.stokKodu || update.matchedProduct?.barcode}</div>
                                            </td>
                                            <td className="p-2 text-right text-xs text-slate-500">
                                                {update.currentBuyPrice ? `${update.currentBuyPrice.toLocaleString('tr-TR')} ₺` : '-'}
                                            </td>
                                            <td className="p-2 text-right">
                                                <input 
                                                    type="number" 
                                                    value={update.newBuyPrice}
                                                    onChange={(e) => handlePriceChange(index, parseFloat(e.target.value))}
                                                    className="w-20 text-right text-xs font-bold border rounded px-1 py-0.5 focus:ring-1 focus:ring-cyan-500 outline-none"
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                {update.currentBuyPrice && (
                                                    <span className={`text-[10px] font-bold ${update.newBuyPrice > update.currentBuyPrice ? 'text-red-600' : update.newBuyPrice < update.currentBuyPrice ? 'text-green-600' : 'text-slate-400'}`}>
                                                        {update.newBuyPrice > update.currentBuyPrice ? '↑' : update.newBuyPrice < update.currentBuyPrice ? '↓' : '='}
                                                        {Math.abs(((update.newBuyPrice - update.currentBuyPrice) / update.currentBuyPrice) * 100).toFixed(1)}%
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <footer className="p-3 bg-slate-50 border-t flex justify-between items-center">
                            <div className="text-xs text-slate-500">
                                <strong>{updates.filter(u => u.status === 'matched').length}</strong> ürün eşleşti.
                            </div>
                            <button 
                                onClick={handleApplyUpdates}
                                className="btn-primary text-xs px-6"
                            >
                                Değişiklikleri Uygula
                            </button>
                        </footer>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4 bg-white rounded-xl border border-dashed border-slate-300">
                        <div className="p-6 bg-slate-50 rounded-full">
                            <Icon name="excel" className="w-12 h-12" />
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-slate-600">Henüz dosya yüklenmedi</p>
                            <p className="text-sm">Tedarikçiden gelen fiyat listesini yükleyerek başlayın.</p>
                        </div>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="btn-secondary text-xs"
                        >
                            Dosya Seç
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AiPriceUpdateView;
