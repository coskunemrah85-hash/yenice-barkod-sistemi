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
    const [filterBrandId, setFilterBrandId] = useState<string | null>(null);

    // Inline Edit States
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [editBrandId, setEditBrandId] = useState<string>('');
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
        setFilterBrandId(null);
    }, [activeTab]);

    const filteredContent = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        let content: any[] = [];
        
        switch (activeTab) {
            case 'brands': content = definitions.brands; break;
            case 'models': 
                content = definitions.models; 
                if (filterBrandId) content = content.filter(m => m.brandId === filterBrandId);
                break;
            case 'colors': content = definitions.colors; break;
            case 'sizes': content = definitions.sizes; break;
            case 'suppliers': content = suppliers; break;
            case 'customers': content = customers; break;
            case 'groups': 
                content = definitions.groups;
                // Apply Group specific filters
                if (filterParentGroupId) content = content.filter(g => g.parentId === filterParentGroupId);
                if (filterBrandId) content = content.filter(g => g.brandId === filterBrandId);
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
    }, [activeTab, searchTerm, definitions, suppliers, customers, filterParentGroupId, filterBrandId]);

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
            case 'models': onUpdateModels(definitions.models.map(x => x.id === id ? { ...x, name: val, brandId: editBrandId || x.brandId } : x)); break;
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

    const handleSyncFromProducts = () => {
        let newBrands = [...definitions.brands];
        let newModels = [...definitions.models];
        let newGroups = [...definitions.groups];
        let brandsAdded = 0;
        let modelsAdded = 0;
        let groupsAdded = 0;

        props.products.forEach(product => {
            const markaName = (product.marka || '').trim();
            const modelName = (product.model || '').trim();
            const anaGroupName = (product.group || '').trim();
            const araGroupName = (product.midGroup || '').trim();
            const altGroupName = (product.subGroup || '').trim();

            // 1. Marka kontrolü ve ekleme
            let brandId: string | null = null;
            if (markaName) {
                let brand = newBrands.find(b => b.name.toLowerCase() === markaName.toLowerCase());
                if (!brand) {
                    brand = { id: `br-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, name: markaName };
                    newBrands.push(brand);
                    brandsAdded++;
                }
                brandId = brand.id;
            }

            // 2. Model kontrolü ve ekleme
            if (modelName && brandId) {
                const modelExists = newModels.find(m => m.brandId === brandId && m.name.toLowerCase() === modelName.toLowerCase());
                if (!modelExists) {
                    newModels.push({ 
                        id: `mod-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, 
                        brandId: brandId, 
                        name: modelName 
                    });
                    modelsAdded++;
                }
            }

            // 3. Hiyerarşik Grup Kontrolü (Ana > Ara > Alt)
            let currentParentId: string | null = null;

            // --- ANA GRUP ---
            if (anaGroupName) {
                let anaG = newGroups.find(g => !g.parentId && g.name.toLowerCase() === anaGroupName.toLowerCase());
                if (!anaG) {
                    anaG = { 
                        id: `grp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, 
                        name: anaGroupName, 
                        parentId: null, 
                        brandId: null // Ana gruplar genelde geneldir
                    };
                    newGroups.push(anaG);
                    groupsAdded++;
                }
                currentParentId = anaG.id;
            }

            // --- ARA GRUP ---
            if (araGroupName && currentParentId) {
                let araG = newGroups.find(g => g.parentId === currentParentId && g.name.toLowerCase() === araGroupName.toLowerCase());
                if (!araG) {
                    araG = { 
                        id: `grp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, 
                        name: araGroupName, 
                        parentId: currentParentId, 
                        brandId: null
                    };
                    newGroups.push(araG);
                    groupsAdded++;
                }
                currentParentId = araG.id;
            }

            // --- ALT GRUP ---
            if (altGroupName && currentParentId) {
                let altG = newGroups.find(g => g.parentId === currentParentId && g.name.toLowerCase() === altGroupName.toLowerCase());
                if (!altG) {
                    altG = { 
                        id: `grp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, 
                        name: altGroupName, 
                        parentId: currentParentId, 
                        brandId: null
                    };
                    newGroups.push(altG);
                    groupsAdded++;
                }
            }
        });

        if (brandsAdded > 0) onUpdateBrands(newBrands);
        if (modelsAdded > 0) onUpdateModels(newModels);
        if (groupsAdded > 0) onUpdateGroups(newGroups);
        
        if (brandsAdded > 0 || modelsAdded > 0 || groupsAdded > 0) {
            alert(`${brandsAdded} yeni marka, ${modelsAdded} yeni model ve ${groupsAdded} yeni grup başarıyla tanımlara eklendi.`);
        } else {
            alert("Tüm bilgiler zaten tanımlı.");
        }
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
                        {['brands', 'models'].includes(activeTab) && (
                            <button 
                                onClick={handleSyncFromProducts}
                                className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase bg-indigo-500/10 px-6 py-3 rounded-2xl border border-indigo-500/20 hover:bg-indigo-500/20 transition-all shadow-lg"
                                title="Ürün listesindeki eksik tanımları otomatik ekle"
                            >
                                <Icon name="refresh" className="w-4 h-4" /> OTOMATİK SENKRONİZE ET
                            </button>
                        )}
                        {(filterParentGroupId || filterBrandId) && (
                            <button onClick={() => { setFilterParentGroupId(null); setFilterBrandId(null); }} className="flex items-center gap-2 text-[10px] font-black text-rose-500 uppercase bg-rose-500/10 px-4 py-2 rounded-full border border-rose-500/20 hover:bg-rose-500/20 transition-all">
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
                        
                        {/* Global Brand Filter for Models and Groups */}
                        {['models', 'groups'].includes(activeTab) && (
                            <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-4">
                                <span className="text-[9px] font-black text-cyan-500 uppercase tracking-[0.2em] px-1">Marka Filtresi</span>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[8px] font-black text-slate-500 uppercase">Seçili Markaya Göre Listele</label>
                                        <select value={filterBrandId || ''} onChange={e => {
                                            const val = e.target.value || null;
                                            setFilterBrandId(val);
                                            if (val) setSelectedBrandId(val); // Sync with add form
                                        }} className="w-full h-10 bg-slate-900 border border-white/10 rounded-xl px-3 text-[10px] font-bold text-white outline-none focus:border-cyan-500/50 transition-all">
                                            <option value="">Tüm Markalar</option>
                                            {definitions.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                    {activeTab === 'groups' && (
                                        <div className="space-y-2">
                                            <label className="text-[8px] font-black text-slate-500 uppercase">Ana Gruba Göre Süz</label>
                                            <select value={filterParentGroupId || ''} onChange={e => setFilterParentGroupId(e.target.value || null)} className="w-full h-10 bg-slate-900 border border-white/10 rounded-xl px-3 text-[10px] font-bold text-white outline-none">
                                                <option value="">Tüm Gruplar</option>
                                                {definitions.groups.filter(g => !g.parentId).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                            </select>
                                        </div>
                                    )}
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
                        {/* Dual-List Layout for Models */}
                        {activeTab === 'models' ? (
                            <div className="flex h-full gap-8 overflow-hidden">
                                {/* LIST 1: BRANDS */}
                                <div className="w-72 flex flex-col bg-slate-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden shrink-0 shadow-2xl">
                                    <div className="p-8 border-b border-white/5 bg-slate-900/80 backdrop-blur-md">
                                        <h4 className="text-[11px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-1">MARKALAR</h4>
                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{definitions.brands.length} KAYITLI</p>
                                    </div>
                                    <div className="flex-grow overflow-y-auto custom-scrollbar p-4 space-y-2">
                                        {definitions.brands.map(brand => (
                                            <button 
                                                key={brand.id}
                                                onClick={() => {
                                                    setFilterBrandId(brand.id);
                                                    setSelectedBrandId(brand.id);
                                                    setEditingId(null);
                                                }}
                                                className={`w-full text-left px-6 py-5 rounded-2xl text-[11px] font-black uppercase transition-all flex items-center justify-between group ${filterBrandId === brand.id ? 'bg-cyan-600 text-white shadow-xl shadow-cyan-900/40 translate-x-2' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                                            >
                                                <span className="truncate">{brand.name}</span>
                                                <Icon name="back" className={`w-3 h-3 transition-transform ${filterBrandId === brand.id ? 'rotate-180 text-white' : 'opacity-0 group-hover:opacity-100'}`} />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* LIST 2: MODELS OF SELECTED BRAND */}
                                <div className="flex-1 flex flex-col bg-slate-900/30 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-inner">
                                    {!filterBrandId ? (
                                        <div className="flex-grow flex flex-col items-center justify-center p-20 text-center opacity-40">
                                            <div className="w-24 h-24 bg-slate-800 rounded-3xl flex items-center justify-center mb-6">
                                                <Icon name="tag" className="w-10 h-10 text-slate-600" />
                                            </div>
                                            <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-2">Lütfen Bir Marka Seçin</h4>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Modelleri görüntülemek ve yönetmek için soldan seçim yapın</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-500">
                                                        <Icon name="products" className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xl font-black text-white uppercase tracking-tight">
                                                            {definitions.brands.find(b => b.id === filterBrandId)?.name} <span className="text-indigo-500 italic">MODELLERİ</span>
                                                        </h4>
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{filteredContent.length} TOPLAM MODEL TANIMI</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-3">
                                                {filteredContent.map((item: any, idx: number) => (
                                                    <div 
                                                        key={item.id} 
                                                        className="group flex items-center gap-6 p-2 pr-6 bg-slate-950/40 border border-white/5 rounded-[2rem] hover:bg-slate-950/60 hover:border-indigo-500/30 transition-all shadow-lg"
                                                    >
                                                        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-[10px] font-black text-indigo-500 shadow-inner shrink-0">
                                                            #{idx + 1}
                                                        </div>
                                                        <div className="flex-grow min-w-0">
                                                            {editingId === item.id ? (
                                                                <div className="flex items-center gap-3">
                                                                    <input 
                                                                        autoFocus
                                                                        value={editValue}
                                                                        onChange={e => setEditValue(e.target.value)}
                                                                        onKeyDown={e => e.key === 'Enter' && handleSaveEdit(item.id)}
                                                                        className="flex-grow h-11 bg-slate-900 border-2 border-indigo-500/50 rounded-xl px-4 text-sm font-bold text-white outline-none shadow-xl"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        placeholder="Model Adı..."
                                                                    />
                                                                    <button onClick={() => handleSaveEdit(item.id)} className="w-11 h-11 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg"><Icon name="check" className="w-5 h-5" /></button>
                                                                    <button onClick={() => setEditingId(null)} className="w-11 h-11 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400"><Icon name="x-circle" className="w-5 h-5" /></button>
                                                                </div>
                                                            ) : (
                                                                <h3 className="text-sm font-black text-white uppercase truncate tracking-tight px-2">{item.name}</h3>
                                                            )}
                                                        </div>

                                                        {editingId !== item.id && (
                                                            <div className="flex gap-2">
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingId(item.id);
                                                                        setEditValue(item.name);
                                                                        setEditBrandId(item.brandId || '');
                                                                    }}
                                                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 text-slate-500 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all border border-white/5"
                                                                    title="Düzenle"
                                                                >
                                                                    <Icon name="edit" className="w-5 h-5" />
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(item.id); }} 
                                                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all border border-white/5"
                                                                    title="Sil"
                                                                >
                                                                    <Icon name="minus" className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}

                                                {/* INLINE ADD FORM AT BOTTOM */}
                                                <div className="mt-8 pt-8 border-t border-white/5">
                                                    <form onSubmit={handleAddItem} className="flex gap-4 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-[2.5rem] items-center">
                                                        <div className="w-14 h-14 bg-emerald-600 rounded-[1.4rem] flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-900/20">
                                                            <Icon name="plus" className="w-6 h-6" />
                                                        </div>
                                                        <input 
                                                            type="text" 
                                                            value={newItemName} 
                                                            onChange={e => setNewItemName(e.target.value)}
                                                            placeholder="Yeni Model Adı Yazın..."
                                                            className="flex-grow h-14 bg-transparent border-none text-sm font-bold text-white outline-none placeholder:text-emerald-500/40 px-2"
                                                            required
                                                        />
                                                        <button 
                                                            type="submit"
                                                            className="px-10 h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[1.2rem] font-black text-[11px] uppercase tracking-widest transition-all shadow-xl shadow-emerald-900/40 flex items-center gap-2"
                                                        >
                                                            EKLE +
                                                        </button>
                                                    </form>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
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
                                                <div className="flex flex-col gap-2 w-full pr-10">
                                                    <input 
                                                        autoFocus
                                                        value={editValue}
                                                        onChange={e => setEditValue(e.target.value)}
                                                        className="w-full h-10 bg-slate-900 border border-cyan-500/50 rounded-lg px-4 text-sm font-bold text-white outline-none shadow-xl"
                                                        onClick={(e) => e.stopPropagation()}
                                                        placeholder="Adı"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button onClick={(e) => { e.stopPropagation(); handleSaveEdit(item.id); }} className="flex-1 h-8 bg-cyan-600 rounded-lg text-[10px] font-black uppercase text-white">Kaydet</button>
                                                        <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="flex-1 h-8 bg-white/5 rounded-lg text-[10px] font-black uppercase text-slate-400">Vazgeç</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <h3 className="text-sm font-black text-white uppercase truncate tracking-tight">{item.name}</h3>
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
                                                </>
                                            )}
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
                                                        setEditBrandId(item.brandId || '');
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
                        )}
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