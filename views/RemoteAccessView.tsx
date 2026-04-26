import React, { useMemo, useState } from 'react';
import { Product, SaleRecord, SaleItem, View, TabIcon, Supplier } from '../types';
import Icon from '../components/Icon';

interface RemoteAccessViewProps {
  salesHistory: SaleRecord[];
  products: Product[];
  suspendedSales: SaleItem[][];
  onNavigate: (view: View, label: string, icon: TabIcon) => void;
  suppliers: Supplier[];
  localIps: string[];
  hostname: string;
}

const RemoteAccessView: React.FC<RemoteAccessViewProps> = ({ salesHistory, products, suspendedSales, onNavigate, suppliers, localIps, hostname }) => {
  const [selectedIp, setSelectedIp] = useState(localIps[0] || 'localhost');
  const [useHostname, setUseHostname] = useState(false);
  
  const port = window.location.port || '14532';
  const remoteUrl = `http://${useHostname ? hostname : selectedIp}:${port}`;

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaySales = salesHistory.filter(s => s.date.split('T')[0] === today);
    const totalRev = todaySales.reduce((acc, s) => acc + s.total, 0);
    const lowStock = products.filter(p => !p.isDeleted && p.stock <= 5).length;
    return { totalRev, salesCount: todaySales.length, lowStock };
  }, [salesHistory, products]);

  return (
    <div className="w-full h-full bg-[#020617] text-slate-300 font-sans overflow-y-auto custom-scrollbar p-8">
      
      {/* 🌌 HEADER */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="relative">
            <div className="absolute -left-4 top-0 w-1 h-12 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-1 underline decoration-indigo-500/30 decoration-4 underline-offset-8">STUDIO <span className="text-indigo-400">HUB</span></h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Merkezi Yönetim & Mobil Erişim Üssü</p>
        </div>
        <div className="flex items-center gap-6 bg-white/[0.03] border border-white/5 p-4 rounded-[2rem] backdrop-blur-3xl">
            <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Sistem Çevrimiçi</span>
            </div>
            <div className="h-8 w-px bg-white/10"></div>
            <div className="flex items-center gap-3">
                <Icon name="ai" className="w-5 h-5 text-indigo-400 animate-spin-slow" />
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">AI Sync Aktif</span>
            </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8">
        
        {/* LEFT: MONITORING & TOOLS */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
            
            {/* REAL-TIME PULSE */}
            <div className="grid grid-cols-3 gap-6">
                {[
                    { label: 'GÜNLÜK AKIŞ', val: stats.totalRev.toFixed(0) + '₺', icon: 'finance', col: 'indigo' },
                    { label: 'AKTİF SATIŞLAR', val: stats.salesCount, icon: 'new-sale', col: 'cyan' },
                    { label: 'KRİTİK STOK', val: stats.lowStock, icon: 'exclamation-circle', col: 'rose' }
                ].map((s, i) => (
                    <div key={i} className="bg-[#0f172a] p-6 rounded-[2.5rem] border border-white/5 group hover:border-indigo-500/30 transition-all">
                        <div className={`w-10 h-10 bg-${s.col}-500/10 rounded-xl flex items-center justify-center mb-4 text-${s.col}-400 group-hover:scale-110 transition-transform`}>
                            <Icon name={s.icon as any} className="w-5 h-5" />
                        </div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
                        <h3 className="text-2xl font-black text-white tabular-nums">{s.val}</h3>
                    </div>
                ))}
            </div>

            {/* QUICK ACTIONS TABLE */}
            <div className="bg-[#0f172a] p-10 rounded-[3rem] border border-white/5 shadow-2xl">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-10 flex items-center gap-3">
                    <Icon name="list-bullet" className="w-5 h-5 text-indigo-500" /> HIZLI YÖNETİM ARAÇLARI
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => onNavigate(View.REPORTS, 'Raporlar', 'reports')} className="flex items-center gap-4 p-6 bg-white/[0.02] border border-white/5 rounded-3xl hover:bg-white/[0.05] transition-all group text-left">
                        <div className="w-12 h-12 bg-emerald-600/10 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
                            <Icon name="reports" className="w-6 h-6 text-emerald-400 group-hover:text-white" />
                        </div>
                        <div>
                            <h4 className="text-[11px] font-black text-white uppercase tracking-tight">X-Raporu Al</h4>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Anlık Kasa Özeti</p>
                        </div>
                    </button>
                    <button onClick={() => onNavigate(View.SETTINGS, 'Ayarlar', 'settings')} className="flex items-center gap-4 p-6 bg-white/[0.02] border border-white/5 rounded-3xl hover:bg-white/[0.05] transition-all group text-left">
                        <div className="w-12 h-12 bg-purple-600/10 rounded-2xl flex items-center justify-center group-hover:bg-purple-600 transition-colors">
                            <Icon name="settings" className="w-6 h-6 text-purple-400 group-hover:text-white" />
                        </div>
                        <div>
                            <h4 className="text-[11px] font-black text-white uppercase tracking-tight">Uygulama Ayarları</h4>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Sistem Konfigürasyonu</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* TROUBLESHOOTING NOTICE */}
            <div className="bg-rose-500/10 border border-rose-500/20 p-8 rounded-[3rem] flex gap-6 items-start">
                <div className="w-12 h-12 bg-rose-500/20 rounded-2xl flex items-center justify-center shrink-0">
                    <Icon name="exclamation-circle" className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                    <h4 className="text-[11px] font-black text-rose-400 uppercase tracking-widest mb-2">Bağlantı Sorunu mu Yaşıyorsunuz?</h4>
                    <ul className="text-[10px] text-slate-400 space-y-2 font-bold uppercase">
                        <li>• iPhone kullanıyorsanız <b>{hostname}</b> seçeneğini deneyin.</li>
                        <li>• Bilgisayarınızda <b>Windows Güvenlik Duvarı</b>'nın port <b>{port}</b> için izin verdiğinden emin olun.</li>
                        <li>• Telefon ve Bilgisayarın <b>AYNI WI-FI</b> ağına bağlı olduğunu kontrol edin.</li>
                    </ul>
                </div>
            </div>
        </div>

        {/* RIGHT: MOBILE TERMINAL PAIRING */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-10 rounded-[3.5rem] shadow-[0_20px_50px_rgba(99,102,241,0.2)] text-white relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 blur-[60px] rounded-full group-hover:bg-white/20 transition-all"></div>
                
                <h2 className="text-2xl font-black mb-2 flex items-center gap-3">
                    <Icon name="barcode" className="w-8 h-8" /> MOBİL KÖPRÜ
                </h2>
                <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-8">Erişim Adresini Seçin</p>

                {/* ADDRESS SELECTOR */}
                <div className="flex flex-col gap-3 mb-8">
                    {localIps.map(ip => (
                        <button 
                            key={ip}
                            onClick={() => { setSelectedIp(ip); setUseHostname(false); }}
                            className={`p-4 rounded-2xl border text-left transition-all ${!useHostname && selectedIp === ip ? 'bg-white text-indigo-600 border-white' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                        >
                            <p className="text-[9px] font-black opacity-50 uppercase tracking-widest mb-0.5">Yerel IP Adresi</p>
                            <p className="text-sm font-black tracking-tight">{ip}:{port}</p>
                        </button>
                    ))}
                    {hostname && (
                        <button 
                            onClick={() => setUseHostname(true)}
                            className={`p-4 rounded-2xl border text-left transition-all ${useHostname ? 'bg-white text-indigo-600 border-white' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                        >
                            <p className="text-[9px] font-black opacity-50 uppercase tracking-widest mb-0.5">iPhone / Mac için (mDNS)</p>
                            <p className="text-sm font-black tracking-tight">{hostname}:{port}</p>
                        </button>
                    )}
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] flex flex-col items-center justify-center mb-8 shadow-inner border-4 border-indigo-500/30">
                    <div className="relative group/qr">
                        <div className="w-56 h-56 bg-white rounded-3xl flex items-center justify-center relative overflow-hidden p-4 shadow-xl">
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(remoteUrl)}`} 
                                alt="Remote Access QR"
                                className="w-full h-full object-contain"
                            />
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500"></div>
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500"></div>
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500"></div>
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500"></div>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={() => {
                        navigator.clipboard.writeText(remoteUrl);
                        alert("Erişim bağlantısı kopyalandı!");
                    }}
                    className="w-full bg-white text-indigo-700 h-14 rounded-2xl flex items-center justify-center gap-4 text-xs font-black uppercase tracking-[0.2em] hover:bg-slate-100 transition-all active:scale-95"
                >
                    <Icon name="back" className="w-5 h-5 rotate-180" /> BAĞLANTIYI KOPYALA
                </button>
            </div>
        </div>
      </div>

      <style>{`
        .animate-spin-slow { animation: spin 8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #020617; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 20px; }
      `}</style>
    </div>
  );
};

export default RemoteAccessView;