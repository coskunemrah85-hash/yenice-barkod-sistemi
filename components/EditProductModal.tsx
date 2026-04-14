import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, Brand, Model, Color, Size, Group } from '../types';
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
    productGroup: Product[];
    definitions: Definitions;
}

const EditProductModal: React.FC<EditProductModalProps> = ({ isOpen, onClose, onSave, productGroup, definitions }) => {
    const [commonData, setCommonData] = useState<Partial<Product>>({});
    const [variations, setVariations] = useState<Product[]>([]);
    const [applyPricesToAll, setApplyPricesToAll] = useState(true);
    const initialVariations = useRef<Product[]>([]);
    const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && productGroup.length > 0) {
            const firstProduct = productGroup[0];
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
            });
            
            const deepCopiedGroup = JSON.parse(JSON.stringify(productGroup));
            setVariations(deepCopiedGroup);
            initialVariations.current = deepCopiedGroup;
        }
    }, [isOpen, productGroup]);
    
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
        
        setCommonData(prev => ({ ...prev, [name]: value }));
        
        if (applyPricesToAll) {
            setVariations(vars => vars.map(v => ({ ...v, [name]: value })));
        }
    };

    const handleVariationChange = (index: number, field: keyof Product, value: string | number) => {
        setVariations(vars => vars.map((v, i) => {
            if (i === index) {
                return { ...v, [field]: value };
            }
            return v;
        }));
    };

    const handleSave = () => {
        const finalProducts = variations.map(v => {
            const baseName = commonData.name || '';
            const newName = v.renk && v.beden ? `${baseName} (${v.renk} - ${v.beden})` : baseName;
            return {
                ...v,
                ...commonData,
                price: parseFloat(String(v.price).replace(',', '.')) || 0,
                buyPrice: parseFloat(String(v.buyPrice).replace(',', '.')) || 0,
                name: newName,
            };
        });

        const changedProducts = finalProducts.filter(updatedProduct => {
            const originalProduct = initialVariations.current.find(p => p.stokKodu === updatedProduct.stokKodu);
            return !originalProduct || JSON.stringify(originalProduct) !== JSON.stringify(updatedProduct);
        });

        if (changedProducts.length > 0) {
            onSave(changedProducts);
        }
        onClose();
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
        return definitions.groups.filter(g => g.parentId === selectedGroup.id && g.brandId === selectedGroup.brandId);
    }, [commonData.group, mainGroups, definitions.groups]);
    const subGroups = useMemo(() => {
        const selectedMidGroup = midGroups.find(g => g.name === commonData.midGroup);
        if (!selectedMidGroup) return [];
        return definitions.groups.filter(g => g.parentId === selectedMidGroup.id && g.brandId === selectedMidGroup.brandId);
    }, [commonData.midGroup, midGroups, definitions.groups]);


    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-5 border-b flex justify-between items-center bg-slate-50">
                    <h2 className="text-2xl font-bold text-slate-800">Ürün Grubu Düzenle: {commonData.anaStokKodu}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200"><Icon name="x-circle" className="w-7 h-7 text-slate-500"/></button>
                </header>
                <main className="flex-grow p-6 overflow-y-auto space-y-6">
                     {error && <p className="text-red-600 bg-red-100 p-3 rounded-lg">{error}</p>}
                    <section>
                        <h3 className="text-lg font-semibold text-slate-700 mb-3 border-b pb-2">Ortak Bilgiler</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="col-span-2">
                                <label className="label-style">Ürün Adı (Temel)</label>
                                <input type="text" name="name" value={commonData.name || ''} onChange={handleCommonDataChange} className="input-style w-full"/>
                            </div>
                             <div className="col-span-2 row-span-2">
                                <label className="label-style">Ürün Açıklaması</label>
                                <div className="relative h-full">
                                    <textarea name="description" value={commonData.description || ''} onChange={handleCommonDataChange} className="input-style w-full h-full" rows={4}></textarea>
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
                            <div><label className="label-style">Ana Stok Kodu</label><input type="text" name="anaStokKodu" value={commonData.anaStokKodu || ''} onChange={handleCommonDataChange} className="input-style w-full"/></div>
                            <div><label className="label-style">Marka</label><select name="marka" value={commonData.marka || ''} onChange={handleCommonDataChange} className="input-style w-full"><option value="">Seçiniz</option>{definitions.brands.map(b=><option key={b.id} value={b.name}>{b.name}</option>)}</select></div>
                            <div><label className="label-style">Model</label><select name="model" value={commonData.model || ''} onChange={handleCommonDataChange} className="input-style w-full" disabled={!commonData.marka}><option value="">Seçiniz</option>{filteredModels.map(m=><option key={m.id} value={m.name}>{m.name}</option>)}</select></div>
                             <div><label className="label-style">Grup</label><select name="group" value={commonData.group || ''} onChange={handleCommonDataChange} className="input-style w-full"><option value="">Seçiniz</option>{mainGroups.map(g=><option key={g.id} value={g.name}>{g.name} {g.brandId === null && '(Genel)'}</option>)}</select></div>
                             <div><label className="label-style">Ara Grup</label><select name="midGroup" value={commonData.midGroup || ''} onChange={handleCommonDataChange} className="input-style w-full" disabled={!commonData.group}><option value="">Seçiniz</option>{midGroups.map(g=><option key={g.id} value={g.name}>{g.name} {g.brandId === null && '(Genel)'}</option>)}</select></div>
                             <div><label className="label-style">Alt Grup</label><select name="subGroup" value={commonData.subGroup || ''} onChange={handleCommonDataChange} className="input-style w-full" disabled={!commonData.midGroup}><option value="">Seçiniz</option>{subGroups.map(g=><option key={g.id} value={g.name}>{g.name} {g.brandId === null && '(Genel)'}</option>)}</select></div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold text-slate-700 mb-3 border-b pb-2">Toplu Fiyatlandırma</h3>
                         <div className="flex items-end gap-4">
                            <div><label className="label-style">Alış Fiyatı</label><input type="text" name="buyPrice" value={commonData.buyPrice || ''} onChange={handlePriceChange} className="input-style"/></div>
                            <div><label className="label-style">Satış Fiyatı</label><input type="text" name="price" value={commonData.price || ''} onChange={handlePriceChange} className="input-style"/></div>
                            <label className="flex items-center gap-2 pb-2 cursor-pointer"><input type="checkbox" checked={applyPricesToAll} onChange={(e) => setApplyPricesToAll(e.target.checked)} className="h-5 w-5 rounded text-cyan-600 focus:ring-cyan-500"/> Fiyatları tüm varyasyonlara uygula</label>
                        </div>
                    </section>
                    
                    <section>
                         <h3 className="text-lg font-semibold text-slate-700 mb-3 border-b pb-2">Varyasyonlar</h3>
                         <div className="overflow-x-auto border rounded-lg">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-100">
                                    <tr>
                                        <th className="th-style">Renk</th><th className="th-style">Beden</th>
                                        <th className="th-style">Stok Kodu</th><th className="th-style">Barkod</th>
                                        <th className="th-style text-right">Stok</th><th className="th-style text-right">Alış Fiyatı</th>
                                        <th className="th-style text-right">Satış Fiyatı</th>
                                    </tr>
                                </thead>
                                <tbody>
                                {variations.map((v, index) => (
                                    <tr key={index} className="border-b last:border-b-0 hover:bg-slate-50">
                                        <td className="td-style"><input value={v.renk} onChange={e=>handleVariationChange(index, 'renk', e.target.value)} className="table-input"/></td>
                                        <td className="td-style"><input value={v.beden} onChange={e=>handleVariationChange(index, 'beden', e.target.value)} className="table-input"/></td>
                                        <td className="td-style"><input value={v.stokKodu} onChange={e=>handleVariationChange(index, 'stokKodu', e.target.value)} className="table-input"/></td>
                                        <td className="td-style"><input value={v.barcode} onChange={e=>handleVariationChange(index, 'barcode', e.target.value)} className="table-input"/></td>
                                            <td className="td-style text-right font-semibold">{v.stock}</td>
                                        <td className="td-style"><input value={v.buyPrice} onChange={e=>handleVariationChange(index, 'buyPrice', e.target.value)} className="table-input text-right" disabled={applyPricesToAll}/></td>
                                        <td className="td-style"><input value={v.price} onChange={e=>handleVariationChange(index, 'price', e.target.value)} className="table-input text-right" disabled={applyPricesToAll}/></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                         </div>
                    </section>
                </main>
                <footer className="p-4 border-t bg-slate-100 flex justify-end gap-4">
                    <button onClick={onClose} className="btn-secondary">İptal</button>
                    <button onClick={handleSave} className="btn-primary">Değişiklikleri Kaydet</button>
                </footer>
            </div>
            <style>{`
                .label-style { display: block; font-size: 0.875rem; font-weight: 500; color: #475569; margin-bottom: 0.25rem; }
                .input-style { background-color: white; border: 1px solid #cbd5e1; border-radius: 0.5rem; padding: 0.5rem 0.75rem; transition: all 0.2s; height: 42px; }
                .input-style:focus { outline: none; box-shadow: 0 0 0 2px #e0f2fe, 0 0 0 4px #0ea5e9; border-color: #0ea5e9; }
                textarea.input-style { height: auto; }
                .th-style { padding: 0.75rem; text-align: left; font-semibold; color: #475569; }
                .td-style { padding: 0.25rem 0.5rem; }
                .table-input { width: 100%; border: 1px solid transparent; background: transparent; padding: 0.5rem; border-radius: 0.25rem; }
                .table-input:focus { background: white; border-color: #0ea5e9; outline: none; box-shadow: 0 0 0 2px #e0f2fe; }
                .table-input:disabled { background: #f1f5f9; color: #64748b; cursor: not-allowed; }
                .btn-primary { background-color: #0ea5e9; color: white; font-weight: bold; border-radius: 0.5rem; padding: 0.6rem 1.5rem; transition: background-color 0.2s; }
                .btn-primary:hover { background-color: #0284c7; }
                .btn-secondary { background-color: white; border: 1px solid #cbd5e1; color: #334155; font-weight: 600; border-radius: 0.5rem; padding: 0.6rem 1.5rem; transition: all 0.2s; }
                .btn-secondary:hover { background-color: #f1f5f9; border-color: #94a3b8; }
                .btn-secondary-sm { display: inline-flex; align-items: center; justify-content: center; gap: 0.25rem; font-weight: 600; padding: 0 0.75rem; border-radius: 0.375rem; transition: all 0.2s; height: 32px; font-size: 0.8rem; border: 1px solid #cbd5e1; }
                .btn-secondary-sm:disabled { opacity: 0.5; cursor: not-allowed; }
            `}</style>
        </div>
    );
};

export default EditProductModal;