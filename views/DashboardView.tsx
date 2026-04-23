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

  const colorMap: Record<string, { bg: string; text: string; glow: string; border: string }> = {
    indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', glow: 'bg-indigo-500/20', border: 'hover:border-indigo-500/40' },
    rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', glow: 'bg-rose-500/20', border: 'hover:border-rose-500/40' },
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', glow: 'bg-cyan-500/20', border: 'hover:border-cyan-500/40' },
    orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', glow: 'bg-orange-500/20', border: 'hover:border-orange-500/40' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', glow: 'bg-emerald-500/20', border: 'hover:border-emerald-500/40' },
    violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', glow: 'bg-violet-500/20', border: 'hover:border-violet-500/40' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', glow: 'bg-amber-500/20', border: 'hover:border-amber-500/40' },
    pink: { bg: 'bg-pink-500/10', text: 'text-pink-400', glow: 'bg-pink-500/20', border: 'hover:border-pink-500/40' },
    green: { bg: 'bg-green-500/10', text: 'text-green-400', glow: 'bg-green-500/20', border: 'hover:border-green-500/40' },
    slate: { bg: 'bg-slate-500/10', text: 'text-slate-400', glow: 'bg-slate-500/20', border: 'hover:border-slate-500/40' },
    lime: { bg: 'bg-lime-500/10', text: 'text-lime-400', glow: 'bg-lime-500/20', border: 'hover:border-lime-500/40' },
    gray: { bg: 'bg-gray-500/10', text: 'text-gray-400', glow: 'bg-gray-500/20', border: 'hover:border-gray-500/40' },
    sky: { bg: 'bg-sky-500/10', text: 'text-sky-400', glow: 'bg-sky-500/20', border: 'hover:border-sky-500/40' },
    teal: { bg: 'bg-teal-500/10', text: 'text-teal-400', glow: 'bg-teal-500/20', border: 'hover:border-teal-500/40' },
  };

  const ActionCard = ({ icon, label, sub, onClick, color }: any) => {
    const c = colorMap[color] || colorMap.slate;
    return (
      <button 
          onClick={onClick}
          className={`relative group bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 ${c.border} p-4 rounded-2xl transition-all overflow-hidden text-left active:scale-[0.98] min-h-[110px] w-full flex flex-col items-start justify-between shadow-lg hover:shadow-xl`}
      >
          <div className={`absolute -right-2 -bottom-2 w-12 h-12 ${c.glow} blur-[20px] group-hover:scale-150 transition-all duration-500`}></div>
          
          <div className={`w-9 h-9 ${c.bg} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shrink-0 border border-white/5`}>
              <Icon name={icon} className={`w-5 h-5 ${c.text}`} />
          </div>
          
          <div className="flex flex-col gap-0.5 relative z-10">
              <h3 className="text-white font-black text-[12px] uppercase tracking-tight leading-[1.1] whitespace-normal break-words">
                  {label}
              </h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none whitespace-normal">
                  {sub}
              </p>
          </div>
      </button>
    );
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#020617] text-slate-300 font-sans overflow-y-auto custom-scrollbar p-8">
      
      {/* 🚀 AI ANALİZ ÇUBUĞU */}
      <div className="flex items-center gap-6 mb-8 bg-indigo-600/5 border border-white/5 p-5 rounded-3xl relative overflow-hidden group shadow-2xl backdrop-blur-sm">
         <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent"></div>
         <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-pulse shrink-0 relative z-10">
            <Icon name="ai" className="w-6 h-6 text-white" />
         </div>
         <div className="min-w-0 flex-1 px-2 relative z-10">
            <h4 className="text-[10px] font-black text-white tracking-[0.2em] uppercase mb-0.5">Yapay Zeka Destekli Durum Analizi</h4>
            <p className="text-[14px] text-slate-400 font-medium italic">"Anlık Ciro: <span className="text-indigo-400 font-bold tabular-nums">{stats.totalRev.toLocaleString('tr-TR')}₺</span>. Bugün <span className="text-white font-bold">{topBrands[0]?.[0]}</span> marka ürünlerinizde artış gözlemliyoruz."</p>
         </div>
         <button onClick={onOpenManual} className="bg-white/5 hover:bg-white/10 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative z-10 border border-white/5">Yardım Al</button>
      </div>

      <div className="grid grid-cols-12 gap-6 mb-8">
          {/* DURUM KARTLARI */}
          {[
            { label: 'GÜNLÜK CİRO', val: stats.totalRev.toLocaleString('tr-TR') + ' ₺', icon: 'new-sale', col: 'indigo' },
            { label: 'BUGÜNKÜ KÂR', val: stats.totalProfit.toLocaleString('tr-TR') + ' ₺', icon: 'finance', col: 'emerald' },
            { label: 'KRİTİK STOK', val: stats.lowStockCount + ' ADET', icon: 'exclamation-circle', col: 'rose' },
            { label: 'TOPLAM ÜRÜN', val: stats.totalItems, icon: 'database', col: 'slate' }
          ].map((stat, i) => {
            const c = colorMap[stat.col] || colorMap.slate;
            return (
              <div key={i} className="col-span-12 sm:col-span-6 lg:col-span-3 bg-[#0f172a]/50 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group hover:bg-[#0f172a]/80 transition-all">
                  <div className={`absolute -right-4 -top-4 w-24 h-24 ${c.glow} blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity`}></div>
                  <div className="relative z-10 flex justify-between items-start">
                      <div>
                          <span className="text-[10px] font-black text-slate-500 tracking-widest uppercase mb-2 block">{stat.label}</span>
                          <span className="text-3xl font-black text-white tabular-nums tracking-tighter">{stat.val}</span>
                      </div>
                      <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center ${c.text} group-hover:scale-110 transition-transform border border-white/5`}><Icon name={stat.icon as any} className="w-6 h-6" /></div>
                  </div>
              </div>
            );
          })}
      </div>

      {/* 🛠 TAM ERİŞİM MENÜSÜ */}
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

      <div className="grid grid-cols-12 gap-8 mb-10">
          {/* MARKA TRENDLERİ */}
          <div className="col-span-12 lg:col-span-8 bg-[#0f172a]/50 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
             <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-3"><Icon name="chart" className="w-5 h-5 text-indigo-500" /> EN POPÜLER MARKALARINIZ</h3>
             <div className="space-y-4">
                {topBrands.map(([brand, count], i) => (
                    <div key={brand} className="group">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[12px] font-black text-white uppercase italic group-hover:text-indigo-400 transition-colors px-1">{brand}</span>
                            <span className="text-[11px] font-black text-slate-500 tabular-nums">{count} ADET SATIŞ</span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-gradient-to-r from-indigo-600 via-cyan-500 to-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${(count / (topBrands[0]?.[1] || 1)) * 100}%` }}></div>
                        </div>
                    </div>
                ))}
             </div>
          </div>
          <div className="col-span-12 lg:col-span-4 bg-gradient-to-br from-[#0f172a] to-[#020617] p-8 rounded-[3rem] border border-white/10 flex flex-col items-center justify-center text-center shadow-2xl group hover:scale-[1.02] transition-all">
                <div className="w-16 h-16 bg-white/5 rounded-[2rem] flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform duration-500">
                    <Icon name="cog-6-tooth" className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2">Yenice Studio Pro</h3>
                <p className="text-[10px] text-slate-500 font-bold leading-relaxed px-6 mb-6">Mağaza yönetiminiz için optimize edilmiş profesyonel altyapı.</p>
                <div className="w-full border-t border-white/10 pt-6">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Versiyon {packageJson.version}</p>
                </div>
          </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6366f1; }
      `}</style>
    </div>
  );
};

export default DashboardView;