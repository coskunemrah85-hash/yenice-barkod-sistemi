import React, { useState, useMemo, useRef } from 'react';
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

interface AddProductModalProps {
  onClose: () => void;
  onSave: (products: Product[]) => void;
  definitions: Definitions;
  suppliers: Supplier[];
  products: Product[];
}

type VariationEntry = {
    id: number;
    renk: string;
    beden: string;
    barcode: string;
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
    anaStokKodu: ''
};

const initialVariationState = {
    renk: '',
    beden: '',
    barcode: '',
    stokKodu: '',
    stock: '0',
};


const AddProductModal: React.FC<AddProductModalProps> = ({ onClose, onSave, definitions, suppliers, products }) => {
    const [mode, setMode] = useState<'single' | 'variation'>('single');
    const [error, setError] = useState('');
    
    // States for 'variation' mode
    const [commonData, setCommonData] = useState(initialCommonState);
    const [currentVariation, setCurrentVariation] = useState(initialVariationState);
    const [addedVariations, setAddedVariations] = useState<VariationEntry[]>([]);
    const barcodeInputRef = useRef<HTMLInputElement>(null);
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

    const generateUniqueBarcode = (existingProducts: Product[], existingVariations: VariationEntry[] = []): string => {
        let barcode: string;
        let isUnique = false;
        while (!isUnique) {
            barcode = '20' + Math.floor(10000000000 + Math.random() * 90000000000).toString();
            const isUsedInProducts = existingProducts.some(p => p.barcode === barcode);
            const isUsedInVariations = existingVariations.some(v => v.barcode === barcode);
            if (!isUsedInProducts && !isUsedInVariations) {
                isUnique = true;
            }
        }
        return barcode!;
    };
    
    const handleGenerateDescription = async () => {
        setIsGeneratingDescription(true);
        setError('');
        try {
            // FIX: Destructure commonData to omit string-based price properties before passing to generateProductDescription.
            const { buyPrice, price, margin, ...productInfo } = commonData;
            const description = await generateProductDescription(productInfo);
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

    const handleAddVariation = () => {
        setError('');
        const { barcode, renk, beden } = currentVariation;
        if (!barcode || !renk || !beden) {
            setError("Lütfen Varyasyon için Renk, Beden ve Barkod girin.");
            return;
        }
        if (products.some(p => p.barcode === barcode) || addedVariations.some(v => v.barcode === barcode)) {
            setError("Bu barkod zaten kullanımda.");
            barcodeInputRef.current?.select();
            return;
        }
        
        setAddedVariations(prev => [...prev, { ...currentVariation, id: Date.now() }]);
        setCurrentVariation(prev => ({
            ...initialVariationState,
            renk: prev.renk, // Keep color for next entry
        }));
        barcodeInputRef.current?.focus();
    };

    const handleVariationKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddVariation();
        }
    };

    const handleRemoveVariation = (id: number) => {
        setAddedVariations(prev => prev.filter(v => v.id !== id));
    };

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
        
        const priceValue = parseFloat(commonData.price.replace(',', '.'));
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
                isActivated: false,
            };
        });

        onSave(productsToSave);
        onClose();
    };

    // --- Dynamic dropdowns for variation mode ---
    const selectedBrand = useMemo(() => definitions.brands.find(b => b.name === commonData.marka), [commonData.marka, definitions.brands]);
    const filteredModels = useMemo(() => selectedBrand ? definitions.models.filter(m => m.brandId === selectedBrand.id) : [], [selectedBrand, definitions.models]);
    const mainGroups = useMemo(() => {
      const selectedBrandId = selectedBrand?.id || null;
      return definitions.groups.filter(g => g.parentId === null && (g.brandId === selectedBrandId || g.brandId === null));
    }, [definitions.groups, selectedBrand]);
    const midGroups = useMemo(() => {
      const selectedGroup = mainGroups.find(g => g.name === commonData.group);
      if(!selectedGroup) return [];
      return definitions.groups.filter(g => g.parentId === selectedGroup.id && g.brandId === selectedGroup.brandId);
    }, [commonData.group, mainGroups, definitions.groups]);
    const subGroups = useMemo(() => {
      const selectedMidGroup = midGroups.find(g => g.name === commonData.midGroup);
      if(!selectedMidGroup) return [];
      return definitions.groups.filter(g => g.parentId === selectedMidGroup.id && g.brandId === selectedMidGroup.brandId);
    }, [commonData.midGroup, midGroups, definitions.groups]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
        >
            <header className="p-5 border-b flex justify-between items-center flex-shrink-0 bg-slate-50/80">
                <h2 className="text-2xl font-bold text-slate-800">Yeni Ürün Ekle</h2>
                <div className="flex items-center gap-2">
                    <div className="bg-slate-200 p-1 rounded-lg flex">
                        <button onClick={() => setMode('single')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${mode === 'single' ? 'bg-white shadow' : 'text-slate-600'}`}>Tek Ürün</button>
                        <button onClick={() => setMode('variation')} className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${mode === 'variation' ? 'bg-white shadow' : 'text-slate-600'}`}>Varyasyonlu Ürün</button>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-2 rounded-full -ml-2">
                         <Icon name="x-circle" className="w-7 h-7" />
                    </button>
                </div>
            </header>
            
            {mode === 'single' ? (
                <SingleProductForm onSave={onSave} onClose={onClose} definitions={definitions} suppliers={suppliers} products={products} generateUniqueBarcode={generateUniqueBarcode} />
            ) : (
                <form onSubmit={handleVariationSubmit}>
                    <main className="p-6 flex-grow overflow-y-auto max-h-[70vh] space-y-6">
                        {error && <p className="text-red-600 bg-red-100 p-3 rounded-lg">{error}</p>}
                        
                        {/* Ortak Bilgiler */}
                        <div>
                            <h3 className="font-semibold text-lg text-slate-700 border-b pb-2 mb-4">1. Ortak Ürün Bilgileri</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4">
                                <div className="md:col-span-4">
                                    <label className="label-style">Ürün Adı (Temel) *</label>
                                    <input type="text" name="name" value={commonData.name} onChange={handleChangeCommon} className="input-style w-full" required />
                                </div>

                                 <div className="md:col-span-4">
                                    <label className="label-style">Ürün Açıklaması</label>
                                    <div className="relative">
                                        <textarea name="description" value={commonData.description} onChange={handleChangeCommon} className="input-style w-full" rows={3}></textarea>
                                        <button type="button" onClick={handleGenerateDescription} disabled={isGeneratingDescription} className="absolute bottom-2 right-2 btn-secondary-sm bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100 disabled:bg-slate-200 disabled:text-slate-500">
                                            {isGeneratingDescription ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-700"></div>
                                            ) : (
                                                <Icon name="ai" className="w-4 h-4"/>
                                            )}
                                            <span>Oluştur</span>
                                        </button>
                                    </div>
                                </div>
                               
                                <div>
                                    <label className="label-style">Ana Stok Kodu</label>
                                    <input type="text" name="anaStokKodu" value={commonData.anaStokKodu} onChange={handleChangeCommon} className="input-style w-full" />
                                </div>
                                <div>
                                    <label className="label-style">Tedarikçi</label>
                                    <select name="supplierId" value={commonData.supplierId} onChange={handleChangeCommon} className="input-style w-full">
                                        <option value="">Seçin (İsteğe Bağlı)</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-3 gap-2 md:col-span-2">
                                    <div>
                                        <label className="label-style">Alış Fiyatı</label>
                                        <input type="text" name="buyPrice" value={commonData.buyPrice} onChange={handleChangeCommon} className="w-full input-style" placeholder="0,00"/>
                                    </div>
                                    <div>
                                        <label className="label-style">Kar Oranı (%)</label>
                                        <input type="text" name="margin" value={commonData.margin} onChange={handleChangeCommon} className="w-full input-style" placeholder="0,00" disabled={!commonData.buyPrice}/>
                                    </div>
                                    <div>
                                        <label className="label-style">Satış Fiyatı *</label>
                                        <input type="text" name="price" value={commonData.price} onChange={handleChangeCommon} className="w-full input-style" required placeholder="0,00"/>
                                    </div>
                                </div>
                                <div>
                                    <label className="label-style">Marka *</label>
                                    <select name="marka" value={commonData.marka} onChange={handleChangeCommon} className="input-style w-full" required><option value="">Seçin</option>{definitions.brands.map(b=><option key={b.id} value={b.name}>{b.name}</option>)}</select>
                                </div>
                                <div>
                                    <label className="label-style">Model *</label>
                                    <select name="model" value={commonData.model} onChange={handleChangeCommon} className="input-style w-full" required disabled={!commonData.marka}><option value="">Seçin</option>{filteredModels.map(m=><option key={m.id} value={m.name}>{m.name}</option>)}</select>
                                </div>
                                <div>
                                    <label className="label-style">Grup *</label>
                                    <select name="group" value={commonData.group} onChange={handleChangeCommon} className="input-style w-full" required disabled={!commonData.marka}><option value="">Seçin</option>{mainGroups.map(g=><option key={g.id} value={g.name}>{g.name} {g.brandId === null && '(Genel)'}</option>)}</select>
                                </div>
                                <div>
                                    <label className="label-style">Ara Grup</label>
                                    <select name="midGroup" value={commonData.midGroup} onChange={handleChangeCommon} className="input-style w-full" disabled={!commonData.group}><option value="">Seçin</option>{midGroups.map(g=><option key={g.id} value={g.name}>{g.name} {g.brandId === null && '(Genel)'}</option>)}</select>
                                </div>
                                <div>
                                    <label className="label-style">Alt Grup</label>
                                    <select name="subGroup" value={commonData.subGroup} onChange={handleChangeCommon} className="input-style w-full" disabled={!commonData.midGroup}><option value="">Seçin</option>{subGroups.map(g=><option key={g.id} value={g.name}>{g.name} {g.brandId === null && '(Genel)'}</option>)}</select>
                                </div>
                            </div>
                        </div>

                        {/* Varyasyon Ekleme */}
                        <div>
                            <h3 className="font-semibold text-lg text-slate-700 border-b pb-2 mb-4">2. Varyasyonları Ekle</h3>
                            <div className="grid grid-cols-12 gap-3 items-end bg-slate-100 p-3 rounded-lg">
                                <div className="col-span-2"><label className="label-style">Renk *</label><select name="renk" value={currentVariation.renk} onChange={handleChangeVariation} className="input-style w-full"><option value="">Seçin</option>{definitions.colors.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                                <div className="col-span-2"><label className="label-style">Beden *</label><select name="beden" value={currentVariation.beden} onChange={handleChangeVariation} className="input-style w-full"><option value="">Seçin</option>{definitions.sizes.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}</select></div>
                                <div className="col-span-2"><label className="label-style">Stok Kodu</label><input type="text" name="stokKodu" value={currentVariation.stokKodu} onChange={handleChangeVariation} className="input-style w-full" /></div>
                                <div className="col-span-1"><label className="label-style">Stok</label><input type="number" name="stock" value={currentVariation.stock} onChange={handleChangeVariation} className="input-style w-full" /></div>
                                <div className="col-span-3">
                                    <label className="label-style">Barkod *</label>
                                    <div className="relative">
                                        <input type="text" name="barcode" ref={barcodeInputRef} value={currentVariation.barcode} onChange={handleChangeVariation} onKeyDown={handleVariationKeyDown} className="input-style w-full pr-10" />
                                        <button type="button" onClick={() => setCurrentVariation(v => ({ ...v, barcode: generateUniqueBarcode(products, addedVariations) }))} className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-cyan-600" title="Otomatik Barkod Oluştur">
                                            <Icon name="ai" className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="col-span-2"><button type="button" onClick={handleAddVariation} className="btn-secondary w-full"><Icon name="plus" className="w-5 h-5"/> Varyasyon Ekle</button></div>
                            </div>
                            
                            {addedVariations.length > 0 && (
                                <div className="mt-4 border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-200"><tr className="text-left"><th className="p-2">Renk</th><th className="p-2">Beden</th><th className="p-2">Stok Kodu</th><th className="p-2">Barkod</th><th className="p-2">Stok</th><th className="p-2"></th></tr></thead>
                                    <tbody>{addedVariations.map(v => (<tr key={v.id} className="border-b"><td className="p-2">{v.renk}</td><td className="p-2">{v.beden}</td><td className="p-2">{v.stokKodu}</td><td className="p-2 font-mono">{v.barcode}</td><td className="p-2">{v.stock}</td><td className="p-2 text-right"><button type="button" onClick={() => handleRemoveVariation(v.id)} className="p-1 text-red-500 hover:bg-red-100 rounded-full"><Icon name="trash" className="w-4 h-4" /></button></td></tr>))}</tbody>
                                </table>
                                </div>
                            )}
                        </div>
                    </main>
                    <footer className="p-4 border-t flex justify-end gap-4 flex-shrink-0 bg-slate-50 rounded-b-xl">
                        <button type="button" onClick={onClose} className="btn-secondary">İptal</button>
                        <button type="submit" className="btn-primary">Tüm Ürünleri Kaydet</button>
                    </footer>
                </form>
            )}
        </div>
        <style>{`
            .label-style { display: block; font-size: 0.875rem; font-weight: 500; color: #475569; margin-bottom: 0.25rem; }
            .input-style { background-color: white; border: 1px solid #cbd5e1; border-radius: 0.5rem; padding: 0.5rem 0.75rem; transition: all 0.2s; height: 42px; }
            .input-style:focus { outline: none; box-shadow: 0 0 0 2px #e0f2fe, 0 0 0 4px #0ea5e9; border-color: #0ea5e9; }
            .input-style:disabled { background-color: #f1f5f9; cursor: not-allowed; }
            textarea.input-style { height: auto; }
            .btn-primary { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; background-color: #0ea5e9; color: white; font-weight: 600; padding: 0 1.5rem; border-radius: 0.5rem; transition: all 0.2s; height: 42px; }
            .btn-primary:hover { background-color: #0284c7; }
            .btn-secondary { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; background-color: white; border: 1px solid #cbd5e1; color: #334155; font-weight: 600; padding: 0 1rem; border-radius: 0.5rem; transition: all 0.2s; height: 42px; }
            .btn-secondary:hover { background-color: #f1f5f9; }
            .btn-secondary-sm { display: inline-flex; align-items: center; justify-content: center; gap: 0.25rem; font-weight: 600; padding: 0 0.75rem; border-radius: 0.375rem; transition: all 0.2s; height: 32px; font-size: 0.8rem; border: 1px solid #cbd5e1; }
            .btn-secondary-sm:disabled { opacity: 0.5; cursor: not-allowed; }
            @keyframes fade-in-up {
                from { opacity: 0; transform: translateY(20px) scale(0.98); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
        `}</style>
    </div>
  );
};

