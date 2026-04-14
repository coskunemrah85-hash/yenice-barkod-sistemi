import React, { useState, useEffect } from 'react';
import { Customer } from '../types';
import Icon from './Icon';

interface CustomerEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (customer: Partial<Customer>) => void;
    customerToEdit: Customer | null;
}

const CustomerEditModal: React.FC<CustomerEditModalProps> = ({ isOpen, onClose, onSave, customerToEdit }) => {
    const [customer, setCustomer] = useState<Partial<Customer>>({});

    useEffect(() => {
        if (isOpen) {
            setCustomer(customerToEdit || {});
        }
    }, [isOpen, customerToEdit]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setCustomer(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!customer.name) {
            alert("Müşteri adı zorunludur.");
            return;
        }
        onSave(customer);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <header className="p-5 border-b flex justify-between items-center bg-slate-50">
                    <h2 className="text-2xl font-bold text-slate-800">
                        {customerToEdit ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200"><Icon name="x-circle" className="w-7 h-7 text-slate-500"/></button>
                </header>
                <form onSubmit={handleSubmit}>
                    <main className="p-6 overflow-y-auto max-h-[70vh] grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="md:col-span-2">
                            <label className="label-style">Müşteri Adı Soyadı *</label>
                            <input type="text" name="name" value={customer.name || ''} onChange={handleChange} className="input-style w-full" required autoFocus />
                        </div>
                        <div>
                            <label className="label-style">Telefon Numarası</label>
                            <input type="tel" name="phone" value={customer.phone || ''} onChange={handleChange} className="input-style w-full" />
                        </div>
                         <div>
                            <label className="label-style">E-posta Adresi</label>
                            <input type="email" name="email" value={customer.email || ''} onChange={handleChange} className="input-style w-full" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="label-style">Adres</label>
                            <textarea name="address" value={customer.address || ''} onChange={handleChange} rows={3} className="input-style w-full h-auto py-2" />
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

export default CustomerEditModal;