
import React, { useState, useMemo, useCallback } from 'react';
import { Product } from '../types';
import Icon from '../components/Icon';
import VarianceReportModal from '../components/VarianceReportModal';

interface StockCountViewProps {
  products: Product[];
  onBulkStockUpdate: (updates: { barcode: string; newStock: number }[]) => void;
}

const StockCountView: React.FC<StockCountViewProps> = ({ products, onBulkStockUpdate }) => {
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState('');
  const [showReport, setShowReport] = useState(false);

  const filteredProducts = useMemo(() => {
    const lowercasedFilter = filter.toLowerCase();
    return products
      .filter(p => !p.isDeleted)
      .filter(p => 
        p.name.toLowerCase().includes(lowercasedFilter) ||
        p.barcode.includes(lowercasedFilter) ||
        (p.secondaryBarcodes && p.secondaryBarcodes.some(bc => bc.includes(lowercasedFilter))) ||
        p.stokKodu.toLowerCase().includes(lowercasedFilter)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, filter]);

  const handleCountChange = (barcode: string, value: string) => {
    if (/^\d*$/.test(value)) {
      setCounts(prev => ({ ...prev, [barcode]: value }));
    }
  };

  const handleConfirmUpdate = (updates: { barcode: string, newStock: number }[]) => {
    onBulkStockUpdate(updates);
    setShowReport(false);
    setCounts({});
    alert(`${updates.length} ürünün stoğu başarıyla güncellendi.`);
  };
  
  const isCountInProgress = Object.keys(counts).length > 0;

  return (
    <div className="w-full h-full flex flex-col gap-4">
      {showReport && (
        <VarianceReportModal 
            isOpen={showReport}
            onClose={() => setShowReport(false)}
            onConfirm={handleConfirmUpdate}
            products={products}
            counts={counts}
        />
      )}
      <div className="flex-shrink-0 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Stok Sayım Modu</h1>
        <div className="flex items-center gap-2">
            <button 
                onClick={() => setShowReport(true)} 
                disabled={!isCountInProgress}
                className="btn-primary"
            >
                <Icon name="check" className="w-5 h-5"/> Sayımı Tamamla ve Raporla
            </button>
        </div>
      </div>

      <div className="flex-grow bg-white border border-slate-200/80 rounded-lg shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b bg-slate-50/70">
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Ürün adı, barkod veya stok kodu ile ara..."
            className="w-full max-w-md h-12 bg-white border-2 border-slate-300 rounded-lg px-4 text-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
        <div className="flex-grow overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-100 text-slate-600 uppercase z-10">
              <tr>
                <th className="p-3 text-left w-2/5">Ürün</th>
                <th className="p-3 text-left">Barkod</th>
                <th className="p-3 text-right">Sistem Stoğu</th>
                <th className="p-3 text-center w-48">Sayılan Miktar</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => (
                <tr key={product.barcode} className={`border-b last:border-b-0 hover:bg-slate-50 transition-colors ${counts[product.barcode] ? 'bg-green-50' : ''}`}>
                  <td className="p-3 font-medium text-slate-800">{product.name}</td>
                  <td className="p-3 font-mono text-slate-500">{product.barcode}</td>
                  <td className="p-3 text-right font-semibold">{product.stock}</td>
                  <td className="p-3 text-center">
                    <input
                      type="text"
                      value={counts[product.barcode] || ''}
                      onChange={e => handleCountChange(product.barcode, e.target.value)}
                      className="w-24 text-center text-lg font-bold border-2 border-slate-300 rounded-md py-1 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <div className="text-center p-16 text-slate-500">Arama kriterlerinize uygun ürün bulunamadı.</div>
          )}
        </div>
      </div>
      <style>{`
          .btn-primary { 
              display: inline-flex; align-items: center; gap: 0.5rem; background-color: #0ea5e9; 
              color: white; font-weight: 600; padding: 0.6rem 1.2rem; border-radius: 0.5rem; 
              transition: all 0.2s;
          }
          .btn-primary:hover { background-color: #0284c7; }
          .btn-primary:disabled { background-color: #94a3b8; cursor: not-allowed; }
      `}</style>
    </div>
  );
};

export default StockCountView;
