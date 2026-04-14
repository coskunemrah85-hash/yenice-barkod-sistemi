

import React from 'react';
import { Product, AITask } from '../types';
import Icon from './Icon';

interface AiReviewModalProps {
  task: AITask | null;
  onClose: () => void;
  onCommit: (taskId: string, products: Product[]) => void;
  onDismiss: (taskId: string) => void;
}

const AiReviewModal: React.FC<AiReviewModalProps> = ({ task, onClose, onCommit, onDismiss }) => {
  if (!task) return null;

  const handleCommitResults = () => {
    const validProducts: Product[] = (task.results || [])
      .filter(p => p.barcode && p.name)
      .map((p, index) => ({
        barcode: p.barcode || `YAPAYZEKA-${Date.now()}-${index}`,
        name: p.name || 'İsimsiz Ürün',
        buyPrice: p.buyPrice || 0,
        price: p.price || 0,
        stock: p.stock || 0,
        stokKodu: p.stokKodu || '',
        marka: p.marka || 'Yenice',
        model: p.model || 'Standart',
        renk: p.renk || 'Belirtilmemiş',
        beden: p.beden || 'Standart',
        anaStokKodu: p.anaStokKodu || 'GENEL-AI',
        group: '',
        midGroup: '',
        subGroup: '',
        isActivated: false,
      }));
    
    if (validProducts.length > 0) {
      onCommit(task.id, validProducts);
    } else {
      alert("Stoğa eklenecek geçerli ürün bulunamadı. Lütfen barkod ve ürün adı bilgilerinin olduğundan emin olun.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
          className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
      >
        <header className="p-5 border-b flex justify-between items-center flex-shrink-0 bg-slate-50/80">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">AI Sonuçlarını İncele</h2>
            <p className="text-sm text-slate-500">{task.fileName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-2 rounded-full -mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>
        <main className="flex-grow overflow-y-auto bg-slate-50 border-y border-slate-200">
            {task.results && task.results.length > 0 ? (
                <table className="w-full text-sm">
                    <thead className="bg-slate-200 sticky top-0">
                        <tr>
                            <th className="p-3 text-left font-semibold text-slate-600">Barkod</th>
                            <th className="p-3 text-left font-semibold text-slate-600">Ürün Adı</th>
                            <th className="p-3 text-left font-semibold text-slate-600">Marka/Model</th>
                            <th className="p-3 text-right font-semibold text-slate-600">Adet</th>
                            <th className="p-3 text-right font-semibold text-slate-600">Alış Fiyatı</th>
                            <th className="p-3 text-right font-semibold text-slate-600">Satış Fiyatı</th>
                        </tr>
                    </thead>
                    <tbody>
                        {task.results.map((p, i) => (
                            <tr key={p.barcode || i} className="border-b last:border-0 bg-white hover:bg-slate-100/70">
                                <td className="p-3 font-mono text-slate-600">{p.barcode || 'N/A'}</td>
                                <td className="p-3 font-medium">{p.name || 'N/A'}</td>
                                <td className="p-3 text-slate-500">{p.marka || ''}{p.model ? ` - ${p.model}`: ''}</td>
                                <td className="p-3 text-right font-bold">{p.stock ?? 'N/A'}</td>
                                <td className="p-3 text-right font-semibold text-slate-500">{p.buyPrice?.toFixed(2) ?? 'N/A'} ₺</td>
                                <td className="p-3 text-right font-semibold text-cyan-700">{p.price?.toFixed(2) ?? 'N/A'} ₺</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div className="flex items-center justify-center h-full text-slate-500 p-4 text-center">
                    <p>Yapay zeka bu dosyadan ürün çıkaramadı veya sonuçlar boş.</p>
                </div>
            )}
        </main>
        <footer className="p-4 flex justify-between items-center flex-shrink-0 bg-slate-100 rounded-b-xl">
          <p className="text-sm text-slate-600 font-medium">
            Toplam <span className="font-bold text-cyan-700">{task.results?.length || 0}</span> adet ürün bulundu.
          </p>
          <div className="flex gap-4">
              <button type="button" onClick={() => onDismiss(task.id)} className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold py-2 px-6 rounded-lg transition">İptal Et</button>
              <button 
                  onClick={handleCommitResults} 
                  disabled={!task.results || task.results.length === 0}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg transition shadow-sm hover:shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                  Stoğa Ekle
              </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AiReviewModal;