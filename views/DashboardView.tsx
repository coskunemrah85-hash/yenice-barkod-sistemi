import React, { useMemo } from 'react';
import { View, TabIcon, User, SaleRecord, Product, CompanyInfo } from '../types';
import Icon from '../components/Icon';
import packageJson from '../package.json';

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

  const topBrands = useMemo(() => {
    const brandSales: {[key: string]: number} = {};
    salesHistory.slice(-100).forEach(sale => {
        sale.items.forEach(item => {
            const brand = item.marka || 'Bilinmeyen';
            brandSales[brand] = (brandSales[brand] || 0) + item.quantity;
        });
    });
    return Object.entries(brandSales).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [salesHistory]);

  const ActionCard = ({ icon, label, sub, onClick, color }: any) => (
    <button 
        onClick={onClick}
        className={`relative group bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-${color}-500/40 p-4 rounded-2xl transition-all overflow-hidden text-left active:scale-[0.98] min-h-[110px] w-full flex flex-col items-start justify-between`}
    >
        <div className={`absolute -right-2 -bottom-2 w-12 h-12 bg-${color}-500/10 blur-[20px] group-hover:bg-${color}-500/20 transition-all`}></div>
        
        <div className={`w-9 h-9 bg-${color}-500/10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shrink-0`}>
            <Icon name={icon} className={`w-5 h-5 text-${color}-400`} />
        </div>
        
        <div className="flex flex-col gap-0.5">
            <h3 className="text-white font-black text-[12px] uppercase tracking-tight leading-[1.1] whitespace-normal break-words">
                {label}
            </h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none whitespace-normal">
                {sub}
            </p>
        </div>
    </button>
  );

  return (
    <div className="w-full h-full bg-[#020617] text-slate-300 font-sans overflow-y-auto custom-scrollbar p-8">
      
      {/* 🚀 AI ANALİZ ÇUBUĞU */}
      <div className="flex items-center gap-6 mb-8 bg-indigo-600/5 border border-indigo-500/10 p-5 rounded-3xl relative overflow-hidden group">
         <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-pulse shrink-0"><Icon name="ai" className="w-6 h-6 text-white" /></div>
         <div className="min-w-0 flex-1 px-2">
            <h4 className="text-[10px] font-black text-white tracking-[0.2em] uppercase mb-0.5">Yapay Zeka Destekli Durum Analizi</h4>
            <p className="text-[14px] text-slate-400 font-medium italic">"Anlık Ciro: {stats.totalRev.toFixed(0)}₺. Bugün {topBrands[0]?.[0]} marka ürünlerinizde artış gözlemliyoruz."</p>
         </div>
         <button onClick={onOpenManual} className="bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Yardım Al</button>
      </div>

      <div className="grid grid-cols-12 gap-6 mb-8">
          {/* DURUM KARTLARI */}
          {[
            { label: 'GÜNLÜK CİRO', val: stats.totalRev.toFixed(0) + ' ₺', icon: 'new-sale', col: 'indigo' },
            { label: 'BUGÜNKÜ KÂR', val: stats.totalProfit.toFixed(0) + ' ₺', icon: 'finance', col: 'emerald' },
            { label: 'KRİTİK STOK', val: stats.lowStockCount + ' ADET', icon: 'exclamation-circle', col: 'rose' },
            { label: 'TOPLAM ÜRÜN', val: stats.totalItems, icon: 'database', col: 'slate' }
          ].map((stat, i) => (
            <div key={i} className="col-span-12 sm:col-span-6 lg:col-span-3 bg-[#0f172a] p-6 rounded-[2.5rem] border border-white/5 shadow-xl relative overflow-hidden group">
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <span className="text-[10px] font-black text-slate-500 tracking-widest uppercase mb-2 block">{stat.label}</span>
                        <span className={`text-3xl font-black text-white tabular-nums tracking-tighter`}>{stat.val}</span>
                    </div>
                    <div className={`w-10 h-10 bg-${stat.col}-500/10 rounded-xl flex items-center justify-center text-${stat.col}-500 group-hover:scale-110 transition-transform`}><Icon name={stat.icon as any} className="w-6 h-6" /></div>
                </div>
            </div>
          ))}
      </div>

      {/* 🛠 TAM ERİŞİM MENÜSÜ (TÜRKÇE VE OKUNUR) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 mb-12">
          <ActionCard icon="new-sale" label="Satış Ekranı" sub="Hızlı Kasa" color="indigo" onClick={() => onNavigate(View.SALE, 'Satış Ekranı', 'new-sale')} />
          <ActionCard icon="back" label="İade İşlemi" sub="Ürün İadesi" color="rose" onClick={() => onNavigate(View.RETURN, 'İade Ekranı', 'back')} />
          <ActionCard icon="products" label="Stok Yönetimi" sub="Ürün Listesi" color="cyan" onClick={() => onNavigate(View.PRODUCTS, 'Stok Yönetimi', 'products')} />
          <ActionCard icon="refresh" label="Stok Sayımı" sub="Sayım Modu" color="orange" onClick={() => onNavigate(View.STOCK_COUNT, 'Stok Sayım', 'refresh')} />
          <ActionCard icon="reports" label="Muhasebe" sub="Raporlar" color="emerald" onClick={() => onNavigate(View.REPORTS, 'Raporlar', 'reports')} />
          <ActionCard icon="chart" label="Grafik Analiz" sub="İstatistik" color="violet" onClick={() => onNavigate(View.ANALYSIS, 'Analiz Paneli', 'chart')} />
          <ActionCard icon="purchase" label="Sipariş Listesi" sub="Eksik Ürünler" color="amber" onClick={() => onNavigate(View.STOCK_ORDER, 'Sipariş Listesi', 'purchase')} />
          
          <ActionCard icon="list-bullet" label="Hesap Makinesi" sub="Hızlı İşlem" color="orange" onClick={() => onNavigate(View.CALCULATOR_MENU, 'Hesap Makinesi Menüsü', 'list-bullet')} />
          <ActionCard icon="barcode" label="Etiket Basımı" sub="Baskı Merkezi" color="pink" onClick={() => onNavigate(View.SERIAL_LABEL, 'Seri Etiket Tasarımı', 'barcode')} />
          <ActionCard icon="ai" label="Yapay Zeka" sub="IA Asistanı" color="indigo" onClick={() => onNavigate(View.AI_MENU, 'Yapay Zeka', 'ai')} />
          <ActionCard icon="excel" label="Excel Dosyaları" sub="Veri Aktarımı" color="green" onClick={() => onNavigate(View.EXCEL_OPERATIONS, 'Excel İşlemleri', 'excel')} />
          <ActionCard icon="tag" label="Genel Tanımlar" sub="Sabit Veriler" color="slate" onClick={() => onNavigate(View.DEFINITIONS, 'Tanımlar', 'tag')} />
          <ActionCard icon="tag" label="Fiyat Güncelleme" sub="Toplu İşlem" color="cyan" onClick={() => onNavigate(View.BULK_PRICE_UPDATE, 'Fiyat Güncelle', 'tag')} />
          
          <ActionCard icon="purchase" label="Satın Alma" sub="Alış Faturaları" color="amber" onClick={() => onNavigate(View.PURCHASE_MENU, 'Satın Alma', 'purchase')} />
          <ActionCard icon="finance" label="Finans Yönetimi" sub="Gelir ve Gider" color="lime" onClick={() => onNavigate(View.FINANCE, 'Finans Yönetimi', 'finance')} />
          <ActionCard icon="database" label="Veri Depolama" sub="Yedekleme" color="gray" onClick={() => onNavigate(View.STORAGE_MANAGEMENT, 'Veri Yönetimi', 'database')} />
          <ActionCard icon="settings" label="Sistem Ayarları" sub="Uygulama" color="rose" onClick={() => onNavigate(View.SETTINGS, 'Ayarlar', 'settings')} />
          <ActionCard icon="users" label="Kullanıcılar" sub="Yetkilendirme" color="sky" onClick={() => onNavigate(View.USER_MANAGEMENT, 'Kullanıcı Yönetimi', 'users')} />
          <ActionCard icon="sales-management" label="Uzaktan Erişim" sub="Mobil Köprü" color="teal" onClick={() => onNavigate(View.REMOTE_ACCESS, 'Uzaktan Erişim', 'sales-management')} />
      </div>

      <div className="grid grid-cols-12 gap-8">
          {/* MARKA TRENDLERİ */}
          <div className="col-span-12 lg:col-span-8 bg-[#0f172a] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
             <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-3"><Icon name="chart" className="w-5 h-5 text-indigo-500" /> EN POPÜLER MARKALARINIZ</h3>
             <div className="space-y-4">
                {topBrands.map(([brand, count], i) => (
                    <div key={brand} className="group">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[12px] font-black text-white uppercase italic group-hover:text-indigo-400 transition-colors px-1">{brand}</span>
                            <span className="text-[11px] font-black text-slate-500">{count} ADET SATIŞ</span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-600 to-cyan-500 rounded-full transition-all duration-1000" style={{ width: `${(count / topBrands[0][1]) * 100}%` }}></div>
                        </div>
                    </div>
                ))}
             </div>
          </div>
          <div className="col-span-12 lg:col-span-4 bg-gradient-to-br from-indigo-900/40 to-slate-950 p-8 rounded-[3rem] border border-white/10 flex flex-col items-center justify-center text-center shadow-2xl">
                <Icon name="ai" className="w-12 h-12 text-indigo-500/20 mb-4" />
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2">Yenice Studio Pro</h3>
                <p className="text-[11px] font-bold text-slate-500 uppercase border-t border-white/10 pt-3">Yazılım Sürümü: {packageJson.version}</p>
          </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #020617; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6366f1; }
      `}</style>
    </div>
  );
};

export default DashboardView;