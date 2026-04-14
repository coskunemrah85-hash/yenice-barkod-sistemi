import React, { useState, useEffect } from 'react';
import Icon from '../components/Icon';
import { View, TabIcon, CompanyInfo } from '../types';

interface AiSettingsViewProps {
  onNavigate: (view: View, label: string, icon: TabIcon) => void;
  companyInfo: CompanyInfo;
  onUpdateCompanyInfo: (info: CompanyInfo) => void;
}

const AiSettingsView: React.FC<AiSettingsViewProps> = ({ onNavigate, companyInfo, onUpdateCompanyInfo }) => {
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
      label: 'Ürünler'
    },
    {
      id: 'purchase-extraction',
      title: 'Alış Faturası Ayıklama',
      description: 'Tedarikçi faturalarını tarayarak otomatik alış kaydı oluşturur.',
      icon: 'purchase' as TabIcon,
      targetView: View.PURCHASE,
      label: 'Alış Yap'
    },
    {
      id: 'sales-analysis',
      title: 'Satış Analizi ve Koçluk',
      description: 'Satış verilerini analiz ederek stok ve fiyatlandırma önerileri sunar.',
      icon: 'chart' as TabIcon,
      targetView: View.ANALYSIS,
      label: 'Analiz'
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <header className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-1.5 bg-cyan-100 text-cyan-600 rounded-xl">
              <Icon name="ai" className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">Yapay Zeka Merkezi</h1>
          </div>
          <p className="text-slate-500 text-sm">
            Uygulama genelindeki tüm yapay zeka özelliklerini buradan yönetebilir ve yapılandırabilirsiniz.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {aiFeatures.map((feature) => (
            <div 
              key={feature.id}
              className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:border-cyan-300 hover:shadow-md transition-all cursor-pointer group"
              onClick={() => onNavigate(feature.targetView, feature.label, feature.icon)}
            >
              <div className="flex items-start gap-4">
                <div className="p-2 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-cyan-50 group-hover:text-cyan-600 transition-colors">
                  <Icon name={feature.icon} className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">{feature.title}</h3>
                  <p className="text-slate-500 leading-relaxed mb-2 text-xs">
                    {feature.description}
                  </p>
                  <div className="flex items-center text-cyan-600 font-semibold text-xs group-hover:translate-x-1 transition-transform">
                    Özelliğe Git <Icon name="back" className="w-3 h-3 ml-1 rotate-180" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Icon name="ai" className="w-6 h-6 text-cyan-600" />
                Yapay Zeka Servisi
              </h2>
              <p className="text-slate-500">Sistem genelindeki yapay zeka desteğini buradan açıp kapatabilirsiniz.</p>
            </div>
            <button 
              onClick={handleToggleAi}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ${
                companyInfo.aiEnabled ? 'bg-cyan-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  companyInfo.aiEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className={`space-y-6 transition-opacity duration-300 ${companyInfo.aiEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none grayscale'}`}>
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Icon name="settings" className="w-6 h-6 text-slate-400" />
              Gelişmiş Ayarlar
            </h2>
            
            <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <h4 className="font-bold text-slate-700">Otomatik Analiz</h4>
                <p className="text-sm text-slate-500">Gün sonu raporlarında otomatik AI yorumu oluştur.</p>
              </div>
              <div className="w-12 h-6 bg-cyan-500 rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <h4 className="font-bold text-slate-700">Gelişmiş Ürün Tanıma</h4>
                <p className="text-sm text-slate-500">Görüntü analizinde daha derinlemesine detay (kumaş, tarz vb.) ara.</p>
              </div>
              <div className="w-12 h-6 bg-slate-300 rounded-full relative cursor-pointer">
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-bold text-slate-700">Gemini API Anahtarı</h4>
                  <p className="text-sm text-slate-500">Yapay zeka özelliklerini kullanmak için gerekli anahtar.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowKey(!showKey)}
                    className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                    title={showKey ? "Gizle" : "Göster"}
                  >
                    <Icon name={showKey ? "eye-slash" : "eye"} className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={handleSaveKey}
                    disabled={saveStatus !== 'idle'}
                    className={`px-4 py-2 rounded-xl font-semibold transition-all flex items-center gap-2 ${
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
                placeholder="AI API Anahtarınızı buraya yapıştırın..."
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none transition-all font-mono text-sm"
              />
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
              <Icon name="exclamation-triangle" className="w-6 h-6 text-amber-500 shrink-0" />
              <div>
                <h4 className="font-bold text-amber-800">API Anahtarı Hakkında</h4>
                <p className="text-sm text-amber-700">
                  Yapay zeka özellikleri Gemini API üzerinden çalışmaktadır. Buraya eklediğiniz anahtar, tarayıcınızda güvenli bir şekilde saklanır ve sadece bu cihazda kullanılır.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  );
};

export default AiSettingsView;
