import React, { useMemo, useState } from 'react';
import { Product, SaleRecord, SaleItem, View, TabIcon, Supplier } from '../types';
import Icon from '../components/Icon';

interface RemoteAccessViewProps {
  salesHistory: SaleRecord[];
  products: Product[];
  suspendedSales: SaleItem[][];
  onNavigate: (view: View, label: string, icon: TabIcon) => void;
  suppliers: Supplier[];
}

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

const SalesDashboard: React.FC<{ salesHistory: SaleRecord[], suspendedSales: SaleItem[][], onNavigate: RemoteAccessViewProps['onNavigate'] }> = ({ salesHistory, suspendedSales, onNavigate }) => {
    const todayStats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todaysSales = salesHistory.filter(sale => new Date(sale.date) >= today);
        const totalRevenue = todaysSales.reduce((sum, sale) => sum + sale.total, 0);
        const salesCount = todaysSales.length;
        
        const productSalesMap = new Map<string, {name: string, quantity: number}>();
        todaysSales.forEach(sale => {
        sale.items.forEach(item => {
            const existing = productSalesMap.get(item.barcode);
            productSalesMap.set(item.barcode, {
            name: item.name,
            quantity: (existing?.quantity || 0) + item.quantity
            });
        });
        });

        const topSellers = Array.from(productSalesMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

        return { totalRevenue, salesCount, topSellers };
    }, [salesHistory]);

    return (
        <div className="w-full lg:w-1/2 flex flex-col gap-6">
            <h2 className="text-xl font-bold text-slate-700 border-b pb-2">Bugünkü Satış Faaliyetleri</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatCard icon="finance" title="Bugünkü Ciro" value={`${todayStats.totalRevenue.toFixed(2)} ₺`} color="bg-green-100 text-green-700" />
                <StatCard icon="new-sale" title="Bugünkü Satış Adedi" value={todayStats.salesCount} color="bg-cyan-100 text-cyan-700" />
            </div>

            <div className="bg-white rounded-xl shadow-md p-5 border border-slate-200/80 flex-grow flex flex-col">
                <h3 className="font-bold text-slate-800 mb-3">Günün Çok Satanları</h3>
                {todayStats.topSellers.length > 0 ? (
                    <ul className="space-y-3">
                        {todayStats.topSellers.map((item, index) => (
                            <li key={index} className="flex justify-between items-center text-sm">
                                <span className="font-medium text-slate-700 truncate pr-4">{item.name}</span>
                                <span className="font-bold text-cyan-600 bg-cyan-100/70 px-2 py-1 rounded-md">{item.quantity} adet</span>
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-slate-500 text-sm text-center py-4">Bugün henüz satış yapılmadı.</p>}
            </div>

            <div className="bg-white rounded-xl shadow-md p-5 border border-slate-200/80">
                <h3 className="font-bold text-slate-800 mb-3">Beklemedeki Satışlar ({suspendedSales.length})</h3>
                    {suspendedSales.length > 0 ? (
                    <div className="space-y-2">
                            {suspendedSales.map((sale, index) => {
                            const saleTotal = sale.reduce((sum, item) => sum + item.price * item.quantity, 0);
                            const itemCount = sale.reduce((sum, item) => sum + item.quantity, 0);
                            return (
                                <div key={index} className="flex items-center justify-between bg-slate-100 p-2 rounded-lg">
                                    <div><p className="font-semibold text-slate-700 text-sm">Satış #{index + 1}: {itemCount} ürün</p></div>
                                    <p className="font-bold text-sm text-slate-800">{saleTotal.toFixed(2)} ₺</p>
                                </div>
                            );
                        })}
                    </div>
                ) : <p className="text-slate-500 text-sm">Beklemede satış bulunmuyor.</p>}
                    <button onClick={() => onNavigate(View.SALE, 'Satış Ekranı', 'new-sale')} className="text-sm font-semibold text-cyan-600 hover:underline mt-4">Satış Ekranına Git →</button>
            </div>
        </div>
    );
}

const generatePdfInNewTab = (title: string, headers: string[], rows: (string|number)[][]) => {
    const tableHeaders = headers.map(h => `<th>${h}</th>`).join('');
    const tableRows = rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('');
    
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 10pt; }
                .container { width: 95%; margin: 2rem auto; }
                h1 { text-align: center; color: #334155; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
                th { background-color: #f1f5f9; font-weight: 600; color: #475569; }
                tr:nth-child(even) { background-color: #f8fafc; }
                .print-controls { text-align: center; margin-bottom: 2rem; }
                .print-button { background-color: #0ea5e9; color: white; padding: 10px 20px; border-radius: 6px; border: none; font-size: 1rem; cursor: pointer; }
                @media print {
                    body { font-size: 9pt; }
                    .print-controls { display: none; }
                    .container { width: 100%; margin: 0; }
                    h1 { margin-bottom: 1rem; }
                    table { margin-top: 0; }
                    th, td { padding: 6px 8px; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="print-controls">
                    <button class="print-button" onclick="window.print()">Yazdır veya PDF Olarak Kaydet</button>
                </div>
                <h1>${title}</h1>
                <p>Oluşturma Tarihi: ${new Date().toLocaleString('tr-TR')}</p>
                <table>
                    <thead><tr>${tableHeaders}</tr></thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
    } else {
        alert("Yazdırma penceresi açılamadı. Lütfen pop-up engelleyicinizi kontrol edin.");
    }
};


const StockInquiry: React.FC<{ products: Product[], suppliers: Supplier[] }> = ({ products, suppliers }) => {
    const [selectedSupplierId, setSelectedSupplierId] = useState('all');

    const filteredProducts = useMemo(() => {
        const activeProducts = products.filter(p => !p.isDeleted);
        if (selectedSupplierId === 'all') {
            return activeProducts;
        }
        return activeProducts.filter(p => p.supplierId === selectedSupplierId);
    }, [products, selectedSupplierId]);

    const handleDownloadFullList = () => {
        const supplierName = selectedSupplierId === 'all' ? 'Tüm Ürünler' : suppliers.find(s => s.id === selectedSupplierId)?.name || 'Bilinmeyen Tedarikçi';
        const headers = ['Ürün Adı', 'Barkod', 'Stok', 'Alış Fiyatı', 'Satış Fiyatı'];
        const rows = filteredProducts.map(p => [p.name, p.barcode, p.stock, p.buyPrice.toFixed(2), p.price.toFixed(2)]);
        generatePdfInNewTab(`${supplierName} - Stok Listesi`, headers, rows);
    };

    const handleDownloadMissingList = () => {
        const missingItems = filteredProducts.filter(p => p.stock <= 10);
        if (missingItems.length === 0) {
            alert("Seçili tedarikçi için kritik stok seviyesinde ürün bulunmuyor.");
            return;
        }
        const supplierName = selectedSupplierId === 'all' ? 'Genel' : suppliers.find(s => s.id === selectedSupplierId)?.name || 'Bilinmeyen Tedarikçi';
        const headers = ['Ürün Adı', 'Stok Kodu', 'Mevcut Stok', 'Alış Fiyatı'];
        const rows = missingItems.map(p => [p.name, p.stokKodu, p.stock, p.buyPrice.toFixed(2)]);
        generatePdfInNewTab(`${supplierName} - Eksik Sipariş Listesi`, headers, rows);
    };

    return (
        <div className="w-full lg:w-1/2 flex flex-col gap-6">
            <h2 className="text-xl font-bold text-slate-700 border-b pb-2">Stok Sorgulama</h2>
            <div className="bg-white rounded-xl shadow-md p-5 border border-slate-200/80 flex flex-col flex-grow">
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className="flex-grow">
                        <label className="block text-sm font-medium text-slate-600 mb-1">Tedarikçiye Göre Filtrele</label>
                        <select
                            value={selectedSupplierId}
                            onChange={e => setSelectedSupplierId(e.target.value)}
                            className="w-full h-11 bg-white border border-slate-300 rounded-lg px-3 text-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        >
                            <option value="all">Tüm Tedarikçiler</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto border-t border-b -mx-5 px-5 py-2">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left sticky top-0 bg-white">
                                <th className="font-semibold text-slate-600 pb-2">Ürün</th>
                                <th className="font-semibold text-slate-600 pb-2 text-right">Stok</th>
                                <th className="font-semibold text-slate-600 pb-2 text-right">Satış Fiyatı</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map(item => (
                                <tr key={item.barcode} className="border-t">
                                    <td className="py-2.5">{item.name}</td>
                                    <td className={`py-2.5 text-right font-bold ${item.stock <= 10 ? 'text-red-600' : 'text-slate-800'}`}>{item.stock}</td>
                                    <td className="py-2.5 text-right font-semibold text-cyan-700">{item.price.toFixed(2)} ₺</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredProducts.length === 0 && <p className="text-slate-500 text-center py-8">Bu tedarikçiye ait ürün bulunmuyor.</p>}
                </div>
                <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-end">
                    <button onClick={handleDownloadFullList} className="btn-action bg-slate-200 text-slate-700 hover:bg-slate-300">
                        <Icon name="download" className="w-5 h-5"/> Listeyi PDF Olarak İndir
                    </button>
                    <button onClick={handleDownloadMissingList} className="btn-action bg-rose-500 text-white hover:bg-rose-600">
                        <Icon name="exclamation-triangle" className="w-5 h-5"/> Eksik Listesini İndir
                    </button>
                </div>
            </div>
            <style>{`.btn-action { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem 1rem; font-size: 0.875rem; font-weight: 600; border-radius: 0.5rem; transition: background-color 0.2s; }`}</style>
        </div>
    );
};


const RemoteAccessView: React.FC<RemoteAccessViewProps> = ({ salesHistory, products, suspendedSales, onNavigate, suppliers }) => {
  const appUrl = window.location.href;

  return (
    <div className="w-full h-full flex flex-col gap-6 overflow-y-auto pb-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-800">Uzaktan Erişim Paneli</h1>
                <p className="text-slate-500">Mağazanızı her yerden, her cihazdan yönetin.</p>
            </div>
            <div className="flex items-center gap-2 bg-cyan-50 text-cyan-700 px-4 py-2 rounded-xl border border-cyan-100">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-bold">Bulut Senkronizasyonu Aktif</span>
            </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 flex flex-col gap-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    <SalesDashboard salesHistory={salesHistory} suspendedSales={suspendedSales} onNavigate={onNavigate} />
                    <StockInquiry products={products} suppliers={suppliers} />
                </div>
            </div>

            <div className="flex flex-col gap-6">
                <section className="bg-white p-6 rounded-3xl shadow-md border border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Icon name="ai" className="w-6 h-6 text-cyan-600" />
                        Mobil Erişim
                    </h2>
                    <p className="text-sm text-slate-500 mb-6">
                        Telefonunuzdan veya tabletinizden erişmek için aşağıdaki bağlantıyı kullanın veya QR kodu taratın.
                    </p>
                    
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Erişim Bağlantısı</p>
                        <div className="flex items-center gap-2">
                            <input 
                                readOnly 
                                value={appUrl} 
                                className="flex-1 bg-transparent text-sm font-mono text-slate-600 outline-none truncate"
                            />
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(appUrl);
                                    alert("Bağlantı kopyalandı!");
                                }}
                                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                <Icon name="back" className="w-4 h-4 rotate-180" />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center p-6 bg-white border-2 border-dashed border-slate-200 rounded-2xl">
                        <div className="w-32 h-32 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
                            <Icon name="barcode" className="w-16 h-16 text-slate-300" />
                        </div>
                        <p className="text-xs text-center text-slate-400">
                            QR Kod simülasyonu. Gerçek kullanımda buraya dinamik QR kod gelecektir.
                        </p>
                    </div>
                </section>

                <section className="bg-gradient-to-br from-cyan-600 to-blue-700 p-6 rounded-3xl shadow-lg text-white">
                    <h2 className="text-xl font-bold mb-4">Nasıl Çalışır?</h2>
                    <ul className="space-y-4 text-sm text-cyan-50">
                        <li className="flex gap-3">
                            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center shrink-0 font-bold">1</div>
                            <p>Uygulama verileriniz Google Firebase bulut altyapısında saklanır.</p>
                        </li>
                        <li className="flex gap-3">
                            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center shrink-0 font-bold">2</div>
                            <p>Aynı Google hesabıyla giriş yaptığınız tüm cihazlarda veriler anında eşitlenir.</p>
                        </li>
                        <li className="flex gap-3">
                            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center shrink-0 font-bold">3</div>
                            <p>Bilgisayarınız kapalı olsa bile telefonunuzdan stok görebilir ve satış yapabilirsiniz.</p>
                        </li>
                    </ul>
                </section>
            </div>
        </div>
    </div>
  );
};

export default RemoteAccessView;