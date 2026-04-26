import React, { useState, useEffect } from 'react';
import Icon from '../components/Icon';
import { CompanyInfo, User } from '../types';

interface SettingsViewProps {
    currentUser: User;
    companyInfo: CompanyInfo;
    onUpdateCompanyInfo: (info: CompanyInfo) => void;
    onCheckUpdates?: () => void;
    currentVersion?: string;
}

const SettingsView: React.FC<SettingsViewProps> = ({ currentUser, companyInfo, onUpdateCompanyInfo, onCheckUpdates, currentVersion = '1.0.0' }) => {
    const [localCompanyInfo, setLocalCompanyInfo] = useState(companyInfo);
    const [notification, setNotification] = useState('');

    useEffect(() => {
        setLocalCompanyInfo(companyInfo);
    }, [companyInfo]);

    const showNotification = (message: string) => {
        setNotification(message);
        setTimeout(() => setNotification(''), 2000);
    }

    const handleCompanyInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        const checked = (e.target as HTMLInputElement).checked;
        setLocalCompanyInfo(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) : value)
        }));
    };

    const handleSave = () => {
        onUpdateCompanyInfo(localCompanyInfo);
        showNotification('Ayarlar başarıyla kaydedildi!');
    };

    return (
        <div className="w-full h-full bg-[#020617] p-8 overflow-y-auto custom-scrollbar transform-gpu" style={{ transform: 'translateZ(0)' }}>
            
            {notification && (
                <div className="fixed top-24 right-8 p-6 rounded-[2rem] shadow-2xl text-white z-50 bg-emerald-600/90 backdrop-blur-xl border border-emerald-500/50 animate-fade-in-up font-black uppercase tracking-widest text-xs flex items-center gap-4">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        <Icon name="check" className="w-5 h-5"/>
                    </div>
                    {notification}
                </div>
            )}

            <div className="w-full space-y-12">
                {/* 👑 HEADER */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 px-4">
                    <div className="animate-fade-in-down">
                        <h1 className="text-6xl font-black text-white tracking-tighter uppercase underline decoration-indigo-500 decoration-8 underline-offset-8">SİSTEM <span className="text-indigo-400">AYARLARI</span></h1>
                        <p className="text-sm text-white/50 font-bold uppercase tracking-[0.5em] mt-8 ml-1">Konfigürasyon & Stratejik Yönetim Üssü</p>
                    </div>
                    <button
                        onClick={handleSave}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white h-24 px-16 rounded-[2.5rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/30 transition-all duration-100 active:scale-95 flex items-center gap-6 group transform-gpu"
                    >
                        <Icon name="check" className="w-8 h-8 group-hover:scale-110 transition-transform duration-100" /> Ayarları Kaydet
                    </button>
                </header>

                <div className="grid grid-cols-12 gap-10">
                    
                    {/* 🏢 KURUMSAL KİMLİK */}
                    <div className="col-span-12">
                        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[4.5rem] p-16 shadow-2xl relative overflow-hidden will-change-transform transform-gpu">
                            <h3 className="text-sm font-black text-white/40 uppercase tracking-[0.4em] mb-12 flex items-center gap-5">
                                <Icon name="tag" className="w-8 h-8 text-indigo-400" /> Firma Kimliği & Kurumsal Veriler
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
                                {[
                                    { n: 'appTitle', l: 'Uygulama Başlığı', v: localCompanyInfo.appTitle },
                                    { n: 'name', l: 'Firma Resmi Adı', v: localCompanyInfo.name },
                                    { n: 'phone', l: 'İletişim Hattı', v: localCompanyInfo.phone },
                                    { n: 'taxOffice', l: 'Vergi Dairesi', v: localCompanyInfo.taxOffice }
                                ].map((f, i) => (
                                    <div key={i} className="space-y-4">
                                        <label className="text-xs font-black text-white/60 uppercase tracking-widest ml-6">{f.l}</label>
                                        <input type="text" name={f.n} value={f.v || ''} onChange={handleCompanyInfoChange} className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-xl text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/30 transition-all duration-100 font-black" />
                                    </div>
                                ))}
                                <div className="lg:col-span-3 space-y-4">
                                    <label className="text-xs font-black text-white/60 uppercase tracking-widest ml-6">Genel Merkez Adresi</label>
                                    <input type="text" name="address" value={localCompanyInfo.address || ''} onChange={handleCompanyInfoChange} className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-xl text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/30 transition-all duration-100 font-black" />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-xs font-black text-white/60 uppercase tracking-widest ml-6">Vergi Numarası</label>
                                    <input type="text" name="taxNumber" value={localCompanyInfo.taxNumber || ''} onChange={handleCompanyInfoChange} className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-xl text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/30 transition-all duration-100 font-black" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 📦 E-TİCARET ENTEGRASYONU */}
                    <div className="col-span-12">
                        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[4.5rem] p-16 shadow-2xl relative overflow-hidden will-change-transform transform-gpu">
                            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/5 blur-[150px] -mr-64 -mt-64"></div>
                            <h3 className="text-sm font-black text-white/40 uppercase tracking-[0.4em] mb-12 flex items-center gap-5">
                                <Icon name="excel" className="w-8 h-8 text-orange-400" /> E-Ticaret & Pazaryeri Senkronizasyonu
                            </h3>
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
                                {/* Trendyol */}
                                <div className="bg-white/[0.02] p-10 rounded-[3.5rem] border border-white/10 space-y-8 group hover:bg-white/5 transition-all">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 bg-[#F27A1A]/10 rounded-2xl flex items-center justify-center text-[#F27A1A] font-black italic text-2xl">T</div>
                                        <h4 className="text-2xl font-black text-white uppercase tracking-tight">Trendyol</h4>
                                    </div>
                                    <div className="space-y-5">
                                        <input type="password" name="trendyolApiKey" value={localCompanyInfo.trendyolApiKey || ''} onChange={handleCompanyInfoChange} placeholder="API Key" className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all" />
                                        <input type="password" name="trendyolApiSecret" value={localCompanyInfo.trendyolApiSecret || ''} onChange={handleCompanyInfoChange} placeholder="API Secret" className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all" />
                                    </div>
                                </div>
                                {/* Hepsiburada */}
                                <div className="bg-white/[0.02] p-10 rounded-[3.5rem] border border-white/10 space-y-8 group hover:bg-white/5 transition-all">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 bg-[#FF6000]/10 rounded-2xl flex items-center justify-center text-[#FF6000] font-black italic text-2xl">H</div>
                                        <h4 className="text-2xl font-black text-white uppercase tracking-tight">Hepsiburada</h4>
                                    </div>
                                    <div className="space-y-5">
                                        <input type="password" name="hepsiburadaApiKey" value={localCompanyInfo.hepsiburadaApiKey || ''} onChange={handleCompanyInfoChange} placeholder="API Key" className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all" />
                                    </div>
                                </div>
                                {/* N11 */}
                                <div className="bg-white/[0.02] p-10 rounded-[3.5rem] border border-white/10 space-y-8 group hover:bg-white/5 transition-all">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 bg-purple-600/10 rounded-2xl flex items-center justify-center text-purple-400 font-black italic text-2xl">n11</div>
                                        <h4 className="text-2xl font-black text-white uppercase tracking-tight">n11.com</h4>
                                    </div>
                                    <div className="space-y-5">
                                        <input type="password" name="n11AppKey" value={localCompanyInfo.n11AppKey || ''} onChange={handleCompanyInfoChange} placeholder="App Key" className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 🔌 ÖZEL ENTEGRASYON & API (NEW SECTION FOR CUSTOM APPS) */}
                    <div className="col-span-12">
                        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[4.5rem] p-16 shadow-2xl relative overflow-hidden will-change-transform transform-gpu">
                            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[150px] -ml-64 -mt-64"></div>
                            
                            <h3 className="text-sm font-black text-white/40 uppercase tracking-[0.4em] mb-12 flex items-center gap-5">
                                <Icon name="ai" className="w-8 h-8 text-emerald-400" /> Özel Entegrasyon & API (Webhooks)
                            </h3>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                                {/* Custom Website API */}
                                <div className="bg-white/[0.02] p-10 rounded-[3.5rem] border border-white/10 space-y-8">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-5">
                                            <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 shadow-lg">
                                                <Icon name="search" className="w-8 h-8" />
                                            </div>
                                            <div>
                                                <h4 className="text-2xl font-black text-white uppercase tracking-tight">Özel Web Sitesi API</h4>
                                                <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">Kendi sitemize ürün gönderimi & stok eşleme</p>
                                            </div>
                                        </div>
                                        <input type="checkbox" name="externalApiEnabled" checked={localCompanyInfo.externalApiEnabled || false} onChange={handleCompanyInfoChange} className="w-14 h-8 rounded-full bg-slate-800 appearance-none border-4 border-slate-800 checked:bg-emerald-600 transition-all cursor-pointer relative after:content-[''] after:absolute after:w-6 after:h-6 after:bg-white after:rounded-full after:left-0 checked:after:left-6 after:transition-all" />
                                    </div>
                                    <div className="space-y-5">
                                        <input type="text" name="customWebsiteUrl" value={localCompanyInfo.customWebsiteUrl || ''} onChange={handleCompanyInfoChange} placeholder="Web Sitesi URL (örn: https://sitem.com/api/v1)" className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all" />
                                        <input type="password" name="customWebsiteApiKey" value={localCompanyInfo.customWebsiteApiKey || ''} onChange={handleCompanyInfoChange} placeholder="API Erişim Anahtarı (Bearer Token / Key)" className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all" />
                                    </div>
                                </div>

                                {/* Google AI Studio & Webhooks */}
                                <div className="bg-white/[0.02] p-10 rounded-[3.5rem] border border-white/10 space-y-8">
                                    <div className="flex items-center gap-5">
                                        <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 shadow-lg">
                                            <Icon name="ai" className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h4 className="text-2xl font-black text-white uppercase tracking-tight">AI App & Webhook</h4>
                                            <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-1">AI Studio Entegrasyonu & Anlık Veri Yayını</p>
                                        </div>
                                    </div>
                                    <div className="space-y-5">
                                        <input type="text" name="googleAIStudioAppKey" value={localCompanyInfo.googleAIStudioAppKey || ''} onChange={handleCompanyInfoChange} placeholder="Google AI Studio / Custom App Key" className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                                        <input type="text" name="customWebhookUrl" value={localCompanyInfo.customWebhookUrl || ''} onChange={handleCompanyInfoChange} placeholder="Webhook URL (Stok değişiminde veri gönderilecek adres)" className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 🚀 KULLANICI DENEYİMİ & 🎨 TEMA */}
                    <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[4.5rem] p-16 shadow-2xl will-change-transform transform-gpu">
                            <h3 className="text-sm font-black text-white/40 uppercase tracking-[0.4em] mb-12 flex items-center gap-5">
                                <Icon name="ai" className="w-8 h-8 text-emerald-400" /> Kullanıcı Deneyimi & Verimlilik
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                {[
                                    { n: 'autoPrintReceipt', l: 'Otomatik Fiş Yazdır', s: 'Onay sormadan yazdır', c: 'emerald' },
                                    { n: 'soundEnabled', l: 'Sesli Bildirimler', s: 'Okutma & Hata Sesleri', c: 'indigo' },
                                    { n: 'quickAddMode', l: 'Hızlı Ürün Ekleme', s: 'Otomatik Kayıt Modu', c: 'amber' },
                                    { n: 'darkMode', l: 'Koyu Mod (Dark)', s: 'Arayüz Renk Şeması', c: 'purple' }
                                ].map((item) => (
                                    <div key={item.n} className="flex items-center justify-between bg-white/5 p-8 rounded-[3rem] border border-white/5 group hover:border-white/20 transition-all duration-150">
                                        <div>
                                            <h4 className="text-sm font-black text-white uppercase tracking-tight">{item.l}</h4>
                                            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">{item.s}</p>
                                        </div>
                                        <input type="checkbox" name={item.n} checked={(localCompanyInfo as any)[item.n] || false} onChange={handleCompanyInfoChange} className="w-14 h-8 rounded-full bg-slate-800 appearance-none border-4 border-slate-800 checked:bg-indigo-600 transition-all cursor-pointer relative after:content-[''] after:absolute after:w-6 after:h-6 after:bg-white after:rounded-full after:left-0 checked:after:left-6 after:transition-all" />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[4.5rem] p-16 shadow-2xl will-change-transform transform-gpu">
                            <h3 className="text-sm font-black text-white/40 uppercase tracking-[0.4em] mb-12 flex items-center gap-5">
                                <Icon name="settings" className="w-8 h-8 text-purple-400" /> Uygulama Vurgu Rengi
                            </h3>
                            <div className="grid grid-cols-5 gap-6 mb-12">
                                {['indigo', 'rose', 'emerald', 'amber', 'cyan'].map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => setLocalCompanyInfo(prev => ({ ...prev, accentColor: color as any }))}
                                        className={`h-24 rounded-3xl border-4 transition-all duration-100 ${localCompanyInfo.accentColor === color ? 'border-white scale-110 shadow-2xl' : 'border-transparent opacity-30 hover:opacity-100 hover:scale-105'} bg-${color === 'indigo' ? 'indigo-500' : color === 'rose' ? 'rose-500' : color === 'emerald' ? 'emerald-500' : color === 'amber' ? 'amber-500' : 'cyan-500'}`}
                                    ></button>
                                ))}
                            </div>
                            <div className="bg-white/5 p-10 rounded-[3.5rem] border border-white/10 text-center">
                                <p className="text-xs font-black text-white/30 uppercase tracking-[0.6em] mb-4">Sistem Versiyonu</p>
                                <h4 className="text-6xl font-black text-white tracking-tighter mb-8">{currentVersion}</h4>
                                <button onClick={onCheckUpdates} className="w-full bg-white/5 hover:bg-white/10 text-white h-20 rounded-3xl text-sm font-black uppercase tracking-widest transition-all active:scale-95">Güncellemeleri Denetle</button>
                            </div>
                        </div>
                    </div>

                    {/* ⚙️ OTOMATİK GÜN SONU */}
                    <div className="col-span-12">
                         <div className="bg-gradient-to-br from-slate-900 to-black border border-white/10 rounded-[5rem] p-20 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-12 will-change-transform transform-gpu">
                             <div className="flex items-center gap-12">
                                 <div className="w-32 h-32 bg-white/5 rounded-[3rem] flex items-center justify-center text-indigo-400 shadow-inner">
                                     <Icon name="refresh" className="w-16 h-16" />
                                 </div>
                                 <div>
                                     <h3 className="text-4xl font-black text-white uppercase tracking-tight">Otomatik Gün Sonu Raporlama</h3>
                                     <p className="text-lg text-white/40 font-bold uppercase tracking-widest mt-4">Sistem her gün belirlenen saatte kasanızı otomatik kapatır.</p>
                                 </div>
                             </div>
                             <div className="flex items-center gap-10 bg-white/5 p-10 rounded-[4rem] border border-white/5">
                                 <input type="checkbox" name="autoEndOfDayEnabled" checked={localCompanyInfo.autoEndOfDayEnabled || false} onChange={handleCompanyInfoChange} className="w-20 h-12 rounded-full bg-slate-800 appearance-none border-4 border-slate-800 checked:bg-indigo-600 transition-all cursor-pointer relative after:content-[''] after:absolute after:w-10 after:h-10 after:bg-white after:rounded-full after:left-0 checked:after:left-10 after:transition-all" />
                                 {localCompanyInfo.autoEndOfDayEnabled && (
                                     <input type="time" name="autoEndOfDayTime" value={localCompanyInfo.autoEndOfDayTime || '23:59'} onChange={handleCompanyInfoChange} className="bg-white/10 border border-white/10 rounded-3xl p-6 text-6xl font-black text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/30" />
                                 )}
                             </div>
                         </div>
                    </div>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 20px; }
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in-up { animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes fadeInDown { from { opacity: 0; transform: translateY(-40px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in-down { animation: fadeInDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .bg-indigo-500 { background-color: #6366f1; }
                .bg-rose-500 { background-color: #f43f5e; }
                .bg-emerald-500 { background-color: #10b981; }
                .bg-amber-500 { background-color: #f59e0b; }
                .bg-cyan-500 { background-color: #06b6d4; }
            `}</style>
        </div>
    );
};

export default SettingsView;
