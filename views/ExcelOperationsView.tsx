import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import Icon from '../components/Icon';
import AiDataImportModal from '../components/AiDataImportModal';
import { View, TabIcon, Product, SaleRecord, PurchaseRecord } from '../types';

interface ExcelOperationsViewProps {
  onNavigate: (view: View, label: string, icon: TabIcon) => void;
  products: Product[];
  salesHistory: SaleRecord[];
  purchaseHistory: PurchaseRecord[];
}

const ExcelOperationsView: React.FC<ExcelOperationsViewProps> = ({ onNavigate, products, salesHistory, purchaseHistory }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [showAiImport, setShowAiImport] = useState(false);
  const [importSuccess, setImportSuccess] = useState<{ show: boolean; count: number }>({ show: false, count: 0 });

  const handleDownloadTemplate = () => {
    if (!XLSX) {
      alert("Excel kütüphanesi yüklenemedi. Lütfen internet bağlantınızı kontrol edin.");
      return;
    }
    const templateData = [{
      'Barkod': '8690000000001',
      'Ürün Adı': 'Örnek T-Shirt',
      'Alış Fiyatı': 150.50,
      'Satış Fiyatı': 299.99,
      'Stok': 50,
      'Stok Kodu': 'TSHRT-001',
      'Marka': 'Kendi Markam',
      'Model': 'Yazlık',
      'Renk': 'Beyaz',
      'Beden': 'M',
      'Grup': 'Giyim',
      'Ara Grup': 'Üst Giyim',
      'Alt Grup': 'Kısa Kollu'
    }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ürün Şablonu");
    XLSX.writeFile(wb, "urun_sablonu.xlsx");
  };

  const handleExportStock = () => {
    const data = products.map(p => ({
      'Barkod': p.barcode,
      'Ürün Adı': p.name,
      'Stok': p.stock,
      'Alış Fiyatı': p.buyPrice,
      'Satış Fiyatı': p.price,
      'Stok Kodu': p.stokKodu,
      'Ana Stok Kodu': p.anaStokKodu,
      'Marka': p.marka,
      'Model': p.model,
      'Renk': p.renk,
      'Beden': p.beden,
      'Grup': p.group,
      'Ara Grup': p.midGroup,
      'Alt Grup': p.subGroup,
      'Durum': p.isActivated ? 'Aktif' : 'Pasif'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stok Listesi");
    XLSX.writeFile(wb, `stok_listesi_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportSales = () => {
    const data = salesHistory.flatMap(sale => 
      sale.items.map(item => ({
        'Satış Tarihi': new Date(sale.date).toLocaleString('tr-TR'),
        'İşlem No': sale.id,
        'Ödeme Yöntemi': sale.paymentMethod,
        'Müşteri ID': sale.customerId || 'Genel Müşteri',
        'Barkod': item.barcode,
        'Ürün Adı': item.name,
        'Satılan Miktar': item.quantity,
        'Birim Fiyat': item.price,
        'Toplam Tutar': item.price * item.quantity
      }))
    );
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Satış Raporu");
    XLSX.writeFile(wb, `satis_raporu_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPurchases = () => {
    const data = purchaseHistory.flatMap(purchase => 
      purchase.items.map(item => ({
        'Alış Tarihi': new Date(purchase.date).toLocaleString('tr-TR'),
        'Fatura/İşlem No': purchase.id,
        'Tedarikçi ID': purchase.supplierId,
        'Barkod': item.barcode,
        'Ürün Adı': item.name,
        'Alınan Miktar': item.quantity,
        'Birim Alış Fiyatı': item.buyPrice,
        'Toplam Tutar': item.buyPrice * item.quantity
      }))
    );
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Alış Raporu");
    XLSX.writeFile(wb, `alis_raporu_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const executeExport = async (exportFn: () => void) => {
    setIsExporting(true);
    try {
      if (!XLSX) {
        alert("Excel kütüphanesi yüklenemedi. Lütfen internet bağlantınızı kontrol edin.");
        return;
      }
      exportFn();
    } catch (error) {
      console.error("Excel dışa aktarma hatası:", error);
      alert("Dışa aktarma sırasında bir hata oluştu.");
    } finally {
      setIsExporting(false);
    }
  };

  const excelFeatures = [
    {
      id: 'ai-data-import',
      title: 'AI Asistanlı Veri Aktarım',
      description: 'Başka bir sistemden Excel\'le dışa aktardığınız tüm ürün ve tedarikçi verilerini AI ile otomatik sisteme aktarın.',
      icon: 'ai' as TabIcon,
      action: () => setShowAiImport(true),
      badge: 'ÖNERİLİ',
      color: 'bg-purple-600/20 text-purple-400'
    },
    {
      id: 'product-export',
      title: 'Stok Listesi İndir',
      description: 'Mevcut tüm stoklarınızı, fiyatlarını ve detaylarını Excel formatında indirin.',
      icon: 'download' as TabIcon,
      action: () => executeExport(handleExportStock),
      color: 'bg-emerald-600/20 text-emerald-400'
    },
    {
      id: 'sales-export',
      title: 'Satış Raporu İndir',
      description: 'Tüm geçmiş satış verilerini muhasebe veya analiz için Excel\'e aktarın.',
      icon: 'reports' as TabIcon,
      action: () => executeExport(handleExportSales),
      color: 'bg-indigo-600/20 text-indigo-400'
    },
    {
      id: 'purchase-export',
      title: 'Alış Raporu İndir',
      description: 'Tüm geçmiş alış faturalarınızı ve detaylarını Excel formatında indirin.',
      icon: 'database' as TabIcon,
      action: () => executeExport(handleExportPurchases),
      color: 'bg-rose-600/20 text-rose-400'
    }
  ];

  return (
    <div className="w-full h-full bg-[#020617] p-10 overflow-y-auto custom-scrollbar transform-gpu">
      <div className="w-full space-y-12">
        
        {/* 📑 HEADER */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-10 px-4 animate-fade-in-down">
          <div className="flex items-center gap-8">
            <div className="w-20 h-20 bg-emerald-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-emerald-600/30">
              <Icon name="excel" className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-5xl font-black text-white tracking-tighter uppercase underline decoration-emerald-500 decoration-8 underline-offset-8">EXCEL <span className="text-emerald-400">OPERASYONLARI</span></h1>
              <p className="text-xs text-white/50 font-bold uppercase tracking-[0.6em] mt-8 ml-1">Toplu Veri Yönetimi & Raporlama Merkezi</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 px-4">
          {excelFeatures.map((feature) => (
            <div 
              key={feature.id}
              className={`bg-white/5 backdrop-blur-3xl border border-white/10 p-12 rounded-[4rem] shadow-2xl hover:bg-white/[0.08] transition-all duration-300 cursor-pointer group relative overflow-hidden will-change-transform transform-gpu ${
                feature.badge === 'ÖNERİLİ' ? 'border-purple-500/50' : 'hover:border-emerald-500/50'
              }`}
              onClick={feature.action}
            >
              {feature.badge && (
                <div className={`absolute top-8 right-8 text-[10px] font-black px-4 py-2 rounded-full flex items-center gap-2 tracking-[0.2em] uppercase z-10 ${
                  feature.badge === 'ÖNERİLİ' ? 'bg-purple-600 text-white shadow-xl shadow-purple-600/20' : 'bg-emerald-600 text-white shadow-xl shadow-emerald-600/20'
                }`}>
                  <Icon name={feature.badge === 'ÖNERİLİ' ? 'star' : 'ai'} className="w-3 h-3" />
                  {feature.badge}
                </div>
              )}

              <div className="absolute top-0 right-0 p-8 opacity-[0.03] -mr-12 -mt-12 group-hover:opacity-[0.08] transition-opacity">
                 <Icon name={feature.icon} className="w-48 h-48" />
              </div>

              <div className="flex items-start gap-8 relative z-10">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg ${feature.color} group-hover:scale-110 transition-transform duration-300`}>
                  <Icon name={feature.icon} className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white uppercase tracking-tight mb-4">{feature.title}</h3>
                  <p className="text-white/40 font-bold leading-relaxed mb-10 uppercase tracking-widest text-[11px]">
                    {feature.description}
                  </p>
                  <div className={`flex items-center font-black uppercase tracking-[0.3em] text-[10px] group-hover:translate-x-4 transition-transform ${feature.id === 'ai-data-import' ? 'text-purple-400' : 'text-emerald-400'}`}>
                    {feature.id === 'ai-data-import' ? 'AI SİHİRBAZINI BAŞLAT' : 'DOSYAYI OLUŞTUR'} <Icon name="back" className="w-5 h-5 ml-4 rotate-180" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 px-4">
          <section className="lg:col-span-2 bg-white/5 backdrop-blur-3xl border border-white/10 p-16 rounded-[5rem] shadow-2xl relative overflow-hidden">
            <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-12 flex items-center gap-6">
              <Icon name="settings" className="w-8 h-8 text-white/20" />
              Sistem Şablonları & Ayarlar
            </h2>
            
            <div className="space-y-8">
              <div className="p-10 bg-white/[0.03] rounded-[3rem] border border-white/5 flex items-center justify-between group hover:bg-white/5 transition-all">
                <div>
                  <h4 className="text-xl font-black text-white uppercase tracking-tight">Standart Excel Şablonu</h4>
                  <p className="text-[11px] text-white/30 font-bold uppercase tracking-widest mt-2">Hızlı ürün girişi için optimize edilmiş şablon.</p>
                </div>
                <button 
                  onClick={handleDownloadTemplate} 
                  disabled={isExporting}
                  className="flex items-center gap-4 bg-emerald-600 text-white h-16 px-10 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-500 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Icon name="download" className="w-6 h-6" /> ŞABLONU İNDİR
                </button>
              </div>

              <div className="p-10 bg-white/[0.03] rounded-[3rem] border border-white/5 flex items-center justify-between">
                <div>
                  <h4 className="text-xl font-black text-white uppercase tracking-tight">AI Akıllı Eşleştirme</h4>
                  <p className="text-[11px] text-white/30 font-bold uppercase tracking-widest mt-2">Sütun başlıklarını (Fiyat, Stok vb.) otomatik tanır.</p>
                </div>
                <div className="w-16 h-8 bg-emerald-600 rounded-full relative shadow-inner border-4 border-emerald-900/50">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-lg"></div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-gradient-to-br from-cyan-600 to-blue-700 p-16 rounded-[5rem] shadow-2xl text-white relative overflow-hidden group">
            <div className="absolute -right-16 -bottom-16 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <Icon name="ai" className="w-72 h-72" />
            </div>
            <h2 className="text-4xl font-black mb-8 tracking-tighter uppercase relative z-10 leading-none">Yapay Zeka İpucu</h2>
            <p className="text-cyan-50 font-bold text-sm uppercase tracking-widest leading-relaxed mb-12 relative z-10 opacity-70">
              Excel dosyalarınızdaki başlıklar sistemle birebir aynı olmasa bile AI bunları anlayabilir. "Miktar" veya "Adet" başlıklarını "Stok" olarak otomatik eşler.
            </p>
            <button 
              onClick={() => onNavigate(View.AI_SETTINGS, 'AI Ayarları', 'settings')}
              className="w-full bg-white text-cyan-700 h-20 rounded-3xl font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-2xl relative z-10"
            >
              AI SİSTEMİNİ YÖNET
            </button>
          </section>
        </div>

        {/* Success Notification */}
        {importSuccess.show && (
          <div className="fixed bottom-12 right-12 bg-emerald-600 text-white p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(16,185,129,0.3)] border border-emerald-400/50 flex items-center gap-6 z-50 animate-fade-in-up">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Icon name="check" className="w-7 h-7" />
            </div>
            <div>
              <p className="font-black text-xl tracking-tight uppercase">Veri Aktarımı Tamamlandı!</p>
              <p className="text-emerald-100/70 text-xs font-black uppercase tracking-widest mt-1">{importSuccess.count} Ürün Başarıyla Sisteme Aktarıldı.</p>
            </div>
          </div>
        )}
      </div>

      {/* AI Data Import Modal Placeholder logic would go here if I were editing the modal too */}
      {showAiImport && (
        <AiDataImportModal
          onClose={() => setShowAiImport(false)}
          onSuccess={(count) => {
            setImportSuccess({ show: true, count });
            setTimeout(() => {
              setImportSuccess({ show: false, count: 0 });
            }, 5000);
          }}
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 20px; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-down { animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeInUpSmall { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fadeInUpSmall 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default ExcelOperationsView;
