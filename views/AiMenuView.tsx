
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
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 'purchase-extraction',
      title: 'Alış Faturası Ayıklama',
      description: 'Tedarikçi faturalarını tarayarak otomatik alış kaydı oluşturur.',
      icon: 'purchase' as TabIcon,
      targetView: View.PURCHASE,
      label: 'Alış Yap',
      color: 'bg-amber-100 text-amber-600'
    },
    {
      id: 'sales-analysis',
      title: 'Satış Analizi ve Koçluk',
      description: 'Satış verilerini analiz ederek stok ve fiyatlandırma önerileri sunar.',
      icon: 'chart' as TabIcon,
      targetView: View.ANALYSIS,
      label: 'Analiz',
      color: 'bg-violet-100 text-violet-600'
    },
    {
      id: 'price-update',
      title: 'AI Fiyat Güncelleme',
      description: 'Excel listelerindeki yeni alış fiyatlarını analiz eder ve stok kartlarını otomatik günceller.',
      icon: 'excel' as TabIcon,
      targetView: View.AI_PRICE_UPDATE,
      label: 'Fiyat Güncelle',
      color: 'bg-green-100 text-green-600'
    },
    {
      id: 'ai-settings',
      title: 'AI Ayarları',
      description: 'API anahtarı ve gelişmiş yapay zeka parametrelerini yapılandırın.',
      icon: 'settings' as TabIcon,
      targetView: View.AI_SETTINGS,
      label: 'AI Ayarları',
      color: 'bg-slate-100 text-slate-600'
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-1.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-xl">
                <Icon name="ai" className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Yapay Zeka Menüsü</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Tüm yapay zeka operasyonlarını ve ayarlarını buradan yönetin.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="text-right">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">AI Durumu</p>
              <p className={`text-[10px] font-semibold ${companyInfo.aiEnabled ? 'text-green-500' : 'text-slate-400'}`}>
                {companyInfo.aiEnabled ? 'Aktif (Çevrimiçi)' : 'Kapalı (Manuel Kullanım)'}
              </p>
            </div>
            <button 
              onClick={handleToggleAi}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ${
                companyInfo.aiEnabled ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  companyInfo.aiEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </header>

        {!companyInfo.aiEnabled && (
          <div className="mb-8 p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-xl">
              <Icon name="exclamation-triangle" className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-amber-800 dark:text-amber-300">Yapay Zeka Devre Dışı</h3>
              <p className="text-amber-700 dark:text-amber-400 text-sm">
                Yapay zeka özellikleri şu an kapalı. Uygulamayı internet olmadan veya manuel olarak kullanmaya devam edebilirsiniz. Özellikleri kullanmak için yukarıdaki düğmeden aktif edin.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {aiFeatures.map((feature) => (
            <div 
              key={feature.id}
              className={`bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-cyan-300 dark:hover:border-cyan-600 hover:shadow-lg transition-all cursor-pointer group flex flex-col h-full ${
                !companyInfo.aiEnabled && feature.id !== 'ai-settings' ? 'opacity-50 grayscale pointer-events-none' : ''
              }`}
              onClick={() => onNavigate(feature.targetView, feature.label, feature.icon)}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className={`p-4 rounded-2xl transition-colors ${feature.color} dark:bg-opacity-20`}>
                  <Icon name={feature.icon} className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">{feature.title}</h3>
              </div>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6 flex-grow">
                {feature.description}
              </p>
              <div className="flex items-center text-cyan-600 dark:text-cyan-400 font-bold group-hover:translate-x-2 transition-transform mt-auto">
                İşleme Git <Icon name="back" className="w-5 h-5 ml-2 rotate-180" />
              </div>
            </div>
          ))}
        </div>

        <section className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100 dark:border-slate-700">
            <div className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-lg">
              <Icon name="settings" className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Hızlı API Yapılandırması</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-bold text-slate-700 dark:text-slate-200">Gemini API Anahtarı</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Yapay zeka motorunu besleyen anahtar.</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowKey(!showKey)}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      <Icon name={showKey ? "eye-slash" : "eye"} className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={handleSaveKey}
                      disabled={saveStatus !== 'idle'}
                      className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
                        saveStatus === 'saved' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-cyan-600 text-white hover:bg-cyan-700'
                      }`}
                    >
                      {saveStatus === 'saving' ? (
                        <Icon name="refresh" className="w-4 h-4 animate-spin" />
                      ) : saveStatus === 'saved' ? (
                        <Icon name="check" className="w-4 h-4" />
                      ) : (
                        'Kaydet'
                      )}
                    </button>
                  </div>
                </div>
                <input 
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="API Anahtarınızı buraya yapıştırın..."
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none transition-all font-mono text-sm dark:text-white"
                />
              </div>
            </div>

            <div className="p-6 bg-cyan-50 dark:bg-cyan-900/20 rounded-2xl border border-cyan-100 dark:border-cyan-800 flex gap-4">
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm h-fit">
                <Icon name="ai" className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <h4 className="font-bold text-cyan-800 dark:text-cyan-300 mb-2">Neden Yapay Zeka?</h4>
                <p className="text-sm text-cyan-700 dark:text-cyan-400 leading-relaxed">
                  Yapay zeka desteği ile faturaları saniyeler içinde sisteme girebilir, ürün resimlerinden otomatik stok kartı oluşturabilir ve satış verilerinizden geleceğe yönelik tahminler alabilirsiniz. İnternet bağlantınız olmadığında sistemi manuel olarak kullanmaya devam edebilirsiniz.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AiMenuView;
