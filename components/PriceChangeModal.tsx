
import React, { useState, useEffect } from 'react';
import { Product } from '../types';

interface PriceChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSave: (updatedProducts: Product[]) => void;
}

const PriceChangeModal: React.FC<PriceChangeModalProps> = ({ isOpen, onClose, products, onSave }) => {
  const [updatedPrices, setUpdatedPrices] = useState<{ [barcode: string]: string }>({});

  useEffect(() => {
    if (isOpen) {
      // When modal opens, populate with current prices
      const initialPrices = products.reduce((acc, product) => {
        acc[product.barcode] = product.price.toString();
        return acc;
      }, {} as { [barcode: string]: string });
      setUpdatedPrices(initialPrices);
    }
  }, [isOpen, products]);

  if (!isOpen) return null;

  const handlePriceChange = (barcode: string, value: string) => {
    setUpdatedPrices(prev => ({ ...prev, [barcode]: value }));
  };

  const handleSave = () => {
    const newProducts = products.map(product => {
      const newPriceStr = updatedPrices[product.barcode];
      // Ensure the value is a valid number format before parsing
      const sanitizedValue = newPriceStr.replace(',', '.');
      const newPrice = parseFloat(sanitizedValue);
      if (!isNaN(newPrice) && newPrice >= 0) {
        return { ...product, price: newPrice };
      }
      return product;
    });
    onSave(newProducts);
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
        onClick={(e) => e.stopPropagation()} // Prevent closing modal when clicking inside
        onKeyDown={handleKeyPress}
       >
        <header className="p-5 border-b flex justify-between items-center flex-shrink-0 bg-slate-50/80">
          <h2 className="text-2xl font-bold text-slate-800">Hızlı Fiyat Güncelleme</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-2 rounded-full -mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
          </button>
        </header>
        <main className="p-6 flex-grow overflow-y-auto">
          <div className="space-y-4">
            {products.map(product => (
              <div key={product.barcode} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div>
                  <p className="font-semibold text-slate-800">{product.name}</p>
                  <p className="text-sm text-slate-500 font-mono">{product.barcode}</p>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-slate-600 font-semibold">₺</span>
                   <input
                    type="number"
                    step="0.01"
                    value={updatedPrices[product.barcode] || ''}
                    onChange={(e) => handlePriceChange(product.barcode, e.target.value)}
                    className="w-full bg-slate-100 border-2 border-slate-300 rounded-lg p-2 text-lg text-right font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                    placeholder="0.00"
                  />
                </div>
              </div>
            ))}
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

export default PriceChangeModal;
