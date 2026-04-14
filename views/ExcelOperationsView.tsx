import React, { useState } from 'react';
import Icon from '../components/Icon';
import { View, TabIcon, Product, SaleRecord, PurchaseRecord } from '../types';

interface ExcelOperationsViewProps {
  onNavigate: (view: View, label: string, icon: TabIcon) => void;
  products: Product[];
  salesHistory: SaleRecord[];
  purchaseHistory: PurchaseRecord[];
}

const ExcelOperationsView: React.FC<ExcelOperationsViewProps> = ({ onNavigate, products, salesHistory, purchaseHistory }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadTemplate = () => {
    if (!(window as any).XLSX) {
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
    const ws = (window as any).XLSX.utils.json_to_sheet(templateData);
    const wb = (window as any).XLSX.utils.book_new();
    (window as any).XLSX.utils.book_append_sheet(wb, ws, "Ürün Şablonu");
    (window as any).XLSX.writeFile(wb, "urun_sablonu.xlsx");
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
    const ws = (window as any).XLSX.utils.json_to_sheet(data);
    const wb = (window as any).XLSX.utils.book_new();
    (window as any).XLSX.utils.book_append_sheet(wb, ws, "Stok Listesi");
    (window as any).XLSX.writeFile(wb, `stok_listesi_${new Date().toISOString().split('T')[0]}.xlsx`);
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
    const ws = (window as any).XLSX.utils.json_to_sheet(data);
    const wb = (window as any).XLSX.utils.book_new();
    (window as any).XLSX.utils.book_append_sheet(wb, ws, "Satış Raporu");
    (window as any).XLSX.writeFile(wb, `satis_raporu_${new Date().toISOString().split('T')[0]}.xlsx`);
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
    const ws = (window as any).XLSX.utils.json_to_sheet(data);
    const wb = (window as any).XLSX.utils.book_new();
    (window as any).XLSX.utils.book_append_sheet(wb, ws, "Alış Raporu");
    (window as any).XLSX.writeFile(wb, `alis_raporu_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const executeExport = async (exportFn: () => void) => {
    setIsExporting(true);
    try {
      if (!(window as any).XLSX) {
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
      id: 'product-import',
      title: 'Ürün İçe Aktar (Excel)',
      description: 'Excel dosyasındaki ürünleri sisteme toplu olarak ekleyin. Yapay zeka desteği ile sütunları otomatik eşleştirir.',
      icon: 'upload' as TabIcon,
      action: () => onNavigate(View.PRODUCTS, 'Stok Yönetimi', 'products'),
      badge: 'AI Destekli'
    },
    {
      id: 'purchase-import',
      title: 'Alış Faturası İçe Aktar',
      description: 'Tedarikçiden gelen Excel faturalarını tarayarak otomatik alış kaydı ve stok güncellemesi yapın.',
      icon: 'purchase' as TabIcon,
      action: () => onNavigate(View.PURCHASE, 'Satın Alma', 'purchase'),
      badge: 'AI Destekli'
    },
    {
      id: 'product-export',
      title: 'Stok Listesi Dışa Aktar',
      description: 'Mevcut tüm stoklarınızı, fiyatlarını ve detaylarını Excel formatında indirin.',
      icon: 'download' as TabIcon,
      action: () => executeExport(handleExportStock)
    },
    {
      id: 'sales-export',
      title: 'Satış Raporu Dışa Aktar',
      description: 'Tüm geçmiş satış verilerini muhasebe veya analiz için Excel\'e aktarın.',
      icon: 'reports' as TabIcon,
      action: () => executeExport(handleExportSales)
    },
    {
      id: 'purchase-export',
      title: 'Alış Raporu Dışa Aktar',
      description: 'Tüm geçmiş alış faturalarınızı ve detaylarını Excel formatında indirin.',
      icon: 'database' as TabIcon,
      action: () => executeExport(handleExportPurchases)
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-4 bg-green-100 text-green-600 rounded-2xl shadow-sm">
              <Icon name="excel" className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Excel İşlemleri Merkezi</h1>
              <p className="text-slate-500 text-lg">
                Verilerinizi toplu yönetin, Excel dosyalarınızı yapay zeka ile saniyeler içinde işleyin.
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {excelFeatures.map((feature) => (
            <div 
              key={feature.id}
              className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:border-green-300 hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden"
              onClick={feature.action}
            >
              {feature.badge && (
                <div className="absolute top-4 right-4 bg-cyan-100 text-cyan-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <Icon name="ai" className="w-3 h-3" />
                  {feature.badge}
                </div>
              )}
              <div className="flex items-start gap-6">
                <div className="p-4 bg-slate-100 text-slate-600 rounded-2xl group-hover:bg-green-50 group-hover:text-green-600 transition-colors">
                  <Icon name={feature.icon} className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-3">{feature.title}</h3>
                  <p className="text-slate-500 leading-relaxed text-base mb-6">
                    {feature.description}
                  </p>
                  <div className="flex items-center text-green-600 font-bold group-hover:translate-x-2 transition-transform">
                    İşlemi Başlat <Icon name="back" className="w-5 h-5 ml-2 rotate-180" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-8 flex items-center gap-3">
              <Icon name="settings" className="w-7 h-7 text-slate-400" />
              Excel Ayarları ve Şablonlar
            </h2>
            
            <div className="space-y-6">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-lg">Standart Excel Şablonu</h4>
                  <p className="text-slate-500">Ürünlerinizi manuel eklemek için boş şablonu indirin.</p>
                </div>
            <button 
              onClick={handleDownloadTemplate} 
              disabled={isExporting}
              className="flex items-center gap-2 bg-white border border-slate-200 px-5 py-2.5 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-sm disabled:opacity-50"
            >
                  <Icon name="download" className="w-5 h-5" />
                  Şablonu İndir
                </button>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-slate-800 text-lg">AI Sütun Eşleştirme</h4>
                  <div className="w-12 h-6 bg-green-500 rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                  </div>
                </div>
                <p className="text-slate-500 text-sm">
                  Farklı formatlardaki Excel dosyalarını yüklediğinizde, yapay zeka sütun başlıklarını (Fiyat, Stok, Barkod vb.) otomatik olarak sistemle eşleştirir.
                </p>
              </div>
            </div>
          </section>

          <section className="bg-cyan-600 p-8 rounded-3xl shadow-lg text-white relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 opacity-10">
              <Icon name="ai" className="w-48 h-48" />
            </div>
            <h2 className="text-2xl font-bold mb-4 relative z-10">Yapay Zeka İpucu</h2>
            <p className="text-cyan-50 leading-relaxed mb-8 relative z-10">
              Excel dosyalarınızdaki başlıklar sistemle birebir aynı olmasa bile AI bunları anlayabilir. Örneğin; "Miktar", "Adet", "Stok" başlıklarının hepsini sistemdeki "Stock" alanına otomatik yönlendirir.
            </p>
            <button 
              onClick={() => onNavigate(View.AI_SETTINGS, 'Yapay Zeka', 'ai')}
              className="w-full bg-white text-cyan-700 font-bold py-4 rounded-2xl hover:bg-cyan-50 transition-colors shadow-md relative z-10"
            >
              AI Ayarlarını Yönet
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ExcelOperationsView;
