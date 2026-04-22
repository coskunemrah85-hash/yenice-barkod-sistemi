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
    // Local state for settings. In a real app, this would come from a context or props.
    const [localCompanyInfo, setLocalCompanyInfo] = useState(companyInfo);
    const [receiptSettings, setReceiptSettings] = useState({
        headerText: 'Yenice İç Giyim',
        footerText: 'Bizi tercih ettiğiniz için teşekkür ederiz.',
        showLogo: true,
        fontSize: 'normal',
    });

    const [labelSettings, setLabelSettings] = useState({
        width: 38,
        height: 25,
        showProductName: true,
        showPrice: true,
        showBarcode: true,
    });

    const [notification, setNotification] = useState('');

    useEffect(() => {
        setLocalCompanyInfo(companyInfo);
    }, [companyInfo]);

    const showNotification = (message: string) => {
        setNotification(message);
        setTimeout(() => setNotification(''), 3000);
    }

    const handleCompanyInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        const checked = (e.target as HTMLInputElement).checked;
        setLocalCompanyInfo(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? checked : value 
        }));
    };

    const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setReceiptSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setLabelSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSave = () => {
        onUpdateCompanyInfo(localCompanyInfo);
        // Here you would also save receipt and label settings
        showNotification('Ayarlar başarıyla kaydedildi!');
    };

    return (
        <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-slate-900 p-4 overflow-hidden">
            {notification && (
                <div className="fixed top-24 right-6 p-4 rounded-2xl shadow-2xl text-white z-50 bg-cyan-600 animate-fade-in-up font-bold flex items-center gap-3">
                    <Icon name="check" className="w-6 h-6"/> {notification}
                </div>
            )}
            
            <header className="view-header mb-6">
                <h1 className="view-title">Sistem Ayarları</h1>
                <div className="view-actions">
                     <button
                        onClick={handleSave}
                        className="btn-primary"
                    >
                        <Icon name="check" className="w-5 h-5" /> Ayarları Kaydet
                    </button>
                </div>
            </header>

            <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
                    {/* Company Info Card (Admin only) */}
                    {currentUser.role === 'admin' && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm lg:col-span-2">
                            <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest mb-6 pb-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                                <Icon name="tag" className="w-5 h-5 text-cyan-600" />
                                Firma Bilgileri
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="label-style dark:text-slate-300">Uygulama Başlığı</label>
                                    <input type="text" name="appTitle" value={localCompanyInfo.appTitle} onChange={handleCompanyInfoChange} className="input-style w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
                                </div>
                                <div>
                                    <label className="label-style dark:text-slate-300">Firma Adı</label>
                                    <input type="text" name="name" value={localCompanyInfo.name} onChange={handleCompanyInfoChange} className="input-style w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
                                </div>
                                 <div className="md:col-span-2">
                                    <label className="label-style dark:text-slate-300">Adres</label>
                                    <input type="text" name="address" value={localCompanyInfo.address || ''} onChange={handleCompanyInfoChange} className="input-style w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
                                </div>
                                <div>
                                    <label className="label-style dark:text-slate-300">Telefon</label>
                                    <input type="text" name="phone" value={localCompanyInfo.phone || ''} onChange={handleCompanyInfoChange} className="input-style w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
                                </div>
                                 <div>
                                    <label className="label-style dark:text-slate-300">Vergi Dairesi</label>
                                    <input type="text" name="taxOffice" value={localCompanyInfo.taxOffice || ''} onChange={handleCompanyInfoChange} className="input-style w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
                                </div>
                                 <div>
                                    <label className="label-style dark:text-slate-300">Vergi Numarası</label>
                                    <input type="text" name="taxNumber" value={localCompanyInfo.taxNumber || ''} onChange={handleCompanyInfoChange} className="input-style w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white"/>
                                </div>
                            </div>
                        </div>
                    )}


                    {/* Receipt Settings Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4 pb-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                            <Icon name="printer" className="w-6 h-6 text-cyan-700" />
                            Fiş Ayarları
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="label-style dark:text-slate-300">Fiş Başlığı</label>
                                <input
                                    type="text"
                                    name="headerText"
                                    value={receiptSettings.headerText}
                                    onChange={handleReceiptChange}
                                    className="input-style w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="label-style dark:text-slate-300">Alt Bilgi Metni</label>
                                <textarea
                                    name="footerText"
                                    value={receiptSettings.footerText}
                                    onChange={handleReceiptChange}
                                    rows={3}
                                    className="input-style w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="label-style dark:text-slate-300">Yazı Tipi Boyutu</label>
                                <select
                                    name="fontSize"
                                    value={receiptSettings.fontSize}
                                    onChange={handleReceiptChange}
                                    className="input-style w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                >
                                    <option value="small">Küçük</option>
                                    <option value="normal">Normal</option>
                                    <option value="large">Büyük</option>
                                </select>
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="showLogo"
                                    checked={receiptSettings.showLogo}
                                    onChange={handleReceiptChange}
                                    className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                                />
                                <span className="text-slate-700 dark:text-slate-200 select-none">Logo Göster (varsa)</span>
                            </label>
                        </div>
                    </div>

                    {/* Label Settings Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4 pb-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                            <Icon name="barcode" className="w-6 h-6 text-cyan-700" />
                            Etiket & Barkod Ayarları
                        </h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label-style dark:text-slate-300">Etiket Genişliği (mm)</label>
                                    <input
                                        type="number"
                                        name="width"
                                        value={labelSettings.width}
                                        onChange={handleLabelChange}
                                        className="input-style w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="label-style dark:text-slate-300">Etiket Yüksekliği (mm)</label>
                                    <input
                                        type="number"
                                        name="height"
                                        value={labelSettings.height}
                                        onChange={handleLabelChange}
                                        className="input-style w-full dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Not: Etiket boyutu ayarları, etiket yazıcınızın desteklediği boyutlarla uyumlu olmalıdır.</p>
                            <div className="space-y-2 pt-2">
                                 <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="showProductName"
                                        checked={labelSettings.showProductName}
                                        onChange={handleLabelChange}
                                        className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                                    />
                                    <span className="text-slate-700 dark:text-slate-200 select-none">Ürün Adını Göster</span>
                                </label>
                                 <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="showPrice"
                                        checked={labelSettings.showPrice}
                                        onChange={handleLabelChange}
                                        className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                                    />
                                    <span className="text-slate-700 dark:text-slate-200 select-none">Fiyatı Göster</span>
                                </label>
                                 <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="showBarcode"
                                        checked={labelSettings.showBarcode}
                                        onChange={handleLabelChange}
                                        className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                                    />
                                    <span className="text-slate-700 dark:text-slate-200 select-none">Barkod Numarasını Göster</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Auto End of Day Settings Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4 pb-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                            <Icon name="refresh" className="w-6 h-6 text-cyan-700" />
                            Otomatik Gün Sonu Ayarları
                        </h3>
                        <div className="space-y-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="autoEndOfDayEnabled"
                                    checked={localCompanyInfo.autoEndOfDayEnabled || false}
                                    onChange={handleCompanyInfoChange}
                                    className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                                />
                                <span className="text-slate-700 dark:text-slate-200 font-medium select-none">Otomatik Gün Sonu Almayı Etkinleştir</span>
                            </label>
                            
                            {localCompanyInfo.autoEndOfDayEnabled && (
                                <div className="animate-fade-in-up">
                                    <label className="label-style">Gün Sonu Alma Saati</label>
                                    <input
                                        type="time"
                                        name="autoEndOfDayTime"
                                        value={localCompanyInfo.autoEndOfDayTime || '23:59'}
                                        onChange={handleCompanyInfoChange}
                                        className="input-style w-full"
                                    />
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                        Belirtilen saatte sistem otomatik olarak gün sonu raporu oluşturacaktır.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Theme Settings Card */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4 pb-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                            <Icon name="settings" className="w-6 h-6 text-cyan-700" />
                            Görünüm Ayarları
                        </h3>
                        <div className="space-y-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="darkMode"
                                    checked={localCompanyInfo.darkMode || false}
                                    onChange={handleCompanyInfoChange}
                                    className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                                />
                                <span className="text-slate-700 dark:text-slate-200 font-medium select-none">Koyu Modu Etkinleştir</span>
                            </label>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Uygulamanın renk temasını koyu veya açık olarak değiştirebilirsiniz.
                            </p>
                        </div>
                    </div>

                    {/* Update Settings Card */}
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm lg:col-span-2">
                        <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest mb-6 pb-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                            <Icon name="refresh" className="w-6 h-6 text-cyan-600" />
                            Güncellemeler
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <div>
                                    <p className="text-sm text-slate-500 font-bold uppercase tracking-tighter">Mevcut Sürüm</p>
                                    <p className="text-4xl font-black text-slate-800 dark:text-white tracking-tighter">{currentVersion}</p>
                                </div>
                                <button
                                    onClick={onCheckUpdates}
                                    className="btn-primary px-8 h-[54px]"
                                >
                                    <Icon name="refresh" className="w-5 h-5" /> Güncellemeleri Kontrol Et
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 text-center font-medium">
                                ✅ Uygulama her açılışta güncellemeleri otomatik denetler.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
