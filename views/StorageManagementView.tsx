import React, { useRef, useState } from 'react';
import Icon from '../components/Icon';

interface StorageManagementViewProps {
  onExportData: () => void;
  onImportData: (file: File) => void;
  onResetApplication: () => void;
}

const StorageManagementView: React.FC<StorageManagementViewProps> = ({ onExportData, onImportData, onResetApplication }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resetConfirmation, setResetConfirmation] = useState('');

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (window.confirm(
        'UYARI: Bu işlem mevcut tüm verilerin üzerine yazacaktır ve geri alınamaz. Devam etmek istediğinizden emin misiniz?'
      )) {
        onImportData(file);
      }
    }
    if(event.target) {
        event.target.value = '';
    }
  };

  const handleReset = () => {
    if (resetConfirmation === 'SİL') {
        onResetApplication();
        setResetConfirmation('');
    } else {
        alert('Lütfen silme işlemini onaylamak için "SİL" yazın.');
    }
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-[#4c1d95] via-[#1e40af] to-[#0f172a] p-8 overflow-y-auto custom-scrollbar">
      
      <div className="max-w-5xl mx-auto space-y-8">
          {/* 🛡️ HEADER */}
          <div className="flex items-center justify-between mb-12">
              <div>
                  <h1 className="text-3xl font-black text-white tracking-tight uppercase underline decoration-indigo-500 decoration-4 underline-offset-8">VERİ <span className="text-indigo-400">YÖNETİMİ</span></h1>
                  <p className="text-[10px] text-white/50 font-bold uppercase tracking-[0.3em] mt-3">Sistem Yedekleme ve Güvenlik Merkezi</p>
              </div>
              <div className="w-16 h-16 bg-white/10 backdrop-blur-2xl border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Icon name="database" className="w-8 h-8 text-indigo-400" />
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* 📤 EXPORT CARD */}
              <div className="bg-white/10 backdrop-blur-3xl border border-white/10 p-10 rounded-[3.5rem] shadow-2xl group transition-all hover:bg-white/15">
                  <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                      <Icon name="download" className="w-8 h-8 text-indigo-400" />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight mb-4">Verileri Yedekle</h3>
                  <p className="text-sm text-slate-400 font-medium leading-relaxed mb-10">
                      Tüm ürünlerinizi, satış geçmişinizi ve ayarlarınızı güvenli bir JSON dosyası olarak bilgisayarınıza indirin.
                  </p>
                  <button
                    onClick={onExportData}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white h-16 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-4 shadow-xl shadow-indigo-600/20 transition-all active:scale-95"
                  >
                    <Icon name="download" className="w-5 h-5" />
                    Sistemi Yedekle
                  </button>
              </div>

              {/* 📥 IMPORT CARD */}
              <div className="bg-white/10 backdrop-blur-3xl border border-white/10 p-10 rounded-[3.5rem] shadow-2xl group transition-all hover:bg-white/15">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                      <Icon name="upload" className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight mb-4">Yedekten Yükle</h3>
                  <p className="text-sm text-slate-400 font-medium leading-relaxed mb-10">
                      Daha önce aldığınız bir yedeği sisteme geri yükleyerek verilerinizi anında kurtarın.
                  </p>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                  <button
                    onClick={handleImportClick}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white h-16 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-4 shadow-xl shadow-emerald-600/20 transition-all active:scale-95"
                  >
                    <Icon name="upload" className="w-5 h-5" />
                    Dosya Seç & Yükle
                  </button>
              </div>
          </div>

          {/* ⚠️ DANGER ZONE */}
          <div className="mt-12 bg-rose-500/5 border-2 border-rose-500/20 p-10 rounded-[4rem] relative overflow-hidden group shadow-2xl shadow-rose-500/5">
              <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 blur-[100px] -mr-32 -mt-32"></div>
              
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
                  <div className="flex-1">
                      <h3 className="text-2xl font-black text-rose-400 uppercase tracking-tight mb-4 flex items-center gap-4">
                          <Icon name="exclamation-circle" className="w-8 h-8" /> Tehlikeli Bölge
                      </h3>
                      <p className="text-sm text-rose-200/60 font-bold uppercase tracking-widest leading-relaxed max-w-2xl">
                          UYARI: Bu işlem tüm verileri kalıcı olarak siler ve uygulamayı fabrika ayarlarına döndürür. Bu işlem geri alınamaz!
                      </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
                      <input
                          type="text"
                          value={resetConfirmation}
                          onChange={(e) => setResetConfirmation(e.target.value)}
                          placeholder='Onay için "SİL" yazın'
                          className="w-full sm:w-56 bg-rose-500/10 border-2 border-rose-500/30 rounded-2xl p-4 text-rose-100 placeholder:text-rose-500/40 focus:outline-none focus:border-rose-500 font-black text-center uppercase tracking-widest"
                      />
                      <button
                        onClick={handleReset}
                        disabled={resetConfirmation !== 'SİL'}
                        className="w-full sm:w-auto bg-rose-600 hover:bg-rose-500 text-white px-8 h-16 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-rose-500/20 transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center gap-4"
                      >
                        <Icon name="trash" className="w-5 h-5" />
                        Sistemi Sıfırla
                      </button>
                  </div>
              </div>
          </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 20px; }
      `}</style>
    </div>
  );
};

export default StorageManagementView;