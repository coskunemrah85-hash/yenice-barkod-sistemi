import React, { useState, useMemo, useEffect } from 'react';
import { SaleRecord, Product, PurchaseRecord, PaymentRecord, ReturnRecord, Supplier, EndOfDayRecord, Customer, CompanyInfo } from '../types';
import Icon from '../components/Icon';
import { analyzeSalesData } from '../services/geminiService';
import Markdown from 'react-markdown';

type ReportTab = 'statistics' | 'sales' | 'purchases' | 'endOfDay' | 'ai' | 'financial';

interface ReportsViewProps {
  salesHistory: SaleRecord[];
  products: Product[];
  purchaseHistory: PurchaseRecord[];
  paymentHistory: PaymentRecord[];
  returnHistory: ReturnRecord[];
  suppliers: Supplier[];
  customers: Customer[];
  endOfDayHistory: EndOfDayRecord[];
  addEndOfDayRecord: (record: EndOfDayRecord) => void;
  initialTab?: ReportTab;
  companyInfo: CompanyInfo;
}

const ReportsView: React.FC<ReportsViewProps> = (props) => {
  const [activeTab, setActiveTab] = useState<ReportTab>(props.initialTab || 'sales');
  
  const today = new Date();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  sevenDaysAgo.setHours(0,0,0,0);
  
  const [startDate, setStartDate] = useState(sevenDaysAgo.toISOString().slice(0, 16));
  const [endDate, setEndDate] = useState(todayEnd.toISOString().slice(0, 16));
  const [eodDate, setEodDate] = useState(today.toISOString().split('T')[0]);

  useEffect(() => {
    if (props.initialTab) {
      setActiveTab(props.initialTab);
    }
  }, [props.initialTab]);

  const filteredSales = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return props.salesHistory.filter(s => {
      const saleDate = new Date(s.date);
      return saleDate >= start && saleDate <= end;
    });
  }, [props.salesHistory, startDate, endDate]);
  
  const filteredPurchases = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return props.purchaseHistory.filter(p => {
      const purchaseDate = new Date(p.date);
      return purchaseDate >= start && purchaseDate <= end;
    });
  }, [props.purchaseHistory, startDate, endDate]);

  const filteredReturns = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return props.returnHistory.filter(r => {
      const returnDate = new Date(r.date);
      return returnDate >= start && returnDate <= end;
    });
  }, [props.returnHistory, startDate, endDate]);

  const filteredPayments = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return props.paymentHistory.filter(p => {
      const paymentDate = new Date(p.date);
      return paymentDate >= start && paymentDate <= end;
    });
  }, [props.paymentHistory, startDate, endDate]);

  const isDayClosed = useMemo(() => {
    return props.endOfDayHistory.some(r => r.date === eodDate);
  }, [props.endOfDayHistory, eodDate]);

  const handleCloseDay = () => {
      const selectedDate = new Date(eodDate);
      selectedDate.setUTCHours(12);

      const dayStart = new Date(selectedDate);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(selectedDate);
      dayEnd.setUTCHours(23, 59, 59, 999);

      const daySales = props.salesHistory.filter(s => { const d = new Date(s.date); return d >= dayStart && d <= dayEnd; });
      const dayReturns = props.returnHistory.filter(r => { const d = new Date(r.date); return d >= dayStart && d <= dayEnd; });
      const dayPurchases = props.purchaseHistory.filter(p => { const d = new Date(p.date); return d >= dayStart && d <= dayEnd; });
      const dayPaymentsToSuppliers = props.paymentHistory.filter(p => { const d = new Date(p.date); return d >= dayStart && d <= dayEnd; });

      if (daySales.length === 0 && dayReturns.length === 0 && dayPurchases.length === 0 && dayPaymentsToSuppliers.length === 0 && !isDayClosed) {
          alert("Kapatılacak herhangi bir işlem bulunamadı.");
          return;
      }
      
      if (isDayClosed) {
          if (!window.confirm("Bu gün için zaten bir kapanış raporu mevcut. Üzerine yazmak istediğinizden emin misiniz?")) {
              return;
          }
      } else if (!window.confirm(`${new Date(eodDate).toLocaleDateString('tr-TR', { timeZone: 'UTC' })} tarihli gün sonu raporu oluşturulacak ve gün kapatılacaktır. Onaylıyor musunuz?`)) {
          return;
      }
      
      const totalRevenue = daySales.reduce((sum, s) => sum + s.total, 0);
      const totalReturn = dayReturns.reduce((sum, r) => sum + r.total, 0);
      const netRevenue = totalRevenue - totalReturn;
      const cashSales = daySales.filter(s => s.paymentMethod === 'Nakit').reduce((s, i) => s + i.total, 0);
      const cardSales = daySales.filter(s => s.paymentMethod === 'Kredi Kartı').reduce((s, i) => s + i.total, 0);
      const totalSalesCount = daySales.length;
      const totalItemsSoldCount = daySales.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
      const totalPurchase = dayPurchases.reduce((sum, p) => sum + p.total, 0);
      const totalPaymentsToSuppliers = dayPaymentsToSuppliers.reduce((sum, p) => sum + p.amount, 0);
      
      const record: EndOfDayRecord = {
          date: eodDate,
          totalRevenue,
          totalReturn,
          netRevenue,
          cashSales,
          cardSales,
          totalSalesCount,
          totalItemsSoldCount,
          totalPurchase,
          totalPaymentsToSuppliers,
      };
      
      props.addEndOfDayRecord(record);
      
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);
      setEodDate(nextDay.toISOString().split('T')[0]);

      alert(`${new Date(record.date).toLocaleDateString('tr-TR', { timeZone: 'UTC' })} günü başarıyla kapatıldı.`);
  };


  const setDateRangePreset = (preset: 'today' | 'week' | 'month') => {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      let start = new Date();
      if (preset === 'today') {
          start.setHours(0, 0, 0, 0);
      } else if (preset === 'week') {
          start.setDate(start.getDate() - 6);
          start.setHours(0, 0, 0, 0);
      } else if (preset === 'month') {
          start.setMonth(start.getMonth() - 1);
          start.setHours(0, 0, 0, 0);
      }
      setStartDate(start.toISOString().slice(0, 16));
      setEndDate(end.toISOString().slice(0, 16));
  };

  const handleExportToExcel = () => {
      if (!(window as any).XLSX) {
          alert("Excel kütüphanesi yüklenemedi. Lütfen internet bağlantınızı kontrol edin.");
          return;
      }

      let data: any[] = [];
      let sheetName = "";
      let fileName = "";

      if (activeTab === 'sales') {
          data = filteredSales.flatMap(sale => 
              sale.items.map(item => ({
                  'Satış Tarihi': new Date(sale.date).toLocaleString('tr-TR'),
                  'İşlem No': sale.id,
                  'Ödeme Yöntemi': sale.paymentMethod,
                  'Müşteri': props.customers.find(c => c.id === sale.customerId)?.name || 'Misafir',
                  'Barkod': item.barcode,
                  'Ürün Adı': item.name,
                  'Satılan Miktar': item.quantity,
                  'Birim Fiyat': item.price,
                  'Toplam Tutar': item.price * item.quantity
              }))
          );
          sheetName = "Satış Raporu";
          fileName = `satis_raporu_${new Date().toISOString().split('T')[0]}.xlsx`;
      } else if (activeTab === 'purchases') {
          data = filteredPurchases.flatMap(purchase => 
              purchase.items.map(item => ({
                  'Alış Tarihi': new Date(purchase.date).toLocaleString('tr-TR'),
                  'Fatura/İşlem No': purchase.id,
                  'Tedarikçi': props.suppliers.find(s => s.id === purchase.supplierId)?.name || 'Bilinmiyor',
                  'Barkod': item.barcode,
                  'Ürün Adı': item.name,
                  'Alınan Miktar': item.quantity,
                  'Birim Alış Fiyatı': item.buyPrice,
                  'Toplam Tutar': item.buyPrice * item.quantity
              }))
          );
          sheetName = "Alış Raporu";
          fileName = `alis_raporu_${new Date().toISOString().split('T')[0]}.xlsx`;
      } else {
          alert("Bu sekme için doğrudan dışa aktarma şablonu bulunmuyor. Lütfen Satış veya Alış sekmelerini kullanın.");
          return;
      }

      if (data.length === 0) {
          alert("Dışa aktarılacak veri bulunamadı.");
          return;
      }

      const ws = (window as any).XLSX.utils.json_to_sheet(data);
      const wb = (window as any).XLSX.utils.book_new();
      (window as any).XLSX.utils.book_append_sheet(wb, ws, sheetName);
      (window as any).XLSX.writeFile(wb, fileName);
  };

  const menuItems: { id: ReportTab; label: string; icon: 'reports' | 'new-sale' | 'purchase' | 'list-bullet' | 'ai' | 'finance' }[] = [
    { id: 'endOfDay', label: 'Gün Sonu Raporu', icon: 'list-bullet' },
    { id: 'statistics', label: 'İstatistikler', icon: 'reports' },
    { id: 'sales', label: 'Satış Raporu', icon: 'new-sale' },
    { id: 'purchases', label: 'Alış Raporu', icon: 'purchase' },
    { id: 'financial', label: 'Finansal Analiz', icon: 'finance' },
    ...(props.companyInfo.aiEnabled ? [{ id: 'ai' as ReportTab, label: 'Yapay Zeka Analizi', icon: 'ai' as const }] : []),
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'statistics':
        return <StatisticsReport sales={filteredSales} products={props.products} />;
      case 'sales':
        return <SalesListReport sales={filteredSales} customers={props.customers} />;
      case 'purchases':
        return <PurchaseListReport purchases={filteredPurchases} suppliers={props.suppliers} />;
      case 'endOfDay': {
        const selectedDate = new Date(eodDate);
        selectedDate.setUTCHours(12);
        
        const dayStart = new Date(selectedDate);
        dayStart.setUTCHours(0,0,0,0);
        const dayEnd = new Date(selectedDate);
        dayEnd.setUTCHours(23,59,59,999);
        
        const daySales = props.salesHistory.filter(s => { const d = new Date(s.date); return d >= dayStart && d <= dayEnd; });
        const dayReturns = props.returnHistory.filter(r => { const d = new Date(r.date); return d >= dayStart && d <= dayEnd; });
        const dayPurchases = props.purchaseHistory.filter(p => { const d = new Date(p.date); return d >= dayStart && d <= dayEnd; });
        const dayPaymentsToSuppliers = props.paymentHistory.filter(p => { const d = new Date(p.date); return d >= dayStart && d <= dayEnd; });

        return <EndOfDayReport 
            date={eodDate} 
            sales={daySales} 
            returns={dayReturns} 
            purchases={dayPurchases}
            payments={dayPaymentsToSuppliers}
            history={props.endOfDayHistory} 
            isDayClosed={isDayClosed} 
            customers={props.customers}
        />;
      }
      case 'financial':
        return <FinancialAnalysisReport sales={filteredSales} purchases={filteredPurchases} payments={filteredPayments} />;
      case 'ai':
        return <AiAnalysisReport sales={filteredSales} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full h-full flex gap-6 bg-slate-50 dark:bg-slate-900 p-4">
      <aside className="w-56 flex-shrink-0 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 overflow-y-auto">
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Rapor Türleri</h2>
        <nav className="space-y-1">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-bold transition-all text-sm ${
                activeTab === item.id 
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/20' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Icon name={item.icon} className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="view-header bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h2 className="view-title">{menuItems.find(m => m.id === activeTab)?.label}</h2>
            {activeTab === 'endOfDay' ? (
                <div className="view-actions">
                    <label htmlFor="eod-date" className="font-bold text-slate-500 dark:text-slate-400 text-sm">Tarih:</label>
                    <input type="date" id="eod-date" value={eodDate} onChange={e => setEodDate(e.target.value)} className="input-style" />
                    <button onClick={handleCloseDay} className="btn-danger">
                        <Icon name="check" className="w-5 h-5" /> Günü Kapat
                    </button>
                </div>
            ) : (
                <div className="view-actions">
                    <div className="flex items-center gap-2">
                         <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-style"/>
                         <span className="font-bold text-slate-300">-</span>
                         <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-style"/>
                    </div>
                     <div className="flex items-center gap-1.5">
                         <button onClick={() => setDateRangePreset('today')} className="btn-secondary px-3">Bugün</button>
                         <button onClick={() => setDateRangePreset('week')} className="btn-secondary px-3">Hafta</button>
                         <button onClick={() => setDateRangePreset('month')} className="btn-secondary px-3">Ay</button>
                         {(activeTab === 'sales' || activeTab === 'purchases') && (
                             <button onClick={handleExportToExcel} className="btn-success">
                                 <Icon name="excel" className="w-5 h-5" /> Excel
                             </button>
                         )}
                    </div>
                </div>
            )}
        </header>

        <div className="flex-grow pt-4 overflow-y-auto">
            {renderContent()}
        </div>
      </main>
    </div>
  );
};


