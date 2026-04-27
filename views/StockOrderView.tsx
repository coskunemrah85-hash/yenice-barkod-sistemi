import React, { useState, useMemo } from 'react';
import { Product, Supplier, View, TabIcon, Brand, Model, Group, Color, Size } from '../types';
import Icon from '../components/Icon';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface StockOrderViewProps {
  products: Product[];
  suppliers: Supplier[];
  definitions: {
    brands: Brand[];
    groups: Group[];
    colors: Color[];
    sizes: Size[];
    models: Model[];
  };
  onNavigate?: (view: View, label: string, icon: TabIcon) => void;
  orderAmounts: Record<string, number>;
  setOrderAmounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

const StockOrderView: React.FC<StockOrderViewProps> = ({ products, suppliers, definitions, onNavigate, orderAmounts, setOrderAmounts }) => {
  
  // 1. STATE MANAGEMENT (Local UI States)
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [filterMarka, setFilterMarka] = useState<string>('');
  const [filterModel, setFilterModel] = useState<string>('');
  const [filterGrup, setFilterGrup] = useState<string>('');
  const [customPhone, setCustomPhone] = useState('');

  // 2. FILTERING & GROUPING LOGIC
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (p.isDeleted) return false;
      
      const search = sidebarSearch.toLowerCase().trim();
      const matchesSearch = !search || 
        p.barcode.toLowerCase().includes(search) || 
        (p.secondaryBarcodes && p.secondaryBarcodes.some(bc => bc.toLowerCase().includes(search))) || 
        (p.name || '').toLowerCase().includes(search) || 
        (p.stokKodu || '').toLowerCase().includes(search) ||
        (p.marka || '').toLowerCase().includes(search);

      const matchesMarka = !filterMarka || (p.marka || '').toLowerCase() === filterMarka.toLowerCase();
      const matchesModel = !filterModel || (p.model || '').toLowerCase() === filterModel.toLowerCase();
      const matchesGrup = !filterGrup || (p.group || '').toLowerCase() === filterGrup.toLowerCase();

      const isLowStock = p.stock <= (p.minStock || 5);
      const hasAnyFilter = sidebarSearch || filterMarka || filterModel || filterGrup;

      if (hasAnyFilter) {
        return matchesSearch && matchesMarka && matchesModel && matchesGrup;
      } else {
        return isLowStock;
      }
    });
  }, [products, sidebarSearch, filterMarka, filterModel, filterGrup]);

  // Ürünleri markaya göre grupla (Exportlar için)
  const getGroupedOrders = () => {
    const groups: Record<string, Product[]> = {};
    filteredProducts.forEach(p => {
      if ((orderAmounts[p.barcode] || 0) > 0) {
        const brand = p.marka || 'DİĞER';
        if (!groups[brand]) groups[brand] = [];
        groups[brand].push(p);
      }
    });
    return groups;
  };

  // 3. HANDLERS
  const updateOrderAmount = (barcode: string, amount: number) => {
    setOrderAmounts(prev => ({
      ...prev,
      [barcode]: Math.max(0, amount)
    }));
  };

  const clearOrders = () => {
    if (confirm("Tüm sipariş kalemlerini sıfırlamak istediğinize emin misiniz?")) {
        setOrderAmounts({});
    }
  };

  const autoFillOrders = () => {
    const newAmounts: Record<string, number> = { ...orderAmounts };
    filteredProducts.forEach(p => {
      const target = (p.minStock || 5) * 2;
      const needed = Math.max(0, target - p.stock);
      if (needed > 0) {
        newAmounts[p.barcode] = needed;
      }
    });
    setOrderAmounts(newAmounts);
  };

  // Helper to get quantity description
  const getQtyDesc = (amount: number) => {
    if (amount === 6) return "Yarım Düzine";
    if (amount === 12) return "1 Düzine";
    return `${amount} Adet`;
  };

  // EXPORT LOGIC
  const handleExportExcel = () => {
    const grouped = getGroupedOrders();
    const rows: any[] = [];

    Object.entries(grouped).forEach(([brand, items]) => {
        items.forEach(p => {
            rows.push({
                'Marka': brand,
                'Barkod': p.barcode,
                'Ürün Adı': p.name,
                'Varyasyon': `${p.renk} / ${p.beden}`,
                'Mevcut': p.stock,
                'Hedef': (p.minStock || 5) * 2,
                'Sipariş': orderAmounts[p.barcode],
                'Birim': getQtyDesc(orderAmounts[p.barcode])
            });
        });
    });

    if (rows.length === 0) return alert("Sipariş miktarı girilmiş ürün bulunamadı!");

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Marka Bazlı Siparişler");
    XLSX.writeFile(wb, `siparis_listesi_${new Date().getTime()}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text('MARKA BAZLI SİPARİŞ LİSTESİ', 14, 22);
    doc.setFontSize(10);
    doc.text(`Tarih: ${new Date().toLocaleString()}`, 14, 30);

    const grouped = getGroupedOrders();
    let currentY = 35;

    Object.entries(grouped).forEach(([brand, items]) => {
        if (currentY > 250) { doc.addPage(); currentY = 20; }
        
        doc.setFontSize(14);
        doc.setTextColor(79, 70, 229);
        doc.text(brand.toUpperCase(), 14, currentY + 10);
        
        const tableData = items.map(p => [
            p.barcode,
            p.name,
            `${p.renk} / ${p.beden}`,
            p.stock.toString(),
            getQtyDesc(orderAmounts[p.barcode])
        ]);

        (doc as any).autoTable({
            startY: currentY + 15,
            head: [['Barkod', 'Ürün', 'Renk/Beden', 'Stok', 'Sipariş']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] },
            margin: { left: 14 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
    });

    if (Object.keys(grouped).length === 0) return alert("Sipariş miktarı girilmiş ürün bulunamadı!");

    doc.save(`siparis_listesi_pdf_${new Date().getTime()}.pdf`);
  };

  const handleWhatsAppShare = () => {
    const supplier = suppliers.find(s => s.name.toLowerCase() === filterMarka.toLowerCase());
    let rawPhone = customPhone || supplier?.whatsapp || supplier?.mobilePhone || '';
    let phone = rawPhone.replace(/\D/g, '');
    if (phone.length === 10 && phone.startsWith('5')) {
        phone = '90' + phone;
    } else if (phone.length === 11 && phone.startsWith('05')) {
        phone = '90' + phone.substring(1);
    }
    if (!phone) return alert("Lütfen geçerli bir telefon numarası girin veya marka seçin.");
    let message = `*📦 SİPARİŞ LİSTESİ - ${new Date().toLocaleDateString()}*\n\n`;
    const grouped = getGroupedOrders();
    Object.entries(grouped).forEach(([brand, items]) => {
        message += `*--- ${brand.toUpperCase()} ---*\n`;
        items.forEach(p => {
            message += `• ${p.name} (${p.renk}/${p.beden}) - *${getQtyDesc(orderAmounts[p.barcode])}*\n`;
        });
        message += `\n`;
    });
    if (Object.keys(grouped).length === 0) return alert("Sipariş miktarı girilmiş ürün bulunamadı!");
    const encodedMsg = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedMsg}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="flex h-full bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-300 font-sans overflow-hidden">
      
      {/* SIDEBAR: FİLTRELER */}
      <aside className="w-60 lg:w-64 flex-shrink-0 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-white/5 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-900/20">
            <h2 className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mb-0.5">STOK YÖNETİMİ</h2>
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight uppercase">SİPARİŞ LİSTESİ</h3>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar p-4 space-y-5">
            <div className="space-y-4">
                <div className="relative group">
                    <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                    <input 
                        type="text" 
                        value={sidebarSearch}
                        onChange={e => setSidebarSearch(e.target.value)}
                        placeholder="Ara..."
                        className="w-full h-10 pl-10 pr-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500/50 transition-all"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">MARKA</label>
                    <select 
                        value={filterMarka}
                        onChange={e => { setFilterMarka(e.target.value); setFilterModel(''); }}
                        className="w-full h-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500/50"
                    >
                        <option value="">Tüm Markalar</option>
                        {definitions.brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">GRUP</label>
                    <select 
                        value={filterGrup}
                        onChange={e => setFilterGrup(e.target.value)}
                        className="w-full h-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg px-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500/50"
                    >
                        <option value="">Tüm Gruplar</option>
                        {definitions.groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                    </select>
                </div>

                <button 
                    onClick={() => { setSidebarSearch(''); setFilterMarka(''); setFilterModel(''); setFilterGrup(''); }}
                    className="w-full py-2 bg-slate-100 dark:bg-white/5 text-slate-500 border border-slate-200 dark:border-white/5 rounded-lg text-[9px] font-bold uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                >
                    TEMİZLE
                </button>
            </div>
        </div>
      </aside>

       {/* ANA LİSTE */}
      <section className="flex-1 flex flex-col bg-white dark:bg-[#020617] border-r border-slate-200 dark:border-white/5 overflow-hidden shadow-inner">
        <div className="p-4 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-slate-950/20 flex items-center justify-between">
            <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-none">Sipariş Oluştur</h1>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{filteredProducts.length} ÜRÜN BULUNDU</p>
            </div>
            <div className="flex gap-3">
                <button 
                    onClick={clearOrders}
                    className="px-4 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-500 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-rose-500/20 transition-all"
                >
                    SIFIRLA
                </button>
                <button 
                    onClick={autoFillOrders}
                    className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-amber-500/20 transition-all"
                >
                    OTOMATİK DOLDUR
                </button>
            </div>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar p-4">
            <div className="grid grid-cols-1 gap-2">
                {filteredProducts.map((p, idx) => (
                    <div key={p.barcode} className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl p-3 flex items-center justify-between group hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-400 dark:text-slate-700 group-hover:text-amber-500 transition-colors shrink-0 border border-slate-200 dark:border-white/5">
                                {idx + 1}
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase line-clamp-1">{p.name}</h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase">{p.marka}</span>
                                    <span className="w-1 h-1 bg-slate-300 dark:bg-white/10 rounded-full"></span>
                                    <span className="text-[10px] font-bold text-slate-400 font-mono">{p.barcode}</span>
                                    <span className="text-[10px] font-bold text-indigo-500 bg-indigo-500/5 px-1.5 py-0.5 rounded-md">[{p.renk}/{p.beden}]</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex items-end gap-3">
                                <div className="text-right">
                                    <p className="text-[7px] font-bold text-slate-400 uppercase">Mevcut</p>
                                    <p className={`text-base font-bold tabular-nums ${p.stock <= (p.minStock || 5) ? 'text-rose-500' : 'text-slate-400'}`}>{p.stock}</p>
                                </div>
                                <div className="w-px h-6 bg-slate-200 dark:bg-white/5"></div>
                                <div className="text-right">
                                    <p className="text-[7px] font-bold text-slate-400 uppercase">Gereken</p>
                                    <p className="text-base font-bold text-cyan-500/40 tabular-nums">{(p.minStock || 5) * 2}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 pr-3 border-r border-slate-200 dark:border-white/5">
                                    <button onClick={() => updateOrderAmount(p.barcode, 6)} className="px-2 py-1.5 bg-white dark:bg-white/5 hover:bg-amber-500/10 text-[9px] font-bold text-slate-500 hover:text-amber-500 rounded border border-slate-200 dark:border-white/5 transition-all">6 ADET</button>
                                    <button onClick={() => updateOrderAmount(p.barcode, 12)} className="px-2 py-1.5 bg-white dark:bg-white/5 hover:bg-amber-500/10 text-[9px] font-bold text-slate-500 hover:text-amber-500 rounded border border-slate-200 dark:border-white/5 transition-all">12 ADET</button>
                                </div>

                                <div className="flex items-center gap-3 bg-white dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm">
                                    <button onClick={() => updateOrderAmount(p.barcode, (orderAmounts[p.barcode] || 0) - 1)} className="w-8 h-8 flex items-center justify-center bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-white rounded-lg transition-all"><Icon name="minus" className="w-3 h-3" /></button>
                                    <input type="number" value={orderAmounts[p.barcode] || ''} onChange={e => updateOrderAmount(p.barcode, parseInt(e.target.value) || 0)} placeholder="0" className="w-12 bg-transparent text-center text-sm font-bold text-slate-900 dark:text-white outline-none" />
                                    <button onClick={() => updateOrderAmount(p.barcode, (orderAmounts[p.barcode] || 0) + 1)} className="w-8 h-8 flex items-center justify-center bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-white rounded-lg transition-all"><Icon name="plus" className="w-3 h-3" /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* SAĞ PANEL: AKSİYONLAR */}
      <aside className="w-60 lg:w-64 flex-shrink-0 bg-white dark:bg-slate-950/20 border-l border-slate-200 dark:border-white/5 flex flex-col p-5">
        <div className="mb-8">
            <h2 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                <Icon name="purchase" className="w-4 h-4" /> ÖZET
            </h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">SİPARİŞ AKTARIM</p>
        </div>

        <div className="flex-grow flex flex-col space-y-3">
            <div className="bg-slate-100 dark:bg-white/5 rounded-xl p-4 border border-slate-200 dark:border-white/5 shadow-inner text-center">
                <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">TOPLAM KALEM</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight tabular-nums">
                    {Object.values(orderAmounts).filter(v => v > 0).length}
                </p>
            </div>

            <button onClick={handleExportExcel} className="w-full h-10 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-500/20 rounded-lg font-bold uppercase text-[9px] tracking-wider transition-all flex items-center justify-center gap-3">
                <Icon name="excel" className="w-4 h-4" /> EXCEL
            </button>

            <button onClick={handleExportPDF} className="w-full h-10 bg-rose-600/10 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-500/20 rounded-lg font-bold uppercase text-[9px] tracking-wider transition-all flex items-center justify-center gap-3">
                <Icon name="pdf" className="w-4 h-4" /> PDF
            </button>

            <div className="pt-5 mt-4 border-t border-slate-200 dark:border-white/5 space-y-3">
                <div className="relative group">
                    <Icon name="customer" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                    <input 
                        type="text" 
                        value={customPhone}
                        onChange={e => setCustomPhone(e.target.value)}
                        placeholder="WhatsApp: 905..."
                        className="w-full h-11 pl-10 pr-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-green-500/50 transition-all font-mono shadow-inner"
                    />
                </div>
                <button 
                    onClick={handleWhatsAppShare}
                    className="w-full h-11 bg-green-600/10 hover:bg-green-600 text-green-600 hover:text-white border border-green-500/20 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-3 group"
                >
                    <Icon name="whatsapp" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    GÖNDER
                </button>
            </div>
        </div>
      </aside>
    </div>
  );
};

export default StockOrderView;
