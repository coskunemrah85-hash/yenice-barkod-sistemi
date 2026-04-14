
import React from 'react';
import { PurchaseItem, AITask } from '../types';
import Icon from './Icon';

interface AiPurchaseReviewModalProps {
  task: AITask | null;
  onClose: () => void;
  onCommit: (taskId: string, products: Partial<PurchaseItem>[]) => void;
  onDismiss: (taskId: string) => void;
}

const AiPurchaseReviewModal: React.FC<AiPurchaseReviewModalProps> = ({ task, onClose, onCommit, onDismiss }) => {
  if (!task || task.status !== 'completed') return null;

  const handleCommitResults = () => {
    const validItems = (task.results || []).filter(p => p.quantity && (p.barcode || p.stokKodu || p.name));
    if (validItems.length > 0) {
      onCommit(task.id, validItems);
    } else {
      alert("Faturaya eklenecek geçerli ürün bulunamadı.");
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
            <h2 className="text-2xl font-bold text-slate-800">AI Fatura Sonuçlarını İncele</h2>
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
                            <th className="p-3 text-left font-semibold text-slate-600">Barkod/Stok Kodu</th>
                            <th className="p-3 text-left font-semibold text-slate-600">Ürün Adı</th>
                            <th className="p-3 text-right font-semibold text-slate-600">Adet</th>
                            <th className="p-3 text-right font-semibold text-slate-600">Alış Fiyatı</th>
                        </tr>
                    </thead>
                    <tbody>
                        {task.results.map((p, i) => (
                            <tr key={p.barcode || p.stokKodu || i} className="border-b last:border-0 bg-white hover:bg-slate-100/70">
                                <td className="p-3 font-mono text-slate-600">{p.barcode || p.stokKodu || 'N/A'}</td>
                                <td className="p-3 font-medium">{p.name || 'N/A'}</td>
                                <td className="p-3 text-right font-bold">{p.quantity ?? 'N/A'}</td>
                                <td className="p-3 text-right font-semibold text-cyan-700">{p.buyPrice?.toFixed(2) ?? 'N/A'} ₺</td>
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
                  Faturaya Ekle
              </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AiPurchaseReviewModal;
