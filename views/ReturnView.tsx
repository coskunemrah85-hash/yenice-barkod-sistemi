

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Product, ReturnItem, ReturnRecord, CompanyInfo } from '../types';
import Icon from '../components/Icon';
import { playErrorSound } from '../services/soundService';

interface ReturnViewProps {
  products: Product[];
  onReturnComplete: (record: ReturnRecord) => void;
  companyInfo: CompanyInfo;
  currentReturn: ReturnItem[];
  setCurrentReturn: React.Dispatch<React.SetStateAction<ReturnItem[]>>;
}

const generateReturnReceiptHtml = (returnItems: ReturnItem[], total: number, companyName: string): string => {
  const date = new Date();
  const totalItems = returnItems.reduce((sum, item) => sum + item.quantity, 0);

  const itemsHtml = returnItems.map(item => `
    <tr>
      <td>${item.name}</td>
      <td class="qty">${item.quantity}</td>
      <td class="price">${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>İade Fişi - ${companyName}</title>
        <style>
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 300px;
            margin: 0 auto;
            padding-top: 80px;
            font-size: 12px;
            color: #000;
            background: #f8fafc;
          }
          .receipt-body {
             background: #fff;
             padding: 10px;
             width: 280px;
             margin: 0 auto;
             box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .print-controls {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            background: #f1f5f9;
            padding: 15px 0;
            text-align: center;
            border-bottom: 1px solid #e2e8f0;
            z-index: 100;
          }
          .print-button {
            background-color: #e11d48; /* Rose color */
            color: white;
            font-weight: bold;
            padding: 10px 24px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          }
          .print-button:hover {
            background-color: #be123c;
          }
          h2 { text-align: center; font-size: 16px; font-weight: bold; margin: 10px 0 5px 0; }
          p { margin: 0; line-height: 1.4; }
          .header-p { text-align: center; font-size: 12px; margin-bottom: 5px; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .date-time { display: flex; justify-content: space-between; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { text-align: left; padding: 2px 0; vertical-align: top; }
          th { border-bottom: 1px solid #000; font-weight: bold; }
          .qty { text-align: center; width: 40px; }
          .price { text-align: right; width: 70px; }
          .summary p { display: flex; justify-content: space-between; }
          .summary .total { font-weight: bold; font-size: 14px; margin-top: 5px; }
          .footer-text { text-align: center; margin-top: 10px; font-size: 11px; }
          @media print {
            body { padding-top: 0; background: #fff; }
             .receipt-body { box-shadow: none; padding: 0; margin: 5mm; width: 280px; }
            .print-controls { display: none; }
            @page { margin: 0; size: 80mm auto; }
          }
        </style>
      </head>
      <body>
        <div class="print-controls">
          <button class="print-button" onclick="window.print()">YAZDIR</button>
        </div>
        <div class="receipt-body">
            <h2>${companyName}</h2>
            <p class="header-p">Ürün İade Fişi</p>
            <div class="divider"></div>
            <p class="date-time">
              <span>Tarih: ${date.toLocaleDateString('tr-TR')}</span>
              <span>Saat: ${date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
            </p>
            <div class="divider"></div>
            <table>
              <thead>
                <tr>
                  <th>Ürün</th>
                  <th class="qty">Adet</th>
                  <th class="price">Fiyat</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            <div class="divider"></div>
            <div class="summary">
              <p>
                <span>Toplam İade Ürün:</span>
                <span>${totalItems}</span>
              </p>
              <p class="total">
                <span>TOPLAM İADE:</span>
                <span>${total.toFixed(2)} ₺</span>
              </p>
            </div>
            <div class="divider"></div>
            <p class="footer-text">İyi günler dileriz.</p>
        </div>
      </body>
    </html>
  `;
};


const allColumns = [
  { id: 'name', label: 'Stok Adı', minWidth: 200 },
  { id: 'barcode', label: 'Barkod', minWidth: 140 },
  { id: 'quantity', label: 'Miktar', minWidth: 120, align: 'center' as const },
  { id: 'stock', label: 'Stok (İade Sonrası)', minWidth: 140, align: 'right' as const },
  { id: 'price', label: 'Fiyat', minWidth: 100, align: 'right' as const },
  { id: 'total', label: 'Toplam', minWidth: 120, align: 'right' as const },
  { id: 'stokKodu', label: 'Stok Kodu', minWidth: 120 },
  { id: 'marka', label: 'Marka', minWidth: 100 },
  { id: 'model', label: 'Model', minWidth: 100 },
  { id: 'renk', label: 'Renk', minWidth: 80 },
  { id: 'beden', label: 'Beden', minWidth: 80 },
  { id: 'anaStokKodu', label: 'Ana Stok Kodu', minWidth: 130 },
  { id: 'actions', label: '', minWidth: 50, align: 'center' as const },
];

const COLUMN_WIDTHS_KEY = 'yenice_return_view_column_widths';
const HIDDEN_COLUMNS_KEY = 'yenice_return_view_hidden_columns';
const COLUMN_ORDER_KEY = 'yenice_return_view_column_order';

const ReturnView: React.FC<ReturnViewProps> = ({ products, onReturnComplete, companyInfo, currentReturn, setCurrentReturn }) => {
  const [barcode, setBarcode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [expandedSearchResult, setExpandedSearchResult] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const defaultWidths = { name: 300, barcode: 150, quantity: 120, stock: 150, price: 120, total: 120, stokKodu: 130, marka: 110, model: 110, renk: 90, beden: 90, anaStokKodu: 140, actions: 60 };
  const defaultHidden = new Set(['stokKodu', 'marka', 'model', 'renk', 'beden', 'anaStokKodu', 'stock']);
  const defaultOrder = allColumns.map(c => c.id);

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
      try {
          const savedWidths = localStorage.getItem(COLUMN_WIDTHS_KEY);
          return savedWidths ? { ...defaultWidths, ...JSON.parse(savedWidths) } : defaultWidths;
      } catch (e) { return defaultWidths; }
  });

  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(() => {
      try {
          const savedHidden = localStorage.getItem(HIDDEN_COLUMNS_KEY);
          return savedHidden ? new Set(JSON.parse(savedHidden)) : defaultHidden;
      } catch (e) { return defaultHidden; }
  });

  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    try {
        const savedOrder = localStorage.getItem(COLUMN_ORDER_KEY);
        if (savedOrder) {
            const parsedOrder = JSON.parse(savedOrder);
            if (defaultOrder.every(id => parsedOrder.includes(id))) {
                return parsedOrder;
            }
        }
        return defaultOrder;
    } catch (e) {
        return defaultOrder;
    }
  });

  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const isResizing = useRef<string | null>(null);
  const draggedColumn = useRef<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const columnManagerRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  useEffect(() => {
    try { localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(columnWidths)); } catch (e) { console.error("Failed to save column widths", e); }
  }, [columnWidths]);

  useEffect(() => {
    try { localStorage.setItem(HIDDEN_COLUMNS_KEY, JSON.stringify(Array.from(hiddenColumns))); } catch (e) { console.error("Failed to save hidden columns", e); }
  }, [hiddenColumns]);

  useEffect(() => {
    try { localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(columnOrder)); } catch (e) { console.error("Failed to save column order", e); }
  }, [columnOrder]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnManagerRef.current && !columnManagerRef.current.contains(event.target as Node)) {
        setIsColumnManagerOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchQuery('');
        setExpandedSearchResult(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => { document.removeEventListener("mousedown", handleClickOutside); };
  }, []);

  const showError = useCallback((message: string) => {
      setError(message);
      playErrorSound();
      setTimeout(() => setError(null), 3000);
  }, []);

  const cancelReturn = () => {
    setCurrentReturn([]);
    setError(null);
    setBarcode('');
    setSearchQuery('');
    barcodeInputRef.current?.focus();
  };

  const addProductToReturn = useCallback((product: Product, quantityToAdd: number = 1) => {
    setError(null);
    setCurrentReturn(prevReturn => {
        const existingItem = prevReturn.find(item => item.barcode === product.barcode);
        if (existingItem) {
          return prevReturn.map(item =>
            item.barcode === product.barcode ? { ...item, quantity: item.quantity + quantityToAdd } : item
          );
        } else {
          return [...prevReturn, { ...product, quantity: quantityToAdd }];
        }
    });

    setBarcode('');
    setSearchQuery('');
    setExpandedSearchResult(null);
    barcodeInputRef.current?.focus();
  }, [setCurrentReturn]);

  const processBarcode = useCallback((barcodeToProcess: string) => {
    if (!barcodeToProcess.trim()) return;

    let quantity = 1;
    let actualBarcode = barcodeToProcess.trim();

    if (actualBarcode.includes('*')) {
      const parts = actualBarcode.split('*');
      const potentialQuantity = parseInt(parts[0].trim(), 10);
      if (!isNaN(potentialQuantity) && potentialQuantity > 0 && parts.length === 2 && parts[1].trim()) {
        quantity = potentialQuantity;
        actualBarcode = parts[1].trim();
      } else {
        showError('Geçersiz format. "Adet * Barkod" şeklinde girin.');
        return;
      }
    }

    const product = products.find(p => p.barcode === actualBarcode);

    if (product) {
      addProductToReturn(product, quantity);
    } else {
      showError('Ürün bulunamadı. Lütfen barkodu kontrol edin.');
    }
  }, [products, addProductToReturn, showError]);

  const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBarcode = e.target.value;
    setBarcode(newBarcode);

    const trimmedBarcode = newBarcode.trim();
    // Auto-process if it looks like a complete, single barcode (e.g., from a scanner)
    if (!trimmedBarcode.includes('*') && /^\d{12,13}$/.test(trimmedBarcode)) {
        if (products.some(p => p.barcode === trimmedBarcode)) {
             processBarcode(trimmedBarcode);
        }
    }
  };
  
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processBarcode(barcode);
  };
  
  const updateQuantity = (barcode: string, delta: number) => {
    const newQuantity = (currentReturn.find(item => item.barcode === barcode)?.quantity || 0) + delta;
    if (newQuantity <= 0) {
        removeItem(barcode);
    } else {
        setCurrentReturn(currentReturn.map(item => item.barcode === barcode ? { ...item, quantity: newQuantity } : item));
    }
  };
  
  const removeItem = (barcode: string) => {
      setCurrentReturn(currentReturn.filter(item => item.barcode !== barcode));
  };

  const total = currentReturn.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCompleteReturn = () => {
    if (currentReturn.length === 0) return;
    const newRecord: ReturnRecord = {
      id: `return-${Date.now()}`,
      items: currentReturn,
      total: total,
      date: new Date().toISOString(),
    };
    onReturnComplete(newRecord);
    setCurrentReturn([]);
    setBarcode('');
    setSearchQuery('');
    barcodeInputRef.current?.focus();
  };

  const handlePrintReceipt = () => {
    if (currentReturn.length === 0) {
        showError("Yazdırmak için listede ürün olmalıdır.");
        return;
    }
    const receiptHtml = generateReturnReceiptHtml(currentReturn, total, companyInfo.name);
    const printWindow = window.open('', '_blank', 'height=800,width=500,scrollbars=yes,resizable=yes');
    if (printWindow) {
      printWindow.document.write(receiptHtml);
      printWindow.document.close();
      printWindow.focus();
    } else {
      showError("Yazdırma penceresi açılamadı. Lütfen pop-up engelleyicinizi kontrol edin.");
    }
  };

  const searchResultGroups = useMemo(() => {
    if (searchQuery.length < 2) return [];
    const lowerCaseQuery = searchQuery.toLowerCase();
    const groups = new Map<string, Product[]>();
    products.forEach(product => {
      if (product.name.toLowerCase().includes(lowerCaseQuery) || product.barcode.includes(lowerCaseQuery) || product.stokKodu.toLowerCase().includes(lowerCaseQuery) || product.anaStokKodu.toLowerCase().includes(lowerCaseQuery)) {
        if (!groups.has(product.anaStokKodu)) groups.set(product.anaStokKodu, []);
        groups.get(product.anaStokKodu)!.push(product);
      }
    });
    return Array.from(groups.values());
  }, [searchQuery, products]);

  const navigableItems = useMemo(() => {
    const items: Array<{ type: 'group' | 'variant'; product: Product; }> = [];
    searchResultGroups.forEach((group) => {
        items.push({ type: 'group', product: group[0] });
        if (group.length > 1 && expandedSearchResult === group[0].anaStokKodu) {
            group.forEach(variant => items.push({ type: 'variant', product: variant }));
        }
    });
    return items;
  }, [searchResultGroups, expandedSearchResult]);

  useEffect(() => { setHighlightedIndex(-1); }, [searchQuery, expandedSearchResult]);

  useEffect(() => {
    const highlightedElement = searchResultsRef.current?.querySelector('.search-item-highlighted');
    if (highlightedElement) highlightedElement.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (navigableItems.length === 0) return;
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev => (prev + 1) % navigableItems.length);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => (prev - 1 + navigableItems.length) % navigableItems.length);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < navigableItems.length) {
            const item = navigableItems[highlightedIndex];
            const group = searchResultGroups.find(g => g[0].anaStokKodu === item.product.anaStokKodu);
            if (!group) return;
            if (item.type === 'group') {
                if (group.length > 1) {
                    setExpandedSearchResult(prev => prev === item.product.anaStokKodu ? null : item.product.anaStokKodu);
                } else {
                    addProductToReturn(item.product);
                }
            } else if (item.type === 'variant') {
                addProductToReturn(item.product);
            }
        }
    } else if (e.key === 'Escape') {
        e.preventDefault();
        setSearchQuery('');
        setExpandedSearchResult(null);
    }
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const thElement = (e.target as HTMLElement).closest('th');
    if (!thElement) return;

    isResizing.current = columnId;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const startX = e.clientX;
    const startWidth = thElement.offsetWidth;
    const minWidth = allColumns.find(c => c.id === columnId)?.minWidth || 50;

    const handleMouseMove = (event: MouseEvent) => {
        const newWidth = startWidth + (event.clientX - startX);
        if (isResizing.current === columnId) {
            setColumnWidths(prev => ({
                ...prev,
                [columnId]: Math.max(newWidth, minWidth),
            }));
        }
    };

    const handleMouseUp = () => {
        isResizing.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const toggleColumn = (columnId: string) => {
      setHiddenColumns(prev => {
          const newSet = new Set(prev);
          if (newSet.has(columnId)) newSet.delete(columnId);
          else newSet.add(columnId);
          return newSet;
      });
  };

  const orderedColumns = useMemo(() => {
    const currentOrder = [...columnOrder];
    defaultOrder.forEach(id => {
        if (!currentOrder.includes(id)) {
            currentOrder.push(id);
        }
    });
    return allColumns.slice().sort((a, b) => currentOrder.indexOf(a.id) - currentOrder.indexOf(b.id));
  }, [columnOrder]);

  const visibleColumns = useMemo(() => orderedColumns.filter(c => !hiddenColumns.has(c.id)), [orderedColumns, hiddenColumns]);

  const handleDragStart = (e: React.DragEvent<HTMLTableHeaderCellElement>, columnId: string) => {
    draggedColumn.current = columnId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', columnId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableHeaderCellElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLTableHeaderCellElement>, targetColumnId: string) => {
    e.preventDefault();
    const sourceColumnId = draggedColumn.current;
    if (!sourceColumnId || sourceColumnId === targetColumnId) {
        return;
    }
    const newOrder = [...columnOrder];
    const sourceIndex = newOrder.indexOf(sourceColumnId);
    const targetIndex = newOrder.indexOf(targetColumnId);
    if (sourceIndex > -1 && targetIndex > -1) {
        const [movedItem] = newOrder.splice(sourceIndex, 1);
        newOrder.splice(targetIndex, 0, movedItem);
        setColumnOrder(newOrder);
    }
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    draggedColumn.current = null;
    setDragOverColumn(null);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLTableHeaderCellElement>, columnId: string) => {
    if (draggedColumn.current && draggedColumn.current !== columnId) {
        setDragOverColumn(columnId);
    }
  };


  return (
    <div className="w-full h-full flex flex-col gap-4">
        <style>{`
            .drag-over-indicator-return::before {
                content: '';
                position: absolute;
                top: 10%;
                left: -2px;
                width: 4px;
                height: 80%;
                background-color: #e11d48;
                border-radius: 4px;
            }
        `}</style>
        <div className="flex-grow flex flex-col bg-white border border-slate-200/80 rounded-lg shadow-lg">
            <div className="p-4 border-b border-slate-200 flex-shrink-0 bg-rose-50/60">
                <div className="flex items-start gap-4">
                    <form onSubmit={handleBarcodeSubmit} className="relative flex-grow">
                        <Icon name="barcode" className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400"/>
                        <input
                          ref={barcodeInputRef}
                          type="text"
                          value={barcode}
                          onChange={handleBarcodeChange}
                          placeholder="İade barkodu okutun (Örn: 10 * 12345...)"
                          className="w-full h-14 bg-white border-2 border-slate-300 rounded-lg pl-14 pr-4 text-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
                        />
                    </form>
                    <div className="relative flex-grow" ref={searchContainerRef}>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            placeholder="Ürün adı, model, stok kodu ile ara..."
                            className="w-full h-14 bg-white border-2 border-slate-300 rounded-lg pl-4 pr-4 text-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition"
                        />
                        {searchResultGroups.length > 0 && (
                            <div ref={searchResultsRef} className="absolute top-full mt-2 w-full bg-white border border-slate-300 rounded-lg shadow-lg z-20 max-h-80 overflow-y-auto">
                                {searchResultGroups.map(group => {
                                    const mainProduct = group[0];
                                    const hasVariants = group.length > 1;
                                    const isExpanded = expandedSearchResult === mainProduct.anaStokKodu;
                                    const isGroupHighlighted = highlightedIndex >= 0 && navigableItems[highlightedIndex]?.type === 'group' && navigableItems[highlightedIndex]?.product.barcode === mainProduct.barcode;

                                    return (
                                        <div key={mainProduct.anaStokKodu} className="border-b last:border-b-0">
                                            <div
                                                onClick={() => hasVariants ? setExpandedSearchResult(prev => prev === mainProduct.anaStokKodu ? null : mainProduct.anaStokKodu) : addProductToReturn(mainProduct)}
                                                className={`p-3 hover:bg-pink-50 flex justify-between items-center cursor-pointer ${isGroupHighlighted ? 'bg-pink-100 search-item-highlighted' : ''}`}
                                            >
                                                <div className="flex-1 mr-2">
                                                    <p className="font-semibold truncate">{mainProduct.name.replace(/\s*\(.+\)$/, '')} - {mainProduct.marka}</p>
                                                    <p className="text-sm text-slate-500">{hasVariants ? `${group.length} varyasyon bulundu` : `${mainProduct.renk} - ${mainProduct.beden}`}</p>
                                                </div>
                                                <div className="flex items-center text-right flex-shrink-0">
                                                    {!hasVariants && <p className="text-sm text-pink-600 font-bold mr-3">{mainProduct.price.toFixed(2)} ₺</p>}
                                                    {hasVariants && <Icon name="arrows-vertical" className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />}
                                                </div>
                                            </div>
                                            {isExpanded && (
                                                <div className="bg-slate-50 p-2">
                                                    {group.map(variant => {
                                                        const isVariantHighlighted = highlightedIndex >= 0 && navigableItems[highlightedIndex]?.type === 'variant' && navigableItems[highlightedIndex]?.product.barcode === variant.barcode;
                                                        return (
                                                            <div
                                                                key={variant.barcode}
                                                                onClick={() => addProductToReturn(variant)}
                                                                className={`flex justify-between items-center p-2 rounded-md transition-colors hover:bg-pink-100 cursor-pointer ${isVariantHighlighted ? 'bg-pink-100 search-item-highlighted' : ''}`}
                                                            >
                                                                <div className="flex-1"><span className="font-medium text-slate-700">{variant.beden}</span><span className="text-slate-500"> / {variant.renk}</span></div>
                                                                <div className="text-right"><p className="text-sm text-pink-600 font-bold">{variant.price.toFixed(2)} ₺</p></div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                     <div className="flex-shrink-0 flex items-center gap-2">
                        <div className="relative" ref={columnManagerRef}>
                            <button onClick={() => setIsColumnManagerOpen(prev => !prev)} className="h-14 flex items-center gap-2 px-4 bg-slate-100 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-200 transition focus:outline-none focus:ring-2 focus:ring-slate-400">
                                <Icon name="view-columns" className="w-5 h-5 text-slate-600"/><span className="font-semibold text-slate-700">Sütunlar</span>
                            </button>
                            {isColumnManagerOpen && (
                                <div className="absolute top-full mt-2 right-0 w-96 bg-white border border-slate-300 rounded-lg shadow-xl z-30 p-4">
                                    <p className="text-sm font-bold text-slate-600 px-2 pb-2 border-b mb-2">Gösterilecek Sütunlar</p>
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                                    {allColumns.filter(c => c.id !== 'actions').map(col => (
                                        <label key={col.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-100 cursor-pointer">
                                            <input type="checkbox" checked={!hiddenColumns.has(col.id)} onChange={() => toggleColumn(col.id)} className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                                            <span className="text-slate-700 select-none">{col.label}</span>
                                        </label>
                                    ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button onClick={handlePrintReceipt} disabled={currentReturn.length === 0} className="h-14 flex items-center gap-2 px-4 bg-rose-50 border-2 border-rose-200 text-rose-700 rounded-lg hover:bg-rose-100 transition focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:bg-slate-200/50 disabled:cursor-not-allowed disabled:text-slate-500 disabled:border-slate-300">
                            <Icon name="printer" className="w-5 h-5 text-rose-600"/><span className="font-semibold">Önizleme</span>
                        </button>
                    </div>
                </div>
                 {error && <p className="text-red-600 mt-2 text-center text-sm animate-pulse">{error}</p>}
            </div>

            <div className="flex-grow overflow-auto">
                <table className="w-full text-sm text-left table-fixed">
                    <thead className="text-xs text-rose-800 uppercase bg-rose-100 sticky top-0 z-10 select-none">
                        <tr className="border-b-2 border-slate-200">
                            {visibleColumns.map(col => (
                                <th 
                                    key={col.id} 
                                    scope="col" 
                                    className={`px-4 py-3 font-bold relative group border-r border-slate-200 last:border-r-0 cursor-move ${draggedColumn.current === col.id ? 'opacity-30' : ''} ${dragOverColumn === col.id && draggedColumn.current !== col.id ? 'drag-over-indicator-return' : ''}`} 
                                    style={{ width: `${columnWidths[col.id]}px` }}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, col.id)}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, col.id)}
                                    onDragEnd={handleDragEnd}
                                    onDragEnter={(e) => handleDragEnter(e, col.id)}
                                >
                                    <div className="flex items-center justify-between">
                                      <span style={{textAlign: col.align || 'left', width: '100%'}}>{col.label}</span>
                                      <Icon name="arrows-vertical" className="w-3 h-3 ml-1 text-slate-400 shrink-0" />
                                    </div>
                                    <div onMouseDown={(e) => handleMouseDown(e, col.id)} className="absolute top-0 right-[-4px] h-full w-2 cursor-col-resize z-20 group-hover:bg-pink-300/50 transition-colors"/>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {currentReturn.length === 0 ? (
                            <tr>
                                <td colSpan={visibleColumns.length} className="text-center py-10 h-full">
                                    <div className="flex flex-col items-center justify-center text-slate-400 p-8">
                                        <Icon name="back" className="w-16 h-16 mx-auto mb-4 text-slate-300"/>
                                        <h3 className="text-xl font-medium text-slate-500">İade Bekleniyor</h3>
                                        <p className="text-sm">İade edilecek ürünün barkodunu okutun veya arayın.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            currentReturn.map(item => (
                                <tr key={item.barcode} className="bg-white border-b last:border-0 hover:bg-rose-50 transition-colors">
                                  {visibleColumns.map(col => {
                                    let content: React.ReactNode = item[col.id as keyof ReturnItem] || '';
                                    if (col.id === 'quantity') {
                                        content = (
                                            <div className="flex items-center justify-center gap-2">
                                              <button onClick={() => updateQuantity(item.barcode, -1)} className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-200 text-slate-700 hover:bg-red-200 hover:text-red-700 transition"><Icon name="minus" className="w-4 h-4" /></button>
                                              <span className="w-8 text-center font-bold text-md text-slate-800">{item.quantity}</span>
                                              <button onClick={() => updateQuantity(item.barcode, 1)} className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-200 text-slate-700 hover:bg-green-200 hover:text-green-700 transition"><Icon name="plus" className="w-4 h-4" /></button>
                                            </div>
                                        );
                                    } else if (col.id === 'price') {
                                        content = `${item.price.toFixed(2)} ₺`;
                                    } else if (col.id === 'total') {
                                        content = `${(item.price * item.quantity).toFixed(2)} ₺`;
                                    } else if (col.id === 'stock') {
                                        const stockAfterReturn = item.stock + item.quantity;
                                        content = (
                                            <span className="font-semibold">{stockAfterReturn}</span>
                                        );
                                    } else if (col.id === 'actions') {
                                        content = (
                                            <div className="flex justify-center">
                                                <button onClick={() => removeItem(item.barcode)} className="p-2 rounded-full text-slate-400 hover:bg-red-100 hover:text-red-600 transition"><Icon name="trash" className="w-4 h-4" /></button>
                                            </div>
                                        );
                                    }
                                    return (
                                        <td key={col.id} className="px-4 py-2 border-r border-slate-200 last:border-r-0" style={{ textAlign: col.align || 'left', fontWeight: ['total', 'price', 'stock'].includes(col.id) ? 600 : 400, color: col.id === 'total' ? '#c026d3' : ''}}>
                                          {content}
                                        </td>
                                    );
                                  })}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        <div className="flex-shrink-0 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-lg shadow-2xl p-4 flex items-center justify-between">
            <div className="text-left">
                <p className="text-lg font-medium text-slate-300">Toplam İade Tutarı</p>
                <p className="text-5xl font-bold tracking-tight text-pink-300">{total.toFixed(2)}<span className="text-3xl ml-1">₺</span></p>
            </div>
            
            <div className="flex items-center gap-4">
                 <button onClick={cancelReturn} disabled={currentReturn.length === 0} className="bg-red-500/20 text-red-300 hover:bg-red-500/40 font-semibold py-3 px-5 rounded-lg transition text-sm disabled:bg-slate-600/50 disabled:text-slate-400 disabled:cursor-not-allowed">İadeyi İptal Et</button>
                 <div className="h-16 w-px bg-slate-600 mx-2"></div>
                <button onClick={handleCompleteReturn} disabled={currentReturn.length === 0} className="w-60 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-xl py-4 rounded-lg transition shadow-lg hover:shadow-pink-500/40 disabled:bg-slate-500 disabled:from-slate-500 disabled:shadow-none disabled:cursor-not-allowed transform hover:-translate-y-1 flex items-center justify-center gap-3">
                    <Icon name="check" className="w-7 h-7" />
                    <span>İadeyi Tamamla</span>
                </button>
            </div>
        </div>
    </div>
  );
};

export default ReturnView;