// --- Sub-Components for each report tab ---

const StatCard: React.FC<{ icon: any; title: string; value: string | number; description?: string; color: string; }> = ({ icon, title, value, description, color }) => (
  <div className="bg-white rounded-xl shadow-md p-5 flex items-center gap-5 border border-slate-200/80">
    <div className={`rounded-full p-3 ${color}`}><Icon name={icon} className="w-7 h-7" /></div>
    <div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <p className="text-3xl font-bold text-slate-800">{value}</p>
      {description && <p className="text-slate-400 text-xs">{description}</p>}
    </div>
  </div>
);

const StatisticsReport: React.FC<{ sales: SaleRecord[]; products: Product[] }> = ({ sales, products }) => {
    const revenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const salesCount = sales.length;
    const itemsSoldCount = sales.reduce((sum, sale) => sum + sale.items.reduce((iSum, i) => iSum + i.quantity, 0), 0);
    const avgBasketSize = salesCount > 0 ? (revenue / salesCount) : 0;
    
    const productSalesMap = new Map<string, number>();
    sales.forEach(sale => sale.items.forEach(item => {
        productSalesMap.set(item.barcode, (productSalesMap.get(item.barcode) || 0) + item.quantity);
    }));

    const bestSellers = Array.from(productSalesMap.entries())
        .map(([barcode, quantitySold]) => ({ product: products.find(p => p.barcode === barcode), quantitySold }))
        .filter(p => p.product)
        .sort((a, b) => b.quantitySold - a.quantitySold)
        .slice(0, 5) as { product: Product; quantitySold: number }[];
    
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon="finance" title="Toplam Ciro" value={`${revenue.toFixed(2)} ₺`} color="bg-green-100 text-green-700" />
                <StatCard icon="new-sale" title="Satış Adedi" value={salesCount} color="bg-cyan-100 text-cyan-700" />
                <StatCard icon="products" title="Satılan Ürün" value={itemsSoldCount} color="bg-indigo-100 text-indigo-700" />
                <StatCard icon="tag" title="Ort. Sepet Tutarı" value={`${avgBasketSize.toFixed(2)} ₺`} color="bg-rose-100 text-rose-700" />
            </div>
            <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200/80">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Çok Satanlar</h3>
                {bestSellers.length > 0 ? (
                    <ul className="space-y-4">
                        {bestSellers.map(({ product, quantitySold }) => (
                            <li key={product.barcode} className="flex justify-between items-center text-sm">
                                <span className="font-medium text-slate-700 truncate pr-4">{product.name}</span>
                                <span className="font-bold text-cyan-600 bg-cyan-100/70 px-2 py-1 rounded-md">{quantitySold} adet</span>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-slate-500 text-sm text-center py-8">Veri bulunmuyor.</p>}
            </div>
        </div>
    );
};

const SalesListReport: React.FC<{ sales: SaleRecord[]; customers: Customer[] }> = ({ sales, customers }) => {
    const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

    const getCustomerName = (customerId?: string) => {
        if (!customerId) return 'Misafir';
        const customer = customers.find(c => c.id === customerId);
        return customer ? customer.name : 'Bilinmeyen Müşteri';
    };

    return (
        <div className="bg-white rounded-xl shadow-md border overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-600 uppercase">
                    <tr>
                        <th className="p-3 text-left">Tarih</th>
                        <th className="p-3 text-left">Müşteri</th>
                        <th className="p-3 text-left">Ödeme Yöntemi</th>
                        <th className="p-3 text-right">Ürün Adedi</th>
                        <th className="p-3 text-right">Toplam</th>
                        <th className="p-3"></th>
                    </tr>
                </thead>
                <tbody>
                    {sales.map(sale => (
                        <React.Fragment key={sale.id}>
                            <tr className="border-b hover:bg-slate-50">
                                <td className="p-3">{new Date(sale.date).toLocaleString('tr-TR')}</td>
                                <td className="p-3">{getCustomerName(sale.customerId)}</td>
                                <td className="p-3">{sale.paymentMethod}</td>
                                <td className="p-3 text-right">{sale.items.reduce((s,i)=>s+i.quantity,0)}</td>
                                <td className="p-3 text-right font-bold text-cyan-700">{sale.total.toFixed(2)} ₺</td>
                                <td className="p-3"><button onClick={()=>setExpandedSaleId(p=>p===sale.id?null:sale.id)} className="text-cyan-600 hover:underline">Detay</button></td>
                            </tr>
                            {expandedSaleId === sale.id && (
                                <tr className="bg-cyan-50/50"><td colSpan={6} className="p-4">
                                    <ul className="space-y-1">
                                    {sale.items.map(item => <li key={item.barcode} className="flex justify-between"><span>{item.name} ({item.quantity} x {item.price.toFixed(2)})</span><span>{(item.quantity * item.price).toFixed(2)} ₺</span></li>)}
                                    </ul>
                                </td></tr>
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const PurchaseListReport: React.FC<{ purchases: PurchaseRecord[], suppliers: Supplier[] }> = ({ purchases, suppliers }) => {
    const [expandedPurchaseId, setExpandedPurchaseId] = useState<string | null>(null);
    const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || 'Bilinmeyen Tedarikçi';
    return (
         <div className="bg-white rounded-xl shadow-md border overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-slate-100 text-slate-600 uppercase">
                    <tr>
                        <th className="p-3 text-left">Tarih</th><th className="p-3 text-left">Tedarikçi</th>
                        <th className="p-3 text-right">Ürün Adedi</th><th className="p-3 text-right">Toplam</th>
                        <th className="p-3"></th>
                    </tr>
                </thead>
                <tbody>
                    {purchases.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="text-center p-8 text-slate-500">Seçili tarih aralığında alış kaydı bulunmuyor.</td>
                        </tr>
                    ) : (
                        purchases.map(p => (
                            <React.Fragment key={p.id}>
                                <tr className="border-b hover:bg-slate-50">
                                    <td className="p-3">{new Date(p.date).toLocaleString('tr-TR')}</td>
                                    <td className="p-3">{getSupplierName(p.supplierId)}</td>
                                    <td className="p-3 text-right">{p.items.reduce((s,i)=>s+i.quantity,0)}</td>
                                    <td className="p-3 text-right font-bold text-rose-700">{p.total.toFixed(2)} ₺</td>
                                    <td className="p-3"><button onClick={()=>setExpandedPurchaseId(id=>id===p.id?null:p.id)} className="text-cyan-600 hover:underline">Detay</button></td>
                                </tr>
                                {expandedPurchaseId === p.id && (
                                    <tr className="bg-rose-50/50"><td colSpan={5} className="p-4">
                                        <ul className="space-y-1">
                                            {p.items.map(item => <li key={item.barcode} className="flex justify-between"><span>{item.name} ({item.quantity} x {item.buyPrice.toFixed(2)})</span><span>{(item.quantity*item.buyPrice).toFixed(2)} ₺</span></li>)}
                                        </ul>
                                    </td></tr>
                                )}
                            </React.Fragment>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

const EndOfDayReport: React.FC<{ 
    date: string; 
    sales: SaleRecord[]; 
    returns: ReturnRecord[]; 
    purchases: PurchaseRecord[];
    payments: PaymentRecord[];
    history: EndOfDayRecord[]; 
    isDayClosed: boolean; 
    customers: Customer[];
}> = ({ date, sales, returns, purchases, payments, history, isDayClosed, customers }) => {
    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
    const totalReturn = returns.reduce((sum, r) => sum + r.total, 0);
    const netRevenue = totalRevenue - totalReturn;
    const cashSales = sales.filter(s => s.paymentMethod === 'Nakit').reduce((s, i) => s + i.total, 0);
    const cardSales = sales.filter(s => s.paymentMethod === 'Kredi Kartı').reduce((s, i) => s + i.total, 0);
    const totalPurchase = purchases.reduce((sum, p) => sum + p.total, 0);
    const totalPaymentsToSuppliers = payments.reduce((sum, p) => sum + p.amount, 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
              <h3 className="text-xl font-bold">Tarih: {new Date(date).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</h3>
              {isDayClosed && (
                <div className="p-2 px-3 bg-green-100 text-green-800 border border-green-200 rounded-lg flex items-center gap-2 text-sm">
                    <Icon name="check" className="w-5 h-5" />
                    <span className="font-semibold">Bu gün kapatıldı.</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon="finance" title="Toplam Ciro" value={`${totalRevenue.toFixed(2)} ₺`} color="bg-green-100 text-green-700" />
                <StatCard icon="back" title="Toplam İade" value={`${totalReturn.toFixed(2)} ₺`} color="bg-red-100 text-red-700" />
                <StatCard icon="tag" title="Net Ciro" value={`${netRevenue.toFixed(2)} ₺`} color="bg-cyan-100 text-cyan-700" />
                <StatCard icon="list-bullet" title="Nakit / Kart" value={`${cashSales.toFixed(2)} / ${cardSales.toFixed(2)} ₺`} color="bg-indigo-100 text-indigo-700" />
                <StatCard icon="purchase" title="Toplam Alış" value={`${totalPurchase.toFixed(2)} ₺`} color="bg-amber-100 text-amber-700" />
                <StatCard icon="finance" title="Tedarikçi Ödemeleri" value={`${totalPaymentsToSuppliers.toFixed(2)} ₺`} color="bg-lime-100 text-lime-700" />
            </div>
             <h4 className="text-lg font-bold pt-4 border-t">Günün Satış Hareketleri</h4>
             {sales.length > 0 ? <SalesListReport sales={sales} customers={customers} /> : <p className="text-slate-500">Bu tarihte satış hareketi yok.</p>}

             <h4 className="text-lg font-bold pt-4 border-t">Geçmiş Gün Sonu Raporları</h4>
             <div className="bg-white rounded-xl shadow-md border overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-slate-600 uppercase">
                        <tr>
                            <th className="p-3 text-left">Tarih</th>
                            <th className="p-3 text-right">Net Ciro</th>
                            <th className="p-3 text-right">Toplam Satış</th>
                            <th className="p-3 text-right">Toplam İade</th>
                            <th className="p-3 text-right">Nakit / Kart</th>
                            <th className="p-3 text-right">Satış Adedi</th>
                            <th className="p-3 text-right">Toplam Alış</th>
                            <th className="p-3 text-right">Ödemeler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.length > 0 ? (
                            history
                              .slice()
                              .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .map(record => (
                               <tr key={record.date} className="border-b hover:bg-slate-50">
                                  <td className="p-3 font-semibold">{new Date(record.date).toLocaleDateString('tr-TR', { timeZone: 'UTC' })}</td>
                                  <td className="p-3 text-right font-bold text-cyan-700">{record.netRevenue.toFixed(2)} ₺</td>
                                  <td className="p-3 text-right">{record.totalRevenue.toFixed(2)} ₺</td>
                                  <td className="p-3 text-right text-red-600">{record.totalReturn.toFixed(2)} ₺</td>
                                  <td className="p-3 text-right">{record.cashSales.toFixed(2)} / {record.cardSales.toFixed(2)} ₺</td>
                                  <td className="p-3 text-right">{record.totalSalesCount}</td>
                                  <td className="p-3 text-right font-semibold text-amber-700">{record.totalPurchase?.toFixed(2) ?? '0.00'} ₺</td>
                                  <td className="p-3 text-right font-semibold text-lime-700">{record.totalPaymentsToSuppliers?.toFixed(2) ?? '0.00'} ₺</td>
                               </tr>
                            ))
                        ) : (
                            <tr><td colSpan={8} className="text-center p-8 text-slate-500">Geçmiş rapor bulunmuyor.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const FinancialAnalysisReport: React.FC<{ sales: SaleRecord[], purchases: PurchaseRecord[], payments: PaymentRecord[] }> = ({ sales, purchases, payments }) => {
    const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
    const totalCogs = sales.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + (item.buyPrice * item.quantity), 0), 0);
    const grossProfit = totalRevenue - totalCogs;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const totalPurchaseCost = purchases.reduce((sum, p) => sum + p.total, 0);
    const totalPaymentsMade = payments.reduce((sum, p) => sum + p.amount, 0);

    return (
         <div className="space-y-6">
             <div className="grid grid-cols-2 gap-6">
                 <StatCard icon="finance" title="Toplam Ciro" value={`${totalRevenue.toFixed(2)} ₺`} color="bg-green-100 text-green-700" />
                 <StatCard icon="purchase" title="Satılan Malın Maliyeti (SMM)" value={`${totalCogs.toFixed(2)} ₺`} color="bg-rose-100 text-rose-700" />
                 <StatCard icon="reports" title="Brüt Kar" value={`${grossProfit.toFixed(2)} ₺`} color="bg-cyan-100 text-cyan-700" />
                 <StatCard icon="tag" title="Brüt Kar Marjı" value={`%${grossMargin.toFixed(2)}`} color="bg-indigo-100 text-indigo-700" />
                 <StatCard icon="purchase" title="Toplam Alış Tutarı" value={`${totalPurchaseCost.toFixed(2)} ₺`} color="bg-amber-100 text-amber-700" />
                 <StatCard icon="finance" title="Tedarikçilere Ödenen" value={`${totalPaymentsMade.toFixed(2)} ₺`} color="bg-lime-100 text-lime-700" />
             </div>
        </div>
    );
};

const AiAnalysisReport: React.FC<{ sales: SaleRecord[] }> = ({ sales }) => {
    const [query, setQuery] = useState('');
    const [report, setReport] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const handleGenerateReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query || isLoading) return;
        setIsLoading(true); setReport('');
        try {
            const result = await analyzeSalesData(query, sales);
            setReport(result);
        } catch (error) {
            setReport('Rapor oluşturulurken bir hata oluştu.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="w-full h-full flex flex-col gap-4">
            <form onSubmit={handleGenerateReport} className="flex-shrink-0">
                <div className="flex gap-4">
                    <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Örn: En karlı ürün hangisi?" className="flex-grow input-style" />
                    <button type="submit" disabled={isLoading || !query} className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-6 rounded-lg transition disabled:bg-slate-400">
                        {isLoading ? '...' : 'Analiz Et'}
                    </button>
                </div>
            </form>
            <div className="flex-grow bg-slate-100 rounded-lg p-6 border prose max-w-none overflow-y-auto">
                {report ? (
                    <div className="markdown-body">
                        <Markdown>{report}</Markdown>
                    </div>
                ) : (
                    <p>Rapor sonucu burada görünecektir.</p>
                )}
            </div>
        </div>
    );
};

export default ReportsView;
