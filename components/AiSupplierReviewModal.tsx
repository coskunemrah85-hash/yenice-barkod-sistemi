import React from 'react';
import { Supplier, AITaskSupplier } from '../types';
import Icon from './Icon';

interface AiSupplierReviewModalProps {
  task: AITaskSupplier | null;
  onClose: () => void;
  onCommit: (taskId: string, suppliers: Partial<Supplier>[]) => void;
  onDismiss: (taskId: string) => void;
}

const AiSupplierReviewModal: React.FC<AiSupplierReviewModalProps> = ({ task, onClose, onCommit, onDismiss }) => {
  if (!task) return null;

  const handleCommitResults = () => {
    const validItems = (task.results || []).filter(s => s.name);
    if (validItems.length > 0) {
      onCommit(task.id, validItems);
    } else {
      alert("Sisteme eklenecek geçerli tedarikçi bulunamadı.");
    }
  };
  
  const renderContent = () => {
    if (task.status === 'processing') {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-500 p-4 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mb-4"></div>
            <p className="text-lg font-semibold">Yapay zeka analiz ediyor...</p>
            <p>"{task.fileName}" dosyasındaki veriler çıkarılıyor.</p>
        </div>
      );
    }
    
    if (task.status === 'error') {
       return (
        <div className="flex flex-col items-center justify-center h-full text-red-600 p-4 text-center">
            <Icon name="exclamation-triangle" className="w-12 h-12 mb-4" />
            <p className="text-lg font-semibold">Bir Hata Oluştu</p>
            <p className="text-sm bg-red-100 p-2 rounded-md mt-2">{task.error}</p>
        </div>
      );
    }

    if (task.results && task.results.length > 0) {
      return (
        <table className="w-full text-sm">
            <thead className="bg-slate-200 sticky top-0">
                <tr>
                    <th className="p-3 text-left font-semibold text-slate-600">Ünvan</th>
                    <th className="p-3 text-left font-semibold text-slate-600">Yetkili</th>
                    <th className="p-3 text-left font-semibold text-slate-600">Telefon</th>
                    <th className="p-3 text-left font-semibold text-slate-600">Vergi No</th>
                </tr>
            </thead>
            <tbody>
                {task.results.map((s, i) => (
                    <tr key={s.code || s.name || i} className="border-b last:border-0 bg-white hover:bg-slate-100/70">
                        <td className="p-3 font-medium">{s.name || 'N/A'}</td>
                        <td className="p-3 text-slate-600">{s.firstName || ''} {s.lastName || ''}</td>
                        <td className="p-3 text-slate-600">{s.mobilePhone || s.whatsapp || 'N/A'}</td>
                        <td className="p-3 font-mono text-slate-600">{s.taxNumber || 'N/A'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      );
    }

    return (
        <div className="flex items-center justify-center h-full text-slate-500 p-4 text-center">
            <p>Yapay zeka bu dosyadan tedarikçi bilgisi çıkaramadı veya sonuçlar boş.</p>
        </div>
    );
  };


  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
          className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
      >
        <header className="p-5 border-b flex justify-between items-center flex-shrink-0 bg-slate-50/80">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">AI Tedarikçi Sonuçlarını İncele</h2>
            <p className="text-sm text-slate-500">{task.fileName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-2 rounded-full -mr-2">
            <Icon name="x-circle" className="w-7 h-7" />
          </button>
        </header>
        <main className="flex-grow overflow-y-auto bg-slate-50 border-y border-slate-200">
            {renderContent()}
        </main>
        <footer className="p-4 flex justify-between items-center flex-shrink-0 bg-slate-100 rounded-b-xl">
          <p className="text-sm text-slate-600 font-medium">
            {task.status === 'completed' && `Toplam ${task.results?.length || 0} adet tedarikçi bulundu.`}
          </p>
          <div className="flex gap-4">
              <button type="button" onClick={() => onDismiss(task.id)} className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold py-2 px-6 rounded-lg transition">Kapat</button>
              <button 
                  onClick={handleCommitResults} 
                  disabled={!task.results || task.results.length === 0 || task.status !== 'completed'}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg transition shadow-sm hover:shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed"
              >
                  Sisteme Ekle
              </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AiSupplierReviewModal;
