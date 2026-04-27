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
        <div className="w-full h-full bg-slate-50 dark:bg-[#020617] p-4 lg:p-6 overflow-y-auto custom-scrollbar">
            
            {notification && (
                <div className="fixed top-20 right-6 px-4 py-3 rounded-xl shadow-lg text-white z-50 bg-emerald-600 border border-emerald-500 animate-fade-in-up text-sm flex items-center gap-3 font-medium">
                    <Icon name="check" className="w-5 h-5"/>
                    {notification}
                </div>
            )}

            <div className="max-w-6xl mx-auto space-y-6">
                {/* HEADER */}
                <header className="flex items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 lg:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-500">
                                <Icon name="settings" className="w-5 h-5" />
                            </div>
                            Sistem Ayarları
                        </h1>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1">Uygulama konfigürasyonu ve genel tercihler</p>
                    </div>
                    <button
                        onClick={handleSave}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white h-10 px-5 rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center gap-2 group"
                    >
                        <Icon name="check" className="w-4 h-4" /> Kaydet
                    </button>
                </header>

                <div className="grid grid-cols-12 gap-6">
                    
                    {/* KURUMSAL KİMLİK */}
                    <div className="col-span-12">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-3">
                                <Icon name="tag" className="w-5 h-5 text-indigo-500" /> Firma Kimliği
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                    { n: 'appTitle', l: 'Uygulama Başlığı', v: localCompanyInfo.appTitle },
                                    { n: 'name', l: 'Firma Adı', v: localCompanyInfo.name },
                                    { n: 'phone', l: 'Telefon', v: localCompanyInfo.phone },
                                    { n: 'taxOffice', l: 'Vergi Dairesi', v: localCompanyInfo.taxOffice }
                                ].map((f, i) => (
                                    <div key={i} className="space-y-2">
                                        <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{f.l}</label>
                                        <input type="text" name={f.n} value={f.v || ''} onChange={handleCompanyInfoChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium" />
                                    </div>
                                ))}
                                <div className="lg:col-span-3 space-y-2">
                                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Adres</label>
                                    <input type="text" name="address" value={localCompanyInfo.address || ''} onChange={handleCompanyInfoChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Vergi No</label>
                                    <input type="text" name="taxNumber" value={localCompanyInfo.taxNumber || ''} onChange={handleCompanyInfoChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* E-TİCARET */}
                    <div className="col-span-12">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-3">
                                <Icon name="excel" className="w-5 h-5 text-orange-500" /> Pazaryeri Entegrasyonları
                            </h3>
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                {/* Trendyol */}
                                <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-[#F27A1A] rounded-lg flex items-center justify-center text-white font-bold text-sm">T</div>
                                        <h4 className="font-bold text-slate-900 dark:text-white">Trendyol</h4>
                                    </div>
                                    <div className="space-y-3">
                                        <input type="password" name="trendyolApiKey" value={localCompanyInfo.trendyolApiKey || ''} onChange={handleCompanyInfoChange} placeholder="API Key" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-orange-500" />
                                        <input type="password" name="trendyolApiSecret" value={localCompanyInfo.trendyolApiSecret || ''} onChange={handleCompanyInfoChange} placeholder="API Secret" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-orange-500" />
                                    </div>
                                </div>
                                {/* Hepsiburada */}
                                <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-[#FF6000] rounded-lg flex items-center justify-center text-white font-bold text-sm">H</div>
                                        <h4 className="font-bold text-slate-900 dark:text-white">Hepsiburada</h4>
                                    </div>
                                    <div className="space-y-3">
                                        <input type="password" name="hepsiburadaApiKey" value={localCompanyInfo.hepsiburadaApiKey || ''} onChange={handleCompanyInfoChange} placeholder="API Key" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-orange-500" />
                                    </div>
                                </div>
                                {/* N11 */}
                                <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">N</div>
                                        <h4 className="font-bold text-slate-900 dark:text-white">n11.com</h4>
                                    </div>
                                    <div className="space-y-3">
                                        <input type="password" name="n11AppKey" value={localCompanyInfo.n11AppKey || ''} onChange={handleCompanyInfoChange} placeholder="App Key" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* API & Webhooks */}
                    <div className="col-span-12">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-3">
                                <Icon name="ai" className="w-5 h-5 text-emerald-500" /> API & Webhooks
                            </h3>
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon name="search" className="w-5 h-5 text-emerald-500" />
                                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">Özel Web Sitesi API</h4>
                                        </div>
                                        <input type="checkbox" name="externalApiEnabled" checked={localCompanyInfo.externalApiEnabled || false} onChange={handleCompanyInfoChange} className="w-10 h-5 rounded-full bg-slate-200 dark:bg-slate-700 appearance-none checked:bg-emerald-600 transition-all cursor-pointer relative after:content-[''] after:absolute after:w-4 after:h-4 after:bg-white after:rounded-full after:left-0.5 after:top-0.5 checked:after:left-5.5 after:transition-all" />
                                    </div>
                                    <div className="space-y-3">
                                        <input type="text" name="customWebsiteUrl" value={localCompanyInfo.customWebsiteUrl || ''} onChange={handleCompanyInfoChange} placeholder="API URL" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
                                        <input type="password" name="customWebsiteApiKey" value={localCompanyInfo.customWebsiteApiKey || ''} onChange={handleCompanyInfoChange} placeholder="API Key" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
                                    </div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Icon name="ai" className="w-5 h-5 text-blue-500" />
                                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">AI & Webhook</h4>
                                    </div>
                                    <div className="space-y-3">
                                        <input type="text" name="googleAIStudioAppKey" value={localCompanyInfo.googleAIStudioAppKey || ''} onChange={handleCompanyInfoChange} placeholder="Google AI Studio Key" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
                                        <input type="text" name="customWebhookUrl" value={localCompanyInfo.customWebhookUrl || ''} onChange={handleCompanyInfoChange} placeholder="Webhook URL" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TEMA & TERCİHLER */}
                    <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-3">
                                <Icon name="ai" className="w-5 h-5 text-emerald-500" /> Tercihler
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[
                                    { n: 'autoPrintReceipt', l: 'Oto Fiş Yazdır', s: 'Onay sormadan' },
                                    { n: 'soundEnabled', l: 'Sesler', s: 'Okutma & Hata' },
                                    { n: 'quickAddMode', l: 'Hızlı Ekleme', s: 'Oto Kayıt' },
                                    { n: 'darkMode', l: 'Koyu Mod', s: 'Dark Mode' }
                                ].map((item) => (
                                    <div key={item.n} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase">{item.l}</h4>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{item.s}</p>
                                        </div>
                                        <input type="checkbox" name={item.n} checked={(localCompanyInfo as any)[item.n] || false} onChange={handleCompanyInfoChange} className="w-10 h-5 rounded-full bg-slate-200 dark:bg-slate-700 appearance-none checked:bg-indigo-600 transition-all cursor-pointer relative after:content-[''] after:absolute after:w-4 after:h-4 after:bg-white after:rounded-full after:left-0.5 after:top-0.5 checked:after:left-5.5 after:transition-all" />
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-3">
                                <Icon name="settings" className="w-5 h-5 text-purple-500" /> Uygulama Vurgu Rengi
                            </h3>
                            <div className="grid grid-cols-5 gap-3 mb-6">
                                {['indigo', 'rose', 'emerald', 'amber', 'cyan'].map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => setLocalCompanyInfo(prev => ({ ...prev, accentColor: color as any }))}
                                        className={`h-10 rounded-xl border-2 transition-all ${localCompanyInfo.accentColor === color ? 'border-white ring-2 ring-indigo-500' : 'border-transparent opacity-40 hover:opacity-100'} bg-${color === 'indigo' ? 'indigo-500' : color === 'rose' ? 'rose-500' : color === 'emerald' ? 'emerald-500' : color === 'amber' ? 'amber-500' : 'cyan-500'}`}
                                    ></button>
                                ))}
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Sistem Versiyonu</p>
                                    <h4 className="text-xl font-bold text-slate-900 dark:text-white">{currentVersion}</h4>
                                </div>
                                <button onClick={onCheckUpdates} className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all active:scale-95">Güncelle</button>
                            </div>
                        </div>
                    </div>

                    {/* OTOMATİK GÜN SONU */}
                    <div className="col-span-12">
                         <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex items-center justify-between gap-6">
                             <div className="flex items-center gap-6">
                                 <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
                                     <Icon name="refresh" className="w-6 h-6" />
                                 </div>
                                 <div>
                                     <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Otomatik Gün Sonu Raporlama</h3>
                                     <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Belirlenen saatte otomatik kasa kapatma</p>
                                 </div>
                             </div>
                             <div className="flex items-center gap-6">
                                 <input type="checkbox" name="autoEndOfDayEnabled" checked={localCompanyInfo.autoEndOfDayEnabled || false} onChange={handleCompanyInfoChange} className="w-12 h-6 rounded-full bg-slate-200 dark:bg-slate-700 appearance-none checked:bg-indigo-600 transition-all cursor-pointer relative after:content-[''] after:absolute after:w-5 after:h-5 after:bg-white after:rounded-full after:left-0.5 after:top-0.5 checked:after:left-6.5 after:transition-all" />
                                 {localCompanyInfo.autoEndOfDayEnabled && (
                                     <input type="time" name="autoEndOfDayTime" value={localCompanyInfo.autoEndOfDayTime || '23:59'} onChange={handleCompanyInfoChange} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xl font-bold text-slate-900 dark:text-white focus:outline-none" />
                                 )}
                             </div>
                         </div>
                    </div>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 20px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in-up { animation: fadeInUp 0.3s ease-out forwards; }
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
