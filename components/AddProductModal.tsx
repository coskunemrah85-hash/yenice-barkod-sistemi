import React, { useState, useMemo, useRef } from 'react';
import { Product, Supplier, Definitions } from '../types';
import Icon from './Icon';
import { generateProductDescription } from '../services/geminiService';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (products: Product[]) => void;
  definitions: Definitions;
  suppliers: Supplier[];
  products: Product[];
  onAddDefinition?: (type: 'brand' | 'model' | 'group' | 'color' | 'size', data: any) => void;
  onMinimize?: (task: any) => void;
}

type VariationEntry = {
    id: number;
    renk: string;
    beden: string;
    barcode: string;
    secondaryBarcodes: string[];
    stokKodu: string;
    stock: string;
};

const initialCommonState = {
    name: '',
    description: '',
    buyPrice: '',
    price: '',
    margin: '',
    marka: '',
    model: '',
    group: '',
    midGroup: '',
    subGroup: '',
    supplierId: '',
    anaStokKodu: '',
    shelfLocation: ''
};

const initialVariationState = {
    renk: '',
    beden: '',
    barcode: '',
    secondaryBarcodes: [] as string[],
    stokKodu: '',
    stock: '0',
};

const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose, onSave, definitions, suppliers, products, onAddDefinition, onMinimize }) => {
    if (!isOpen) return null;

    const [mode, setMode] = useState<'single' | 'variation'>('single');
    const [error, setError] = useState('');
    
    // States for 'variation' mode
    const [commonData, setCommonData] = useState(initialCommonState);
    const [currentVariation, setCurrentVariation] = useState(initialVariationState);
    const [addedVariations, setAddedVariations] = useState<VariationEntry[]>([]);
    const barcodeInputRef = useRef<HTMLInputElement>(null);
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
    const [duplicateError, setDuplicateError] = useState<{barcode: string, productName: string} | null>(null);

    const generateUniqueBarcode = (existingProducts: Product[], existingVariations: VariationEntry[] = []): string => {
        const generateEAN13 = () => {
            // Turkey prefix 869 + 9 random digits = 12 digits
            const base = "869" + Array.from({length: 9}, () => Math.floor(Math.random() * 10)).join('');
            
            // Calculate Check Digit
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
            const isUsedInProducts = existingProducts.some(p => p.barcode === barcode || p.secondaryBarcodes?.includes(barcode));
            const isUsedInVariations = existingVariations.some(v => v.barcode === barcode);
            if (!isUsedInProducts && !isUsedInVariations) {
                isUnique = true;
            }
            attempts++;
        }
        return barcode || Date.now().toString(); // Fallback to timestamp if somehow stuck
    };

    const [quickAddType, setQuickAddType] = useState<'brand' | 'model' | 'group' | 'color' | 'size' | null>(null);
    const [quickAddName, setQuickAddName] = useState('');
    const [quickAddBrandContext, setQuickAddBrandContext] = useState<string | undefined>(undefined);
    const [quickAddCallback, setQuickAddCallback] = useState<((name: string) => void) | null>(null);

    const handleQuickAddSubmit = () => {
        if (!quickAddType || !quickAddName.trim()) {
            setQuickAddType(null);
            setQuickAddCallback(null);
            return;
        }

        if (onAddDefinition) {
            const trimmedName = quickAddName.trim();
            let data: any = { name: trimmedName, id: Date.now().toString() };
            
            if (quickAddType === 'model') {
                const brand = definitions.brands.find(b => b.name === quickAddBrandContext);
                if (!brand) {
                    alert("Lütfen önce bir marka seçiniz.");
                    setQuickAddType(null);
                    setQuickAddCallback(null);
                    return;
                }
                data.brandId = brand.id;
            }
            if (quickAddType === 'group') data.parentId = null;

            onAddDefinition(quickAddType, data);
            
            // Set the value in the appropriate form state after a short delay
            const targetType = quickAddType;
            const currentCallback = quickAddCallback;
            setTimeout(() => {
                if (currentCallback) {
                    currentCallback(trimmedName);
                } else if (mode === 'variation') {
                    const fieldMap: any = { brand: 'marka', model: 'model', group: 'group' };
                    if (fieldMap[targetType]) setCommonData(p => ({...p, [fieldMap[targetType]]: trimmedName}));
                }
            }, 150);
        }
        setQuickAddType(null);
        setQuickAddName('');
        setQuickAddCallback(null);
    };

    const triggerQuickAdd = (type: 'brand' | 'model' | 'group' | 'color' | 'size', brandContext?: string, callback?: (name: string) => void) => {
        setQuickAddType(type);
        setQuickAddName('');
        setQuickAddBrandContext(brandContext);
        setQuickAddCallback(() => callback || null);
    };
    
    const handleGenerateDescription = async () => {
        setIsGeneratingDescription(true);
        setError('');
        try {
            const { buyPrice, price, margin, ...productInfo } = commonData;
            const description = await generateProductDescription(productInfo as any);
            setCommonData(prev => ({...prev, description}));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Açıklama oluşturulamadı.');
        } finally {
            setIsGeneratingDescription(false);
        }
    };

    const handleChangeCommon = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setCommonData(prev => {
            const newState = { ...prev, [name]: value };
            if (['buyPrice', 'price', 'margin'].includes(name)) {
                const buyPriceNum = parseFloat(newState.buyPrice.replace(',', '.'));
                if (name === 'buyPrice' || name === 'price') {
                    const priceNum = parseFloat(newState.price.replace(',', '.'));
                    if (!isNaN(buyPriceNum) && buyPriceNum > 0 && !isNaN(priceNum)) {
                        const newMargin = ((priceNum - buyPriceNum) / buyPriceNum) * 100;
                        newState.margin = isFinite(newMargin) ? newMargin.toFixed(2).replace('.', ',') : '';
                    } else { newState.margin = ''; }
                } else if (name === 'margin') {
                    const marginNum = parseFloat(newState.margin.replace(',', '.'));
                    if (!isNaN(buyPriceNum) && buyPriceNum > 0 && !isNaN(marginNum)) {
                        const newPrice = buyPriceNum * (1 + marginNum / 100);
                        newState.price = isFinite(newPrice) ? newPrice.toFixed(2).replace('.', ',') : '';
                    }
                }
            }
            if(name === 'marka') { newState.model = ''; newState.group = ''; newState.midGroup = ''; newState.subGroup = ''; }
            if(name === 'group') { newState.midGroup = ''; newState.subGroup = ''; }
            if(name === 'midGroup') newState.subGroup = '';
            return newState;
        });
    };

    const handleChangeVariation = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setCurrentVariation(prev => ({ ...prev, [name]: value }));
    };

    const handleRemoveVariation = (id: number) => {
        setAddedVariations(prev => prev.filter(v => v.id !== id));
    };

  const handleAddVariation = () => {
        setError('');
        const { barcode, renk, beden } = currentVariation;
        if (!barcode || !renk || !beden) {
            setError("Lütfen Varyasyon için Renk, Beden ve Barkod girin.");
            return;
        }
        const allBarcodesToCheck = [barcode, ...(currentVariation.secondaryBarcodes || [])].map(b => b.trim());
        
        for (const bc of allBarcodesToCheck) {
            const conflict = products.find(p => {
                if (p.barcode === bc) return true;
                return p.secondaryBarcodes?.some(sb => sb === bc);
            });
            
            const inCurrentList = addedVariations.find(v => {
                if (v.barcode === bc) return true;
                return v.secondaryBarcodes?.some(sb => sb === bc);
            });
            
            if (conflict) {
                setDuplicateError({ barcode: bc, productName: conflict.name });
                return;
            }
            if (inCurrentList) {
                setDuplicateError({ barcode: bc, productName: 'Mevcut Listede' });
                return;
            }
        }
        
        setAddedVariations(prev => [...prev, { ...currentVariation, id: Date.now() }]);
        setCurrentVariation(prev => ({
            ...initialVariationState,
            renk: prev.renk,
            beden: '',
            stock: '0',
            barcode: '',
            stokKodu: '',
            secondaryBarcodes: []
        }));
        barcodeInputRef.current?.focus();
    };

    const handleVariationKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddVariation();
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

    const handleVariationSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!commonData.name || !commonData.price || !commonData.marka || !commonData.model || !commonData.group) {
          setError('Lütfen tüm ortak bilgileri (*) doldurun.');
          return;
        }
        if (addedVariations.length === 0) {
            setError('Kaydetmek için en az bir varyasyon eklemelisiniz.');
            return;
        }

        // Final duplicate sweep for all added variations
        const seenInCurrentBatch = new Set<string>();
        for (const v of addedVariations) {
            const barcodes = [v.barcode, ...(v.secondaryBarcodes || [])].map(b => b.trim()).filter(Boolean);
            for (const bc of barcodes) {
                if (seenInCurrentBatch.has(bc)) {
                    setDuplicateError({ barcode: bc, productName: 'Aşağıdaki listedeki başka bir varyasyon' });
                    return;
                }
                seenInCurrentBatch.add(bc);

                const conflict = products.find(p => p.barcode === bc || p.secondaryBarcodes?.includes(bc));
                if (conflict) {
                    setDuplicateError({ barcode: bc, productName: conflict.name });
                    return;
                }
            }
        }
        
        const priceValue = parseFloat(commonData.price.replace(',', '.')) || 0;
        const buyPriceValue = parseFloat(commonData.buyPrice.replace(',', '.')) || 0;

        const productsToSave: Product[] = addedVariations.map(v => {
            const variationName = `${commonData.name} (${v.renk} - ${v.beden})`;
            return {
                barcode: v.barcode,
                name: variationName,
                description: commonData.description || '',
                buyPrice: buyPriceValue,
                price: priceValue,
                stock: parseInt(v.stock, 10) || 0,
                stokKodu: v.stokKodu,
                marka: commonData.marka,
                model: commonData.model,
                renk: v.renk,
                beden: v.beden,
                anaStokKodu: commonData.anaStokKodu || commonData.marka.substring(0,2).toUpperCase() + '-' + commonData.model.substring(0,3).toUpperCase(),
                group: commonData.group,
                midGroup: commonData.midGroup,
                subGroup: commonData.subGroup,
                supplierId: commonData.supplierId || undefined,
                shelfLocation: commonData.shelfLocation || '',
                isActivated: true,
                secondaryBarcodes: v.secondaryBarcodes
            };
        });

        onSave(productsToSave);
        onClose();
    };

    const handleMinimize = () => {
        if (onMinimize) {
            const task = {
                id: 'add-product-' + Date.now(),
                type: 'add_product',
                title: commonData.name || 'Yeni Ürün Ekleme',
                data: {
                    mode,
                    commonData,
                    addedVariations,
                    currentVariation
                }
            };
            onMinimize(task);
            onClose();
        }
    };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-hidden" onClick={onClose}>
        <div 
            className="bg-slate-50 dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[90vh] overflow-hidden animate-fade-in-up border border-white/20"
            onClick={(e) => e.stopPropagation()}
        >
            <header className="px-8 py-6 border-b dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-800 shrink-0">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-600">
                        <Icon name="plus" className="w-6 h-6" />
                   </div>
                   <div>
                      <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter uppercase">Ürün Ekleme Sistemi</h2>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Stok ve Varyasyon Sihirbazı</p>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl flex border border-slate-200 dark:border-slate-700">
                        <button type="button" onClick={() => setMode('single')} className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase transition-all shadow-sm ${mode === 'single' ? 'bg-white dark:bg-slate-800 text-cyan-600' : 'text-slate-500 hover:text-slate-700'}`}>Tek Ürün</button>
                        <button type="button" onClick={() => setMode('variation')} className={`px-6 py-2 rounded-xl text-[11px] font-black uppercase transition-all shadow-sm ${mode === 'variation' ? 'bg-white dark:bg-slate-800 text-cyan-600' : 'text-slate-500 hover:text-slate-700'}`}>Varyasyonlu Takım</button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={handleMinimize} title="Aşağı İndir" className="w-10 h-10 flex items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600 hover:bg-cyan-100 dark:bg-cyan-900/20 dark:text-cyan-400 transition-all border border-cyan-200/50">
                             <Icon name="minus" className="w-5 h-5" />
                        </button>
                        <button type="button" onClick={onClose} title="Kapat" className="w-10 h-10 flex items-center justify-center rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 transition-all border border-rose-200/50">
                             <Icon name="x-circle" className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>
            
            <div className="flex-grow overflow-y-auto custom-scrollbar p-8 relative">
                {/* Inline Quick Add Overlay */}
                {quickAddType && (
                    <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-8 animate-fade-in">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 border border-white/20 w-full max-w-md animate-scale-in">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-600">
                                    <Icon name="plus" className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Hızlı Tanım Ekle</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{quickAddType === 'brand' ? 'Yeni Marka Oluştur' : quickAddType === 'model' ? 'Yeni Model Oluştur' : 'Yeni Tanım Oluştur'}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="label-style">İsim / Başlık</label>
                                    <input 
                                        type="text" 
                                        autoFocus
                                        value={quickAddName} 
                                        onChange={(e) => setQuickAddName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleQuickAddSubmit()}
                                        className="input-style w-full text-lg" 
                                        placeholder="Örn: Nike, Cotton, XL..."
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setQuickAddType(null)} className="flex-grow btn-secondary py-3 font-black uppercase text-xs">Vazgeç</button>
                                    <button type="button" onClick={handleQuickAddSubmit} className="flex-grow btn-primary py-3 font-black uppercase text-xs shadow-lg shadow-cyan-600/30">Kaydet ve Seç</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {mode === 'single' ? (
                    <SingleProductForm 
                        onSave={onSave} 
                        onClose={onClose} 
                        definitions={definitions} 
                        suppliers={suppliers} 
                        products={products} 
                        onTriggerQuickAdd={triggerQuickAdd}
                        generateUniqueBarcode={(p) => {
                            let barcode;
                            do {
                                barcode = '20' + Math.floor(10000000000 + Math.random() * 90000000000).toString();
                            } while (p.some(pr => pr.barcode === barcode));
                            return barcode;
                        }}
                    />
                ) : (
                    <form onSubmit={handleVariationSubmit} className="space-y-8">
                        {error && <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-xl text-red-700 dark:text-red-400 font-bold text-sm select-none">{error}</div>}
                        
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-8 space-y-6">
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 border-b dark:border-slate-700 pb-2 flex items-center gap-2">
                                        <Icon name="products" className="w-5 h-5 text-cyan-600"/> 1. Ortak Ürün Bilgileri
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="label-style">Ürün Adı (Model İsmi vb.) *</label>
                                            <input type="text" name="name" value={commonData.name} onChange={handleChangeCommon} className="input-style w-full" required placeholder="Örn: Pamuklu Slim Fit Gömlek" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="label-style">Ürün Açıklaması</label>
                                            <div className="relative">
                                                <textarea name="description" value={commonData.description} onChange={handleChangeCommon} className="input-style w-full h-24 pt-3" placeholder="Ürün detayları..."></textarea>
                                                <button type="button" onClick={handleGenerateDescription} disabled={isGeneratingDescription} className="absolute bottom-3 right-3 btn-secondary h-10 px-4 bg-pink-50 dark:bg-pink-900/20 text-pink-700 hover:bg-pink-100 dark:hover:bg-pink-900/40 border-pink-200 dark:border-pink-800 font-black text-[10px] uppercase tracking-tighter">
                                                    {isGeneratingDescription ? <Icon name="refresh" className="w-4 h-4 animate-spin"/> : <Icon name="ai" className="w-4 h-4"/>}
                                                    <span>AI Oluştur</span>
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="label-style">Marka *</label>
                                            <div className="flex gap-2">
                                                <select name="marka" value={commonData.marka} onChange={handleChangeCommon} className="input-style flex-grow" required>
                                                    <option value="">Seçin</option>
                                                    {definitions.brands.map(b=><option key={b.id} value={b.name}>{b.name}</option>)}
                                                </select>
                                                <button type="button" onClick={() => triggerQuickAdd('brand')} className="w-10 h-10 flex items-center justify-center rounded-xl bg-cyan-600 text-white hover:bg-cyan-500 shadow-lg shadow-cyan-500/20 shrink-0">
                                                    <Icon name="plus" className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="label-style">Model *</label>
                                            <div className="flex gap-2">
                                                <select name="model" value={commonData.model} onChange={handleChangeCommon} className="input-style flex-grow" required disabled={!commonData.marka}>
                                                    <option value="">Seçin</option>
                                                    {filteredModels.map(m=><option key={m.id} value={m.name}>{m.name}</option>)}
                                                </select>
                                                <button type="button" onClick={() => triggerQuickAdd('model', commonData.marka)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-cyan-600 text-white hover:bg-cyan-500 shadow-lg shadow-cyan-500/20 shrink-0 disabled:opacity-30 disabled:bg-slate-400" disabled={!commonData.marka}>
                                                    <Icon name="plus" className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="label-style">Grup *</label>
                                            <div className="flex gap-2">
                                                <select name="group" value={commonData.group} onChange={handleChangeCommon} className="input-style flex-grow" required disabled={!commonData.marka}>
                                                    <option value="">Seçin</option>
                                                    {mainGroups.map(g=><option key={g.id} value={g.name}>{g.name}</option>)}
                                                </select>
                                                <button type="button" onClick={() => triggerQuickAdd('group')} className="w-10 h-10 flex items-center justify-center rounded-xl bg-cyan-600 text-white hover:bg-cyan-500 shadow-lg shadow-cyan-500/20 shrink-0 disabled:opacity-30 disabled:bg-slate-400" disabled={!commonData.marka}>
                                                    <Icon name="plus" className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="label-style">Tedarikçi</label>
                                            <select name="supplierId" value={commonData.supplierId} onChange={handleChangeCommon} className="input-style w-full">
                                                <option value="">Tedarikçi Seçin (İsteğe Bağlı)</option>
                                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 border-b dark:border-slate-700 pb-2">2. Varyasyon Girişi</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border dark:border-slate-700">
                                        <div className="md:col-span-3"><label className="label-style">Renk *</label><select name="renk" value={currentVariation.renk} onChange={handleChangeVariation} className="input-style w-full"><option value="">Seçin</option>{definitions.colors.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                                        <div className="md:col-span-2"><label className="label-style">Beden *</label><select name="beden" value={currentVariation.beden} onChange={handleChangeVariation} className="input-style w-full"><option value="">Seçin</option>{definitions.sizes.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}</select></div>
                                        <div className="md:col-span-3">
                                            <label className="label-style">Barkod *</label>
                                            <div className="relative">
                                                <input type="text" name="barcode" ref={barcodeInputRef} value={currentVariation.barcode} onChange={handleChangeVariation} onKeyDown={handleVariationKeyDown} className="input-style w-full pr-10" placeholder="Barkod Taratın" />
                                                <button type="button" onClick={() => setCurrentVariation(v => ({ ...v, barcode: generateUniqueBarcode(products, addedVariations) }))} className="absolute right-0 top-0 h-full px-3 text-cyan-600 hover:text-cyan-700" title="Otomatik Barkod">
                                                    <Icon name="refresh" className="w-4 h-4" />
                                                </button>
                                            </div>
                                            {/* Secondary Barcodes for Variations */}
                                            <div className="mt-2 space-y-1">
                                                {currentVariation.secondaryBarcodes.map((bc, idx) => (
                                                    <div key={idx} className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-[10px] font-mono">
                                                        <span>{bc}</span>
                                                        <button type="button" onClick={() => setCurrentVariation(v => ({ ...v, secondaryBarcodes: v.secondaryBarcodes.filter((_, i) => i !== idx) }))} className="text-red-500 hover:text-red-700">
                                                            <Icon name="trash" className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <div className="flex gap-1">
                                                    <input 
                                                        type="text" 
                                                        placeholder="+ Ek Barkod" 
                                                        className="bg-transparent border-b border-slate-300 dark:border-slate-600 text-[10px] w-full focus:outline-none"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                const val = e.currentTarget.value.trim();
                                                                if (val && !currentVariation.secondaryBarcodes.includes(val)) {
                                                                    setCurrentVariation(v => ({ ...v, secondaryBarcodes: [...v.secondaryBarcodes, val] }));
                                                                    e.currentTarget.value = '';
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="md:col-span-2"><label className="label-style">Stok</label><input type="number" name="stock" value={currentVariation.stock} onChange={handleChangeVariation} className="input-style w-full" /></div>
                                        <div className="md:col-span-2"><button type="button" onClick={handleAddVariation} className="btn-primary w-full shadow-lg shadow-cyan-600/20"><Icon name="plus" className="w-5 h-5"/></button></div>
                                    </div>
                                    
                                    {addedVariations.length > 0 && (
                                        <div className="mt-6 border dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-700 font-black text-slate-400 uppercase tracking-tighter"><tr className="text-left"><th className="p-3">Renk</th><th className="p-3">Beden</th><th className="p-3">Barkodlar</th><th className="p-3">Stok</th><th className="p-3 text-right">İşlem</th></tr></thead>
                                                <tbody>{addedVariations.map(v => (<tr key={v.id} className="border-b dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"><td className="p-3 font-bold">{v.renk}</td><td className="p-3">{v.beden}</td><td className="p-3 font-mono text-cyan-600 dark:text-cyan-400">
                                                    <div className="flex flex-wrap gap-1">
                                                        <span className="font-bold">{v.barcode}</span>
                                                        {v.secondaryBarcodes.map((bc, i) => (
                                                            <span key={i} className="opacity-50 text-[10px]">, {bc}</span>
                                                        ))}
                                                    </div>
                                                </td><td className="p-3">{v.stock}</td><td className="p-3 text-right"><button type="button" onClick={() => handleRemoveVariation(v.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"><Icon name="trash" className="w-4 h-4" /></button></td></tr>))}</tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="lg:col-span-4 space-y-6">
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 border-b dark:border-slate-700 pb-2">3. Fiyatlandırma</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="label-style">Alış Fiyatı (₺)</label>
                                            <input type="text" name="buyPrice" value={commonData.buyPrice} onChange={handleChangeCommon} className="input-style w-full text-right font-black" placeholder="0,00"/>
                                        </div>
                                        <div>
                                            <label className="label-style">Kar Oranı (%)</label>
                                            <input type="text" name="margin" value={commonData.margin} onChange={handleChangeCommon} className="input-style w-full text-right font-black text-emerald-600 dark:text-emerald-400" placeholder="0,00" disabled={!commonData.buyPrice}/>
                                        </div>
                                        <div>
                                            <label className="label-style">Satış Fiyatı (₺) *</label>
                                            <input type="text" name="price" value={commonData.price} onChange={handleChangeCommon} className="input-style w-full text-right font-black text-xl text-cyan-600 dark:text-cyan-400" required placeholder="0,00"/>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm font-bold text-xs">
                                     <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 border-b dark:border-slate-700 pb-2">Diğer Kodlar</h3>
                                     <div className="space-y-4">
                                        <div><label className="label-style">Ana Stok Kodu</label><input type="text" name="anaStokKodu" value={commonData.anaStokKodu} onChange={handleChangeCommon} className="input-style w-full" placeholder="Örn: YNC-GMLK" /></div>
                                        <div><label className="label-style">Raf / Konum</label><input type="text" name="shelfLocation" value={commonData.shelfLocation} onChange={handleChangeCommon} className="input-style w-full" placeholder="Örn: A-12" /></div>
                                        <div className="grid grid-cols-2 gap-4">
                                             <div><label className="label-style">Ara Grup</label><select name="midGroup" value={commonData.midGroup} onChange={handleChangeCommon} className="input-style w-full" disabled={!commonData.group}><option value="">Seçin</option>{midGroups.map(g=><option key={g.id} value={g.name}>{g.name}</option>)}</select></div>
                                             <div><label className="label-style">Alt Grup</label><select name="subGroup" value={commonData.subGroup} onChange={handleChangeCommon} className="input-style w-full" disabled={!commonData.midGroup}><option value="">Seçin</option>{subGroups.map(g=><option key={g.id} value={g.name}>{g.name}</option>)}</select></div>
                                        </div>
                                     </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 border-t dark:border-slate-800 pt-8">
                            <button type="button" onClick={onClose} className="btn-secondary px-8 font-black uppercase text-xs">İptal</button>
                            <button type="submit" className="btn-primary px-10 font-black uppercase text-xs shadow-xl shadow-cyan-600/30 tracking-widest">Tüm Ürünleri Kaydet</button>
                        </div>
                    </form>
                )}
            </div>
            {/* Duplicate Error Modal */}
            {duplicateError && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[200] p-4 animate-fade-in">
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
    </div>
  );
};

// Standalone component for single product mode to keep the main component cleaner
const SingleProductForm: React.FC<Omit<AddProductModalProps, 'onSave' | 'isOpen'> & {
    onSave: (products: Product[]) => void; 
    generateUniqueBarcode: (p: Product[]) => string;
    onTriggerQuickAdd: (type: 'brand' | 'model' | 'group' | 'color' | 'size', brandName?: string, callback?: (name: string) => void) => void;
}> = ({onClose, onSave, definitions, suppliers, products, generateUniqueBarcode, onTriggerQuickAdd}) => {
    const [product, setProduct] = useState({ ...initialCommonState, barcode: '', secondaryBarcodes: [] as string[], renk: '', beden: '', stokKodu: '', stock: '0' });
    const [error, setError] = useState('');
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
    const [duplicateError, setDuplicateError] = useState<{barcode: string, productName: string} | null>(null);

    const handleGenerateDescription = async () => {
        setIsGeneratingDescription(true);
        setError('');
        try {
            const { buyPrice, price, margin, stock, ...productInfo } = product;
            const description = await generateProductDescription(productInfo as any);
            setProduct(prev => ({...prev, description}));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Açıklama oluşturulamadı.');
        } finally {
            setIsGeneratingDescription(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setProduct(prev => {
            const newState = { ...prev, [name]: value };
            if (['buyPrice', 'price', 'margin'].includes(name)) {
                const buyPriceNum = parseFloat(newState.buyPrice.replace(',', '.'));
                if (name === 'buyPrice' || name === 'price') {
                    const priceNum = parseFloat(newState.price.replace(',', '.'));
                    if (!isNaN(buyPriceNum) && buyPriceNum > 0 && !isNaN(priceNum)) {
                        const newMargin = ((priceNum - buyPriceNum) / buyPriceNum) * 100;
                        newState.margin = isFinite(newMargin) ? newMargin.toFixed(2).replace('.', ',') : '';
                    } else { newState.margin = ''; }
                } else if (name === 'margin') {
                    const marginNum = parseFloat(newState.margin.replace(',', '.'));
                    if (!isNaN(buyPriceNum) && buyPriceNum > 0 && !isNaN(marginNum)) {
                        const newPrice = buyPriceNum * (1 + marginNum / 100);
                        newState.price = isFinite(newPrice) ? newPrice.toFixed(2).replace('.', ',') : '';
                    }
                }
            }
             if(name === 'marka') { newState.model = ''; newState.group = ''; newState.midGroup = ''; newState.subGroup = ''; }
            if(name === 'group') { newState.midGroup = ''; newState.subGroup = ''; }
            if(name === 'midGroup') newState.subGroup = '';
            return newState;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!product.barcode || !product.name || !product.price || !product.marka || !product.model || !product.renk || !product.beden || !product.group) {
            setError('Yıldızlı (*) ile işaretli tüm alanlar zorunludur.');
            return;
        }

        const allBarcodes = [product.barcode, ...product.secondaryBarcodes].map(b => b.trim()).filter(Boolean);
        const conflict = products.find(p => {
            if (allBarcodes.includes(p.barcode)) return true;
            return p.secondaryBarcodes?.some(sb => allBarcodes.includes(sb));
        });
        
        if (conflict) {
            const matchedBarcode = allBarcodes.find(bc => bc === conflict.barcode || conflict.secondaryBarcodes?.includes(bc));
            setDuplicateError({ barcode: matchedBarcode || product.barcode, productName: conflict.name });
            return;
        }
        
        const priceValue = parseFloat(product.price.replace(',', '.')) || 0;
        const buyPriceValue = parseFloat(product.buyPrice.replace(',', '.')) || 0;

        const finalProduct: Product = {
            barcode: product.barcode,
            name: product.name,
            description: product.description || '',
            buyPrice: buyPriceValue,
            price: priceValue,
            stock: parseInt(product.stock, 10) || 0,
            stokKodu: product.stokKodu,
            marka: product.marka,
            model: product.model,
            renk: product.renk,
            beden: product.beden,
            anaStokKodu: product.anaStokKodu || product.stokKodu.split('-').slice(0, 2).join('-') || 'GENEL',
            group: product.group,
            midGroup: product.midGroup,
            subGroup: product.subGroup,
            supplierId: product.supplierId || undefined,
            shelfLocation: product.shelfLocation || '',
            isActivated: true,
            isDeleted: false,
            secondaryBarcodes: product.secondaryBarcodes
        };
        onSave([finalProduct]);
    };

     const selectedBrand = useMemo(() => definitions.brands.find(b => b.name === product.marka), [product.marka, definitions.brands]);
     const filteredModels = useMemo(() => selectedBrand ? definitions.models.filter(m => m.brandId === selectedBrand.id) : [], [selectedBrand, definitions.models]);
     const mainGroups = useMemo(() => {
        const selectedBrandId = selectedBrand?.id || null;
        return definitions.groups.filter(g => g.parentId === null && (g.brandId === selectedBrandId || g.brandId === null));
     }, [definitions.groups, selectedBrand]);
      const midGroups = useMemo(() => {
      const selectedGroup = mainGroups.find(g => g.name === product.group);
      if(!selectedGroup) return [];
      return definitions.groups.filter(g => g.parentId === selectedGroup.id);
    }, [product.group, mainGroups, definitions.groups]);
    const subGroups = useMemo(() => {
      const selectedMidGroup = midGroups.find(g => g.name === product.midGroup);
      if(!selectedMidGroup) return [];
      return definitions.groups.filter(g => g.parentId === selectedMidGroup.id);
    }, [product.midGroup, midGroups, definitions.groups]);

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in-up">
            {error && <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-xl text-red-700 dark:text-red-400 font-bold text-sm select-none">{error}</div>}
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 border-b dark:border-slate-700 pb-2 flex items-center gap-2">
                             <Icon name="tag" className="w-5 h-5 text-cyan-600"/> Ürün Kimlik Bilgileri
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="label-style">Barkod *</label>
                                <div className="relative">
                                    <input type="text" name="barcode" value={product.barcode} onChange={handleChange} className="w-full input-style pr-12 font-mono text-cyan-600 dark:text-cyan-400 font-bold" required placeholder="Barkod Okutun veya Oluşturun" />
                                    <button type="button" onClick={() => setProduct(p => ({ ...p, barcode: generateUniqueBarcode(products) }))} className="absolute right-0 top-0 h-full px-4 text-cyan-600 hover:text-cyan-700" title="Otomatik Barkod Oluştur">
                                        <Icon name="refresh" className="w-5 h-5" />
                                    </button>
                                </div>
                                {/* Secondary Barcodes for Single Product */}
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {product.secondaryBarcodes.map((bc, idx) => (
                                        <div key={idx} className="flex items-center gap-2 bg-cyan-500/10 text-cyan-600 px-3 py-1.5 rounded-xl text-xs font-bold border border-cyan-500/20">
                                            <span>{bc}</span>
                                            <button type="button" onClick={() => setProduct(p => ({ ...p, secondaryBarcodes: p.secondaryBarcodes.filter((_, i) => i !== idx) }))} className="hover:text-cyan-800">
                                                <Icon name="x-circle" className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="relative flex-grow min-w-[150px]">
                                        <input 
                                            type="text" 
                                            placeholder="+ Ek Barkod Ekle (Enter)" 
                                            className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-cyan-500/50"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const val = e.currentTarget.value.trim();
                                                    if (val && !product.secondaryBarcodes.includes(val) && val !== product.barcode) {
                                                        setProduct(p => ({ ...p, secondaryBarcodes: [...p.secondaryBarcodes, val] }));
                                                        e.currentTarget.value = '';
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="label-style">Ürün Tam Adı *</label>
                                <input type="text" name="name" value={product.name} onChange={handleChange} className="w-full input-style" required placeholder="Örn: Nike Air Max 270" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="label-style">Ürün Açıklaması</label>
                                <div className="relative">
                                    <textarea name="description" value={product.description} onChange={handleChange} className="input-style w-full h-24 pt-3" placeholder="Ürün özelliklerini girin..."></textarea>
                                    <button type="button" onClick={handleGenerateDescription} disabled={isGeneratingDescription} className="absolute bottom-3 right-3 btn-secondary h-10 px-4 bg-pink-50 dark:bg-pink-900/20 text-pink-700 border-pink-200 dark:border-pink-800 font-black text-[10px] uppercase tracking-tighter">
                                        {isGeneratingDescription ? <Icon name="refresh" className="w-4 h-4 animate-spin"/> : <Icon name="ai" className="w-4 h-4"/>}
                                        <span>AI Tanım</span>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="label-style">Marka *</label>
                                <div className="flex gap-2">
                                    <select name="marka" value={product.marka} onChange={handleChange} className="input-style flex-grow" required><option value="">Seçin</option>{definitions.brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}</select>
                                    <button type="button" onClick={() => onTriggerQuickAdd('brand', undefined, (name) => setProduct(p => ({...p, marka: name})))} className="w-10 h-10 flex items-center justify-center rounded-xl bg-cyan-600 text-white hover:bg-cyan-500 shrink-0 shadow-lg shadow-cyan-500/20"><Icon name="plus" className="w-4 h-4"/></button>
                                </div>
                            </div>
                            <div>
                                <label className="label-style">Model *</label>
                                <div className="flex gap-2">
                                    <select name="model" value={product.model} onChange={handleChange} className="input-style flex-grow" required disabled={!product.marka}><option value="">Seçin</option>{filteredModels.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}</select>
                                    <button type="button" onClick={() => onTriggerQuickAdd('model', product.marka, (name) => setProduct(p => ({...p, model: name})))} className="w-10 h-10 flex items-center justify-center rounded-xl bg-cyan-600 text-white hover:bg-cyan-500 shrink-0 shadow-lg shadow-cyan-500/20 disabled:opacity-30 disabled:bg-slate-400" disabled={!product.marka}><Icon name="plus" className="w-4 h-4"/></button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 md:col-span-2">
                                 <div>
                                    <label className="label-style">Renk *</label>
                                    <div className="flex gap-1.5">
                                        <select name="renk" value={product.renk} onChange={handleChange} className="input-style flex-grow" required>
                                            <option value="">Seçin</option>
                                            {definitions.colors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </select>
                                        <button type="button" onClick={() => onTriggerQuickAdd('color', undefined, (name) => setProduct(p => ({...p, renk: name})))} className="w-10 h-10 flex items-center justify-center rounded-xl bg-purple-600 text-white hover:bg-purple-500 shrink-0 shadow-lg shadow-purple-500/20">
                                            <Icon name="plus" className="w-4 h-4"/>
                                        </button>
                                    </div>
                                 </div>
                                 <div>
                                    <label className="label-style">Beden *</label>
                                    <div className="flex gap-1.5">
                                        <select name="beden" value={product.beden} onChange={handleChange} className="input-style flex-grow" required>
                                            <option value="">Seçin</option>
                                            {definitions.sizes.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                        </select>
                                        <button type="button" onClick={() => onTriggerQuickAdd('size', undefined, (name) => setProduct(p => ({...p, beden: name})))} className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 shrink-0 shadow-lg shadow-indigo-500/20">
                                            <Icon name="plus" className="w-4 h-4"/>
                                        </button>
                                    </div>
                                 </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 border-b dark:border-slate-700 pb-2 flex items-center gap-2">
                            <Icon name="purchase" className="w-5 h-5 text-cyan-600"/> Fiyat & Stok
                        </h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="label-style">Stok Miktarı</label>
                                    <input type="number" name="stock" value={product.stock} onChange={handleChange} className="input-style w-full font-black text-center text-xl bg-slate-50 dark:bg-slate-900 border-dashed" />
                                </div>
                                <div className="col-span-2"><hr className="dark:border-slate-700"/></div>
                                <div><label className="label-style">Alış (₺)</label><input type="text" name="buyPrice" value={product.buyPrice} onChange={handleChange} className="input-style w-full text-right" placeholder="0,00"/></div>
                                <div><label className="label-style">Kar (%)</label><input type="text" name="margin" value={product.margin} onChange={handleChange} className="input-style w-full text-right text-emerald-600" placeholder="0,00" disabled={!product.buyPrice}/></div>
                                <div className="col-span-2"><label className="label-style">Satış Fiyatı (₺) *</label><input type="text" name="price" value={product.price} onChange={handleChange} className="input-style w-full text-right font-black text-2xl text-cyan-600" required placeholder="0,00"/></div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 border-b dark:border-slate-700 pb-2">Kategorizasyon</h3>
                        <div className="space-y-4">
                             <div>
                                <label className="label-style">Grup *</label>
                                <div className="flex gap-2">
                                    <select name="group" value={product.group} onChange={handleChange} className="input-style flex-grow" required disabled={!product.marka}>
                                        <option value="">Grup Seçin</option>
                                        {mainGroups.map(g=><option key={g.id} value={g.name}>{g.name}</option>)}
                                    </select>
                                    <button type="button" onClick={() => onTriggerQuickAdd('group', undefined, (name) => setProduct(p => ({...p, group: name})))} className="w-10 h-10 flex items-center justify-center rounded-xl bg-cyan-600 text-white hover:bg-cyan-500 shrink-0 shadow-lg shadow-cyan-500/20 disabled:opacity-30 disabled:bg-slate-400" disabled={!product.marka}>
                                        <Icon name="plus" className="w-4 h-4"/>
                                    </button>
                                </div>
                             </div>
                             <div><label className="label-style">Stok Kodu</label><input type="text" name="stokKodu" value={product.stokKodu} onChange={handleChange} className="input-style w-full" placeholder="Örn: M-456" /></div>
                             <div><label className="label-style">Raf / Konum</label><input type="text" name="shelfLocation" value={product.shelfLocation} onChange={handleChange} className="input-style w-full" placeholder="Örn: B-04" /></div>
                             <div><label className="label-style">Tedarikçi</label><select name="supplierId" value={product.supplierId} onChange={handleChange} className="input-style w-full"><option value="">Tedarikçi (Opsiyonel)</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-4 border-t dark:border-slate-800 pt-8 mt-4">
                <button type="button" onClick={onClose} className="btn-secondary px-8 font-black uppercase text-xs">Vazgeç</button>
                <button type="submit" className="btn-primary px-10 font-black uppercase text-xs shadow-xl shadow-cyan-600/30 tracking-widest">Ürünü Kaydet</button>
            </div>
            {/* Duplicate Error Modal */}
            {duplicateError && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[200] p-4 animate-fade-in">
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
        </form>
    );
};

export default AddProductModal;