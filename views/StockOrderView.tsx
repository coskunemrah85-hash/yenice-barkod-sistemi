import React, { useMemo } from 'react';
import { Product, Supplier, View, TabIcon } from '../types';
import Icon from '../components/Icon';
import * as XLSX from 'xlsx';

interface StockOrderViewProps {
  products: Product[];
  suppliers: Supplier[];
  onNavigate?: (view: View, label: string, icon: TabIcon) => void;
}

const StockOrderView: React.FC<StockOrderViewProps> = ({ products, suppliers, onNavigate }) => {
    // Module for generating PDF/Excel stock orders

  const lowStockProducts = useMemo(() => {
    return products.filter(p => !p.isDeleted && (p.stock <= (p.minStock || 5)));
  }, [products]);

  const groupedBySupplier = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    lowStockProducts.forEach(p => {
      const sId = p.supplierId || 'unknown';
      if (!groups[sId]) groups[sId] = [];
      groups[sId].push(p);
    });
    return groups;
  }, [lowStockProducts]);

  const handleExportExcel = (supplierId: string, productsList: Product[]) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    const supplierName = supplier?.name || 'Genel';
    
    const data = productsList.map(p => ({
      'Ürün Adı': p.name,
      'Stok Kodu': p.stokKodu,
      'Marka': p.marka,
      'Model': p.model,
      'Mevcut Stok': p.stock,
      'Min Stok': p.minStock || 5,
      'Sipariş Miktarı': Math.max(10, (p.minStock || 5) * 2 - p.stock)
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sipariş Listesi");
    XLSX.writeFile(wb, `siparis_listesi_${supplierName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-slate-900 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-8 rounded-3xl border dark:border-slate-700 shadow-xl">
            <div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase flex items-center gap-3">
                    <Icon name="purchase" className="w-8 h-8 text-amber-500" />
                    Otomatik Sipariş Listesi Oluşturucu
                </h2>
                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Kritik seviyenin altına düşen ürünler baz alınır.</p>
            </div>
            <div className="text-right">
                <p className="text-3xl font-black text-amber-500 italic">{lowStockProducts.length}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase">Eksik Ürün Sayısı</p>
            </div>
        </div>

        <div className="space-y-8">
          {Object.entries(groupedBySupplier).map(([sId, sProducts]) => {
            const supplier = suppliers.find(s => s.id === sId);
            return (
              <section key={sId} className="bg-white dark:bg-slate-800 rounded-3xl border dark:border-slate-700 shadow-xl overflow-hidden group">
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-b dark:border-slate-700 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border dark:border-slate-700 flex items-center justify-center">
                        <Icon name="supplier" className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{supplier?.name || 'Tedarikçisi Belirlenmemiş Ürünler'}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{sProducts.length} Kritik Ürün</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleExportExcel(sId, sProducts)}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.05]"
                  >
                    <Icon name="excel" className="w-4 h-4" />
                    Excel Sipariş Listesi Al
                  </button>
                </div>
                
                <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {sProducts.map(p => (
                            <div key={p.barcode} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border dark:border-slate-700">
                                <div>
                                    <p className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase">{p.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{p.marka} - {p.model} - {p.renk}/{p.beden}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-rose-500 underline decoration-2 underline-offset-4">{p.stock} ADET</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Raf: {p.shelfLocation || '--'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              </section>
            );
          })}

          {lowStockProducts.length === 0 && (
            <div className="py-24 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed dark:border-slate-700">
                <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Icon name="check" className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase italic">Harika! Stoklar Tamam</h3>
                <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Kritik seviyenin altında ürün bulunmuyor.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockOrderView;
