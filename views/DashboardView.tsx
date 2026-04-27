import React, { useMemo } from 'react';
import { View, TabIcon, User, SaleRecord, Product, CompanyInfo } from '../types';
import Icon from '../components/Icon';

interface DashboardViewProps {
  onNavigate: (view: View, label: string, icon: TabIcon) => void;
  onOpenManual: () => void;
  currentUser: User;
  salesHistory: SaleRecord[];
  products: Product[];
  companyInfo: CompanyInfo;
}

const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onOpenManual, currentUser, salesHistory, products, companyInfo }) => {
  
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = salesHistory.filter(s => s.date.split('T')[0] === today);
    const totalRev = todaySales.reduce((acc, s) => acc + s.total, 0);
    const totalProfit = todaySales.reduce((acc, s) => {
        const saleProfit = s.items.reduce((itemAcc, item) => {
            const prod = products.find(p => p.barcode === item.barcode);
            const buyPrice = prod?.buyPrice || 0;
            return itemAcc + (item.price - buyPrice) * item.quantity;
        }, 0);
        return acc + saleProfit;
    }, 0);
    const lowStockCount = products.filter(p => !p.isDeleted && p.stock < 5).length;
    const totalItems = products.filter(p => !p.isDeleted).length;
    return { totalRev, totalProfit, lowStockCount, todaySalesCount: todaySales.length, totalItems };
  }, [salesHistory, products]);

  const iconMap3D: Record<string, string> = {
    'new-sale': '/icons/3d/cash_register_3d_1777199414512.png',
    'back': '/icons/3d/return_icon_3d_1777198783628.png',
    'products': '/icons/3d/warehouse_shelves_3d_1777199427980.png',
    'refresh': '/icons/3d/inventory_icon_3d_1777198691099.png',
    'reports': '/icons/3d/calculator_ledger_3d_1777199459534.png',
    'chart': '/icons/3d/chart_3d_line_1777199525182.png',
    'ai': '/icons/3d/ai_icon_3d_1777198741680.png',
    'excel': '/icons/3d/excel_icon_3d_1777198755547.png',
    'settings': '/icons/3d/settings_tools_3d_1777199511878.png',
    'users': '/icons/3d/users_icon_3d_1777198769472.png',
    'finance': '/icons/3d/bank_vault_3d_1777199499250.png',
    'purchase': '/icons/3d/sales_icon_3d_1777198670960.png',
    'order-list': '/icons/3d/inventory_icon_3d_1777198691099.png',
    'barcode': '/icons/3d/barcode_printer_3d_1777199444369.png',
    'price-tag': '/icons/3d/price_tag_3d_1777199474458.png',
    'definitions': '/icons/3d/settings_icon_3d_1777198720041.png',
    'list-bullet': '/icons/3d/calculator_ledger_3d_1777199459534.png',
    'database': '/icons/3d/finance_icon_3d_1777198797048.png',
    'sales-management': '/icons/3d/reports_icon_3d_1777198704067.png'
  };

  const ActionCard = ({ icon, label, sub, onClick, color }: any) => {
    const iconSrc = iconMap3D[icon] || iconMap3D['settings'];
    return (
      <button 
          onClick={onClick}
          className={`relative group bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 p-2 rounded-xl overflow-hidden text-center active:scale-[0.95] min-h-[75px] w-full flex flex-col items-center justify-center shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-100 ease-out will-change-transform transform-gpu`}
      >
          <div className="w-6 h-6 mb-1 group-hover:scale-105 flex items-center justify-center transition-transform duration-100 will-change-transform">
              <img src={iconSrc} alt={label} className="w-full h-full object-contain drop-shadow-2xl" />
          </div>
          
          <div className="flex flex-col gap-0 relative z-10">
              <h3 className="text-white font-black text-[8px] uppercase tracking-tight leading-tight">
                  {label}
              </h3>
              <p className="text-[6.5px] text-white/30 font-bold uppercase tracking-widest leading-none mt-0.5">
                  {sub}
              </p>
          </div>
      </button>
    );
  };

  return (
    <div className="w-full h-full bg-[#020617] text-white font-sans overflow-y-auto custom-scrollbar p-6 flex flex-col gap-4 transform-gpu" style={{ transform: 'translateZ(0)' }}>
      
      <div className="grid grid-cols-12 gap-6 mb-2">
          {[
            { label: 'GÜNLÜK CİRO', val: stats.totalRev.toLocaleString('tr-TR') + ' ₺', icon: 'new-sale' },
            { label: 'BUGÜNKÜ KÂR', val: stats.totalProfit.toLocaleString('tr-TR') + ' ₺', icon: 'finance' },
            { label: 'KRİTİK STOK', val: stats.lowStockCount + ' ADET', icon: 'products' },
            { label: 'TOPLAM ÜRÜN', val: stats.totalItems, icon: 'chart' }
          ].map((stat, i) => {
            const iconSrc = iconMap3D[stat.icon] || iconMap3D['settings'];
            return (
              <div key={i} className="col-span-12 sm:col-span-6 lg:col-span-3 bg-white/10 backdrop-blur-xl p-3 rounded-xl border border-white/10 shadow-md relative overflow-hidden group hover:bg-white/15 transition-all duration-150">
                  <div className="relative z-10 flex justify-between items-center">
                      <div>
                          <span className="text-[7.5px] font-black text-white/40 tracking-widest uppercase mb-0.5 block">{stat.label}</span>
                          <span className="text-lg font-black text-white tabular-nums tracking-tighter">{stat.val}</span>
                      </div>
                      <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center p-1 group-hover:scale-110 transition-transform duration-150">
                          <img src={iconSrc} className="w-full h-full object-contain" />
                      </div>
                  </div>
              </div>
            );
          })}
      </div>

      <div className="flex items-center justify-between px-2">
          <h2 className="text-[11px] font-black text-white/30 uppercase tracking-[0.4em]">Komuta Merkezi</h2>
          <div className="h-px flex-1 bg-white/10 mx-8"></div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-5 pb-12">
          <ActionCard icon="new-sale" label="Satış Ekranı" sub="Hızlı Kasa" color="indigo" onClick={() => onNavigate(View.SALE, 'Satış Ekranı', 'new-sale')} />
          <ActionCard icon="back" label="İade İşlemi" sub="Ürün İadesi" color="rose" onClick={() => onNavigate(View.RETURN, 'İade Ekranı', 'back')} />
          <ActionCard icon="products" label="Stok Yönetimi" sub="Ürün Listesi" color="cyan" onClick={() => onNavigate(View.PRODUCTS, 'Stok Yönetimi', 'products')} />
          <ActionCard icon="refresh" label="Stok Sayımı" sub="Sayım Modu" color="orange" onClick={() => onNavigate(View.STOCK_COUNT, 'Stok Sayım', 'refresh')} />
          <ActionCard icon="reports" label="Raporlar" sub="Muhasebe" color="emerald" onClick={() => onNavigate(View.REPORTS, 'Raporlar', 'reports')} />
          <ActionCard icon="chart" label="Grafik Analiz" sub="İstatistik" color="violet" onClick={() => onNavigate(View.ANALYSIS, 'Analiz Paneli', 'chart')} />
          <ActionCard icon="order-list" label="Sipariş Listesi" sub="Eksik Ürünler" color="amber" onClick={() => onNavigate(View.STOCK_ORDER, 'Sipariş Listesi', 'purchase')} />
          <ActionCard icon="list-bullet" label="Hesap Makinesi" sub="Hızlı İşlem" color="orange" onClick={() => onNavigate(View.CALCULATOR_MENU, 'Hesap Makinesi Menüsü', 'list-bullet')} />
          <ActionCard icon="barcode" label="Etiket Basımı" sub="Baskı Merkezi" color="pink" onClick={() => onNavigate(View.SERIAL_LABEL, 'Seri Etiket Tasarımı', 'barcode')} />
          <ActionCard icon="ai" label="Yapay Zeka" sub="IA Asistanı" color="indigo" onClick={() => onNavigate(View.AI_MENU, 'Yapay Zeka', 'ai')} />
          <ActionCard icon="excel" label="Excel Dosyaları" sub="Veri Aktarımı" color="green" onClick={() => onNavigate(View.EXCEL_OPERATIONS, 'Excel İşlemleri', 'excel')} />
          <ActionCard icon="definitions" label="Genel Tanımlar" sub="Sabit Veriler" color="slate" onClick={() => onNavigate(View.DEFINITIONS, 'Tanımlar', 'tag')} />
          <ActionCard icon="price-tag" label="Fiyat Güncelleme" sub="Toplu İşlem" color="cyan" onClick={() => onNavigate(View.BULK_PRICE_UPDATE, 'Fiyat Güncelle', 'tag')} />
          <ActionCard icon="purchase" label="Satın Alma" sub="Alış Faturaları" color="amber" onClick={() => onNavigate(View.PURCHASE_MENU, 'Satın Alma', 'purchase')} />
          <ActionCard icon="finance" label="Finans Yönetimi" sub="Gelir ve Gider" color="lime" onClick={() => onNavigate(View.FINANCE, 'Finans Yönetimi', 'finance')} />
          <ActionCard icon="database" label="Veri Depolama" sub="Yedekleme" color="gray" onClick={() => onNavigate(View.STORAGE_MANAGEMENT, 'Veri Yönetimi', 'database')} />
          <ActionCard icon="settings" label="Sistem Ayarları" sub="Uygulama" color="rose" onClick={() => onNavigate(View.SETTINGS, 'Ayarlar', 'settings')} />
          <ActionCard icon="users" label="Kullanıcılar" sub="Yetkilendirme" color="sky" onClick={() => onNavigate(View.USER_MANAGEMENT, 'Kullanıcı Yönetimi', 'users')} />
          <ActionCard icon="users" label="Cari Yönetimi" sub="Müşteri & Tedarikçi" color="sky" onClick={() => onNavigate(View.CARI_MANAGEMENT, 'Cari Yönetimi', 'users')} />
          <ActionCard icon="reports" label="E-Dönüşüm" sub="E-Fatura & Arşiv" color="indigo" onClick={() => onNavigate(View.E_DONUSUM, 'E-Dönüşüm Portalı', 'reports')} />
          <ActionCard icon="sales-management" label="Uzaktan Erişim" sub="Mobil Köprü" color="teal" onClick={() => onNavigate(View.REMOTE_ACCESS, 'Uzaktan Erişim', 'sales-management')} />
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 20px; }
      `}</style>
    </div>
  );
};

export default DashboardView;