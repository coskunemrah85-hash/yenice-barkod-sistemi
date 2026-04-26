import React, { useState, useMemo } from 'react';
import { Product, Supplier, SaleRecord, MissingListRecord, MissingListItem } from '../types';
import Icon from './Icon';
import { generateLowStockReport } from '../services/geminiService';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// @ts-ignore
const XLSX = window.XLSX;

interface MissingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  suppliers: Supplier[];
  salesHistory: SaleRecord[];
  missingLists: MissingListRecord[];
  onAddMissingList: (record: MissingListRecord) => void;
}

const MissingListModal: React.FC<MissingListModalProps> = ({ 
  isOpen, 
  onClose, 
  products, 
  suppliers, 
  salesHistory,
  missingLists,
  onAddMissingList
}) => {
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<string>>(new Set());
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>({});
  const [aiReasons, setAiReasons] = useState<Record<string, string>>({});
  const [selectedSupplierId, setSelectedSupplierId] = useState('all');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'past'>('current');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedPastList, setSelectedPastList] = useState<MissingListRecord | null>(null);

  const missingProductsBySupplier = useMemo(() => {
    // Optimization: Filter first, then group
    const missing = [];
    for (let i = 0; i < products.length; i++) {
        const p = products[i];
        if (p.stock <= 10 && !p.isDeleted) {
            missing.push(p);
        }
    }
    
    const supplierMap = new Map<string, { supplier: Supplier | null, products: Product[] }>();

    missing.forEach(p => {
      const supplierId = p.supplierId || 'unknown';
      if (!supplierMap.has(supplierId)) {
        const supplierInfo = suppliers.find(s => s.id === p.supplierId) || null;
        supplierMap.set(supplierId, { supplier: supplierInfo, products: [] });
      }
      supplierMap.get(supplierId)!.products.push(p);
    });

    return Array.from(supplierMap.values());
  }, [products, suppliers]);

  const [displayLimit, setDisplayLimit] = useState(20);

  const filteredSupplierGroups = useMemo(() => {
    let groups = missingProductsBySupplier;
    if (selectedSupplierId !== 'all') {
        if (selectedSupplierId === 'unknown') {
            groups = missingProductsBySupplier.filter(group => group.supplier === null);
        } else {
            groups = missingProductsBySupplier.filter(group => group.supplier?.id === selectedSupplierId);
        }
    }
    return groups;
  }, [missingProductsBySupplier, selectedSupplierId]);

  const filteredPastLists = useMemo(() => {
    let lists = missingLists || [];
    if (selectedSupplierId !== 'all') {
        lists = lists.filter(l => l.supplierId === selectedSupplierId);
    }
    if (dateFilter) {
        lists = lists.filter(l => new Date(l.date).toISOString().split('T')[0] === dateFilter);
    }
    return [...lists].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [missingLists, selectedSupplierId, dateFilter]);

  // Memoized Supplier Group Component to prevent whole-list re-renders
  const SupplierGroup = React.memo(({ group, isExpanded, toggleSupplier, orderQuantities, handleQuantityChange, handleQuantityIncrement, aiReasons, onSave, onExcel, onPdf, onWhatsApp, onEmail }: any) => {
    const { supplier, products: missingItems } = group;
    const supplierId = supplier?.id || 'unknown';
    const supplierName = supplier?.name || 'Tedarikçisi Belirtilmemiş';
    
    const orderedItems = useMemo(() => missingItems.filter((p: any) => (orderQuantities[p.barcode] || 0) > 0), [missingItems, orderQuantities]);
    const totalQuantity = useMemo(() => orderedItems.reduce((sum: number, item: any) => sum + (orderQuantities[item.barcode] || 0), 0), [orderedItems, orderQuantities]);
    const totalCost = useMemo(() => orderedItems.reduce((sum: number, item: any) => sum + (Number(item.buyPrice || 0) * (orderQuantities[item.barcode] || 0)), 0), [orderedItems, orderQuantities]);

    return (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm mb-4">
            <button onClick={() => toggleSupplier(supplierId)} className="w-full flex justify-between items-center p-3 text-left hover:bg-slate-50 transition">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-xs">
                        {supplierName.charAt(0)}
                    </div>
                    <div>
                        <div className="font-bold text-slate-800 text-sm">{supplierName}</div>
                        <div className="text-[10px] text-slate-500">{missingItems.length} kritik stoklu ürün</div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {totalQuantity > 0 && (
                        <span className="bg-cyan-100 text-cyan-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {totalQuantity} Adet Hazır
                        </span>
                    )}
                    <Icon name="arrows-vertical" className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
            </button>
            {isExpanded && (
                <div className="p-3 border-t border-slate-100 bg-slate-50/20">
                    <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
                        <table className="w-full text-xs">
                            <thead className="bg-slate-50 text-slate-500 text-[9px] uppercase font-black">
                                <tr>
                                    <th className="px-3 py-2 text-left">Ürün Bilgisi</th>
                                    <th className="px-3 py-2 text-left">Kod / Barkod</th>
                                    <th className="px-3 py-2 text-right">Kalan</th>
                                    <th className="px-3 py-2 text-center w-40">Sipariş</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {missingItems.map((item: any) => (
                                    <tr key={item.barcode} className="hover:bg-slate-50/50">
                                        <td className="px-3 py-2">
                                            <div className="font-bold text-slate-700">{item.name}</div>
                                            <div className="text-[10px] text-slate-500">{item.marka} {item.model} - {item.renk} / {item.beden}</div>
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="text-slate-600 font-medium">{item.stokKodu}</div>
                                            <div className="text-[9px] font-mono text-slate-400">{item.barcode}</div>
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <span className={`font-bold ${item.stock <= 5 ? 'text-red-600' : 'text-amber-600'}`}>
                                                {item.stock}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="flex items-center justify-center gap-1">
                                                    <input 
                                                        type="text" 
                                                        value={orderQuantities[item.barcode] || ''}
                                                        onChange={(e) => handleQuantityChange(item.barcode, e.target.value)}
                                                        className="w-12 text-center font-bold border border-slate-200 rounded-md py-1 focus:ring-1 focus:ring-cyan-500 outline-none"
                                                        placeholder="0"
                                                    />
                                                    <button onClick={() => handleQuantityIncrement(item.barcode, 6)} className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-bold">+6</button>
                                                    <button onClick={() => handleQuantityIncrement(item.barcode, 12)} className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-bold">+12</button>
                                                </div>
                                                {aiReasons[item.barcode] && (
                                                    <span className="text-[8px] text-purple-600 font-bold bg-purple-50 px-1 py-0.5 rounded italic">
                                                        {aiReasons[item.barcode]}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex gap-4 text-xs">
                            <div className="flex flex-col">
                                <span className="text-[9px] text-slate-400 uppercase font-bold">Çeşit</span>
                                <span className="font-bold">{orderedItems.length} Kalem</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] text-slate-400 uppercase font-bold">Toplam Adet</span>
                                <span className="font-bold">{totalQuantity} Adet</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] text-slate-400 uppercase font-bold">Tutar</span>
                                <span className="font-bold text-cyan-600">{totalCost.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap justify-end gap-1.5">
                            <button onClick={() => onSave(supplier, missingItems)} className="btn-micro bg-cyan-600 text-white"><Icon name="database" className="w-3 h-3" /> Kaydet</button>
                            <button onClick={() => onExcel(supplierName, missingItems)} className="btn-micro bg-emerald-600 text-white"><Icon name="excel" className="w-3 h-3" /> Excel</button>
                            <button onClick={() => onPdf(supplierName, missingItems)} className="btn-micro bg-rose-600 text-white"><Icon name="pdf" className="w-3 h-3" /> PDF</button>
                            <button onClick={() => onWhatsApp(supplier, missingItems)} disabled={!supplier?.whatsapp} className="btn-micro bg-green-600 text-white disabled:bg-slate-300"><Icon name="whatsapp" className="w-3 h-3" /> WhatsApp</button>
                            <button onClick={() => onEmail(supplier, missingItems)} className="btn-micro bg-sky-600 text-white"><Icon name="logout" className="w-3 h-3" /> E-Posta</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
  });

  if (!isOpen) return null;

  const handleQuantityChange = (barcode: string, value: string) => {
    const quantity = parseInt(value, 10);
    setOrderQuantities(prev => ({
        ...prev,
        [barcode]: isNaN(quantity) || quantity < 0 ? 0 : quantity
    }));
  };

  const handleQuantityIncrement = (barcode: string, amount: number) => {
      setOrderQuantities(prev => ({
          ...prev,
          [barcode]: (prev[barcode] || 0) + amount
      }));
  };

  const toggleSupplier = (supplierId: string) => {
    setExpandedSuppliers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(supplierId)) newSet.delete(supplierId);
      else newSet.add(supplierId);
      return newSet;
    });
  };
  
  const getOrderedItems = (items: Product[]) => {
    return items
      .map(item => ({
        ...item,
        orderQuantity: orderQuantities[item.barcode] || 0,
      }))
      .filter(item => item.orderQuantity > 0);
  };

  const handleAiGenerate = async () => {
    setIsAiLoading(true);
    try {
      const suggestions = await generateLowStockReport(products, salesHistory, 10);
      const newQuantities: Record<string, number> = { ...orderQuantities };
      const newReasons: Record<string, string> = { ...aiReasons };
      
      suggestions.forEach(s => {
        newQuantities[s.barcode] = s.suggestedQuantity;
        newReasons[s.barcode] = s.reason;
      });
      
      setOrderQuantities(newQuantities);
      setAiReasons(newReasons);
      
      // Expand suppliers that have suggestions
      const suppliersWithSuggestions = new Set<string>();
      suggestions.forEach(s => {
        const product = products.find(p => p.barcode === s.barcode);
        if (product) {
          suppliersWithSuggestions.add(product.supplierId || 'unknown');
        }
      });
      setExpandedSuppliers(prev => new Set([...prev, ...suppliersWithSuggestions]));
      
      alert("Yapay zeka önerileri başarıyla oluşturuldu ve listeye eklendi.");
    } catch (error) {
      console.error("AI Generation Error:", error);
      alert("Yapay zeka önerileri oluşturulurken bir hata oluştu.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const generateExcel = (supplierName: string, items: Product[]) => {
    const orderedItems = getOrderedItems(items);
    if (orderedItems.length === 0) {
      alert("Lütfen en az bir ürün için sipariş adedi girin.");
      return;
    }

    const data = orderedItems.map(item => ({
      "Ürün Adı": item.name,
      "Marka": item.marka,
      "Model": item.model,
      "Renk": item.renk,
      "Beden": item.beden,
      "Stok Kodu": item.stokKodu,
      "Barkod": item.barcode,
      "Kalan Stok": item.stock,
      "Sipariş Adedi": item.orderQuantity
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sipariş Listesi");
    XLSX.writeFile(wb, `${supplierName}-siparis-listesi.xlsx`);
  };

  const generatePdf = (supplierName: string, items: Product[]) => {
    const orderedItems = getOrderedItems(items);
    if (orderedItems.length === 0) {
      alert("Lütfen en az bir ürün için sipariş adedi girin.");
      return;
    }

    const doc = new jsPDF();
    const totalUniqueItems = orderedItems.length;
    const totalQuantity = orderedItems.reduce((sum, item) => sum + item.orderQuantity, 0);
    const totalCost = orderedItems.reduce((sum, item: any) => sum + (Number(item.buyPrice || 0) * Number(item.orderQuantity || 0)), 0);

    doc.setFont("helvetica", "bold");
    doc.text(`${supplierName} - Siparis Listesi`, 105, 15, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 10, 25);

    const tableData = orderedItems.map(item => [
      item.name,
      `${item.marka || ''} ${item.model || ''}`,
      `${item.renk || ''} / ${item.beden || ''}`,
      item.stokKodu,
      item.stock.toString(),
      item.orderQuantity.toString()
    ]);

    (doc as any).autoTable({
      startY: 30,
      head: [['Urun Adi', 'Marka/Model', 'Renk/Beden', 'Stok Kodu', 'Kalan Stok', 'Siparis Adedi']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [14, 165, 233] }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text(`Toplam Urun Cesidi: ${totalUniqueItems} kalem`, 10, finalY);
    doc.text(`Toplam Urun Adedi: ${totalQuantity} adet`, 10, finalY + 7);
    doc.setFont("helvetica", "bold");
    doc.text(`SIPARIS TOPLAMI: ${totalCost.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}`, 10, finalY + 15);

    doc.save(`${supplierName}-siparis-listesi.pdf`);
  };

  const generateCsv = (supplierName: string, items: Product[]) => {
      const orderedItems = getOrderedItems(items);
      if(orderedItems.length === 0) {
        alert("Lütfen en az bir ürün için sipariş adedi girin.");
        return;
      }
      const totalUniqueItems = orderedItems.length;
      const totalQuantity = orderedItems.reduce((sum, item) => sum + item.orderQuantity, 0);
      const totalCost = orderedItems.reduce((sum, item) => sum + (item.buyPrice * item.orderQuantity), 0);
      
      const headers = ["Ürün Adı", "Model", "Stok Kodu", "Barkod", "Kalan Stok", "Sipariş Adedi"];
      const rows = orderedItems.map(item => [item.name, item.model, item.stokKodu, item.barcode, item.stock, item.orderQuantity]);
      let csvContent = [headers, ...rows].map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}`).join(";")).join("\n");
      
      csvContent += `\n\n`;
      csvContent += `;;;;Toplam Ürün Çeşidi:;${totalUniqueItems} kalem\n`;
      csvContent += `;;;;Toplam Ürün Adedi:;${totalQuantity} adet\n`;
      csvContent += `;;;;Sipariş Toplam Tutarı:;"${totalCost.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}"\n`;

      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // BOM for UTF-8
      const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${supplierName}-siparis-listesi.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const generatePrintableHtml = (supplierName: string, items: Product[]) => {
      const orderedItems = getOrderedItems(items);
      if(orderedItems.length === 0) {
        alert("Lütfen en az bir ürün için sipariş adedi girin.");
        return '';
      }
      const totalUniqueItems = orderedItems.length;
      const totalQuantity = orderedItems.reduce((sum, item) => sum + item.orderQuantity, 0);
      const totalCost = orderedItems.reduce((sum, item) => sum + (item.buyPrice * item.orderQuantity), 0);

      const itemsHtml = orderedItems.map(item => `
          <tr>
              <td>${item.name}</td>
              <td>${item.model}</td>
              <td>${item.stokKodu}</td>
              <td style="text-align: right;">${item.stock}</td>
              <td style="text-align: right; font-weight: bold;">${item.orderQuantity}</td>
          </tr>
      `).join('');

      const summaryHtml = `
        <tfoot>
            <tr>
                <td colspan="4" style="text-align: right; font-weight: bold; padding-top: 15px;">Toplam Ürün Çeşidi:</td>
                <td style="text-align: right; font-weight: bold; padding-top: 15px;">${totalUniqueItems} kalem</td>
            </tr>
            <tr>
                <td colspan="4" style="text-align: right; font-weight: bold;">Toplam Ürün Adedi:</td>
                <td style="text-align: right; font-weight: bold;">${totalQuantity} adet</td>
            </tr>
            <tr>
                <td colspan="4" style="text-align: right; font-weight: bold; font-size: 1.1em; padding-top: 5px;">SİPARİŞ TOPLAMI:</td>
                <td style="text-align: right; font-weight: bold; font-size: 1.1em; padding-top: 5px;">${totalCost.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
            </tr>
        </tfoot>
    `;

      return `
          <html><head><title>${supplierName} - Sipariş Listesi</title>
          <style>
              body { font-family: sans-serif; margin: 2rem; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; }
              th { background-color: #f2f2f2; text-align: left; }
              h1 { text-align: center; }
              tfoot td { border: none; }
          </style>
          </head><body>
          <h1>${supplierName} - Sipariş Listesi</h1>
          <p>Tarih: ${new Date().toLocaleDateString('tr-TR')}</p>
          <table><thead><tr><th>Ürün Adı</th><th>Model</th><th>Stok Kodu</th><th style="text-align: right;">Kalan Stok</th><th style="text-align: right;">Sipariş Adedi</th></tr></thead><tbody>${itemsHtml}</tbody>${summaryHtml}</table>
          </body></html>
      `;
  };

  const printList = (supplierName: string, items: Product[]) => {
      const html = generatePrintableHtml(supplierName, items);
      if (!html) return;
      const printWindow = window.open('', '_blank');
      printWindow?.document.write(html);
      printWindow?.document.close();
      printWindow?.print();
  };

  const downloadAsSvg = (supplierName: string, items: Product[]) => {
    const orderedItems = getOrderedItems(items);
    if(orderedItems.length === 0) {
      alert("Lütfen en az bir ürün için sipariş adedi girin.");
      return;
    }
    const totalUniqueItems = orderedItems.length;
    const totalQuantity = orderedItems.reduce((sum, item) => sum + item.orderQuantity, 0);
    const totalCost = orderedItems.reduce((sum, item) => sum + (item.buyPrice * item.orderQuantity), 0);

    const rowHeight = 25;
    const headerHeight = 40;
    const summaryHeight = 60;
    const width = 800;
    const height = headerHeight + orderedItems.length * rowHeight + summaryHeight + 20;

    const itemsSvg = orderedItems.map((item, index) => `
        <text x="10" y="${headerHeight + (index * rowHeight) + 18}" font-size="12" fill="#333">${item.name}</text>
        <text x="300" y="${headerHeight + (index * rowHeight) + 18}" font-size="12" fill="#333">${item.model}</text>
        <text x="450" y="${headerHeight + (index * rowHeight) + 18}" font-size="12" fill="#333">${item.stokKodu}</text>
        <text x="650" y="${headerHeight + (index * rowHeight) + 18}" font-size="12" fill="#333" text-anchor="end">${item.stock}</text>
        <text x="780" y="${headerHeight + (index * rowHeight) + 18}" font-size="12" fill="#000" font-weight="bold" text-anchor="end">${item.orderQuantity}</text>
        <line x1="5" y1="${headerHeight + (index * rowHeight) + rowHeight/2 + 8}" x2="${width - 5}" y2="${headerHeight + (index * rowHeight) + rowHeight/2 + 8}" stroke="#eee" />
    `).join('');

    const summaryYStart = headerHeight + orderedItems.length * rowHeight + 20;

    const summarySvg = `
        <line x1="5" y1="${summaryYStart}" x2="${width - 5}" y2="${summaryYStart}" stroke="#ccc" />
        <text x="550" y="${summaryYStart + 20}" font-size="12" font-weight="bold" text-anchor="end">Toplam Ürün Çeşidi:</text>
        <text x="780" y="${summaryYStart + 20}" font-size="12" text-anchor="end">${totalUniqueItems} kalem</text>

        <text x="550" y="${summaryYStart + 35}" font-size="12" font-weight="bold" text-anchor="end">Toplam Ürün Adedi:</text>
        <text x="780" y="${summaryYStart + 35}" font-size="12" text-anchor="end">${totalQuantity} adet</text>
        
        <text x="550" y="${summaryYStart + 55}" font-size="14" font-weight="bold" text-anchor="end">Sipariş Toplam Tutarı:</text>
        <text x="780" y="${summaryYStart + 55}" font-size="14" font-weight="bold" text-anchor="end">${totalCost.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</text>
    `;

    const svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
            <rect width="100%" height="100%" fill="white"/>
            <text x="${width/2}" y="20" font-size="16" font-weight="bold" text-anchor="middle">${supplierName} - Sipariş Listesi</text>
            <rect x="5" y="${headerHeight-10}" width="${width-10}" height="${rowHeight}" fill="#f2f2f2" />
            <text x="10" y="${headerHeight+5}" font-weight="bold" font-size="12">Ürün Adı</text>
            <text x="300" y="${headerHeight+5}" font-weight="bold" font-size="12">Model</text>
            <text x="450" y="${headerHeight+5}" font-weight="bold" font-size="12">Stok Kodu</text>
            <text x="650" y="${headerHeight+5}" font-weight="bold" font-size="12" text-anchor="end">Kalan Stok</text>
            <text x="780" y="${headerHeight+5}" font-weight="bold" font-size="12" text-anchor="end">Sipariş Adedi</text>
            ${itemsSvg}
            ${summarySvg}
        </svg>
    `;

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${supplierName}-siparis-listesi.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveList = (supplier: Supplier | null, items: Product[]) => {
    const orderedItems = getOrderedItems(items);
    if (orderedItems.length === 0) {
      alert("Lütfen en az bir ürün için sipariş adedi girin.");
      return;
    }

    const totalQuantity = orderedItems.reduce((sum, item) => sum + item.orderQuantity, 0);
    const totalCost = orderedItems.reduce((sum, item) => sum + (item.buyPrice * item.orderQuantity), 0);

    const record: MissingListRecord = {
      id: `ml-${Date.now()}`,
      date: new Date().toISOString(),
      supplierId: supplier?.id || 'unknown',
      supplierName: supplier?.name || 'Tedarikçisi Belirtilmemiş',
      items: orderedItems.map(item => ({
        barcode: item.barcode,
        name: item.name,
        model: item.model,
        stokKodu: item.stokKodu,
        stock: item.stock,
        orderQuantity: item.orderQuantity
      })),
      totalQuantity,
      totalCost
    };

    onAddMissingList(record);
    alert("Eksik listesi başarıyla kaydedildi.");
  };

  const sendToEmail = (supplier: Supplier | null, items: Product[] | MissingListItem[]) => {
    const orderedItems = 'orderQuantity' in items[0] ? items as any[] : []; // Simplified check
    const isPastList = !('barcode' in items[0] && 'buyPrice' in items[0]);
    
    let listToProcess = items;
    if (!isPastList) {
        listToProcess = getOrderedItems(items as Product[]);
    }

    if (listToProcess.length === 0) {
      alert("Lütfen en az bir ürün için sipariş adedi girin.");
      return;
    }

    const supplierName = supplier?.name || 'Tedarikçi';
    const totalQuantity = listToProcess.reduce((sum, item: any) => sum + item.orderQuantity, 0);
    const totalCost = 'totalCost' in (items as any) ? (items as any).totalCost : listToProcess.reduce((sum, item: any) => sum + (Number(item.buyPrice || 0) * Number(item.orderQuantity || 0)), 0);

    const subject = `${supplierName} - Sipariş Listesi (${new Date().toLocaleDateString('tr-TR')})`;
    const body = `Merhaba ${supplierName},\n\nAşağıdaki ürünler için sipariş vermek istiyoruz:\n\n` +
      `${listToProcess.map((p: any) => `- ${p.name} [${p.marka || ''} ${p.model || ''}] (${p.renk || ''} / ${p.beden || ''}) - Kod: ${p.stokKodu || ''}: ${p.orderQuantity} adet`).join('\n')}\n\n` +
      `Toplam: ${totalQuantity} adet ürün\n\n` +
      `Teşekkürler.`;

    const mailtoUrl = `mailto:${supplier?.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  const sendToWhatsApp = (supplier: Supplier | null, items: Product[] | MissingListItem[]) => {
      const isPastList = !('barcode' in items[0] && 'buyPrice' in items[0]);
      let listToProcess = items;
      if (!isPastList) {
          listToProcess = getOrderedItems(items as Product[]);
      }

      if(listToProcess.length === 0) {
        alert("Lütfen en az bir ürün için sipariş adedi girin.");
        return;
      }
      if (!supplier || !supplier.whatsapp) {
          alert("Bu tedarikçi için kayıtlı bir WhatsApp numarası bulunmuyor.");
          return;
      }

      const totalQuantity = listToProcess.reduce((sum, item: any) => sum + item.orderQuantity, 0);

      const message = `Merhaba ${supplier.name},\n\nAşağıdaki ürünler için sipariş vermek istiyoruz:\n\n` +
        `${listToProcess.map((p: any) => `- ${p.name} [${p.marka || ''} ${p.model || ''}] (${p.renk || ''} / ${p.beden || ''}) - Kod: ${p.stokKodu || ''}: ${p.orderQuantity} adet`).join('\n')}\n\n` +
        `*Toplam:* ${totalQuantity} adet ürün\n\n` +
        `Teşekkürler.`;
        
      let phone = supplier.whatsapp.replace(/\D/g, '');
      if (phone.length === 10 && phone.startsWith('5')) {
          phone = '90' + phone;
      } else if (phone.length === 11 && phone.startsWith('05')) {
          phone = '90' + phone.substring(1);
      }

      const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
  };


  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
        >
            <header className="p-5 border-b flex justify-between items-center flex-shrink-0 bg-slate-50/80">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                    <Icon name="list-bullet" className="w-7 h-7 text-amber-500" /> Eksik Ürün Listesi ve Sipariş
                </h2>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-2 rounded-full -mr-2">
                     <Icon name="x-circle" className="w-7 h-7" />
                </button>
            </header>
            <main className="flex-grow overflow-y-auto bg-slate-100 flex flex-col">
                <div className="bg-white border-b sticky top-0 z-20">
                    <div className="flex border-b">
                        <button 
                            onClick={() => setActiveTab('current')}
                            className={`flex-1 py-3 font-bold text-sm transition-colors ${activeTab === 'current' ? 'text-cyan-600 border-b-2 border-cyan-600 bg-cyan-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            Güncel Eksik Listesi
                        </button>
                        <button 
                            onClick={() => setActiveTab('past')}
                            className={`flex-1 py-3 font-bold text-sm transition-colors ${activeTab === 'past' ? 'text-cyan-600 border-b-2 border-cyan-600 bg-cyan-50/30' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            Geçmiş Listeler
                        </button>
                    </div>
                    <div className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-grow">
                            <div className="flex-grow max-w-xs">
                                <label htmlFor="supplier-filter" className="block text-xs font-medium text-slate-500 mb-1 uppercase">
                                    Tedarikçi
                                </label>
                                <select
                                    id="supplier-filter"
                                    value={selectedSupplierId}
                                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                >
                                    <option value="all">Tüm Tedarikçiler</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                    <option value="unknown">Tedarikçisi Belirtilmemiş</option>
                                </select>
                            </div>
                            {activeTab === 'past' && (
                                <div className="w-48">
                                    <label htmlFor="date-filter" className="block text-xs font-medium text-slate-500 mb-1 uppercase">
                                        Tarih
                                    </label>
                                    <input 
                                        type="date" 
                                        id="date-filter"
                                        value={dateFilter}
                                        onChange={(e) => setDateFilter(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    />
                                </div>
                            )}
                        </div>
                        {activeTab === 'current' && (
                            <button 
                                onClick={handleAiGenerate}
                                disabled={isAiLoading}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
                                    isAiLoading 
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                                    : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg hover:scale-105 active:scale-95'
                                }`}
                            >
                                {isAiLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                        Analiz Ediliyor...
                                    </>
                                ) : (
                                    <>
                                        <Icon name="ai" className="w-5 h-5" />
                                        AI ile Öneri Al
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                <div className="p-6 flex-grow">
                    {activeTab === 'current' ? (
                        filteredSupplierGroups.length === 0 ? (
                            <div className="text-center text-slate-500 py-16 bg-white rounded-xl border border-dashed border-slate-300">
                                <Icon name="list-bullet" className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <p className="font-semibold text-lg">Kritik stok seviyesinde ürün bulunmuyor.</p>
                                <p className="text-sm">Tüm ürünlerinizin stok seviyesi yeterli görünüyor.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredSupplierGroups.map(({ supplier, products: missingItems }) => {
                                    const supplierId = supplier?.id || 'unknown';
                                    const isExpanded = expandedSuppliers.has(supplierId);
                                    const supplierName = supplier?.name || 'Tedarikçisi Belirtilmemiş';
                                    
                                    const orderedItems = getOrderedItems(missingItems);
                                    const totalUniqueItems = orderedItems.length;
                                    const totalQuantity = orderedItems.reduce((sum, item) => sum + Number(item.orderQuantity || 0), 0);
                                    const totalCost = orderedItems.reduce((sum, item: any) => sum + (Number(item.buyPrice || 0) * Number(item.orderQuantity || 0)), 0);

                                    return (
                                        <div key={supplierId} className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                                            <button onClick={() => toggleSupplier(supplierId)} className="w-full flex justify-between items-center p-4 text-left hover:bg-slate-50 transition">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold">
                                                        {supplierName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800">{supplierName}</div>
                                                        <div className="text-xs text-slate-500">{missingItems.length} kritik stoklu ürün</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {totalQuantity > 0 && (
                                                        <span className="bg-cyan-100 text-cyan-700 text-xs font-bold px-2 py-1 rounded-full">
                                                            {totalQuantity} Adet Sipariş Hazır
                                                        </span>
                                                    )}
                                                    <Icon name="arrows-vertical" className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                </div>
                                            </button>
                                            {isExpanded && (
                                                <div className="p-4 border-t border-slate-100 bg-slate-50/30">
                                                    <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
                                                        <table className="w-full text-sm">
                                                            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold">
                                                                <tr>
                                                                    <th className="px-4 py-3 text-left">Ürün Bilgisi</th>
                                                                    <th className="px-4 py-3 text-left">Stok Kodu / Barkod</th>
                                                                    <th className="px-4 py-3 text-right">Kalan</th>
                                                                    <th className="px-4 py-3 text-center w-48">Sipariş Adedi</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100">
                                                                {missingItems.map(item => (
                                                                    <tr key={item.barcode} className="hover:bg-slate-50/50">
                                                                        <td className="px-4 py-3">
                                                                            <div className="font-semibold text-slate-700">{item.name}</div>
                                                                            <div className="text-xs text-slate-500">{item.marka} {item.model} - {item.renk} / {item.beden}</div>
                                                                        </td>
                                                                        <td className="px-4 py-3">
                                                                            <div className="text-slate-600">{item.stokKodu}</div>
                                                                            <div className="text-[10px] font-mono text-slate-400">{item.barcode}</div>
                                                                        </td>
                                                                        <td className="px-4 py-3 text-right">
                                                                            <span className={`font-bold ${item.stock <= 5 ? 'text-red-600' : 'text-amber-600'}`}>
                                                                                {item.stock}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-3">
                                                                            <div className="flex flex-col items-center gap-1">
                                                                                <div className="flex items-center justify-center gap-1">
                                                                                    <input 
                                                                                        type="text" 
                                                                                        value={orderQuantities[item.barcode] || ''}
                                                                                        onChange={(e) => handleQuantityChange(item.barcode, e.target.value)}
                                                                                        className="w-14 text-center font-bold border border-slate-200 rounded-md py-1.5 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                                                                                        placeholder="0"
                                                                                    />
                                                                                    <button onClick={() => handleQuantityIncrement(item.barcode, 6)} className="btn-qty" title="Yarım Düzine">+6</button>
                                                                                    <button onClick={() => handleQuantityIncrement(item.barcode, 12)} className="btn-qty" title="Düzine">+12</button>
                                                                                </div>
                                                                                {aiReasons[item.barcode] && (
                                                                                    <span className="text-[10px] text-purple-600 font-medium bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 italic">
                                                                                        {aiReasons[item.barcode]}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                    <div className="mt-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                                                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm min-w-[200px]">
                                                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Sipariş Özeti</h4>
                                                            <div className="space-y-1 text-sm">
                                                                <div className="flex justify-between gap-4">
                                                                    <span className="text-slate-500">Çeşit:</span>
                                                                    <span className="font-bold">{totalUniqueItems} kalem</span>
                                                                </div>
                                                                <div className="flex justify-between gap-4">
                                                                    <span className="text-slate-500">Adet:</span>
                                                                    <span className="font-bold">{totalQuantity} adet</span>
                                                                </div>
                                                                <div className="flex justify-between gap-4 pt-1 border-t">
                                                                    <span className="font-bold text-slate-700">Toplam:</span>
                                                                    <span className="font-bold text-cyan-600">{totalCost.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap justify-end gap-2">
                                                            <button onClick={() => handleSaveList(supplier, missingItems)} className="btn-action bg-cyan-600 text-white hover:bg-cyan-700">
                                                                <Icon name="database" className="w-4 h-4" /> Kaydet
                                                            </button>
                                                            <button onClick={() => generateExcel(supplierName, missingItems)} className="btn-action bg-emerald-600 text-white hover:bg-emerald-700">
                                                                <Icon name="excel" className="w-4 h-4" /> Excel
                                                            </button>
                                                            <button onClick={() => generatePdf(supplierName, missingItems)} className="btn-action bg-rose-600 text-white hover:bg-rose-700">
                                                                <Icon name="pdf" className="w-4 h-4" /> PDF
                                                            </button>
                                                            <button onClick={() => sendToWhatsApp(supplier, missingItems)} disabled={!supplier?.whatsapp} className="btn-action bg-green-600 text-white hover:bg-green-700 disabled:bg-slate-300">
                                                                <Icon name="whatsapp" className="w-4 h-4" /> WhatsApp
                                                            </button>
                                                            <button onClick={() => sendToEmail(supplier, missingItems)} className="btn-action bg-sky-600 text-white hover:bg-sky-700">
                                                                <Icon name="logout" className="w-4 h-4" /> E-Posta
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredPastLists.length === 0 ? (
                                <div className="col-span-full text-center text-slate-500 py-16 bg-white rounded-xl border border-dashed border-slate-300">
                                    <Icon name="refresh" className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                    <p className="font-semibold text-lg">Geçmiş liste bulunamadı.</p>
                                    <p className="text-sm">Henüz kaydedilmiş bir eksik listesi yok.</p>
                                </div>
                            ) : (
                                filteredPastLists.map(list => (
                                    <div 
                                        key={list.id} 
                                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                                        onClick={() => setSelectedPastList(list)}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-cyan-100 group-hover:text-cyan-600 transition-colors">
                                                <Icon name="list-bullet" className="w-6 h-6" />
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded">
                                                {new Date(list.date).toLocaleDateString('tr-TR')}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-slate-800 mb-1 truncate">{list.supplierName}</h3>
                                        <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                                            <span>{list.items.length} Kalem</span>
                                            <span>{list.totalQuantity} Adet</span>
                                        </div>
                                        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                            <span className="font-bold text-cyan-600">{list.totalCost.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                                            <button className="text-cyan-600 hover:text-cyan-700 font-bold text-xs flex items-center gap-1">
                                                Detaylar <Icon name="arrows-vertical" className="w-3 h-3 rotate-90" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </main>

            {selectedPastList && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setSelectedPastList(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <header className="p-5 border-b flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">{selectedPastList.supplierName}</h3>
                                <p className="text-sm text-slate-500">{new Date(selectedPastList.date).toLocaleString('tr-TR')}</p>
                            </div>
                            <button onClick={() => setSelectedPastList(null)} className="text-slate-400 hover:text-slate-700 p-2 rounded-full">
                                <Icon name="x-circle" className="w-7 h-7" />
                            </button>
                        </header>
                        <div className="flex-grow overflow-y-auto p-6">
                            <table className="w-full text-sm">
                                <thead className="text-slate-500 text-xs uppercase border-b">
                                    <tr>
                                        <th className="pb-3 text-left">Ürün</th>
                                        <th className="pb-3 text-left">Kod</th>
                                        <th className="pb-3 text-right">Sipariş</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {selectedPastList.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="py-3">
                                                <div className="font-semibold text-slate-700">{item.name}</div>
                                                <div className="text-xs text-slate-400">{item.model}</div>
                                            </td>
                                            <td className="py-3 font-mono text-xs text-slate-500">{item.stokKodu}</td>
                                            <td className="py-3 text-right font-bold text-slate-700">{item.orderQuantity}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <footer className="p-5 border-t bg-slate-50 flex justify-between items-center">
                            <div className="text-sm">
                                <span className="text-slate-500">Toplam:</span>
                                <span className="ml-2 font-bold text-lg text-cyan-600">{selectedPastList.totalCost.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => sendToWhatsApp(suppliers.find(s => s.id === selectedPastList.supplierId) || null, selectedPastList.items)} 
                                    className="btn-action bg-green-600 text-white"
                                >
                                    <Icon name="whatsapp" className="w-4 h-4" /> WhatsApp
                                </button>
                                <button 
                                    onClick={() => sendToEmail(suppliers.find(s => s.id === selectedPastList.supplierId) || null, selectedPastList.items)} 
                                    className="btn-action bg-sky-600 text-white"
                                >
                                    <Icon name="logout" className="w-4 h-4" /> E-Posta
                                </button>
                            </div>
                        </footer>
                    </div>
                </div>
            )}
             <footer className="p-4 border-t flex justify-end gap-4 flex-shrink-0 bg-slate-50 rounded-b-xl">
                <button type="button" onClick={onClose} className="bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold py-2 px-6 rounded-lg transition">Kapat</button>
            </footer>
        </div>
         <style>{`
            @keyframes fade-in-up {
                from { opacity: 0; transform: translateY(20px) scale(0.98); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .animate-fade-in-up {
                animation: fade-in-up 0.3s ease-out forwards;
            }
            .btn-export {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 1rem;
                font-size: 0.875rem;
                font-weight: 600;
                border-radius: 0.5rem;
                background-color: #e2e8f0;
                color: #475569;
                transition: background-color 0.2s;
            }
            .btn-export:hover {
                background-color: #cbd5e1;
            }
            .btn-qty {
                background-color: #f1f5f9;
                border: 1px solid #e2e8f0;
                color: #475569;
                font-size: 0.75rem;
                font-weight: 600;
                border-radius: 0.375rem;
                padding: 0.25rem 0.5rem;
                transition: all 0.2s;
            }
            .btn-qty:hover {
                background-color: #e2e8f0;
                border-color: #cbd5e1;
            }
            .btn-action {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 1rem;
                font-size: 0.75rem;
                font-weight: 700;
                border-radius: 0.5rem;
                transition: all 0.2s;
                text-transform: uppercase;
                letter-spacing: 0.025em;
            }
            .btn-action:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            }
            .btn-action:active {
                transform: translateY(0);
            }
        `}</style>
    </div>
  );
};

export default MissingListModal;