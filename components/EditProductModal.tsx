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
                shelfLocation: firstProduct.shelfLocation || '',
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
        const numValue = parseFloat(value.replace(',', '.')) || 0;
        
        setCommonData(prev => ({ ...prev, [name]: value }));
        
        if (applyPricesToAll) {
            setVariations(vars => vars.map(v => ({ ...v, [name]: numValue })));
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

    const addVariation = () => {
        const lastVar = variations[variations.length - 1];
        const newBarcode = (parseInt(lastVar?.barcode || '100000000000') + 1).toString();
        
        const newVariation: Product = {
            ...productGroup[0],
            barcode: newBarcode,
            stokKodu: `${commonData.anaStokKodu}-${variations.length + 1}`,
            renk: '',
            beden: '',
            stock: 0,
            buyPrice: parseFloat(String(commonData.buyPrice || 0).replace(',', '.')) || 0,
            price: parseFloat(String(commonData.price || 0).replace(',', '.')) || 0,
            isActivated: true
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
        onSave(finalProducts as Product[]);
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
        return definitions.groups.filter(g => g.parentId === selectedGroup.id);
    }, [commonData.group, mainGroups, definitions.groups]);
    
    const subGroups = useMemo(() => {
        const selectedMidGroup = midGroups.find(g => g.name === commonData.midGroup);
        if (!selectedMidGroup) return [];
        return definitions.groups.filter(g => g.parentId === selectedMidGroup.id);
    }, [commonData.midGroup, midGroups, definitions.groups]);

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-4" onClick={onClose}>
            <div className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <header className="p-8 border-b border-white/5 flex justify-between items-center bg-slate-900/50 backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-cyan-500/20 rounded-2xl flex items-center justify-center text-cyan-400">
                            <Icon name="edit" className="w-6 h-6"/>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight italic">Ürün Grubu Düzenle</h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">DÜZENLENEN GRUP: <span className="text-cyan-500">{commonData.anaStokKodu || commonData.model || 'GENEL'}</span></p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                        <Icon name="x-circle" className="w-7 h-7"/>
                    </button>
                </header>

                <main className="flex-grow p-8 overflow-y-auto space-y-10 custom-scrollbar">
                    {error && <p className="text-[10px] font-black text-rose-500 bg-rose-500/10 p-4 rounded-xl uppercase tracking-widest">{error}</p>}
                    
                    {/* Common Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-white/[0.02] p-8 rounded-[2rem] border border-white/5">
                        <div className="md:col-span-2">
                            <label className="label-pro">Temel Ürün Adı</label>
                            <input type="text" name="name" value={commonData.name || ''} onChange={handleCommonDataChange} className="input-pro w-full" placeholder="Örn: Pamuklu Boxer"/>
                        </div>
                        <div>
                            <label className="label-pro">Ana Stok Kodu (Model Kodu)</label>
                            <input type="text" name="anaStokKodu" value={commonData.anaStokKodu || ''} onChange={handleCommonDataChange} className="input-pro w-full text-cyan-400 font-mono" placeholder="Örn: MDL-101"/>
                        </div>
                        <div>
                            <label className="label-pro">Raf / Konum</label>
                            <input type="text" name="shelfLocation" value={commonData.shelfLocation || ''} onChange={handleCommonDataChange} className="input-pro w-full" placeholder="Örn: A-12"/>
                        </div>

                        <div><label className="label-pro">Marka</label><select name="marka" value={commonData.marka || ''} onChange={handleCommonDataChange} className="input-pro w-full text-xs font-bold"><option value="">Seçiniz</option>{definitions.brands.map(b=><option key={b.id} value={b.name}>{b.name}</option>)}</select></div>
                        <div><label className="label-pro">Model</label><select name="model" value={commonData.model || ''} onChange={handleCommonDataChange} className="input-pro w-full text-xs font-bold"><option value="">Seçiniz</option>{filteredModels.map(m=><option key={m.id} value={m.name}>{m.name}</option>)}</select></div>
                        <div className="md:col-span-1"><label className="label-pro text-emerald-500">Global Alış</label><input type="text" name="buyPrice" value={commonData.buyPrice || ''} onChange={handlePriceChange} className="input-pro w-full border-emerald-500/20"/></div>
                        <div className="md:col-span-1"><label className="label-pro text-cyan-500">Global Satış</label><input type="text" name="price" value={commonData.price || ''} onChange={handlePriceChange} className="input-pro w-full border-cyan-500/20"/></div>

                        <div>
                            <label className="label-pro">Grup</label>
                            <select name="group" value={commonData.group || ''} onChange={handleCommonDataChange} className="input-pro w-full text-xs font-bold">
                                <option value="">Tüm Gruplar</option>
                                {mainGroups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label-pro">Ara Grup</label>
                            <select name="midGroup" value={commonData.midGroup || ''} onChange={handleCommonDataChange} className="input-pro w-full text-xs font-bold" disabled={!commonData.group}>
                                <option value="">Tüm Ara Gruplar</option>
                                {midGroups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label-pro">Alt Grup</label>
                            <select name="subGroup" value={commonData.subGroup || ''} onChange={handleCommonDataChange} className="input-pro w-full text-xs font-bold" disabled={!commonData.midGroup}>
                                <option value="">Tüm Alt Gruplar</option>
                                {subGroups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                            </select>
                        </div>

                        <div className="md:col-span-1 flex items-end">
                            <button onClick={() => setApplyPricesToAll(!applyPricesToAll)} className={`flex items-center justify-center gap-3 w-full h-[46px] rounded-xl border transition-all ${applyPricesToAll ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-white/5 border-white/10 text-slate-500'}`}>
                                <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${applyPricesToAll ? 'bg-cyan-500 border-cyan-400' : 'border-white/20'}`}>
                                    {applyPricesToAll && <Icon name="check" className="w-2.5 h-2.5 text-slate-900"/>}
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest">Fiyatları Uygula</span>
                            </button>
                        </div>

                        <div className="md:col-span-4">
                            <div className="flex items-center justify-between mb-2">
                                <label className="label-pro m-0">Ürün Açıklaması</label>
                                <button onClick={handleGenerateDescription} disabled={isGeneratingDescription} className="flex items-center gap-2 text-[10px] font-bold text-pink-500 hover:text-pink-400 transition-colors">
                                    <Icon name="ai" className={`w-4 h-4 ${isGeneratingDescription ? 'animate-spin' : ''}`}/>
                                    {isGeneratingDescription ? 'AI OLUŞTURUYOR...' : 'AI İLE AÇIKLAMA OLUŞTUR'}
                                </button>
                            </div>
                            <textarea name="description" value={commonData.description || ''} onChange={handleCommonDataChange} className="input-pro w-full h-24 resize-none text-xs" placeholder="Ürün özelliklerini buraya yazabilirsiniz..."></textarea>
                        </div>
                    </div>

                    {/* Table View */}
                    <section className="space-y-6">
                        <div className="flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-purple-500 rounded-full"></div>
                                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Varyasyon Listesi ({variations.length})</h3>
                             </div>
                             <button onClick={addVariation} className="h-11 px-6 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-purple-900/20 flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95">
                                <Icon name="plus" className="w-4 h-4"/> YENİ VARYASYON EKLE
                             </button>
                        </div>

                        <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] overflow-hidden">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead className="bg-[#1e293b] text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-white/5">
                                    <tr>
                                        <th className="px-6 py-4">Sıra</th>
                                        <th className="px-6 py-4">Renk</th>
                                        <th className="px-6 py-4">Beden</th>
                                        <th className="px-6 py-4">Barkod</th>
                                        <th className="px-6 py-4">Stok Kodu</th>
                                        <th className="px-6 py-4 text-center">Stok</th>
                                        {!applyPricesToAll && <><th className="px-6 py-4 text-right">Alış</th><th className="px-6 py-4 text-right">Satış</th></>}
                                        <th className="px-6 py-4 text-center">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {variations.map((v, index) => (
                                        <tr key={index} className="hover:bg-white/[0.03] transition-colors group">
                                            <td className="px-6 py-3 font-mono text-slate-600 text-[10px]">#{index + 1}</td>
                                            <td className="px-4 py-2"><input value={v.renk} onChange={e=>handleVariationChange(index, 'renk', e.target.value)} className="table-input-pro" placeholder="Renk"/></td>
                                            <td className="px-4 py-2"><input value={v.beden} onChange={e=>handleVariationChange(index, 'beden', e.target.value)} className="table-input-pro" placeholder="Beden"/></td>
                                            <td className="px-4 py-2"><input value={v.barcode} onChange={e=>handleVariationChange(index, 'barcode', e.target.value)} className="table-input-pro font-mono text-cyan-500 w-40"/></td>
                                            <td className="px-4 py-2"><input value={v.stokKodu} onChange={e=>handleVariationChange(index, 'stokKodu', e.target.value)} className="table-input-pro font-mono text-slate-500 w-40"/></td>
                                             <td className="px-4 py-2"><input type="number" value={v.stock} onChange={e=>handleVariationChange(index, 'stock', parseInt(e.target.value) || 0)} className="table-input-pro text-center w-20"/></td>

                                            {!applyPricesToAll && (
                                                <>
                                                    <td className="px-4 py-2"><input value={v.buyPrice} onChange={e=>handleVariationChange(index, 'buyPrice', e.target.value)} className="table-input-pro text-right text-emerald-500"/></td>
                                                    <td className="px-4 py-2"><input value={v.price} onChange={e=>handleVariationChange(index, 'price', e.target.value)} className="table-input-pro text-right text-cyan-500"/></td>
                                                </>
                                            )}
                                            <td className="px-6 py-2 text-center">
                                                <button onClick={() => removeVariation(index)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white">
                                                    <Icon name="trash" className="w-4 h-4"/>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </main>

                <footer className="p-8 border-t border-white/5 bg-slate-900/50 backdrop-blur-xl flex justify-end gap-6">
                    <button onClick={onClose} className="px-10 h-14 bg-white/5 hover:bg-white/10 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">Vazgeç</button>
                    <button onClick={handleSave} className="px-12 h-14 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-cyan-900/40 transform hover:scale-105 active:scale-95 transition-all">Değişiklikleri Uygula</button>
                </footer>
            </div>
            
            <style>{`
                .label-pro { display: block; font-size: 9px; font-black text-slate-500 uppercase tracking-widest mb-2 px-1; }
                .input-pro { background-color: rgba(255, 255, 255, 0.03); border: 2px solid rgba(255, 255, 255, 0.05); border-radius: 1.25rem; padding: 0.8rem 1.25rem; color: white; font-size: 0.85rem; font-weight: 700; transition: all 0.3s; outline: none; }
                .input-pro:focus { border-color: rgba(6, 182, 212, 0.5); background-color: rgba(255, 255, 255, 0.06); }
                
                .table-input-pro { background: transparent; border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 0.75rem; padding: 0.5rem 0.75rem; color: white; font-size: 11px; font-weight: 700; width: 100%; outline: none; transition: all 0.2s; }
                .table-input-pro:focus { background: rgba(255, 255, 255, 0.05); border-color: rgba(147, 51, 234, 0.4); }

                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
                
                @keyframes fade-in { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in { animation: fade-in 0.3s ease-out; }
            `}</style>
        </div>
    );
};

export default EditProductModal;