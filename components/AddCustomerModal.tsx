import React, { useState } from 'react';
import { Customer } from '../types';
import Icon from './Icon';

interface AddCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (customer: Omit<Customer, 'id'>) => Customer;
}

const AddCustomerModal: React.FC<AddCustomerModalProps> = ({ isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSave = () => {
        if (!name.trim()) {
            setError('Müşteri adı zorunludur.');
            return;
        }
        onSave({ name, phone, email });
        onClose();
    };
    
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <header className="p-5 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">Hızlı Müşteri Ekle</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-2 rounded-full"><Icon name="x-circle" className="w-7 h-7"/></button>
                </header>
                <main className="p-6 space-y-4">
                     {error && <p className="text-red-500 bg-red-100 p-2 rounded-md text-sm">{error}</p>}
                    <div>
                        <label className="label-style">Müşteri Adı *</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-style w-full" autoFocus required />
                    </div>
                    <div>
                        <label className="label-style">Telefon Numarası</label>
                        <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="input-style w-full" />
                    </div>
                     <div>
                        <label className="label-style">E-posta</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-style w-full" />
                    </div>
                </main>
                <footer className="p-4 bg-slate-50 flex justify-end gap-4">
                    <button onClick={onClose} className="btn-secondary">İptal</button>
                    <button onClick={handleSave} className="btn-primary">Kaydet ve Seç</button>
                </footer>
            </div>
             <style>{`
                .label-style { display: block; font-size: 0.875rem; font-weight: 500; color: #475569; margin-bottom: 0.25rem; }
                .input-style { background-color: white; border: 1px solid #cbd5e1; border-radius: 0.5rem; padding: 0.5rem 0.75rem; transition: all 0.2s; height: 42px; }
                .input-style:focus { outline: none; box-shadow: 0 0 0 2px #e0f2fe, 0 0 0 4px #0ea5e9; border-color: #0ea5e9; }
                .btn-primary { background-color: #0ea5e9; color: white; font-weight: bold; border-radius: 0.5rem; padding: 0.6rem 1.5rem; transition: background-color 0.2s; }
                .btn-primary:hover { background-color: #0284c7; }
                .btn-secondary { background-color: white; border: 1px solid #cbd5e1; color: #334155; font-weight: 600; border-radius: 0.5rem; padding: 0.6rem 1.5rem; transition: all 0.2s; }
                .btn-secondary:hover { background-color: #f1f5f9; }
            `}</style>
        </div>
    );
};

export default AddCustomerModal;