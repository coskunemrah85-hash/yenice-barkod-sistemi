
import React, { useState, useMemo, useEffect } from 'react';
import { Supplier, PurchaseRecord, PaymentRecord } from '../types';
import Icon from '../components/Icon';

interface FinanceViewProps {
  suppliers: Supplier[];
  purchaseHistory: PurchaseRecord[];
  paymentHistory: PaymentRecord[];
  onAddPayment: (payment: Omit<PaymentRecord, 'id' | 'date'>) => void;
  onUpdatePayment: (payment: PaymentRecord) => void;
  onDeletePayment: (id: string) => void;
}

const PaymentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier;
  paymentToEdit?: PaymentRecord | null;
  onSave: (amount: number, notes: string) => void;
}> = ({ isOpen, onClose, supplier, paymentToEdit, onSave }) => {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (paymentToEdit) {
        setAmount(paymentToEdit.amount.toString().replace('.', ','));
        setNotes(paymentToEdit.notes || '');
      } else {
        setAmount('');
        setNotes('');
      }
    }
  }, [isOpen, paymentToEdit]);

  if (!isOpen) return null;

  const handleSave = () => {
    const paymentAmount = parseFloat(amount.replace(',', '.'));
    if (paymentAmount > 0) {
      onSave(paymentAmount, notes);
      onClose();
    } else {
      alert("Geçerli bir tutar giriniz.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <header className="p-3 border-b">
          <h2 className="text-lg font-bold text-slate-800">
            {paymentToEdit ? 'Ödemeyi Düzenle' : 'Yeni Ödeme Ekle'}: {supplier.name}
          </h2>
        </header>
        <main className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Ödeme Tutarı (₺)</label>
            <input
              type="text"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0,00"
              className="w-full input-style text-base"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Açıklama (İsteğe Bağlı)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Örn: Banka havalesi"
              className="w-full input-style"
            />
          </div>
        </main>
        <footer className="p-4 bg-slate-50 flex justify-end gap-4">
          <button onClick={onClose} className="btn-secondary">İptal</button>
          <button onClick={handleSave} className="btn-primary">
            {paymentToEdit ? 'Güncelle' : 'Ödemeyi Kaydet'}
          </button>
        </footer>
      </div>
    </div>
  );
};

const FinanceView: React.FC<FinanceViewProps> = ({ suppliers, purchaseHistory, paymentHistory, onAddPayment, onUpdatePayment, onDeletePayment }) => {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [paymentModalSupplier, setPaymentModalSupplier] = useState<Supplier | null>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);

  const supplierFinancials = useMemo(() => {
    return suppliers.map(supplier => {
      const purchases = purchaseHistory.filter(p => p.supplierId === supplier.id);
      const payments = paymentHistory.filter(p => p.supplierId === supplier.id);

      const totalPurchaseValue = purchases.reduce((sum, p) => sum + p.total, 0);
      const totalItemsPurchased = purchases.reduce((sum, p) => sum + p.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      const balance = totalPurchaseValue - totalPaid;

      return {
        ...supplier,
        totalPurchaseValue,
        totalItemsPurchased,
        totalPaid,
        balance,
      };
    });
  }, [suppliers, purchaseHistory, paymentHistory]);
  
  const grandTotals = useMemo(() => {
      return supplierFinancials.reduce((totals, supplier) => {
          totals.totalPurchaseValue += supplier.totalPurchaseValue;
          totals.totalItemsPurchased += supplier.totalItemsPurchased;
          totals.totalPaid += supplier.totalPaid;
          totals.balance += supplier.balance;
          return totals;
      }, { totalPurchaseValue: 0, totalItemsPurchased: 0, totalPaid: 0, balance: 0 });
  }, [supplierFinancials]);

  const selectedSupplierTransactions = useMemo(() => {
    if (!selectedSupplierId) return [];
    const purchases = purchaseHistory
        .filter(p => p.supplierId === selectedSupplierId)
        .map(p => ({ ...p, type: 'purchase' as const }));
    const payments = paymentHistory
        .filter(p => p.supplierId === selectedSupplierId)
        .map(p => ({ ...p, type: 'payment' as const }));
    
    return [...purchases, ...payments].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedSupplierId, purchaseHistory, paymentHistory]);

  const handleSavePayment = (amount: number, notes: string) => {
    if (paymentModalSupplier) {
      if (editingPayment) {
        // Edit mode
        onUpdatePayment({
          ...editingPayment,
          amount,
          notes,
        });
      } else {
        // Add mode
        onAddPayment({ supplierId: paymentModalSupplier.id, amount, notes });
      }
    }
    setEditingPayment(null);
  };

  const handleEditPayment = (payment: PaymentRecord, supplier: Supplier) => {
    setEditingPayment(payment);
    setPaymentModalSupplier(supplier);
  };

  const handleDeleteClick = (paymentId: string) => {
    if (window.confirm("Bu ödeme kaydını silmek istediğinizden emin misiniz?")) {
      onDeletePayment(paymentId);
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-4">
      {paymentModalSupplier && (
        <PaymentModal
          isOpen={!!paymentModalSupplier}
          onClose={() => { setPaymentModalSupplier(null); setEditingPayment(null); }}
          supplier={paymentModalSupplier}
          paymentToEdit={editingPayment}
          onSave={handleSavePayment}
        />
      )}
      <div className="flex-grow bg-white border border-slate-200/80 rounded-lg shadow-xl overflow-hidden flex flex-col">
          <header className="p-4 border-b">
            <h2 className="text-2xl font-bold text-slate-800">Finans Yönetimi - Tedarikçi Bakiyeleri</h2>
          </header>
          <div className="flex-grow overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-600 uppercase bg-slate-100 sticky top-0">
                <tr>
                  <th className="p-4 font-semibold">Tedarikçi</th>
                  <th className="p-4 font-semibold text-right">Toplam Alınan Ürün</th>
                  <th className="p-4 font-semibold text-right">Toplam Alış Tutarı</th>
                  <th className="p-4 font-semibold text-right">Toplam Ödenen</th>
                  <th className="p-4 font-semibold text-right">Bakiye</th>
                  <th className="p-4 font-semibold text-center">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {supplierFinancials.map(s => (
                  <React.Fragment key={s.id}>
                    <tr className="border-b last:border-b-0 hover:bg-slate-50 transition group">
                      <td className="p-4 font-medium text-slate-800">{s.name}</td>
                      <td className="p-4 text-right font-mono">{s.totalItemsPurchased.toLocaleString('tr-TR')} adet</td>
                      <td className="p-4 text-right font-mono">{s.totalPurchaseValue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                      <td className="p-2 text-right font-mono text-green-600">{s.totalPaid.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                      <td className={`p-2 text-right font-bold ${s.balance > 0 ? 'text-red-600' : 'text-green-700'}`}>
                          {s.balance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      </td>
                      <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => { setEditingPayment(null); setPaymentModalSupplier(s); }} className="btn-sm btn-secondary">Ödeme Yap</button>
                            <button onClick={() => setSelectedSupplierId(prev => prev === s.id ? null : s.id)} className="btn-sm btn-secondary">
                                {selectedSupplierId === s.id ? 'Detay Kapat' : 'Detay Gör'}
                            </button>
                          </div>
                      </td>
                    </tr>
                    {selectedSupplierId === s.id && (
                        <tr className="bg-slate-50">
                            <td colSpan={6} className="p-2">
                                <h4 className="font-bold text-slate-700 mb-2">İşlem Geçmişi: {s.name}</h4>
                                <div className="max-h-60 overflow-y-auto border rounded-md bg-white">
                                    {selectedSupplierTransactions.length > 0 ? (
                                        <ul className="divide-y">
                                            {selectedSupplierTransactions.map(tx => (
                                                <li key={tx.id} className="p-1.5 flex justify-between items-center hover:bg-slate-50 transition-colors">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`font-semibold ${tx.type === 'purchase' ? 'text-red-600' : 'text-green-600'}`}>
                                                                {tx.type === 'purchase' ? 'Alış Faturası' : 'Ödeme'}
                                                            </span>
                                                            <span className="text-slate-500 text-[10px]"> - {new Date(tx.date).toLocaleString('tr-TR')}</span>
                                                        </div>
                                                        {tx.type === 'payment' && tx.notes && <p className="text-[10px] text-slate-500 italic mt-1">"{tx.notes}"</p>}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-4">
                                                        <span className={`font-bold text-base ${tx.type === 'purchase' ? 'text-red-600' : 'text-green-600'}`}>
                                                            {tx.type === 'purchase' ? `+${tx.total.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}` : `-${tx.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}`}
                                                        </span>
                                                        
                                                        {tx.type === 'payment' && (
                                                            <div className="flex items-center gap-1">
                                                                <button 
                                                                    onClick={() => handleEditPayment(tx as PaymentRecord, s)} 
                                                                    className="p-1.5 text-slate-400 hover:text-cyan-600 rounded-full hover:bg-cyan-50 transition"
                                                                    title="Ödemeyi Düzenle"
                                                                >
                                                                    <Icon name="edit" className="w-4 h-4" />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteClick(tx.id)} 
                                                                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-50 transition"
                                                                    title="Ödemeyi Sil"
                                                                >
                                                                    <Icon name="trash" className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                        {/* Placeholder for alignment if it's a purchase record, ensuring amounts line up nicely */}
                                                        {tx.type === 'purchase' && <div className="w-[52px]"></div>}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-center text-slate-500 p-4">Bu tedarikçiye ait işlem bulunmuyor.</p>
                                    )}
                                </div>
                            </td>
                        </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 bg-slate-100/90 backdrop-blur-sm shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.05)]">
                  <tr className="border-t-2 border-slate-300 font-bold text-slate-800 text-sm">
                      <td className="p-2">GENEL TOPLAM</td>
                      <td className="p-2 text-right">{grandTotals.totalItemsPurchased.toLocaleString('tr-TR')} adet</td>
                      <td className="p-2 text-right">{grandTotals.totalPurchaseValue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                      <td className="p-2 text-right text-green-700">{grandTotals.totalPaid.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                      <td className={`p-2 text-right ${grandTotals.balance > 0 ? 'text-red-700' : 'text-green-800'}`}>{grandTotals.balance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                      <td className="p-2"></td>
                  </tr>
              </tfoot>
            </table>
          </div>
      </div>
       <style>{`
            .input-style {
                background-color: white; border: 1px solid #cbd5e1; border-radius: 0.5rem;
                padding: 0.25rem 0.5rem; font-size: 0.75rem; transition: all 0.2s;
            }
            .input-style:focus {
                outline: none; box-shadow: 0 0 0 2px #e0f2fe, 0 0 0 4px #0ea5e9; border-color: #0ea5e9;
            }
            .btn-primary {
                background-color: #0ea5e9; color: white; font-weight: 600; border-radius: 0.5rem;
                padding: 0.25rem 0.75rem; transition: background-color 0.2s; font-size: 0.75rem;
            }
            .btn-primary:hover { background-color: #0284c7; }
            .btn-secondary {
                background-color: white; border: 1px solid #cbd5e1; color: #334155; font-weight: 600;
                border-radius: 0.5rem; padding: 0.25rem 0.75rem; transition: all 0.2s; font-size: 0.75rem;
            }
            .btn-secondary:hover { background-color: #f1f5f9; border-color: #94a3b8; }
            .btn-sm {
                padding: 0.125rem 0.5rem; font-size: 0.75rem; border-radius: 0.375rem;
            }
        `}</style>
    </div>
  );
};

export default FinanceView;
