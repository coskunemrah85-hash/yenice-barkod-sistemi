import React, { useState, useEffect } from 'react';
import { Supplier } from '../types';
import Icon from './Icon';

interface SupplierEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (supplier: Partial<Supplier>) => void;
    supplierToEdit: Supplier | null;
}

const SupplierEditModal: React.FC<SupplierEditModalProps> = ({ isOpen, onClose, onSave, supplierToEdit }) => {
    const [supplier, setSupplier] = useState<Partial<Supplier>>({});

    useEffect(() => {
        if (isOpen) {
            setSupplier(supplierToEdit || {});
        }
    }, [isOpen, supplierToEdit]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSupplier(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!supplier.name) {
            alert("Tedarikçi ünvanı zorunludur.");
            return;
        }
        onSave(supplier);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <header className="p-5 border-b flex justify-between items-center bg-slate-50">
                    <h2 className="text-2xl font-bold text-slate-800">
                        {supplierToEdit ? 'Tedarikçi Düzenle' : 'Yeni Tedarikçi Ekle'}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200"><Icon name="x-circle" className="w-7 h-7 text-slate-500"/></button>
                </header>
                <form onSubmit={handleSubmit}>
                    <main className="p-6 overflow-y-auto max-h-[70vh] grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                        {/* Column 1 */}
                        <div className="space-y-4">
                            <div><label className="label-style">Tedarikçi Ünvanı *</label><input type="text" name="name" value={supplier.name || ''} onChange={handleChange} className="input-style w-full" required /></div>
                            <div><label className="label-style">Cari Kodu</label><input type="text" name="code" value={supplier.code || ''} onChange={handleChange} className="input-style w-full" /></div>
                            <div><label className="label-style">Grup</label><input type="text" name="group" value={supplier.group || ''} onChange={handleChange} className="input-style w-full" /></div>
                            <div><label className="label-style">İskonto Oranı (%)</label><input type="number" name="discountRate" value={supplier.discountRate || ''} onChange={handleChange} className="input-style w-full" /></div>
                        </div>
                        {/* Column 2 */}
                        <div className="space-y-4">
                            <div><label className="label-style">Yetkili Adı</label><input type="text" name="firstName" value={supplier.firstName || ''} onChange={handleChange} className="input-style w-full" /></div>
                            <div><label className="label-style">Yetkili Soyadı</label><input type="text" name="lastName" value={supplier.lastName || ''} onChange={handleChange} className="input-style w-full" /></div>
                            <div><label className="label-style">Cep Telefonu</label><input type="text" name="mobilePhone" value={supplier.mobilePhone || ''} onChange={handleChange} className="input-style w-full" /></div>
                            <div><label className="label-style">WhatsApp</label><input type="text" name="whatsapp" value={supplier.whatsapp || ''} onChange={handleChange} className="input-style w-full" /></div>
                            <div><label className="label-style">E-posta</label><input type="email" name="email" value={supplier.email || ''} onChange={handleChange} className="input-style w-full" /></div>
                        </div>
                        {/* Column 3 */}
                        <div className="space-y-4">
                            <div><label className="label-style">İl</label><input type="text" name="city" value={supplier.city || ''} onChange={handleChange} className="input-style w-full" /></div>
                            <div><label className="label-style">İlçe</label><input type="text" name="district" value={supplier.district || ''} onChange={handleChange} className="input-style w-full" /></div>
                            <div><label className="label-style">Vergi Dairesi</label><input type="text" name="taxOffice" value={supplier.taxOffice || ''} onChange={handleChange} className="input-style w-full" /></div>
                            <div><label className="label-style">Vergi No</label><input type="text" name="taxNumber" value={supplier.taxNumber || ''} onChange={handleChange} className="input-style w-full" /></div>
                            <div><label className="label-style">T.C. No</label><input type="text" name="nationalId" value={supplier.nationalId || ''} onChange={handleChange} className="input-style w-full" /></div>
                        </div>
                    </main>
                    <footer className="p-4 border-t bg-slate-100 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="btn-secondary">İptal</button>
                        <button type="submit" className="btn-primary">Kaydet</button>
                    </footer>
                </form>
            </div>
            <style>{`
                .label-style { display: block; font-size: 0.875rem; font-weight: 500; color: #475569; margin-bottom: 0.25rem; }
                .input-style { background-color: white; border: 1px solid #cbd5e1; border-radius: 0.5rem; padding: 0.5rem 0.75rem; transition: all 0.2s; height: 42px; }
                .input-style:focus { outline: none; box-shadow: 0 0 0 2px #e0f2fe, 0 0 0 4px #0ea5e9; border-color: #0ea5e9; }
                .btn-primary { background-color: #0ea5e9; color: white; font-weight: bold; border-radius: 0.5rem; padding: 0.6rem 1.5rem; transition: background-color 0.2s; }
                .btn-primary:hover { background-color: #0284c7; }
                .btn-secondary { background-color: white; border: 1px solid #cbd5e1; color: #334155; font-weight: 600; border-radius: 0.5rem; padding: 0.6rem 1.5rem; transition: all 0.2s; }
                .btn-secondary:hover { background-color: #f1f5f9; border-color: #94a3b8; }
            `}</style>
        </div>
    );
};

export default SupplierEditModal;
