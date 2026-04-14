
import React, { useState, useCallback } from 'react';
import { Product } from '../types';
import Icon from './Icon';

interface AiProductModalProps {
  onClose: () => void;
  onStartTask: (file: File, prompt: string) => void;
}

const AiProductModal: React.FC<AiProductModalProps> = ({ onClose, onStartTask }) => {
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('Bu Excel veya PDF dosyasındaki ürünleri detaylıca analiz et. Excel ise ilk satırdaki başlıkları (A1, B1 vb.) atlayarak sadece altındaki gerçek verileri işle. Barkod, Ürün Adı, Alış/Satış Fiyatı, Miktar, Marka, Model, Renk ve Grup bilgilerini eksiksiz çıkar.');
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        setFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleStart = () => {
    if (!file || !prompt) {
      setError('Lütfen bir dosya yükleyin ve bir komut girin.');
      return;
    }
    onStartTask(file, prompt);
    onClose();
  };
  

  return (
     <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
        >
            <header className="p-5 border-b flex justify-between items-center flex-shrink-0 bg-slate-50/80">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3"><Icon name="ai" className="w-7 h-7 text-pink-500" /> Yapay Zeka ile Ürün Ekle</h2>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-2 rounded-full -mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </header>
            <main className="p-6 flex-grow overflow-y-auto">
                <div className="flex flex-col gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">1. Fatura, Katalog veya Excel/CSV Dosyası Yükleyin</label>
                        <div 
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-pink-500 hover:bg-pink-50 transition"
                            onClick={() => document.getElementById('ai-file-input')?.click()}
                        >
                            <input id="ai-file-input" type="file" className="hidden" onChange={handleFileChange} accept="image/*,application/pdf,.csv,.xlsx,.xls" />
                            <Icon name="upload" className="w-12 h-12 mx-auto text-slate-400" />
                            {file ? (
                                <p className="mt-2 font-semibold text-pink-700">{file.name}</p>
                            ) : (
                                <>
                                <p className="mt-2 text-slate-500">Dosyayı buraya sürükleyin veya seçmek için tıklayın</p>
                                <p className="text-xs text-slate-400 mt-1">Desteklenenler: Resim, PDF, Excel, CSV</p>
                                </>
                            )}
                        </div>
                    </div>
                     <div>
                        <label htmlFor="ai-prompt" className="block text-sm font-medium text-slate-600 mb-2">2. Yapay Zekadan Ne İstediğinizi Yazın</label>
                        <textarea
                            id="ai-prompt"
                            rows={4}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Örn: Bu faturadaki ürünleri ve adetlerini listeye ekle."
                            className="w-full bg-white border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition"
                        />
                    </div>
                    {error && <p className="text-red-600 bg-red-100 p-3 rounded-lg text-sm">{error}</p>}
                </div>
            </main>
            <footer className="p-4 border-t flex justify-end gap-4 flex-shrink-0 bg-slate-50 rounded-b-xl">
                <button type="button" onClick={onClose} className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold py-2 px-6 rounded-lg transition">İptal</button>
                <button 
                    onClick={handleStart} 
                    disabled={!file}
                    className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-6 rounded-lg transition disabled:bg-slate-400 flex items-center justify-center gap-3 shadow-md hover:shadow-lg disabled:shadow-none"
                >
                    <Icon name="check" className="w-5 h-5"/> 
                    <span>Analizi Başlat</span>
                </button>
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

export default AiProductModal;
