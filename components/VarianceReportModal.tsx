
import React, { useMemo } from 'react';
import { Product } from '../types';
import Icon from './Icon';

interface VarianceReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (updates: { barcode: string; newStock: number }[]) => void;
    products: Product[];
    counts: Record<string, string>;
}

const VarianceReportModal: React.FC<VarianceReportModalProps> = ({ isOpen, onClose, onConfirm, products, counts }) => {

    const varianceData = useMemo(() => {
        return products
            .map(product => {
                const countedStockStr = counts[product.barcode];
                if (countedStockStr === undefined || countedStockStr === '') return null; // Only include items that were counted

                const countedStock = parseInt(countedStockStr, 10);
                const systemStock = product.stock;
                const difference = countedStock - systemStock;

                if (difference === 0) return null; // Only show items with differences

                return {
                    barcode: product.barcode,
                    name: product.name,
                    systemStock,
                    countedStock,
                    difference
                };
            })
            .filter(Boolean) as { barcode: string; name: string; systemStock: number; countedStock: number; difference: number }[];
    }, [products, counts]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (window.confirm(
            'Stoklar sayılan değerlerle güncellenecektir. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?'
        )) {
            const updates = varianceData.map(item => ({
                barcode: item.barcode,
                newStock: item.countedStock,
            }));
            onConfirm(updates);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <header className="p-5 border-b flex justify-between items-center bg-slate-50">
                    <h2 className="text-2xl font-bold text-slate-800">Stok Fark Raporu</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-2 rounded-full"><Icon name="x-circle" className="w-7 h-7"/></button>
                </header>
                <main className="flex-grow overflow-y-auto">
                    {varianceData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                            <Icon name="check" className="w-16 h-16 text-green-500 mb-4" />
                            <p className="font-semibold text-lg">Tebrikler!</p>
                            <p>Sayılan ürünler ile sistem stoğu arasında fark bulunamadı.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-600 uppercase bg-slate-100 sticky top-0">
                                <tr>
                                    <th className="p-3 w-1/2">Ürün Adı</th>
                                    <th className="p-3 text-right">Sistem Stoğu</th>
                                    <th className="p-3 text-right">Sayılan Stok</th>
                                    <th className="p-3 text-right">Fark</th>
                                </tr>
                            </thead>
                            <tbody>
                                {varianceData.map(item => (
                                    <tr key={item.barcode} className="border-b last:border-0 hover:bg-slate-50">
                                        <td className="p-3 font-medium">{item.name}</td>
                                        <td className="p-3 text-right font-semibold">{item.systemStock}</td>
                                        <td className="p-3 text-right font-semibold">{item.countedStock}</td>
                                        <td className={`p-3 text-right font-bold ${item.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {item.difference > 0 ? `+${item.difference}` : item.difference}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </main>
                <footer className="p-4 border-t bg-slate-100 flex justify-end gap-4">
                    <button onClick={onClose} className="btn-secondary">Kapat</button>
                    <button 
                        onClick={handleConfirm}
                        disabled={varianceData.length === 0}
                        className="btn-primary bg-green-600 hover:bg-green-700"
                    >
                        Stokları Sayılan Değerlerle Güncelle
                    </button>
                </footer>
            </div>
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
                .btn-primary { 
                    display: inline-flex; align-items: center; gap: 0.5rem; color: white; font-weight: 600; 
                    padding: 0.6rem 1.2rem; border-radius: 0.5rem; transition: all 0.2s; 
                }
                .btn-primary:disabled { background-color: #94a3b8; cursor: not-allowed; }
                .btn-secondary { 
                    background-color: white; border: 1px solid #cbd5e1; color: #334155; 
                    font-weight: 600; padding: 0.6rem 1.2rem; border-radius: 0.5rem; 
                    transition: all 0.2s;
                }
                .btn-secondary:hover { background-color: #f1f5f9; }
            `}</style>
        </div>
    );
};

export default VarianceReportModal;
