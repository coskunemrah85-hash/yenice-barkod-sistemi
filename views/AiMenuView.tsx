import React, { useState, useEffect } from 'react';
import Icon from '../components/Icon';
import { View, TabIcon, CompanyInfo } from '../types';

interface AiMenuViewProps {
  onNavigate: (view: View, label: string, icon: TabIcon) => void;
  companyInfo: CompanyInfo;
  onUpdateCompanyInfo: (info: CompanyInfo) => void;
}

const AiMenuView: React.FC<AiMenuViewProps> = ({ onNavigate, companyInfo, onUpdateCompanyInfo }) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    const storedKey = localStorage.getItem('GEMINI_API_KEY');
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  const handleSaveKey = () => {
    setSaveStatus('saving');
    localStorage.setItem('GEMINI_API_KEY', apiKey);
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  const handleToggleAi = () => {
    onUpdateCompanyInfo({
      ...companyInfo,
      aiEnabled: !companyInfo.aiEnabled
    });
  };

  const aiFeatures = [
    {
      id: 'product-extraction',
      title: 'Ürün Ayıklama',
      description: 'Görüntü veya dosyalardan otomatik ürün bilgilerini (isim, barkod, fiyat vb.) ayıklar.',
      icon: 'products' as TabIcon,
      targetView: View.PRODUCTS,
      label: 'Ürünler',
      color: 'bg-blue-500/20 text-blue-400'
    },
    {
      id: 'purchase-extraction',
      title: 'Fatura Analizi',
      description: 'Tedarikçi faturalarını tarayarak otomatik alış kaydı ve stok girişi oluşturur.',
      icon: 'purchase' as TabIcon,
      targetView: View.PURCHASE,
      label: 'Alış Yap',
      color: 'bg-amber-500/20 text-amber-400'
    },
    {
      id: 'sales-analysis',
      title: 'Satış Koçu',
      description: 'Satış verilerini analiz ederek stok ve fiyatlandırma önerileri sunar.',
      icon: 'chart' as TabIcon,
      targetView: View.ANALYSIS,
      label: 'Analiz',
      color: 'bg-violet-500/20 text-violet-400'
    },
    {
      id: 'price-update',
      title: 'AI Fiyat Güncelleme',
      description: 'Excel listelerindeki yeni alış fiyatlarını analiz eder ve stokları otomatik günceller.',
      icon: 'excel' as TabIcon,
      targetView: View.AI_PRICE_UPDATE,
      label: 'Fiyat Güncelle',
      color: 'bg-emerald-500/20 text-emerald-400'
    },
    {
      id: 'ai-settings',
      title: 'Gelişmiş Ayarlar',
      description: 'API anahtarı ve yapay zeka parametrelerini profesyonelce yapılandırın.',
      icon: 'settings' as TabIcon,
      targetView: View.AI_SETTINGS,
      label: 'AI Ayarları',
      color: 'bg-slate-500/20 text-slate-400'
    }
  ];

  return (
    <div className="w-full h-full bg-[#020617] p-10 overflow-y-auto custom-scrollbar transform-gpu">
      <div className="w-full space-y-12">
        
        {/* 🧠 HEADER */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-10 px-4 animate-fade-in-down">
          <div className="flex items-center gap-8">
            <div className="w-20 h-20 bg-cyan-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-cyan-600/30 animate-pulse">
              <Icon name="ai" className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-5xl font-black text-white tracking-tighter uppercase underline decoration-cyan-500 decoration-8 underline-offset-8">YAPAY ZEKA <span className="text-cyan-400">MERKEZİ</span></h1>
              <p className="text-xs text-white/50 font-bold uppercase tracking-[0.6em] mt-8 ml-1">İleri Düzey Veri İşleme & Otomasyon Üssü</p>
            </div>
          </div>

          <div className="flex items-center gap-10 bg-white/5 p-6 rounded-[2.5rem] border border-white/10 shadow-2xl backdrop-blur-xl">
            <div className="text-right">
              <p className="text-xs font-black text-white uppercase tracking-widest">SİSTEM DURUMU</p>
              <p className={`text-[11px] font-black uppercase mt-1 ${companyInfo.aiEnabled ? 'text-emerald-400' : 'text-rose-400'}`}>
                {companyInfo.aiEnabled ? '• ÇEVRİMİÇİ (AKTİF)' : '• ÇEVRİMDIŞI (KAPALI)'}
              </p>
            </div>
            <button 
              onClick={handleToggleAi}
              className={`relative inline-flex h-10 w-20 items-center rounded-full transition-all duration-300 focus:outline-none border-4 ${
                companyInfo.aiEnabled ? 'bg-emerald-600 border-emerald-900/50' : 'bg-slate-700 border-slate-900/50'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-xl transition-all duration-300 ${
                  companyInfo.aiEnabled ? 'translate-x-11' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </header>

        {!companyInfo.aiEnabled && (
          <div className="p-10 bg-rose-500/10 border border-rose-500/20 rounded-[3.5rem] flex items-center gap-8 animate-fade-in mx-4">
            <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-3xl flex items-center justify-center shrink-0">
              <Icon name="exclamation-triangle" className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-rose-400 uppercase tracking-tight">Zeka Motoru Devre Dışı</h3>
              <p className="text-sm text-rose-300/60 font-bold uppercase tracking-widest mt-2">
                Yapay zeka özellikleri şu an kapalı. Otomatik faturayı okuma ve ürün ayıklama gibi fonksiyonları kullanmak için yukarıdaki anahtarı aktif edin.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 px-4">
          {aiFeatures.map((feature) => (
            <div 
              key={feature.id}
              className={`bg-white/5 backdrop-blur-3xl border border-white/10 p-12 rounded-[4rem] shadow-2xl hover:border-cyan-500/50 hover:bg-white/[0.08] transition-all duration-300 cursor-pointer group flex flex-col h-full relative overflow-hidden will-change-transform transform-gpu ${
                !companyInfo.aiEnabled && feature.id !== 'ai-settings' ? 'opacity-30 grayscale pointer-events-none' : ''
              }`}
              onClick={() => onNavigate(feature.targetView, feature.label, feature.icon)}
            >
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] -mr-12 -mt-12 group-hover:opacity-[0.08] transition-opacity">
                 <Icon name={feature.icon} className="w-48 h-48" />
              </div>

              <div className="flex items-center gap-6 mb-8 relative z-10">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg ${feature.color} group-hover:scale-110 transition-transform`}>
                  <Icon name={feature.icon} className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">{feature.title}</h3>
              </div>
              <p className="text-white/40 font-bold leading-relaxed mb-10 flex-grow uppercase tracking-widest text-[11px] relative z-10">
                {feature.description}
              </p>
              <div className="flex items-center text-cyan-400 font-black uppercase tracking-[0.3em] text-[10px] group-hover:translate-x-4 transition-transform mt-auto relative z-10">
                MODÜLÜ BAŞLAT <Icon name="back" className="w-5 h-5 ml-4 rotate-180" />
              </div>
            </div>
          ))}
        </div>

        <section className="bg-white/5 backdrop-blur-3xl border border-white/10 p-16 rounded-[5rem] shadow-2xl mx-4 relative overflow-hidden will-change-transform transform-gpu">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-500/5 blur-[150px] -mr-80 -mt-80"></div>
          
          <div className="flex items-center gap-6 mb-12 pb-10 border-b border-white/5 relative z-10">
            <div className="w-14 h-14 bg-white/5 text-white/40 rounded-2xl flex items-center justify-center">
              <Icon name="settings" className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight text-shadow">Gelişmiş API Yapılandırması</h2>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-16 relative z-10">
            <div className="space-y-8">
              <div className="p-10 bg-white/[0.03] rounded-[3rem] border border-white/10 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xl font-black text-white uppercase tracking-tight">Gemini AI Anahtarı</h4>
                    <p className="text-[11px] text-white/30 font-bold uppercase tracking-widest mt-2">Zeka motoruna güç veren dijital anahtar.</p>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setShowKey(!showKey)} className="w-14 h-14 bg-white/5 text-white/30 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all">
                      <Icon name={showKey ? "eye-slash" : "eye"} className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={handleSaveKey}
                      disabled={saveStatus !== 'idle'}
                      className={`h-14 px-10 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl ${
                        saveStatus === 'saved' ? 'bg-emerald-600 text-white shadow-emerald-600/20' : 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-cyan-600/20'
                      }`}
                    >
                      {saveStatus === 'saving' ? <Icon name="refresh" className="w-6 h-6 animate-spin" /> : saveStatus === 'saved' ? 'KAYDEDİLDİ' : 'GÜNCELLE'}
                    </button>
                  </div>
                </div>
                <input 
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="API Anahtarınızı buraya yapıştırın..."
                  className="w-full px-8 py-6 bg-black/40 border border-white/10 rounded-3xl focus:ring-4 focus:ring-cyan-500/30 outline-none transition-all font-mono text-lg text-white font-black tracking-widest"
                />
              </div>
            </div>

            <div className="p-12 bg-cyan-500/5 rounded-[4rem] border border-cyan-500/20 flex gap-8 items-center">
              <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] shadow-2xl flex items-center justify-center shrink-0 animate-pulse">
                <Icon name="ai" className="w-12 h-12 text-cyan-400" />
              </div>
              <div>
                <h4 className="text-2xl font-black text-cyan-400 uppercase tracking-tight mb-4 text-shadow-lg">Neden Yapay Zeka?</h4>
                <p className="text-sm text-cyan-100/60 font-bold leading-relaxed uppercase tracking-widest">
                  Yapay zeka desteği ile faturaları saniyeler içinde sisteme girebilir, ürün resimlerinden otomatik stok kartı oluşturabilir ve satış verilerinizden geleceğe yönelik stratejik tahminler alabilirsiniz.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 20px; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-down { animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .text-shadow { text-shadow: 0 4px 10px rgba(0,0,0,0.5); }
      `}</style>
    </div>
  );
};

export default AiMenuView;