// Standalone component for single product mode to keep the main component cleaner
const SingleProductForm: React.FC<Omit<AddProductModalProps, 'onSave'> & {onSave: (products: Product[]) => void; generateUniqueBarcode: (p: Product[], v?: any[]) => string}> = ({onClose, onSave, definitions, suppliers, products, generateUniqueBarcode}) => {
    const [product, setProduct] = useState({ ...initialCommonState, barcode: '', renk: '', beden: '', stokKodu: '', stock: '' });
    const [error, setError] = useState('');
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

    const handleGenerateDescription = async () => {
        setIsGeneratingDescription(true);
        setError('');
        try {
            // FIX: Destructure 'stock' along with other string-based properties to prevent a type mismatch, as the form state uses a string for stock while the Product type expects a number.
            const { buyPrice, price, margin, stock, ...productInfo } = product;
            const description = await generateProductDescription(productInfo);
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
        if (products.some(p => p.barcode === product.barcode)) {
            setError('Bu barkod zaten kullanımda.');
            return;
        }
        const priceValue = parseFloat(product.price.replace(',', '.'));
        const buyPriceValue = parseFloat(product.buyPrice.replace(',', '.')) || 0;

        const finalProduct: Product = {
            ...product,
            description: product.description || '',
            buyPrice: buyPriceValue,
            price: priceValue,
            stock: parseInt(product.stock, 10) || 0,
            anaStokKodu: product.anaStokKodu || product.stokKodu.split('-').slice(0, 2).join('-') || 'GENEL',
            supplierId: product.supplierId || undefined,
            isActivated: false,
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
      return definitions.groups.filter(g => g.parentId === selectedGroup.id && g.brandId === selectedGroup.brandId);
    }, [product.group, mainGroups, definitions.groups]);
    const subGroups = useMemo(() => {
      const selectedMidGroup = midGroups.find(g => g.name === product.midGroup);
      if(!selectedMidGroup) return [];
      return definitions.groups.filter(g => g.parentId === selectedMidGroup.id && g.brandId === selectedMidGroup.brandId);
    }, [product.midGroup, midGroups, definitions.groups]);


    return (
        <form onSubmit={handleSubmit}>
            <main className="p-6 flex-grow overflow-y-auto max-h-[70vh]">
                {error && <p className="text-red-600 bg-red-100 p-3 rounded-lg mb-4">{error}</p>}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                    <div className="space-y-4 md:col-span-3">
                        <div className="relative">
                            <label className="label-style">Ürün Açıklaması</label>
                            <textarea name="description" value={product.description} onChange={handleChange} className="input-style w-full" rows={3}></textarea>
                            <button type="button" onClick={handleGenerateDescription} disabled={isGeneratingDescription} className="absolute bottom-2 right-2 btn-secondary-sm bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100 disabled:bg-slate-200 disabled:text-slate-500">
                                {isGeneratingDescription ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-700"></div>
                                ) : (
                                    <Icon name="ai" className="w-4 h-4"/>
                                )}
                                <span>Oluştur</span>
                            </button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg text-slate-700 border-b pb-2">Temel Bilgiler</h3>
                        <div>
                            <label className="label-style">Barkod *</label>
                            <div className="relative">
                                <input type="text" name="barcode" value={product.barcode} onChange={handleChange} className="w-full input-style pr-10" required />
                                <button type="button" onClick={() => setProduct(p => ({ ...p, barcode: generateUniqueBarcode(products) }))} className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-cyan-600" title="Otomatik Barkod Oluştur">
                                    <Icon name="ai" className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div><label className="label-style">Ürün Adı *</label><input type="text" name="name" value={product.name} onChange={handleChange} className="w-full input-style" required /></div>
                        <div className="grid grid-cols-3 gap-2">
                             <div><label className="label-style">Alış Fiyatı</label><input type="text" name="buyPrice" value={product.buyPrice} onChange={handleChange} className="w-full input-style" placeholder="0,00"/></div>
                             <div><label className="label-style">Kar (%)</label><input type="text" name="margin" value={product.margin} onChange={handleChange} className="w-full input-style" placeholder="0,00" disabled={!product.buyPrice}/></div>
                             <div><label className="label-style">Satış Fiyatı *</label><input type="text" name="price" value={product.price} onChange={handleChange} className="w-full input-style" required placeholder="0,00"/></div>
                        </div>
                        <div><label className="label-style">Stok Adedi</label><input type="number" name="stock" value={product.stock} onChange={handleChange} className="w-full input-style" /></div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg text-slate-700 border-b pb-2">Ürün Detayları</h3>
                        <div><label className="label-style">Marka *</label><select name="marka" value={product.marka} onChange={handleChange} className="w-full input-style" required><option value="">Seçin</option>{definitions.brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}</select></div>
                        <div><label className="label-style">Model *</label><select name="model" value={product.model} onChange={handleChange} className="w-full input-style" required disabled={!product.marka}><option value="">Seçin</option>{filteredModels.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}</select></div>
                        <div className="grid grid-cols-2 gap-4">
                             <div><label className="label-style">Renk *</label><select name="renk" value={product.renk} onChange={handleChange} className="w-full input-style" required><option value="">Seçin</option>{definitions.colors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                             <div><label className="label-style">Beden *</label><select name="beden" value={product.beden} onChange={handleChange} className="w-full input-style" required><option value="">Seçin</option>{definitions.sizes.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select></div>
                        </div>
                        <div><label className="label-style">Tedarikçi</label><select name="supplierId" value={product.supplierId} onChange={handleChange} className="w-full input-style"><option value="">Seçin (İsteğe Bağlı)</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg text-slate-700 border-b pb-2">Kategorizasyon</h3>
                        <div><label className="label-style">Grup *</label><select name="group" value={product.group} onChange={handleChange} className="w-full input-style" required disabled={!product.marka}><option value="">Seçin</option>{mainGroups.map(g=><option key={g.id} value={g.name}>{g.name} {g.brandId === null && '(Genel)'}</option>)}</select></div>
                        <div><label className="label-style">Ara Grup</label><select name="midGroup" value={product.midGroup} onChange={handleChange} className="w-full input-style" disabled={!product.group}><option value="">Seçin</option>{midGroups.map(g=><option key={g.id} value={g.name}>{g.name} {g.brandId === null && '(Genel)'}</option>)}</select></div>
                        <div><label className="label-style">Alt Grup</label><select name="subGroup" value={product.subGroup} onChange={handleChange} className="w-full input-style" disabled={!product.midGroup}><option value="">Seçin</option>{subGroups.map(g=><option key={g.id} value={g.name}>{g.name} {g.brandId === null && '(Genel)'}</option>)}</select></div>
                        <div><label className="label-style">Stok Kodu</label><input type="text" name="stokKodu" value={product.stokKodu} onChange={handleChange} className="w-full input-style" placeholder="Örn: YN-KL-001" /></div>
                        <div><label className="label-style">Ana Stok Kodu</label><input type="text" name="anaStokKodu" value={product.anaStokKodu} onChange={handleChange} className="w-full input-style" /></div>
                    </div>
                </div>
            </main>
            <footer className="p-4 border-t flex justify-end gap-4 flex-shrink-0 bg-slate-50 rounded-b-xl">
                <button type="button" onClick={onClose} className="btn-secondary">İptal</button>
                <button type="submit" className="btn-primary">Ürünü Kaydet</button>
            </footer>
        </form>
    );
}

export default AddProductModal;