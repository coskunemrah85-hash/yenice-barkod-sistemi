import React, { useState, useMemo } from 'react';
import { Customer, Supplier, View, TabIcon } from '../types';
import Icon from '../components/Icon';

interface CariManagementViewProps {
  customers: Customer[];
  suppliers: Supplier[];
  onAddCustomer: (customer: Customer) => void;
  onAddSupplier: (supplier: Supplier) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onUpdateSupplier: (supplier: Supplier) => void;
  onDeleteCustomer: (id: string) => void;
  onDeleteSupplier: (id: string) => void;
}

const CariManagementView: React.FC<CariManagementViewProps> = ({ 
  customers, suppliers, onAddCustomer, onAddSupplier, onUpdateCustomer, onUpdateSupplier, onDeleteCustomer, onDeleteSupplier 
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'customers' | 'suppliers'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [modalRecordType, setModalRecordType] = useState<'customer' | 'supplier'>('customer');

  const filteredItems = useMemo(() => {
    let list: any[] = [];
    if (activeTab === 'all') {
        list = [
            ...customers.map(c => ({ ...c, _type: 'customer' })),
            ...suppliers.map(s => ({ ...s, _type: 'supplier' }))
        ];
    } else if (activeTab === 'customers') {
        list = customers.map(c => ({ ...c, _type: 'customer' }));
    } else {
        list = suppliers.map(s => ({ ...s, _type: 'supplier' }));
    }

    return list.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item._type === 'supplier' && item.taxNumber?.includes(searchTerm)) ||
      (item.phone || item.mobilePhone)?.includes(searchTerm)
    ).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [activeTab, customers, suppliers, searchTerm]);

  const stats = useMemo(() => {
    return {
      customerCount: customers.length,
      supplierCount: suppliers.length,
      totalBalance: 0, // Placeholder for future debt/credit logic
    };
  }, [customers, suppliers]);

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = Object.fromEntries(formData.entries());
    
    if (modalRecordType === 'customer') {
      const newCustomer: Customer = {
        id: editingItem?.id || Date.now().toString(),
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
      };
      editingItem ? onUpdateCustomer(newCustomer) : onAddCustomer(newCustomer);
    } else {
      const newSupplier: Supplier = {
        id: editingItem?.id || Date.now().toString(),
        name: data.name,
        mobilePhone: data.phone, // using data.phone from form but mapping to mobilePhone
        email: data.email,
        taxOffice: data.taxOffice,
        taxNumber: data.taxNumber,
      };
      editingItem ? onUpdateSupplier(newSupplier) : onAddSupplier(newSupplier);
    }
    setIsModalOpen(false);
    setEditingItem(null);
  };

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-slate-950 p-8 overflow-y-auto custom-scrollbar font-sans">
      
      {/* 🌌 HEADER */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase underline decoration-indigo-500 decoration-4 underline-offset-8">CARİ <span className="text-indigo-400">YÖNETİMİ</span></h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.4em] mt-4 ml-1">Müşteri & Tedarikçi Finansal Üssü</p>
          </div>
          
          <div className="flex items-center gap-4">
              <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-xl">
                  <button 
                    onClick={() => setActiveTab('all')}
                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'all' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
                  >
                    Tümü
                  </button>
                  <button 
                    onClick={() => setActiveTab('customers')}
                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'customers' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
                  >
                    Müşteriler
                  </button>
                  <button 
                    onClick={() => setActiveTab('suppliers')}
                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'suppliers' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
                  >
                    Tedarikçiler
                  </button>
              </div>
              <button 
                onClick={() => { setEditingItem(null); setModalRecordType(activeTab === 'suppliers' ? 'supplier' : 'customer'); setIsModalOpen(true); }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white h-14 px-8 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all active:scale-95 flex items-center gap-3"
              >
                <Icon name="plus" className="w-5 h-5" /> Yeni Kayıt
              </button>
          </div>
      </header>

      {/* 📊 STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
              { label: 'TOPLAM MÜŞTERİ', val: stats.customerCount, icon: 'customer', col: 'indigo' },
              { label: 'TOPLAM TEDARİKÇİ', val: stats.supplierCount, icon: 'supplier', col: 'emerald' },
              { label: 'AKTİF CARİ HACİM', val: '0.00 ₺', icon: 'finance', col: 'amber' }
          ].map((s, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[3rem] shadow-sm group hover:shadow-md transition-all">
                  <div className={`w-12 h-12 bg-${s.col}-500/10 rounded-2xl flex items-center justify-center text-${s.col}-400 mb-6 group-hover:scale-110 transition-transform`}>
                      <Icon name={s.icon as any} className="w-6 h-6" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
                  <h3 className="text-3xl font-black text-slate-800 dark:text-white tabular-nums">{s.val}</h3>
              </div>
          ))}
      </div>

      {/* 🔍 SEARCH & LIST */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3.5rem] p-10 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 blur-[100px] -mr-48 -mt-48"></div>
          
          <div className="flex items-center gap-6 mb-10 relative z-10">
              <div className="flex-1 relative">
                  <Icon name="search" className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="İsim, Telefon veya Vergi No ile ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-5 pl-16 pr-6 text-slate-800 dark:text-white font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  />
              </div>
          </div>

          <div className="overflow-x-auto relative z-10 pb-4">
              <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                          <th className="px-6 py-5 font-black rounded-tl-2xl">Cari Ünvanı</th>
                          {activeTab === 'all' && <th className="px-6 py-5 font-black">Tip</th>}
                          <th className="px-6 py-5 font-black">İletişim Bilgileri</th>
                          {(activeTab === 'all' || activeTab === 'suppliers') && <th className="px-6 py-5 font-black">Vergi Bilgileri</th>}
                          <th className="px-6 py-5 font-black">Adres</th>
                          <th className="px-6 py-5 font-black text-right rounded-tr-2xl">İşlemler</th>
                      </tr>
                  </thead>
                  <tbody>
                      {filteredItems.map((item: any) => (
                          <tr key={`${item._type}-${item.id}`} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                              <td className="px-6 py-4">
                                  <div className="flex items-center gap-4">
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${item._type === 'customer' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                                          {item.name.charAt(0)}
                                      </div>
                                      <span className="font-bold text-slate-800 dark:text-white uppercase">{item.name}</span>
                                  </div>
                              </td>
                              {activeTab === 'all' && (
                                  <td className="px-6 py-4">
                                      <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${item._type === 'customer' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'}`}>
                                          {item._type === 'customer' ? 'Müşteri' : 'Tedarikçi'}
                                      </span>
                                  </td>
                              )}
                              <td className="px-6 py-4">
                                  <div className="flex flex-col gap-1 text-slate-500 dark:text-slate-400 text-xs font-medium">
                                      <div className="flex items-center gap-2"><Icon name="ai" className="w-3.5 h-3.5 opacity-50" /> {item.phone || item.mobilePhone || '-'}</div>
                                      {item.email && <div className="flex items-center gap-2"><Icon name="tag" className="w-3.5 h-3.5 opacity-50" /> {item.email}</div>}
                                  </div>
                              </td>
                              {(activeTab === 'all' || activeTab === 'suppliers') && (
                                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono text-xs">
                                      {item._type === 'supplier' ? (
                                          <>
                                              {item.taxNumber ? `VN: ${item.taxNumber}` : '-'}<br/>
                                              {item.taxOffice ? `VD: ${item.taxOffice}` : ''}
                                          </>
                                      ) : (
                                          '-'
                                      )}
                                  </td>
                              )}
                              <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs max-w-[200px] truncate">
                                  {item.address || '-'}
                              </td>
                              <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => { setEditingItem(item); setModalRecordType(item._type); setIsModalOpen(true); }} className="w-9 h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-500/30 transition-all shadow-sm"><Icon name="settings" className="w-4 h-4" /></button>
                                      <button onClick={() => item._type === 'customer' ? onDeleteCustomer(item.id) : onDeleteSupplier(item.id)} className="w-9 h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-500/30 transition-all shadow-sm"><Icon name="trash" className="w-4 h-4" /></button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>

          {filteredItems.length === 0 && (
              <div className="text-center py-20">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Icon name="search" className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  </div>
                  <p className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Sonuç Bulunamadı</p>
              </div>
          )}
      </div>

      {/* 🎭 MODAL */}
      {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
              <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full max-w-lg rounded-[3rem] p-10 relative z-10 shadow-2xl">
                  <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight mb-8 flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                          <Icon name="plus" className="w-5 h-5" />
                      </div>
                      {editingItem ? 'KAYIT DÜZENLE' : 'YENİ CARİ KAYIT'}
                  </h3>

                  <div className="space-y-6">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-4">Kayıt Tipi</label>
                          <select 
                              value={modalRecordType}
                              onChange={(e) => setModalRecordType(e.target.value as any)}
                              disabled={!!editingItem}
                              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              <option value="customer">Müşteri</option>
                              <option value="supplier">Tedarikçi</option>
                          </select>
                      </div>

                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-4">İsim / Ünvan</label>
                          <input required name="name" defaultValue={editingItem?.name} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-4">Telefon / Gsm</label>
                              <input name="phone" defaultValue={editingItem?.phone || editingItem?.mobilePhone} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-4">E-Posta</label>
                              <input name="email" defaultValue={editingItem?.email} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                          </div>
                      </div>
                      {modalRecordType === 'supplier' && (
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-4">Vergi Dairesi</label>
                                  <input name="taxOffice" defaultValue={editingItem?.taxOffice} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                              </div>
                              <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-4">Vergi No</label>
                                  <input name="taxNumber" defaultValue={editingItem?.taxNumber} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                              </div>
                          </div>
                      )}
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-4">Adres</label>
                          <textarea name="address" defaultValue={editingItem?.address} rows={3} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold resize-none" />
                      </div>
                  </div>

                  <div className="flex gap-4 mt-10">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 h-16 rounded-2xl font-black uppercase tracking-widest transition-all">İptal</button>
                      <button type="submit" className="flex-[2] bg-indigo-600 hover:bg-indigo-500 text-white h-16 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all active:scale-95">Kaydet</button>
                  </div>
              </form>
          </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 20px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 20px; }
      `}</style>
    </div>
  );
};

export default CariManagementView;
