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
    // Reset file input value to allow re-uploading the same file
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
    <div className="w-full h-full flex flex-col items-center overflow-y-auto py-8">
      <div className="w-full max-w-4xl p-10 bg-white rounded-xl shadow-lg border border-slate-200/80 space-y-8">
        {/* Export Section */}
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
            <Icon name="download" className="w-7 h-7 text-cyan-600" />
            Verileri Dışa Aktar (Yedekleme)
          </h2>
          <p className="text-slate-500 mb-4">
            Tüm uygulama verilerinizi (ürünler, satışlar, ayarlar vb.) tek bir JSON dosyası olarak bilgisayarınıza indirin. Bu dosyayı güvenli bir yerde saklayarak verilerinizi yedekleyebilirsiniz.
          </p>
          <button
            onClick={onExportData}
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-6 rounded-lg transition shadow-md hover:shadow-cyan-500/40 flex items-center gap-2"
          >
            <Icon name="download" className="w-5 h-5" />
            Verileri İndir
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200"></div>

        {/* Import Section */}
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
            <Icon name="upload" className="w-7 h-7 text-green-600" />
            Yedekten Geri Yükle
          </h2>
           <div className="bg-amber-50 border-l-4 border-amber-500 text-amber-800 p-4 rounded-r-lg mb-4">
            <p className="font-bold">Önemli Uyarı!</p>
            <p>Bu işlem, mevcut tüm verilerinizi seçeceğiniz yedek dosyasındaki verilerle değiştirecektir. Bu işlem geri alınamaz.</p>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={handleImportClick}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition shadow-md hover:shadow-green-500/40 flex items-center gap-2"
          >
            <Icon name="upload" className="w-5 h-5" />
            Yedek Dosyası Seç ve Yükle
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200"></div>

        {/* Reset Section */}
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
            <Icon name="exclamation-triangle" className="w-7 h-7 text-rose-600" />
            Tehlikeli Alan
          </h2>
          <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-4 rounded-r-lg mb-4">
            <p className="font-bold">UYARI: GERİ ALINAMAZ İŞLEM</p>
            <p>Bu işlem, yönetici hesabı dışındaki tüm ürünleri, satışları, tanımları ve diğer verileri kalıcı olarak silecektir. Uygulamayı ilk kurduğunuzdaki haline döndürür. Sadece gerçek verilerinizi girmeye başlamadan önce deneme verilerini temizlemek için kullanın.</p>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={resetConfirmation}
              onChange={(e) => setResetConfirmation(e.target.value)}
              placeholder='Onaylamak için "SİL" yazın'
              className="h-12 border-2 border-slate-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <button
              onClick={handleReset}
              disabled={resetConfirmation !== 'SİL'}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-6 rounded-lg transition shadow-md hover:shadow-rose-500/40 disabled:bg-slate-400 disabled:cursor-not-allowed disabled:shadow-none flex items-center gap-2"
            >
              <Icon name="trash" className="w-5 h-5" />
              Tüm Verileri Sıfırla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageManagementView;