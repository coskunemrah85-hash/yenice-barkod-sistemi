import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, Brand, Model, Color, Size, Group, Supplier } from '../types';
import Icon from './Icon';
import { generateProductDescription } from '../services/geminiService';

interface Definitions {
    brands: Brand[];
    models: Model[];
    colors: Color[];
    sizes: Size[];
    groups: Group[];
}

interface EditProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedProducts: Product[]) => void;
    products: Product[];
    allProducts: Product[];
    definitions: Definitions;
    suppliers: Supplier[];
    onAddDefinition?: (type: 'brand' | 'model' | 'group' | 'color' | 'size', data: any) => void;
    onMinimize?: (task: any) => void;
}

const EditProductModal: React.FC<EditProductModalProps> = ({ isOpen, onClose, onSave, products, allProducts, definitions, suppliers, onAddDefinition, onMinimize }) => {
    const [commonData, setCommonData] = useState<Partial<Product>>({});
    const [variations, setVariations] = useState<Product[]>([]);
    const [applyPricesToAll, setApplyPricesToAll] = useState(true);
    const initialVariations = useRef<Product[]>([]);
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
    const [error, setError] = useState('');
    const [duplicateError, setDuplicateError] = useState<{barcode: string, productName: string} | null>(null);

    const generateUniqueBarcode = (existingProducts: Product[]): string => {
        const generateEAN13 = () => {
            const base = "869" + Array.from({length: 9}, () => Math.floor(Math.random() * 10)).join('');
            let sum = 0;
            for (let i = 0; i < 12; i++) {
                const digit = parseInt(base[i]);
                sum += (i % 2 === 0) ? digit : digit * 3;
            }
            const checkDigit = (10 - (sum % 10)) % 10;
            return base + checkDigit;
        };

        let barcode = '';
        let isUnique = false;
        let attempts = 0;
        while (!isUnique && attempts < 100) {
            barcode = generateEAN13();
            const isUsed = existingProducts.some(p => p.barcode === barcode || p.secondaryBarcodes?.includes(barcode));
            if (!isUsed) isUnique = true;
            attempts++;
        }
        return barcode || Date.now().toString();
    };

    useEffect(() => {
        if (isOpen && products.length > 0) {
            const firstProduct = products[0];
            const baseNameMatch = firstProduct.name.match(/^(.*?)(\s*\(.*\))?$/);
            const baseName = baseNameMatch ? baseNameMatch[1].trim() : firstProduct.name;
            
            setCommonData({
                name: baseName,
                description: firstProduct.description || '',
                anaStokKodu: firstProduct.anaStokKodu,
                marka: firstProduct.marka,
                model: firstProduct.model,
                group: firstProduct.group,
                midGroup: firstProduct.midGroup,
                subGroup: firstProduct.subGroup,
                buyPrice: firstProduct.buyPrice,
                price: firstProduct.price,
                shelfLocation: firstProduct.shelfLocation || '',
            });
            
            const deepCopiedGroup = JSON.parse(JSON.stringify(products));
            setVariations(deepCopiedGroup);
            initialVariations.current = deepCopiedGroup;
        }
    }, [isOpen, products]);
    
    if (!isOpen) return null;

    const handleGenerateDescription = async () => {
        setIsGeneratingDescription(true);
        setError('');
        try {
            const description = await generateProductDescription(commonData);
            setCommonData(prev => ({...prev, description}));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Açıklama oluşturulamadı.');
        } finally {
            setIsGeneratingDescription(false);
        }
    };

    const handleCommonDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setCommonData(prev => {
            const newState = {...prev, [name]: value};
            if(name === 'marka') { newState.model = ''; newState.group = ''; newState.midGroup = ''; newState.subGroup = ''; }
            if(name === 'group') { newState.midGroup = ''; newState.subGroup = ''; }
            if(name === 'midGroup') newState.subGroup = '';
            return newState;
        });
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const numValue = parseFloat(value.replace(',', '.')) || 0;
        
        setCommonData(prev => ({ ...prev, [name]: value }));
        
        if (applyPricesToAll) {
            setVariations(vars => vars.map(v => ({ ...v, [name]: numValue })));
        }
    };

    const handleVariationChange = (index: number, field: keyof Product, value: string | number | string[]) => {
        setVariations(vars => vars.map((v, i) => {
            if (i === index) {
                return { ...v, [field]: value };
            }
            return v;
        }));
    };

    const addVariation = () => {
        const newBarcode = generateUniqueBarcode([...allProducts, ...variations]);
        
        const newVariation: Product = {
            ...products[0],
            barcode: newBarcode,
            stokKodu: `${commonData.anaStokKodu}-${variations.length + 1}`,
            renk: '',
            beden: '',
            stock: 0,
            buyPrice: parseFloat(String(commonData.buyPrice || 0).replace(',', '.')) || 0,
            price: parseFloat(String(commonData.price || 0).replace(',', '.')) || 0,
            isActivated: true,
            secondaryBarcodes: []
        };
        setVariations([...variations, newVariation]);
    };

    const removeVariation = (index: number) => {
        if(variations.length === 1) return;
        setVariations(variations.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        const finalProducts = variations.map(v => {
            const baseName = commonData.name || '';
            const newName = v.renk && v.beden ? `${baseName} (${v.renk} - ${v.beden})` : baseName;
            
            const buyPrice = applyPricesToAll ? (parseFloat(String(commonData.buyPrice || 0).replace(',', '.')) || 0) : (parseFloat(String(v.buyPrice).replace(',', '.')) || 0);
            const price = applyPricesToAll ? (parseFloat(String(commonData.price || 0).replace(',', '.')) || 0) : (parseFloat(String(v.price).replace(',', '.')) || 0);

            return {
                ...v,
                ...commonData,
                buyPrice,
                price,
                name: newName,
            };
        });
        
        // Duplicate Check - Thorough validation
        const currentEditingBarcodes = new Set(initialVariations.current.map(v => v.barcode));
        const seenBarcodesInGroup = new Set<string>();
        
        for (const v of variations) {
            const barcodesToVerify = [v.barcode, ...(v.secondaryBarcodes || [])].map(b => b.trim()).filter(Boolean);
            
            for (const bc of barcodesToVerify) {
                // 1. Check against other variations IN THIS GROUP
                if (seenBarcodesInGroup.has(bc)) {
                    setDuplicateError({ barcode: bc, productName: 'Bu listenin içindeki başka bir varyasyon' });
                    return;
                }
                seenBarcodesInGroup.add(bc);

                // 2. Check against ALL OTHER products in database
                const conflict = allProducts.find(p => {
                    // Ignore if this is one of the products we are currently editing (the group)
                    if (currentEditingBarcodes.has(p.barcode)) return false;
                    
                    // Check if main barcode matches
                    if (p.barcode === bc) return true;
                    
                    // Check if any secondary barcode matches
                    if (p.secondaryBarcodes?.some(sb => sb === bc)) return true;
                    
                    return false;
                });

                if (conflict) {
                    setDuplicateError({ barcode: bc, productName: conflict.name });
                    return;
                }
            }
        }

        onSave(finalProducts as Product[]);
        onClose();
    };

    const handleMinimize = () => {
        if (onMinimize) {
            const task = {
                id: 'edit-product-' + Date.now(),
                type: 'edit_product',
                title: commonData.name || 'Ürün Düzenleme',
                data: {
                    commonData,
                    variations,
                    applyPricesToAll
                }
            };
            onMinimize(task);
            onClose();
        }
    };

    const selectedBrand = useMemo(() => definitions.brands.find(b => b.name === commonData.marka), [commonData.marka, definitions.brands]);
    const filteredModels = useMemo(() => selectedBrand ? definitions.models.filter(m => m.brandId === selectedBrand.id) : [], [selectedBrand, definitions.models]);
    
    const mainGroups = useMemo(() => {
        const selectedBrandId = selectedBrand?.id || null;
        return definitions.groups.filter(g => g.parentId === null && (g.brandId === selectedBrandId || g.brandId === null));
    }, [definitions.groups, selectedBrand]);
    
    const midGroups = useMemo(() => {
        const selectedGroup = mainGroups.find(g => g.name === commonData.group);
        if (!selectedGroup) return [];
        return definitions.groups.filter(g => g.parentId === selectedGroup.id);
    }, [commonData.group, mainGroups, definitions.groups]);
    
    const subGroups = useMemo(() => {
        const selectedMidGroup = midGroups.find(g => g.name === commonData.midGroup);
        if (!selectedMidGroup) return [];
        return definitions.groups.filter(g => g.parentId === selectedMidGroup.id);
    }, [commonData.midGroup, midGroups, definitions.groups]);

    return (
        <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col animate-fade-in">
            <div className="bg-[#0f172a] h-full w-full flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <header className="flex-shrink-0 h-16 px-8 border-b border-white/5 flex justify-between items-center bg-slate-900/40 backdrop-blur-2xl sticky top-0 z-20">
                    <div className="flex items-center gap-4 min-w-0">
                        <button onClick={onClose} className="group/back flex items-center gap-2 text-slate-500 hover:text-white transition-all pr-4 border-r border-white/10">
                            <Icon name="refresh" className="w-4 h-4 rotate-180 group-hover/back:-translate-x-1 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest">GERİ</span>
                        </button>
                        <div className="min-w-0">
                            <h2 className="text-lg font-black text-white uppercase tracking-tighter italic leading-tight">Ürün Düzenleme Menüsü</h2>
                            <p className="text-[9px] font-bold text-cyan-500/60 uppercase tracking-[0.2em] leading-none">
                                {commonData.name || 'İsimsiz Ürün'} • {commonData.anaStokKodu || 'Kodsuz'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleMinimize} className="flex items-center gap-2 px-4 h-10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-cyan-400 rounded-xl transition-all border border-white/5">
                             <Icon name="minus" className="w-4 h-4" />
                             <span className="text-[9px] font-black uppercase tracking-widest">KÜÇÜLT</span>
                        </button>
                    </div>
                </header>

                <main className="flex-grow p-3 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar min-h-0">
                    {error && <p className="text-[9px] font-black text-rose-500 bg-rose-500/10 p-2 rounded-md uppercase tracking-widest">{error}</p>}
                    
                    {/* Common Info */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-white/[0.01] p-3 sm:p-5 rounded-[1.25rem] border border-white/5">
                        <div className="col-span-2">
                            <label className="label-pro">Temel Ürün Adı</label>
                            <input type="text" name="name" value={commonData.name || ''} onChange={handleCommonDataChange} className="input-pro w-full" placeholder="Adı"/>
                        </div>
                        <div className="col-span-1">
                            <label className="label-pro">Ana Stok Kodu</label>
                            <input type="text" name="anaStokKodu" value={commonData.anaStokKodu || ''} onChange={handleCommonDataChange} className="input-pro w-full text-cyan-400 font-mono" placeholder="MDL-101"/>
                        </div>
                        <div className="col-span-1">
                            <label className="label-pro">Raf / Konum</label>
                            <input type="text" name="shelfLocation" value={commonData.shelfLocation || ''} onChange={handleCommonDataChange} className="input-pro w-full" placeholder="A-12"/>
                        </div>

                        <div><label className="label-pro">Marka</label><select name="marka" value={commonData.marka || ''} onChange={handleCommonDataChange} className="input-pro w-full text-[10px] font-bold"><option value="">Seçiniz</option>{definitions.brands.map(b=><option key={b.id} value={b.name}>{b.name}</option>)}</select></div>
                        <div><label className="label-pro">Model</label><select name="model" value={commonData.model || ''} onChange={handleCommonDataChange} className="input-pro w-full text-[10px] font-bold"><option value="">Seçiniz</option>{filteredModels.map(m=><option key={m.id} value={m.name}>{m.name}</option>)}</select></div>
                        <div><label className="label-pro text-emerald-500">Global Alış</label><input type="text" name="buyPrice" value={commonData.buyPrice || ''} onChange={handlePriceChange} className="input-pro w-full border-emerald-500/10"/></div>
                        <div><label className="label-pro text-cyan-500">Global Satış</label><input type="text" name="price" value={commonData.price || ''} onChange={handlePriceChange} className="input-pro w-full border-cyan-500/10"/></div>

                        <div>
                            <label className="label-pro">Grup</label>
                            <select name="group" value={commonData.group || ''} onChange={handleCommonDataChange} className="input-pro w-full text-[10px] font-bold">
                                <option value="">Grup</option>
                                {mainGroups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label-pro">Ara Grup</label>
                            <select name="midGroup" value={commonData.midGroup || ''} onChange={handleCommonDataChange} className="input-pro w-full text-[10px] font-bold" disabled={!commonData.group}>
                                <option value="">Ara Grup</option>
                                {midGroups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label-pro">Alt Grup</label>
                            <select name="subGroup" value={commonData.subGroup || ''} onChange={handleCommonDataChange} className="input-pro w-full text-[10px] font-bold" disabled={!commonData.midGroup}>
                                <option value="">Alt Grup</option>
                                {subGroups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                            </select>
                        </div>

                        <div className="flex items-end">
                            <button onClick={() => setApplyPricesToAll(!applyPricesToAll)} className={`flex items-center justify-center gap-1.5 w-full h-[32px] rounded-lg border transition-all flex-shrink-0 ${applyPricesToAll ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-white/5 border-white/10 text-slate-500'}`}>
                                <div className={`w-3 h-3 rounded border flex items-center justify-center transition-all flex-shrink-0 ${applyPricesToAll ? 'bg-cyan-500 border-cyan-400' : 'border-white/20'}`}>
                                    {applyPricesToAll && <Icon name="check" className="w-2 h-2 text-slate-900"/>}
                                </div>
                                <span className="text-[7.5px] font-black uppercase tracking-widest truncate">Fiyatları Uygula</span>
                            </button>
                        </div>

                        <div className="col-span-2 lg:col-span-4">
                            <div className="flex items-center justify-between mb-0.5">
                                <label className="label-pro m-0">Ürün Açıklaması</label>
                                <button onClick={handleGenerateDescription} disabled={isGeneratingDescription} className="flex items-center gap-1 text-[8px] font-bold text-pink-500 hover:text-pink-400 transition-colors">
                                    <Icon name="ai" className={`w-3 h-3 ${isGeneratingDescription ? 'animate-spin' : ''}`}/>
                                    {isGeneratingDescription ? '...' : 'AI OLUŞTUR'}
                                </button>
                            </div>
                            <textarea name="description" value={commonData.description || ''} onChange={handleCommonDataChange} className="input-pro w-full h-10 resize-none text-[9px]" placeholder="Açıklama..."></textarea>
                        </div>
                    </div>

                    {/* Table View */}
                    <section className="space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                             <div className="flex items-center gap-2">
                                <div className="w-0.5 h-4 bg-purple-500 rounded-full"></div>
                                <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Varyasyonlar ({variations.length})</h3>
                             </div>
                             <button onClick={addVariation} className="h-7 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-md font-black text-[8px] uppercase tracking-widest flex items-center gap-1.5 transition-all flex-shrink-0">
                                <Icon name="plus" className="w-3 h-3"/> EKLE
                             </button>
                        </div>

                        <div className="bg-white/[0.01] border border-white/5 rounded-[0.75rem] overflow-x-auto custom-scrollbar">
                            <table className="w-full text-xs text-left border-collapse min-w-[600px]">
                                <thead className="bg-[#1e293b] text-[8.5px] font-black text-slate-400 uppercase tracking-widest border-b border-white/5 sticky top-0 z-10">
                                    <tr>
                                        <th className="px-3 py-2">No</th>
                                        <th className="px-3 py-2">Renk</th>
                                        <th className="px-3 py-2">Beden</th>
                                        <th className="px-3 py-2">Barkodlar</th>
                                        <th className="px-3 py-2">Stok Kodu</th>
                                        <th className="px-3 py-2 text-center">Stok</th>
                                        {!applyPricesToAll && <><th className="px-3 py-2 text-right">Alış</th><th className="px-3 py-2 text-right">Satış</th></>}
                                        <th className="px-3 py-2 text-center">Sil</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {variations.map((v, idx) => (
                                        <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-3 py-1 font-mono text-slate-600 text-[8px]">#{idx + 1}</td>
                                            <td className="px-1 py-0.5"><input value={v.renk} onChange={e=>handleVariationChange(idx, 'renk', e.target.value)} className="table-input-pro" placeholder="Renk"/></td>
                                            <td className="px-1 py-0.5"><input value={v.beden} onChange={e=>handleVariationChange(idx, 'beden', e.target.value)} className="table-input-pro" placeholder="Beden"/></td>
                                            <td className="p-1 px-2">
                                                <div className="relative group/bc">
                                                    <input 
                                                        type="text" 
                                                        className="table-input-pro font-mono text-cyan-400 pr-7" 
                                                        value={v.barcode} 
                                                        onChange={(e) => handleVariationChange(idx, 'barcode', e.target.value)}
                                                    />
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleVariationChange(idx, 'barcode', generateUniqueBarcode([...allProducts, ...variations]))}
                                                        className="absolute right-0 top-0 h-full px-2 text-slate-600 hover:text-cyan-400 transition-colors"
                                                        title="Barkod Üret"
                                                    >
                                                        <Icon name="refresh" className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                <div className="flex flex-wrap gap-1 px-1 mt-1">
                                                    {(v.secondaryBarcodes || []).map((bc, bIdx) => (
                                                        <div key={bIdx} className="flex items-center gap-1 bg-white/5 px-1 rounded text-[7px] text-slate-400 group/bc">
                                                            <span>{bc}</span>
                                                            <button onClick={() => handleVariationChange(idx, 'secondaryBarcodes', v.secondaryBarcodes!.filter((_, i) => i !== bIdx))} className="text-rose-500 hover:text-rose-400">×</button>
                                                        </div>
                                                    ))}
                                                    <input 
                                                        placeholder="+ Ekle"
                                                        className="bg-transparent border-none text-[7px] text-slate-500 focus:outline-none w-10"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                const val = e.currentTarget.value.trim();
                                                                if (val && !(v.secondaryBarcodes || []).includes(val)) {
                                                                    handleVariationChange(idx, 'secondaryBarcodes', [...(v.secondaryBarcodes || []), val]);
                                                                    e.currentTarget.value = '';
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-1 py-0.5"><input value={v.stokKodu} onChange={e=>handleVariationChange(idx, 'stokKodu', e.target.value)} className="table-input-pro font-mono text-slate-500 w-32 text-[9px]"/></td>
                                             <td className="px-1 py-0.5"><input type="number" value={v.stock} onChange={e=>handleVariationChange(idx, 'stock', parseInt(e.target.value) || 0)} className="table-input-pro text-center w-12 text-[10px]"/></td>

                                            {!applyPricesToAll && (
                                                <>
                                                    <td className="px-1 py-0.5"><input value={v.buyPrice} onChange={e=>handleVariationChange(idx, 'buyPrice', e.target.value)} className="table-input-pro text-right text-emerald-500 text-[10px]"/></td>
                                                    <td className="px-1 py-0.5"><input value={v.price} onChange={e=>handleVariationChange(idx, 'price', e.target.value)} className="table-input-pro text-right text-cyan-500 text-[10px]"/></td>
                                                </>
                                            )}
                                            <td className="px-3 py-0.5 text-center">
                                                <button onClick={() => removeVariation(idx)} className="w-6 h-6 flex items-center justify-center rounded-md bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white">
                                                    <Icon name="trash" className="w-3 h-3"/>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </main>

                <footer className="flex-shrink-0 p-4 px-8 border-t border-white/5 bg-slate-900/60 backdrop-blur-2xl flex justify-between items-center z-20">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">TOPLAM VARYASYON</span>
                            <span className="text-sm font-black text-white">{variations.length} ADET</span>
                        </div>
                        <div className="w-px h-8 bg-white/5"></div>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">TOPLAM STOK</span>
                            <span className="text-sm font-black text-cyan-400">{variations.reduce((s,v)=>s+v.stock, 0)} ADET</span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-6 h-11 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all border border-white/5">Vazgeç</button>
                        <button onClick={handleSave} className="px-10 h-11 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-cyan-900/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]">Değişiklikleri Kaydet</button>
                    </div>
                </footer>
            </div>
            
            <style>{`
                .label-pro { display: block; font-size: 7px; font-black text-slate-500 uppercase tracking-widest mb-0.5 px-0.5; }
                .input-pro { background-color: rgba(255, 255, 255, 0.01); border: 1px solid rgba(255, 255, 255, 0.04); border-radius: 0.4rem; padding: 0.3rem 0.5rem; color: white; font-size: 9.5px; font-weight: 700; transition: all 0.2s; outline: none; }
                .input-pro:focus { border-color: rgba(6, 182, 212, 0.3); background-color: rgba(255, 255, 255, 0.03); }
                
                .table-input-pro { background: transparent; border: 1px solid rgba(255, 255, 255, 0.02); border-radius: 0.3rem; padding: 0.15rem 0.35rem; color: white; font-size: 9px; font-weight: 700; width: 100%; outline: none; transition: all 0.2s; }
                .table-input-pro:focus { background: rgba(255, 255, 255, 0.02); border-color: rgba(147, 51, 234, 0.25); }

                .custom-scrollbar::-webkit-scrollbar { width: 3px; height: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
                
                @keyframes fade-in { from { opacity: 0; transform: scale(0.995); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in { animation: fade-in 0.15s ease-out; }
            `}</style>
            {/* Duplicate Error Modal */}
            {duplicateError && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[300] p-4 animate-fade-in">
                    <div className="bg-[#0f172a] border border-rose-500/30 rounded-[2rem] shadow-2xl max-w-md w-full p-8 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent"></div>
                        
                        <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
                            <Icon name="exclamation-circle" className="w-10 h-10" />
                        </div>
                        
                        <h2 className="text-xl font-black text-white uppercase tracking-tight mb-2">Barkod Kullanımda!</h2>
                        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                            <span className="text-rose-400 font-mono font-bold">"{duplicateError.barcode}"</span> barkodu başka bir üründe zaten kayıtlı.
                            <br/>
                            <span className="text-white font-bold uppercase text-[10px] tracking-widest mt-2 block">Kayıtlı Ürün: {duplicateError.productName}</span>
                        </p>
                        
                        <button 
                            onClick={() => setDuplicateError(null)}
                            className="w-full h-12 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-rose-900/20 transition-all active:scale-95"
                        >
                            ANLADIM, KAPAT
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditProductModal;