import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Brand, Model, Color, Size, Group, Supplier, Product, Customer, CompanyInfo, Definitions } from '../types';
import Icon from '../components/Icon';
import SupplierEditModal from '../components/SupplierEditModal';
import CustomerEditModal from '../components/CustomerEditModal';

type Tab = 'brands' | 'models' | 'colors' | 'sizes' | 'groups' | 'suppliers' | 'customers';

interface DefinitionsViewProps {
  definitions: Definitions;
  suppliers: Supplier[];
  customers: Customer[];
  products: Product[];
  companyInfo: CompanyInfo;
  onUpdateBrands: (brands: Brand[]) => void;
  onUpdateModels: (models: Model[]) => void;
  onUpdateColors: (colors: Color[]) => void;
  onUpdateSizes: (sizes: Size[]) => void;
  onUpdateGroups: (groups: Group[]) => void;
  onUpdateSuppliers: (suppliers: Supplier[]) => void;
  onUpdateCustomers: (customers: Customer[]) => void;
  onStartAiSupplierTask: (file: File, prompt: string) => void;
}

const DefinitionsView: React.FC<DefinitionsViewProps> = (props) => {
    const { 
        definitions, suppliers, customers, 
        onUpdateBrands, onUpdateModels, onUpdateColors, onUpdateSizes, 
        onUpdateGroups, onUpdateSuppliers, onUpdateCustomers,
    } = props;
    
    const [activeTab, setActiveTab] = useState<Tab>('brands');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Filters for Groups
    const [filterParentGroupId, setFilterParentGroupId] = useState<string | null>(null);
    const [filterBrandIdForGroups, setFilterBrandIdForGroups] = useState<string | null>(null);

    // Inline Edit States
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    // Form States
    const [newItemName, setNewItemName] = useState('');
    const [selectedBrandId, setSelectedBrandId] = useState<string>('');
    const [selectedParentGroupId, setSelectedParentGroupId] = useState<string>('');

    // Modals
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

    useEffect(() => {
        // Reset specific filters when tab changes
        setFilterParentGroupId(null);
        setFilterBrandIdForGroups(null);
    }, [activeTab]);

    const filteredContent = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        let content: any[] = [];
        
        switch (activeTab) {
            case 'brands': content = definitions.brands; break;
            case 'models': content = definitions.models; break;
            case 'colors': content = definitions.colors; break;
            case 'sizes': content = definitions.sizes; break;
            case 'suppliers': content = suppliers; break;
            case 'customers': content = customers; break;
            case 'groups': 
                content = definitions.groups;
                // Apply Group specific filters
                if (filterParentGroupId) content = content.filter(g => g.parentId === filterParentGroupId);
                if (filterBrandIdForGroups) content = content.filter(g => g.brandId === filterBrandIdForGroups);
                break;
        }

        const filtered = content.filter(item => {
            const name = (item.name || '').toLowerCase();
            const phone = ((item as any).phone || (item as any).mobilePhone || '');
            return name.includes(lowerSearch) || phone.includes(searchTerm);
        });

        return [...filtered].sort((a, b) => {
            if (activeTab === 'sizes') {
                const sizeOrder: any = { 'XXS': 1, 'XS': 2, 'S': 3, 'M': 4, 'L': 5, 'XL': 6, 'XXL': 7, '2XL': 7, 'XXXL': 8, '3XL': 8 };
                const vA = String(a.name).toUpperCase();
                const vB = String(b.name).toUpperCase();
                if (sizeOrder[vA] && sizeOrder[vB]) return sizeOrder[vA] - sizeOrder[vB];
                const nA = parseInt(vA); const nB = parseInt(vB);
                if (!isNaN(nA) && !isNaN(nB)) return nA - nB;
                return vA.localeCompare(vB, 'tr');
            }
            return (a.name || '').localeCompare(b.name || '', 'tr', { sensitivity: 'base' });
        });
    }, [activeTab, searchTerm, definitions, suppliers, customers, filterParentGroupId, filterBrandIdForGroups]);

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        const name = newItemName.trim();
        if (!name) return;
        const id = Date.now().toString();

        switch (activeTab) {
            case 'brands': onUpdateBrands([...definitions.brands, { id, name }]); break;
            case 'models':
                if (selectedBrandId) onUpdateModels([...definitions.models, { id, name, brandId: selectedBrandId }]);
                else alert("Lütfen bir marka seçin!");
                break;
            case 'colors': onUpdateColors([...definitions.colors, { id, name }]); break;
            case 'sizes': onUpdateSizes([...definitions.sizes, { id, name }]); break;
            case 'groups':
                onUpdateGroups([...definitions.groups, { id, name, parentId: selectedParentGroupId || null, brandId: selectedBrandId || null }]);
                break;
            case 'suppliers': setEditingSupplier(null); setIsSupplierModalOpen(true); return;
            case 'customers': setEditingCustomer(null); setIsCustomerModalOpen(true); return;
        }
        setNewItemName('');
    };

    const handleSaveEdit = (id: string) => {
        const val = editValue.trim();
        if (!val) { setEditingId(null); return; }

        switch(activeTab) {
            case 'brands': onUpdateBrands(definitions.brands.map(x => x.id === id ? { ...x, name: val } : x)); break;
            case 'models': onUpdateModels(definitions.models.map(x => x.id === id ? { ...x, name: val } : x)); break;
            case 'colors': onUpdateColors(definitions.colors.map(x => x.id === id ? { ...x, name: val } : x)); break;
            case 'sizes': onUpdateSizes(definitions.sizes.map(x => x.id === id ? { ...x, name: val } : x)); break;
            case 'groups': onUpdateGroups(definitions.groups.map(x => x.id === id ? { ...x, name: val } : x)); break;
        }
        setEditingId(null);
    };

    const commitDeletion = () => {
        if (!confirmDeleteId) return;
        const id = confirmDeleteId;
        switch(activeTab) {
            case 'brands': onUpdateBrands([...definitions.brands.filter(x => x.id !== id)]); break;
            case 'models': onUpdateModels([...definitions.models.filter(x => x.id !== id)]); break;
            case 'colors': onUpdateColors([...definitions.colors.filter(x => x.id !== id)]); break;
            case 'sizes': onUpdateSizes([...definitions.sizes.filter(x => x.id !== id)]); break;
            case 'groups': onUpdateGroups([...definitions.groups.filter(x => x.id !== id)]); break;
            case 'suppliers': onUpdateSuppliers([...suppliers.filter(x => x.id !== id)]); break;
            case 'customers': onUpdateCustomers([...customers.filter(x => x.id !== id)]); break;
        }
        setConfirmDeleteId(null);
    };

    const menuItems: { id: Tab; label: string; icon: any, color: string }[] = [
        { id: 'brands', label: 'Markalar', icon: 'tag', color: 'bg-blue-500' },
        { id: 'models', label: 'Modeller', icon: 'products', color: 'bg-indigo-500' },
        { id: 'colors', label: 'Renkler', icon: 'back', color: 'bg-pink-500' },
        { id: 'sizes', label: 'Bedenler', icon: 'list-bullet', color: 'bg-purple-500' },
        { id: 'groups', label: 'Gruplar', icon: 'database', color: 'bg-orange-500' },
        { id: 'suppliers', label: 'Tedarikçiler', icon: 'supplier', color: 'bg-emerald-500' },
        { id: 'customers', label: 'Müşteriler', icon: 'users', color: 'bg-cyan-500' },
    ];

    return (
        <div className="flex w-full h-full bg-[#0f172a] text-slate-300 overflow-hidden font-sans relative">
            
            {/* 🔴 SİLME ONAY MODALI */}
            {confirmDeleteId && (
                <div className="absolute inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-8 animate-fade-in">
                    <div className="bg-[#1e293b] border border-white/10 p-10 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center">
                        <div className="w-16 h-16 bg-rose-500/20 rounded-2xl flex items-center justify-center text-rose-500 mx-auto mb-6">
                            <Icon name="trash" className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase mb-2">Emin misiniz?</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase mb-8">Bu kayıt kalıcı olarak silinecek.</p>
                        <div className="flex gap-4">
                            <button onClick={() => setConfirmDeleteId(null)} className="flex-1 h-12 bg-white/5 hover:bg-white/10 rounded-xl font-black text-[10px] uppercase transition-all">VAZGEÇ</button>
                            <button onClick={commitDeletion} className="flex-1 h-12 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-rose-900/20 transition-all">EVET, SİL</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <aside className="w-80 border-r border-white/5 bg-slate-950/30 flex flex-col shrink-0">
                <div className="p-8 pb-4">
                    <h1 className="text-xl font-black text-white tracking-tighter mb-1 uppercase italic">Studio <span className="text-cyan-500">Pro</span></h1>
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Sistem Parametreleri</p>
                </div>
                <nav className="flex-grow px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
                    {menuItems.map(item => (
                        <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full group flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${activeTab === item.id ? 'bg-cyan-600 text-white shadow-xl shadow-cyan-900/20' : 'text-slate-500 hover:bg-white/5'}`}>
                            <Icon name={item.icon} className="w-5 h-5" />
                            <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 bg-[#020617]">
                <header className="h-24 px-8 border-b border-white/5 flex items-center justify-between sticky top-0 z-30 bg-[#020617]/80 backdrop-blur-xl">
                    <div className="flex items-center gap-6">
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight italic">{menuItems.find(m => m.id === activeTab)?.label}</h2>
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{filteredContent.length} TOPLAM KAYIT</p>
                        </div>
                        <div className="relative w-80">
                            <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Hızlı Ara..." className="w-full h-11 pl-11 pr-4 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-cyan-500/50 transition-all font-mono placeholder:text-slate-800" />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {activeTab === 'groups' && (filterParentGroupId || filterBrandIdForGroups) && (
                            <button onClick={() => { setFilterParentGroupId(null); setFilterBrandIdForGroups(null); }} className="flex items-center gap-2 text-[10px] font-black text-rose-500 uppercase bg-rose-500/10 px-4 py-2 rounded-full border border-rose-500/20 hover:bg-rose-500/20 transition-all">
                                <Icon name="back" className="w-3 h-3" /> FİLTREYİ TEMİZLE
                            </button>
                        )}
                        <button 
                            onClick={() => {
                                if(activeTab === 'suppliers') { setEditingSupplier(null); setIsSupplierModalOpen(true); }
                                else if(activeTab === 'customers') { setEditingCustomer(null); setIsCustomerModalOpen(true); }
                                else { document.getElementById('new-item-input')?.focus(); }
                            }}
                            className="px-8 h-12 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-cyan-900/40 active:scale-95 flex items-center gap-2"
                        >
                            <Icon name="plus" className="w-4 h-4" /> YENİ {menuItems.find(m => m.id === activeTab)?.label.slice(0, -3).toUpperCase()} EKLE
                        </button>
                    </div>
                </header>

                <div className="flex-grow flex p-8 gap-8 overflow-hidden">
                    {/* Filter and Add Form Area */}
                    <div className="w-80 shrink-0 space-y-6">
                        
                        {/* Special Group Filters */}
                        {activeTab === 'groups' && (
                            <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-4">
                                <span className="text-[9px] font-black text-cyan-500 uppercase tracking-[0.2em] px-1">Özel Filtreleme</span>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[8px] font-black text-slate-500 uppercase">Markaya Göre Süz</label>
                                        <select value={filterBrandIdForGroups || ''} onChange={e => setFilterBrandIdForGroups(e.target.value || null)} className="w-full h-10 bg-slate-900 border border-white/10 rounded-xl px-3 text-[10px] font-bold text-white outline-none">
                                            <option value="">Tüm Markalar</option>
                                            {definitions.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[8px] font-black text-slate-500 uppercase">Ana Gruba Göre Süz</label>
                                        <select value={filterParentGroupId || ''} onChange={e => setFilterParentGroupId(e.target.value || null)} className="w-full h-10 bg-slate-900 border border-white/10 rounded-xl px-3 text-[10px] font-bold text-white outline-none">
                                            <option value="">Tüm Gruplar</option>
                                            {definitions.groups.filter(g => !g.parentId).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Add Form */}
                        {['brands', 'models', 'colors', 'sizes', 'groups'].includes(activeTab) && (
                            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
                                <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-6 block px-1">YENİ TANIMLAMA</span>
                                <form onSubmit={handleAddItem} className="space-y-6">
                                    {activeTab === 'models' && (
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-slate-500 uppercase px-1">Marka Seçimi</label>
                                            <select value={selectedBrandId} onChange={e => setSelectedBrandId(e.target.value)} className="w-full h-12 bg-slate-900 border border-white/10 rounded-xl px-4 text-xs font-bold text-white outline-none">
                                                <option value="">İlgili Marka Seçin</option>
                                                {definitions.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    {activeTab === 'groups' && (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-500 uppercase px-1">ÜST GRUP (VARSA)</label>
                                                <select value={selectedParentGroupId} onChange={e => setSelectedParentGroupId(e.target.value)} className="w-full h-12 bg-slate-900 border border-white/10 rounded-xl px-4 text-xs font-bold text-white outline-none">
                                                    <option value="">Ana Grup Olarak Ekle</option>
                                                    {definitions.groups.filter(g => !g.parentId).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-slate-500 uppercase px-1">İLGİLİ MARKA</label>
                                                <select value={selectedBrandId} onChange={e => setSelectedBrandId(e.target.value)} className="w-full h-12 bg-slate-900 border border-white/10 rounded-xl px-4 text-xs font-bold text-white outline-none">
                                                    <option value="">Genel (Tüm Markalar)</option>
                                                    {definitions.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-500 uppercase px-1">AD TANIMI</label>
                                        <input 
                                            id="new-item-input"
                                            type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} 
                                            placeholder={`Örn: Yeni ${menuItems.find(m => m.id === activeTab)?.label.slice(0, -3)}...`}
                                            className="w-full h-14 bg-slate-900 border-2 border-transparent focus:border-cyan-500/50 rounded-2xl px-6 text-sm font-bold text-white outline-none transition-all placeholder:text-slate-800"
                                            required 
                                        />
                                    </div>
                                    <button type="submit" className="w-full h-14 bg-white text-slate-900 rounded-[1.2rem] font-black uppercase text-[10px] tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl">KAYDET</button>
                                </form>
                            </div>
                        )}
                    </div>

                    {/* Data Table Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                        
                        {/* List Layout */}
                        <div className="space-y-3">
                            {filteredContent.map((item: any, idx: number) => (
                                <div 
                                    key={item.id} 
                                    className={`group flex items-center gap-6 p-2 pr-6 bg-white/[0.02] border border-white/5 rounded-[2rem] hover:bg-white/[0.04] transition-all cursor-pointer ${item.id === filterParentGroupId ? 'border-cyan-500/40 bg-cyan-500/5' : ''}`}
                                    onClick={() => {
                                        if (activeTab === 'groups' && !item.parentId) {
                                            setFilterParentGroupId(item.id);
                                        }
                                    }}
                                >
                                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-[10px] font-black text-cyan-500 shadow-inner shrink-0 relative">
                                        #{idx + 1}
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        {editingId === item.id ? (
                                            <input 
                                                autoFocus
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value)}
                                                onBlur={() => handleSaveEdit(item.id)}
                                                onKeyDown={e => e.key === 'Enter' && handleSaveEdit(item.id)}
                                                className="w-full h-10 bg-slate-900 border border-cyan-500/50 rounded-lg px-4 text-sm font-bold text-white outline-none shadow-xl"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            <h3 className="text-sm font-black text-white uppercase truncate tracking-tight">{item.name}</h3>
                                        )}
                                        <div className="flex gap-2 items-center mt-0.5">
                                            <p className="text-[9px] font-bold text-slate-700 uppercase tracking-widest italic">{item.barcode || item.id.slice(-6)}</p>
                                            {item.parentId && (
                                                <span className="bg-orange-500/10 text-orange-500 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                                    Alt Grup: {definitions.groups.find(g => g.id === item.parentId)?.name}
                                                </span>
                                            )}
                                            {item.brandId && (
                                                <span className="bg-indigo-500/10 text-indigo-500 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                                    Marka: {definitions.brands.find(b => b.id === item.brandId)?.name}
                                                </span>
                                            )}
                                            {activeTab === 'groups' && !item.parentId && (
                                                <span className="bg-emerald-500/10 text-emerald-500 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter animate-pulse">Ana Grup Click</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transition-duration-300">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if(['suppliers', 'customers'].includes(activeTab)) {
                                                    if(activeTab === 'suppliers') { setEditingSupplier(item); setIsSupplierModalOpen(true); }
                                                    else { setEditingCustomer(item); setIsCustomerModalOpen(true); }
                                                } else {
                                                    setEditingId(item.id);
                                                    setEditValue(item.name);
                                                }
                                            }}
                                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-slate-500 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all"
                                        >
                                            <Icon name="edit" className="w-5 h-5" />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(item.id); }} 
                                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                                        >
                                            <Icon name="trash" className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {filteredContent.length === 0 && (
                                <div className="py-20 text-center bg-white/[0.01] border border-dashed border-white/5 rounded-[3rem]">
                                    <Icon name="search" className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">Aradığınız kritere uygun kayıt bulunamadı</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {isSupplierModalOpen && <SupplierEditModal isOpen={isSupplierModalOpen} onClose={() => setIsSupplierModalOpen(false)} supplierToEdit={editingSupplier} onSave={(s) => {
                if (!s.id) onUpdateSuppliers([...suppliers, { ...s, id: `sup-${Date.now()}` } as Supplier]);
                else onUpdateSuppliers(suppliers.map(x => x.id === s.id ? { ...x, ...s } : x));
                setIsSupplierModalOpen(false);
            }} />}

            {isCustomerModalOpen && <CustomerEditModal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} customerToEdit={editingCustomer} onSave={(c) => {
                if (!c.id) onUpdateCustomers([...customers, { ...c, id: `cust-${Date.now()}` } as Customer]);
                else onUpdateCustomers(customers.map(x => x.id === c.id ? { ...x, ...c } : x));
                setIsCustomerModalOpen(false);
            }} />}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 20px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6366f1; }
                @keyframes fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in { animation: fade-in 0.3s cubic-bezier(0,0,0.2,1); }
            `}</style>
        </div>
    );
};

export default DefinitionsView;