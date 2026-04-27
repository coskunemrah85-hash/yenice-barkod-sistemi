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
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const filteredItems = useMemo(() => {
    const list = activeTab === 'customers' ? customers : suppliers;
    return list.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (activeTab === 'suppliers' && (item as Supplier).taxNumber?.includes(searchTerm)) ||
      (item as any).phone?.includes(searchTerm)
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
    
    if (activeTab === 'customers') {
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
    <div className="w-full h-full bg-[#020617] p-8 overflow-y-auto custom-scrollbar font-sans">
      
      {/* 🌌 HEADER */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase underline decoration-indigo-500 decoration-4 underline-offset-8">CARİ <span className="text-indigo-400">YÖNETİMİ</span></h1>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.4em] mt-4 ml-1">Müşteri & Tedarikçi Finansal Üssü</p>
          </div>
          
          <div className="flex items-center gap-4">
              <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xl">
                  <button 
                    onClick={() => setActiveTab('customers')}
                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'customers' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                  >
                    Müşteriler
                  </button>
                  <button 
                    onClick={() => setActiveTab('suppliers')}
                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'suppliers' ? 'bg-indigo-600 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                  >
                    Tedarikçiler
                  </button>
              </div>
              <button 
                onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white h-14 px-8 rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-emerald-600/20 transition-all active:scale-95 flex items-center gap-3"
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
              <div key={i} className="bg-white/5 border border-white/10 p-8 rounded-[3rem] backdrop-blur-3xl group hover:bg-white/10 transition-all">
                  <div className={`w-12 h-12 bg-${s.col}-500/10 rounded-2xl flex items-center justify-center text-${s.col}-400 mb-6 group-hover:scale-110 transition-transform`}>
                      <Icon name={s.icon as any} className="w-6 h-6" />
                  </div>
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">{s.label}</p>
                  <h3 className="text-3xl font-black text-white tabular-nums">{s.val}</h3>
              </div>
          ))}
      </div>

      {/* 🔍 SEARCH & LIST */}
      <div className="bg-white/5 border border-white/10 rounded-[3.5rem] p-10 backdrop-blur-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 blur-[100px] -mr-48 -mt-48"></div>
          
          <div className="flex items-center gap-6 mb-10 relative z-10">
              <div className="flex-1 relative">
                  <Icon name="search" className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                  <input 
                    type="text" 
                    placeholder="İsim, Telefon veya Vergi No ile ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-16 pr-6 text-white font-bold placeholder:text-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  />
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 relative z-10">
              {filteredItems.map((item: any) => (
                  <div key={item.id} className="bg-white/5 border border-white/5 rounded-[2.5rem] p-8 hover:bg-white/10 transition-all group border-b-4 border-b-indigo-500/0 hover:border-b-indigo-500/50">
                      <div className="flex justify-between items-start mb-6">
                          <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 font-black text-xl">
                              {item.name.charAt(0)}
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-indigo-600 transition-all"><Icon name="settings" className="w-4 h-4" /></button>
                              <button onClick={() => activeTab === 'customers' ? onDeleteCustomer(item.id) : onDeleteSupplier(item.id)} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-rose-600 transition-all"><Icon name="trash" className="w-4 h-4" /></button>
                          </div>
                      </div>
                      <h4 className="text-lg font-black text-white uppercase tracking-tight mb-4 line-clamp-1">{item.name}</h4>
                      <div className="space-y-3">
                          <div className="flex items-center gap-3 text-white/40">
                              <Icon name="ai" className="w-4 h-4 opacity-30" />
                              <span className="text-[11px] font-bold uppercase tracking-widest">{activeTab === 'customers' ? item.phone : (item as Supplier).mobilePhone || 'Telefon Belirtilmemiş'}</span>
                          </div>
                          {activeTab === 'suppliers' && item.taxNumber && (
                              <div className="flex items-center gap-3 text-white/40">
                                  <Icon name="tag" className="w-4 h-4 opacity-30" />
                                  <span className="text-[11px] font-bold uppercase tracking-widest">VN: {item.taxNumber}</span>
                              </div>
                          )}
                          <div className="flex items-center gap-3 text-white/40">
                              <Icon name="back" className="w-4 h-4 opacity-30 rotate-180" />
                              <span className="text-[11px] font-bold uppercase tracking-widest truncate">{item.address || 'Adres Belirtilmemiş'}</span>
                          </div>
                      </div>
                  </div>
              ))}
          </div>

          {filteredItems.length === 0 && (
              <div className="text-center py-20">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Icon name="search" className="w-8 h-8 text-white/10" />
                  </div>
                  <p className="text-sm font-black text-white/20 uppercase tracking-[0.3em]">Sonuç Bulunamadı</p>
              </div>
          )}
      </div>

      {/* 🎭 MODAL */}
      {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
              <form onSubmit={handleSave} className="bg-[#0f172a] border border-white/10 w-full max-w-lg rounded-[3rem] p-10 relative z-10 shadow-2xl">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-8 flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                          <Icon name="plus" className="w-5 h-5" />
                      </div>
                      {editingItem ? 'KAYIT DÜZENLE' : 'YENİ CARİ KAYIT'}
                  </h3>

                  <div className="space-y-6">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">İsim / Ünvan</label>
                          <input required name="name" defaultValue={editingItem?.name} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Telefon</label>
                              <input name="phone" defaultValue={activeTab === 'customers' ? editingItem?.phone : editingItem?.mobilePhone} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                          </div>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">E-Posta</label>
                              <input name="email" defaultValue={editingItem?.email} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                          </div>
                      </div>
                      {activeTab === 'suppliers' && (
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Vergi Dairesi</label>
                                  <input name="taxOffice" defaultValue={editingItem?.taxOffice} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                              </div>
                              <div className="space-y-2">
                                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Vergi No</label>
                                  <input name="taxNumber" defaultValue={editingItem?.taxNumber} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                              </div>
                          </div>
                      )}
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-4">Adres</label>
                          <textarea name="address" defaultValue={editingItem?.address} rows={3} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold resize-none" />
                      </div>
                  </div>

                  <div className="flex gap-4 mt-10">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-white h-16 rounded-2xl font-black uppercase tracking-widest transition-all">İptal</button>
                      <button type="submit" className="flex-[2] bg-indigo-600 hover:bg-indigo-500 text-white h-16 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 transition-all active:scale-95">Kaydet</button>
                  </div>
              </form>
          </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 20px; }
      `}</style>
    </div>
  );
};

export default CariManagementView;
