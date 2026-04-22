import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ProductFilters, Brand, Model, Color, Size, Group } from '../types';

interface Definitions {
    brands: Brand[];
    models: Model[];
    colors: Color[];
    sizes: Size[];
    groups: Group[];
}

interface ProductFiltersPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (filters: ProductFilters) => void;
    definitions: Definitions;
    currentFilters: ProductFilters;
}

const ProductFiltersPanel: React.FC<ProductFiltersPanelProps> = ({
    isOpen,
    onClose,
    onApply,
    definitions,
    currentFilters
}) => {
    const [localFilters, setLocalFilters] = useState<ProductFilters>(currentFilters);
    const firstInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setLocalFilters(currentFilters);
    }, [currentFilters]);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
            setTimeout(() => firstInputRef.current?.focus(), 100);
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setLocalFilters(prev => ({ ...prev, [name]: checked }));
        } else {
            setLocalFilters(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleClear = () => {
        setLocalFilters({});
        firstInputRef.current?.focus();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onApply(localFilters);
    };

    const filteredModels = useMemo(() => {
        if (!localFilters.marka) return definitions.models;
        const brand = definitions.brands.find(b => b.name === localFilters.marka);
        return brand ? definitions.models.filter(m => m.brandId === brand.id) : [];
    }, [localFilters.marka, definitions.brands, definitions.models]);

    const mainGroups = useMemo(() => definitions.groups.filter(g => g.parentId === null), [definitions.groups]);
    const midGroups = useMemo(() => {
        if (!localFilters.group) return [];
        const selectedGroup = mainGroups.find(g => g.name === localFilters.group);
        return selectedGroup ? definitions.groups.filter(g => g.parentId === selectedGroup.id) : [];
    }, [localFilters.group, mainGroups, definitions.groups]);
    const subGroups = useMemo(() => {
        if (!localFilters.midGroup) return [];
        const selectedMidGroup = midGroups.find(g => g.name === localFilters.midGroup);
        return selectedMidGroup ? definitions.groups.filter(g => g.parentId === selectedMidGroup.id) : [];
    }, [localFilters.midGroup, midGroups, definitions.groups]);
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-40">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />
            <div className="absolute top-0 left-0 h-full w-full max-w-md bg-slate-50 shadow-2xl flex flex-col">
                <header className="p-4 border-b flex justify-between items-center bg-white flex-shrink-0">
                    <h2 className="text-xl font-bold text-slate-800">Ürün Ara & Filtrele</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-2 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto">
                    <div className="p-6 space-y-6">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-slate-600">Arama Kriterleri</h3>
                            <input ref={firstInputRef} type="text" name="name" value={localFilters.name || ''} onChange={handleChange} placeholder="Stok Adı" className="input-style w-full" />
                            <input type="text" name="stokKodu" value={localFilters.stokKodu || ''} onChange={handleChange} placeholder="Stok Kodu" className="input-style w-full" />
                            <input type="text" name="anaStokKodu" value={localFilters.anaStokKodu || ''} onChange={handleChange} placeholder="Ana Stok Kodu" className="input-style w-full" />
                            <input type="text" name="barcode" value={localFilters.barcode || ''} onChange={handleChange} placeholder="Barkod" className="input-style w-full" />
                            <input type="text" name="shelfLocation" value={localFilters.shelfLocation || ''} onChange={handleChange} placeholder="Raf / Konum" className="input-style w-full" />
                        </div>
                        
                        <div className="space-y-4">
                            <h3 className="font-semibold text-slate-600">Kategori</h3>
                            <select name="group" value={localFilters.group || ''} onChange={handleChange} className="input-style w-full">
                                <option value="">Tüm Gruplar</option>
                                {mainGroups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                            </select>
                            <select name="midGroup" value={localFilters.midGroup || ''} onChange={handleChange} className="input-style w-full" disabled={!localFilters.group}>
                                <option value="">Tüm Ara Gruplar</option>
                                {midGroups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                            </select>
                            <select name="subGroup" value={localFilters.subGroup || ''} onChange={handleChange} className="input-style w-full" disabled={!localFilters.midGroup}>
                                <option value="">Tüm Alt Gruplar</option>
                                {subGroups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                            </select>
                        </div>
                        
                        <div className="space-y-4">
                            <h3 className="font-semibold text-slate-600">Detaylar</h3>
                            <select name="marka" value={localFilters.marka || ''} onChange={handleChange} className="input-style w-full">
                                <option value="">Tüm Markalar</option>
                                {definitions.brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                            </select>
                            <select name="model" value={localFilters.model || ''} onChange={handleChange} className="input-style w-full" disabled={!localFilters.marka}>
                                <option value="">Tüm Modeller</option>
                                {filteredModels.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                            </select>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold text-slate-600">Fiyat ve Stok</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="number" name="minPrice" value={localFilters.minPrice || ''} onChange={handleChange} placeholder="Min Fiyat" className="input-style" />
                                <input type="number" name="maxPrice" value={localFilters.maxPrice || ''} onChange={handleChange} placeholder="Max Fiyat" className="input-style" />
                            </div>
                             <select name="stockStatus" value={localFilters.stockStatus || 'all'} onChange={handleChange} className="input-style w-full">
                                <option value="all">Tüm Stok Durumları</option>
                                <option value="inStock">Stokta Olanlar</option>
                                <option value="outOfStock">Tükenenler</option>
                                <option value="lowStock">Az Kalanlar (10 ve altı)</option>
                            </select>
                            <div className="pt-2">
                                <label className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-100 cursor-pointer">
                                    <input type="checkbox" name="showDeleted" checked={localFilters.showDeleted || false} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" />
                                    <span className="text-slate-700 select-none">Arşivlenenleri Göster</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </form>

                <footer className="p-4 border-t bg-white flex justify-end gap-3 flex-shrink-0">
                    <button onClick={handleClear} className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold py-2 px-6 rounded-lg transition">Temizle</button>
                    <button onClick={handleSubmit} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-6 rounded-lg transition">Filtrele</button>
                </footer>
            </div>
             <style>{`
                .input-style {
                    background-color: white; border: 1px solid #cbd5e1; border-radius: 0.5rem;
                    padding: 0.5rem 0.75rem; font-size: 1rem; transition: all 0.2s; height: 42px;
                }
                .input-style:focus {
                    outline: none; box-shadow: 0 0 0 2px #e0f2fe, 0 0 0 4px #0ea5e9; border-color: #0ea5e9;
                }
                 .input-style:disabled {
                    background-color: #f1f5f9; cursor: not-allowed;
                }
            `}</style>
        </div>
    );
};

export default ProductFiltersPanel;