
import React, { useState, useEffect, useMemo } from 'react';
import { SaleItem } from '../types';

interface BulkPriceUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: { [key: string]: number }, mode: 'anaStokKodu' | 'barcode') => void;
  currentSale: SaleItem[];
}

const BulkPriceUpdateModal: React.FC<BulkPriceUpdateModalProps> = ({ isOpen, onClose, onSave, currentSale }) => {
  const [updatedPrices, setUpdatedPrices] = useState<{ [key: string]: string }>({});

  const uniqueSaleItems = useMemo(() => {
    const unique = new Map<string, SaleItem>();

    currentSale.forEach(item => {
      const trimmedCode = item.anaStokKodu?.trim();
      const marka = item.marka?.trim();
      const model = item.model?.trim();
      
      // Key format priority: anaStokKodu OR "Marka:Model" OR "barcode:..."
      let key = (trimmedCode && trimmedCode !== '') ? trimmedCode : '';
      if (!key && marka && model) {
          key = `${marka}:${model}`;
      }
      if (!key) {
          key = `barcode:${item.barcode}`;
      }
      
      if (!unique.has(key)) {
        unique.set(key, item);
      }
    });
    return Array.from(unique.values());
  }, [currentSale]);

  useEffect(() => {
    if (isOpen) {
      const initialPrices = uniqueSaleItems.reduce((acc, item) => {
        const trimmedCode = item.anaStokKodu?.trim();
        const marka = item.marka?.trim();
        const model = item.model?.trim();
        
        let key = (trimmedCode && trimmedCode !== '') ? trimmedCode : '';
        if (!key && marka && model) key = `${marka}:${model}`;
        if (!key) key = `barcode:${item.barcode}`;

        acc[key] = item.price.toString();
        return acc;
      }, {} as { [key: string]: string });
      setUpdatedPrices(initialPrices);
    }
  }, [isOpen, uniqueSaleItems]);

  if (!isOpen) return null;

  const handlePriceChange = (key: string, value: string) => {
    setUpdatedPrices(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const updates: { [key: string]: number } = {};

    for (const item of uniqueSaleItems) {
      const trimmedCode = item.anaStokKodu?.trim();
      const marka = item.marka?.trim();
      const model = item.model?.trim();
      
      let key = (trimmedCode && trimmedCode !== '') ? trimmedCode : '';
      if (!key && marka && model) key = `${marka}:${model}`;
      if (!key) key = `barcode:${item.barcode}`;
      
      const newPriceStr = updatedPrices[key];
      if (newPriceStr === undefined) continue;

      const sanitizedValue = newPriceStr.replace(',', '.');
      const newPrice = parseFloat(sanitizedValue);
      
      if (!isNaN(newPrice) && newPrice >= 0 && newPrice !== item.price) {
        updates[key] = newPrice;
      }
    }
    
    if (Object.keys(updates).length > 0) {
      onSave(updates, 'anaStokKodu');
    }
    onClose();
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSave();
    }
    if (event.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyPress}
       >
        <header className="p-5 border-b flex justify-between items-center flex-shrink-0 bg-slate-50/80">
          <h2 className="text-2xl font-bold text-slate-800">Toplu Fiyat Güncelleme</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-2 rounded-full -mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
          </button>
        </header>
        <main className="p-6 flex-grow overflow-y-auto">
          <div className="space-y-4">
            {uniqueSaleItems.map(item => {
              const trimmedCode = item.anaStokKodu?.trim();
              const marka = item.marka?.trim();
              const model = item.model?.trim();
              
              let displayKey = (trimmedCode && trimmedCode !== '') ? trimmedCode : '';
              let groupType = '';
              
              if (displayKey) {
                  groupType = 'GRUP (ANA KOD)';
              } else if (marka && model) {
                  displayKey = `${marka}:${model}`;
                  groupType = 'GRUP (MODEL)';
              } else {
                  displayKey = `barcode:${item.barcode}`;
                  groupType = 'TEKİL';
              }
              
              const isGroup = !displayKey.startsWith('barcode:');

              return (
                <div key={displayKey} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${isGroup ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {groupType}
                      </span>
                      {isGroup && (
                        <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-100">
                          {trimmedCode ? `KOD: ${trimmedCode}` : `MODEL: ${item.model}`}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-slate-800">{item.name.replace(/ \(.+\)$/, '')} ({item.marka})</p>
                    <p className="text-[10px] text-slate-500 italic">
                      {isGroup 
                        ? 'Bu ürünün tüm varyasyonlarının (renk, beden vb.) fiyatı değişecektir.' 
                        : 'Bu ürünün ana kodu olmadığı için sadece bu barkodun fiyatı değişecektir.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-slate-600 font-semibold text-xl">₺</span>
                     <input
                      type="text"
                      value={updatedPrices[displayKey] || ''}
                      onChange={(e) => handlePriceChange(displayKey, e.target.value)}
                      className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-2xl text-right font-black text-cyan-600 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all shadow-inner"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </main>
        <footer className="p-4 border-t flex justify-end gap-4 flex-shrink-0 bg-slate-50 rounded-b-xl">
          <button onClick={onClose} className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold py-2 px-6 rounded-lg transition">İptal</button>
          <button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg transition shadow-sm hover:shadow-md">Değişiklikleri Kaydet</button>
        </footer>
      </div>
       <style>{`
        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(20px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in-up {
            animation: fade-in-up 0.3s ease-out forwards;
        }
    `}</style>
    </div>
  );
};

export default BulkPriceUpdateModal;
