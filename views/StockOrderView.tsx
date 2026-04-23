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
}

const StockOrderView: React.FC<StockOrderViewProps> = ({ products, suppliers, definitions, onNavigate }) => {
  
  // 1. STATE MANAGEMENT
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [filterMarka, setFilterMarka] = useState<string>('');
  const [filterModel, setFilterModel] = useState<string>('');
  const [filterGrup, setFilterGrup] = useState<string>('');
  const [customPhone, setCustomPhone] = useState('');
  
  // Sipariş miktarlarını tutan state
  const [orderAmounts, setOrderAmounts] = useState<Record<string, number>>({});

  // 2. FILTERING & GROUPING LOGIC
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (p.isDeleted) return false;
      
      const search = sidebarSearch.toLowerCase().trim();
      const matchesSearch = !search || 
        p.barcode.includes(search) || 
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
        // Marka Başlığı ekle (Opsiyonel ama düzenli durur)
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
    
    // Numarayı temizle: sadece rakamlar kalsın
    let phone = rawPhone.replace(/\D/g, '');
    
    // Türkiye numarası formatlama mantığı
    if (phone.length === 10 && phone.startsWith('5')) {
        phone = '90' + phone;
    } else if (phone.length === 11 && phone.startsWith('05')) {
        phone = '90' + phone.substring(1);
    } else if (phone.length === 11 && phone.startsWith('5')) {
        // Hatalı giriş olabilir, 5 ile başlayan 11 hane ise muhtemelen 05... gibi ama başı 5. 
        // Genelde kullanıcılar 532... (10 hane) veya 0532... (11 hane) girer.
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
    // wa.me bazen masaüstü uygulamasını zorlayabilir, web.whatsapp.com doğrudan web sürümünü açar
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedMsg}`;
    window.open(whatsappUrl, '_blank');
  };

  // 4. RENDER
  return (
    <div className="flex h-full bg-[#020617] text-slate-300 font-sans overflow-hidden">
      
      {/* 🔴 1. BÖLÜM: FİLTRELEME (SOL) */}
      <aside className="w-80 flex-shrink-0 bg-slate-950 border-r border-white/5 flex flex-col">
        <div className="p-8 border-b border-white/5 bg-slate-900/20">
            <h2 className="text-[11px] font-black text-amber-500 uppercase tracking-[0.3em] mb-1">STOK YÖNETİMİ</h2>
            <h3 className="text-xl font-black text-white tracking-tighter uppercase">SİPARİŞ LİSTESİ</h3>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-6">
            <div className="space-y-4">
                <div className="relative group">
                    <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
                    <input 
                        type="text" 
                        value={sidebarSearch}
                        onChange={e => setSidebarSearch(e.target.value)}
                        placeholder="Barkod veya isim..."
                        className="w-full h-12 pl-12 pr-4 bg-slate-900/50 border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:border-amber-500/50 transition-all"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">MARKA SEÇİMİ</label>
                    <select 
                        value={filterMarka}
                        onChange={e => { setFilterMarka(e.target.value); setFilterModel(''); }}
                        className="w-full h-12 bg-slate-900 border border-white/10 rounded-xl px-4 text-xs font-bold text-white outline-none focus:border-amber-500/50 appearance-none"
                    >
                        <option value="">Tüm Markalar</option>
                        {definitions.brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">GRUP</label>
                    <select 
                        value={filterGrup}
                        onChange={e => setFilterGrup(e.target.value)}
                        className="w-full h-12 bg-slate-900 border border-white/10 rounded-xl px-4 text-xs font-bold text-white outline-none focus:border-amber-500/50 appearance-none"
                    >
                        <option value="">Tüm Gruplar</option>
                        {definitions.groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                    </select>
                </div>

                <button 
                    onClick={() => {
                        setSidebarSearch('');
                        setFilterMarka('');
                        setFilterModel('');
                        setFilterGrup('');
                    }}
                    className="w-full py-4 bg-white/5 text-slate-500 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all mt-4"
                >
                    FİLTRELERİ SIFIRLA
                </button>
            </div>
        </div>
      </aside>

      {/* 🔵 2. BÖLÜM: ÜRÜN LİSTESİ (ORTA) */}
      <section className="flex-1 flex flex-col bg-[#020617] border-r border-white/5 overflow-hidden">
        <div className="p-10 border-b border-white/5 bg-slate-950/20 backdrop-blur-md flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-black text-white tracking-tighter uppercase mb-1">Eksik Ürünler & Sipariş</h1>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{filteredProducts.length} ÜRÜN LİSTELENDİ</p>
            </div>
            <div className="flex gap-4">
                <button 
                    onClick={clearOrders}
                    className="px-6 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all"
                >
                    LİSTEYİ TEMİZLE
                </button>
                <button 
                    onClick={autoFillOrders}
                    className="px-6 py-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all"
                >
                    OTOMATİK DOLDUR
                </button>
            </div>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar p-8">
            <div className="grid grid-cols-1 gap-4">
                {filteredProducts.map((p, idx) => (
                    <div key={p.barcode} className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex items-center justify-between group hover:bg-white/[0.04] transition-all">
                        <div className="flex items-center gap-6">
                            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-[11px] font-black text-slate-700 group-hover:text-amber-500 transition-colors shrink-0 border border-white/5">
                                #{idx + 1}
                            </div>
                            <div>
                                <h4 className="text-lg font-black text-white uppercase line-clamp-1 tracking-tight mb-1">{p.name}</h4>
                                <div className="flex items-center gap-3">
                                    <span className="text-[11px] font-black text-amber-500 uppercase tracking-widest">{p.marka}</span>
                                    <span className="w-1 h-1 bg-white/10 rounded-full"></span>
                                    <span className="text-[11px] font-bold text-slate-500 font-mono">{p.barcode}</span>
                                    <span className="text-[11px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">[{p.renk} / {p.beden}]</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-10">
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-600 uppercase mb-1">STOK DURUMU</p>
                                <div className="flex items-end gap-3 justify-end">
                                    <div className="text-right">
                                        <p className="text-[9px] font-bold text-slate-700 uppercase leading-none mb-1">Mevcut</p>
                                        <p className={`text-2xl font-black tabular-nums leading-none ${p.stock <= (p.minStock || 5) ? 'text-rose-500' : 'text-slate-400'}`}>{p.stock}</p>
                                    </div>
                                    <div className="w-px h-8 bg-white/5"></div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-bold text-slate-700 uppercase leading-none mb-1">Rafta Gereken</p>
                                        <p className="text-2xl font-black text-cyan-500/50 tabular-nums leading-none">{(p.minStock || 5) * 2}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 pr-4 border-r border-white/5">
                                    <button 
                                        onClick={() => updateOrderAmount(p.barcode, 6)}
                                        className="px-3 py-2 bg-white/5 hover:bg-amber-500/20 text-[10px] font-black text-slate-400 hover:text-amber-500 rounded-lg transition-all border border-white/5"
                                    >
                                        6 ADET
                                    </button>
                                    <button 
                                        onClick={() => updateOrderAmount(p.barcode, 12)}
                                        className="px-3 py-2 bg-white/5 hover:bg-amber-500/20 text-[10px] font-black text-slate-400 hover:text-amber-500 rounded-lg transition-all border border-white/5"
                                    >
                                        12 ADET
                                    </button>
                                </div>

                                <div className="flex items-center gap-4 bg-slate-950 p-2 rounded-2xl border border-white/5 shadow-inner">
                                    <button 
                                        onClick={() => updateOrderAmount(p.barcode, (orderAmounts[p.barcode] || 0) - 1)}
                                        className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all"
                                    >
                                        <Icon name="minus" className="w-4 h-4" />
                                    </button>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            value={orderAmounts[p.barcode] || ''}
                                            onChange={e => updateOrderAmount(p.barcode, parseInt(e.target.value) || 0)}
                                            placeholder="0"
                                            className="w-20 bg-transparent text-center text-xl font-black text-white outline-none"
                                        />
                                        {orderAmounts[p.barcode] > 0 && (
                                            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                                <p className="text-[8px] font-black text-amber-500 uppercase tracking-tighter">
                                                    {getQtyDesc(orderAmounts[p.barcode])}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <button 
                                        onClick={() => updateOrderAmount(p.barcode, (orderAmounts[p.barcode] || 0) + 1)}
                                        className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all"
                                    >
                                        <Icon name="plus" className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* 🟠 3. BÖLÜM: AKSİYONLAR (SAĞ) */}
      <aside className="w-96 flex-shrink-0 bg-slate-950/20 border-l border-white/5 flex flex-col p-10">
        <div className="mb-12">
            <h2 className="text-[11px] font-black text-amber-500 uppercase tracking-[0.4em] mb-2 flex items-center gap-3">
                <Icon name="purchase" className="w-5 h-5" /> SİPARİŞ YÖNETİMİ
            </h2>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">ÇIKTI VE PAYLAŞIM MERKEZİ</p>
        </div>

        <div className="flex-grow flex flex-col space-y-4">
            <div className="bg-white/5 rounded-3xl p-8 border border-white/5 shadow-inner mb-6 text-center">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">TOPLAM SİPARİŞ KALEMİ</p>
                <p className="text-6xl font-black text-white tracking-tighter tabular-nums mb-2">
                    {Object.values(orderAmounts).filter(v => v > 0).length}
                </p>
                <p className="text-[10px] font-bold text-amber-500/50 uppercase tracking-widest">Farklı Ürün Grubu</p>
            </div>

            <button 
                onClick={handleExportExcel}
                className="w-full h-20 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white border border-emerald-500/20 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-4 group"
            >
                <Icon name="excel" className="w-6 h-6 group-hover:scale-110 transition-transform" />
                EXCEL OLARAK İNDİR
            </button>

            <button 
                onClick={handleExportPDF}
                className="w-full h-20 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/20 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-4 group"
            >
                <Icon name="pdf" className="w-6 h-6 group-hover:scale-110 transition-transform" />
                PDF OLARAK İNDİR
            </button>

            <div className="pt-6 mt-6 border-t border-white/5 space-y-4">
                <div className="relative group">
                    <Icon name="customer" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-green-500 transition-colors" />
                    <input 
                        type="text" 
                        value={customPhone}
                        onChange={e => setCustomPhone(e.target.value)}
                        placeholder="WhatsApp No: 905..."
                        className="w-full h-14 pl-12 pr-4 bg-slate-900 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-green-500/50 transition-all font-mono shadow-inner"
                    />
                </div>
                <button 
                    onClick={handleWhatsAppShare}
                    className="w-full h-24 bg-green-600/10 hover:bg-green-600 text-green-500 hover:text-white border border-green-500/20 rounded-[2.5rem] font-black uppercase text-sm tracking-widest shadow-[0_20px_50px_rgba(22,163,74,0.1)] transition-all flex flex-col items-center justify-center gap-1 group"
                >
                    <div className="flex items-center gap-4">
                        <Icon name="whatsapp" className="w-8 h-8 group-hover:scale-110 transition-transform" />
                        WHATSAPP İLE GÖNDER
                    </div>
                    <span className="text-[9px] font-bold opacity-50 uppercase tracking-tighter">Sipariş Listesi (Marka Bazlı)</span>
                </button>
            </div>

            {filterMarka && (
              <p className="text-center text-[10px] font-bold text-slate-700 uppercase tracking-widest italic mt-4">
                {suppliers.find(s => s.name.toLowerCase() === filterMarka.toLowerCase()) ? `${filterMarka} Rehberde Kayıtlı` : `${filterMarka} Rehberde Bulunamadı`}
              </p>
            )}
        </div>
      </aside>
    </div>
  );
};

export default StockOrderView;
