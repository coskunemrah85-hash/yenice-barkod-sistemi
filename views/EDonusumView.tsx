import React, { useState, useMemo } from 'react';
import { SaleRecord, Customer, View, TabIcon, Supplier } from '../types';
import Icon from '../components/Icon';

interface EDonusumViewProps {
  salesHistory: SaleRecord[];
  customers: Customer[];
  suppliers: Supplier[];
}

const EDonusumView: React.FC<EDonusumViewProps> = ({ salesHistory, customers, suppliers }) => {
  const [mainTab, setMainTab] = useState<'e-fatura' | 'e-arsiv' | 'settings' | 'reports'>('e-fatura');
  const [subTab, setSubTab] = useState<'giden' | 'gelen'>('giden');
  const [searchTerm, setSearchTerm] = useState('');

  // Simulated Incoming Invoices (Gelen Faturalar)
  const incomingInvoices = useMemo(() => {
    return Array.from({ length: 5 }).map((_, i) => ({
      id: `GEL-${2024000 + i}`,
      sender: suppliers[i % suppliers.length]?.name || 'Tedarikçi A.Ş.',
      total: 1500 + (i * 450),
      date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
      status: 'ONAYLANDI'
    }));
  }, [suppliers]);

  const filteredGiden = useMemo(() => {
    return salesHistory.filter(s => {
      const customer = customers.find(c => c.id === s.customerId)?.name || 'Perakende Müşteri';
      return customer.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.includes(searchTerm);
    }).reverse();
  }, [salesHistory, customers, searchTerm]);

  const filteredGelen = useMemo(() => {
    return incomingInvoices.filter(s => 
      s.sender.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.includes(searchTerm)
    );
  }, [incomingInvoices, searchTerm]);

  return (
    <div className="w-full h-full bg-[#020617] text-slate-300 font-sans overflow-hidden flex flex-col">
      
      {/* 🌌 MAIN HEADER */}
      <header className="p-8 border-b border-white/5 bg-white/[0.02] backdrop-blur-3xl flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
                  <Icon name="ai" className="w-6 h-6 text-white" />
              </div>
              <div>
                  <h1 className="text-2xl font-black text-white tracking-tighter uppercase">E-DÖNÜŞÜM <span className="text-indigo-400">PORTALI</span></h1>
                  <p className="text-[9px] font-black text-indigo-400/50 uppercase tracking-[0.3em]">Resmi Evrak & Entegrasyon Merkezi</p>
              </div>
          </div>

          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
              {[
                { id: 'e-fatura', label: 'E-Fatura', icon: 'reports' },
                { id: 'e-arsiv', label: 'E-Arşiv', icon: 'reports' },
                { id: 'reports', label: 'Analiz', icon: 'finance' },
                { id: 'settings', label: 'Ayarlar', icon: 'settings' }
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setMainTab(tab.id as any)}
                  className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${mainTab === tab.id ? 'bg-indigo-600 text-white shadow-xl' : 'text-white/40 hover:text-white'}`}
                >
                  <Icon name={tab.icon as any} className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
          </div>
      </header>

      {/* 📂 SUB-NAVIGATION (Gelen / Giden) */}
      {(mainTab === 'e-fatura' || mainTab === 'e-arsiv') && (
        <div className="px-8 py-4 bg-white/[0.01] border-b border-white/5 flex items-center gap-6 shrink-0">
            <button 
              onClick={() => setSubTab('giden')}
              className={`text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-lg transition-all ${subTab === 'giden' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}
            >
              Giden Faturalar
            </button>
            <button 
              onClick={() => setSubTab('gelen')}
              className={`text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-lg transition-all ${subTab === 'gelen' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}
            >
              Gelen Faturalar
            </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          
          {(mainTab === 'e-fatura' || mainTab === 'e-arsiv') && (
              <div className="max-w-7xl mx-auto space-y-8">
                  {/* INVOICE LIST */}
                  <div className="bg-white/5 border border-white/10 rounded-[3.5rem] p-10 backdrop-blur-3xl shadow-2xl relative">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                          <h2 className="text-sm font-black text-white uppercase tracking-[0.3em]">
                            {mainTab === 'e-fatura' ? 'E-FATURA' : 'E-ARŞİV'} {subTab === 'giden' ? 'GİDEN' : 'GELEN'} LİSTESİ
                          </h2>
                          <div className="flex items-center gap-4">
                              <div className="relative">
                                  <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                  <input 
                                    type="text" 
                                    placeholder="Arama yapın..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-6 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                                  />
                              </div>
                          </div>
                      </div>

                      <div className="overflow-x-auto">
                          <table className="w-full text-left">
                              <thead>
                                  <tr className="border-b border-white/5 text-[10px] font-black text-white/20 uppercase tracking-widest">
                                      <th className="pb-4 px-4">FATURA NO / TİP</th>
                                      <th className="pb-4 px-4">{subTab === 'giden' ? 'ALICI (MÜŞTERİ)' : 'GÖNDEREN (TEDARİKÇİ)'}</th>
                                      <th className="pb-4 px-4 text-right">TOPLAM TUTAR</th>
                                      <th className="pb-4 px-4 text-center">DURUM</th>
                                      <th className="pb-4 px-4 text-right">İŞLEMLER</th>
                                  </tr>
                              </thead>
                              <tbody className="text-xs">
                                  {(subTab === 'giden' ? filteredGiden : filteredGelen).map((item: any) => {
                                      const name = subTab === 'giden' 
                                          ? (customers.find(c => c.id === item.customerId)?.name || 'Perakende Müşteri')
                                          : item.sender;
                                      return (
                                          <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                                              <td className="py-6 px-4">
                                                  <p className="font-black text-white uppercase">{item.id.slice(0, 12)}</p>
                                                  <p className="text-[9px] text-white/20 font-bold uppercase mt-1">{mainTab.toUpperCase()} {subTab === 'giden' ? 'SATIŞ' : 'ALIŞ'}</p>
                                              </td>
                                              <td className="py-6 px-4">
                                                  <p className="font-bold text-white/70">{name}</p>
                                                  <p className="text-[9px] text-white/20 font-bold uppercase mt-1">{item.date.split('T')[0]}</p>
                                              </td>
                                              <td className="py-6 px-4 text-right font-black text-white">
                                                  {item.total.toLocaleString('tr-TR')} ₺
                                              </td>
                                              <td className="py-6 px-4 text-center">
                                                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-500/20">RESMİLEŞTİ</span>
                                              </td>
                                              <td className="py-6 px-4 text-right space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <button className="p-2 hover:bg-indigo-600/20 text-indigo-400 rounded-lg transition-all" title="PDF Görüntüle"><Icon name="pdf" className="w-4 h-4" /></button>
                                                  <button className="p-2 hover:bg-emerald-600/20 text-emerald-400 rounded-lg transition-all" title="Email Gönder"><Icon name="whatsapp" className="w-4 h-4" /></button>
                                                  <button className="p-2 hover:bg-rose-600/20 text-rose-400 rounded-lg transition-all" title="İptal Et"><Icon name="trash" className="w-4 h-4" /></button>
                                              </td>
                                          </tr>
                                      );
                                  })}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          )}

          {mainTab === 'settings' && (
              <div className="max-w-4xl mx-auto space-y-8">
                  <div className="bg-white/5 border border-white/10 rounded-[3.5rem] p-12 backdrop-blur-3xl shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] -mr-32 -mt-32"></div>
                      <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Entegrasyon Ayarları</h2>
                      <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.3em] mb-12">E-Fatura Sağlayıcı Bağlantı Bilgileri</p>
                      <div className="space-y-8">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-2">
                                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">E-Fatura Sağlayıcı</label>
                                  <select className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none">
                                      <option value="parasut">PARAŞÜT (DİGİTAL PLANET)</option>
                                      <option value="logo">LOGO İŞBAŞI (E-LOGO)</option>
                                      <option value="uyumsoft">UYUMSOFT</option>
                                      <option value="edm">EDM BİLİŞİM</option>
                                      <option value="qnb">QNB E-FİNANS</option>
                                  </select>
                              </div>
                              <div className="space-y-2">
                                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">V.K.N / T.C. No</label>
                                  <input type="text" placeholder="11 haneli TC veya 10 haneli VKN" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                              </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-2">
                                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">API Client ID</label>
                                  <input type="password" placeholder="••••••••••••••••" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                              </div>
                              <div className="space-y-2">
                                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">API Secret Key</label>
                                  <input type="password" placeholder="••••••••••••••••" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                              </div>
                          </div>

                          <div className="bg-indigo-500/10 p-8 rounded-[2.5rem] border border-indigo-500/20 flex items-center justify-between">
                              <div className="flex items-center gap-6">
                                  <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
                                      <Icon name="ai" className="w-7 h-7 animate-pulse" />
                                  </div>
                                  <div>
                                      <h4 className="text-xs font-black text-white uppercase tracking-tight">Bağlantı Durumu</h4>
                                      <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">SİSTEM ÇEVRİMİÇİ - APİ BAĞLANTISI AKTİF</p>
                                  </div>
                              </div>
                              <button className="bg-white/10 hover:bg-white/20 text-white px-8 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">TEST ET</button>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {mainTab === 'reports' && (
              <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white/5 border border-white/10 rounded-[3.5rem] p-10 backdrop-blur-3xl shadow-2xl text-center">
                      <Icon name="chart" className="w-20 h-20 text-indigo-500/30 mb-6 mx-auto" />
                      <h3 className="text-xl font-black text-white uppercase tracking-tight">Gelir Dağılımı</h3>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-[3.5rem] p-10 backdrop-blur-3xl shadow-2xl text-center">
                      <Icon name="finance" className="w-20 h-20 text-emerald-500/30 mb-6 mx-auto" />
                      <h3 className="text-xl font-black text-white uppercase tracking-tight">Vergi Özet Tablosu</h3>
                  </div>
              </div>
          )}
      </div>

      {/* 🚀 BOTTOM ACTION BAR */}
      <footer className="p-6 border-t border-white/5 bg-white/[0.01] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-8">
              <div className="flex items-center gap-3 text-[10px] font-black text-white/40 uppercase tracking-widest">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div> GİB ENTEGRASYONU AKTİF
              </div>
          </div>
          <div className="flex items-center gap-4">
              <button className="px-6 h-10 rounded-lg bg-white/5 text-white text-[10px] font-black uppercase tracking-widest">EXCEL AKTAR</button>
              <button className="px-8 h-10 rounded-lg bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20">TOPLU MAİL GÖNDER</button>
          </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 20px; }
      `}</style>
    </div>
  );
};

export default EDonusumView;
