import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Product, SaleItem, SaleRecord, CompanyInfo, Customer } from '../types';
import Icon from '../components/Icon';
import BulkPriceUpdateModal from '../components/BulkPriceUpdateModal';
import { playErrorSound } from '../services/soundService';
import AddCustomerModal from '../components/AddCustomerModal';

interface SaleViewProps {
  products: Product[];
  onSaleComplete: (record: SaleRecord) => void;
  suspendedSales: SaleItem[][];
  setSuspendedSales: React.Dispatch<React.SetStateAction<SaleItem[][]>>;
  currentSale: SaleItem[];
  setCurrentSale: React.Dispatch<React.SetStateAction<SaleItem[]>>;
  updateProductPrice: (barcode: string, newPrice: number) => void;
  updatePricesByAnaStokKodu: (updates: { [anaStokKodu: string]: number }) => void;
  companyInfo: CompanyInfo;
  customers: Customer[];
  onAddCustomer: (customer: Omit<Customer, 'id'>) => Customer;
}

type PaymentMethod = 'Nakit' | 'Kredi Kartı';

const allColumns = [
  { id: 'name', label: 'Stok Adı', minWidth: 200 },
  { id: 'barcode', label: 'Barkod', minWidth: 140 },
  { id: 'quantity', label: 'Miktar', minWidth: 120, align: 'center' as const },
  { id: 'stock', label: 'Stok', minWidth: 80, align: 'right' as const },
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

const COLUMN_WIDTHS_KEY = 'yenice_sale_view_column_widths';
const HIDDEN_COLUMNS_KEY = 'yenice_sale_view_hidden_columns';
const COLUMN_ORDER_KEY = 'yenice_sale_view_column_order';

const generateReceiptHtml = (saleItems: SaleItem[], total: number, companyName: string): string => {
  const date = new Date();
  const totalItems = saleItems.reduce((sum, item) => sum + item.quantity, 0);

  const itemsHtml = saleItems.map(item => `
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
        <title>Fiş Önizleme - ${companyName}</title>
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
            background-color: #0ea5e9;
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
            background-color: #0284c7;
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
            <p class="header-p">Müşteri Bilgi Fişi</p>
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
                <span>Toplam Ürün:</span>
                <span>${totalItems}</span>
              </p>
              <p class="total">
                <span>TOPLAM:</span>
                <span>${total.toFixed(2)} ₺</span>
              </p>
            </div>
            <div class="divider"></div>
            <p class="footer-text">Bizi tercih ettiğiniz için teşekkür ederiz.</p>
        </div>
      </body>
    </html>
  `;
};

const SuspendedSalesModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    sales: SaleItem[][];
    onRestore: (index: number) => void;
    onDelete: (index: number) => void;
}> = ({ isOpen, onClose, sales, onRestore, onDelete }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-3 border-b flex justify-between items-center flex-shrink-0 bg-cyan-50/80">
                    <h2 className="text-xl font-bold text-slate-800">Beklemedeki Satışlar</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-2 rounded-full -mr-2">
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>
                <main className="p-2 flex-grow overflow-y-auto max-h-[60vh]">
                    {sales.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">Beklemede satış bulunmuyor.</p>
                    ) : (
                        <div className="space-y-3">
                            {sales.map((sale, index) => {
                                const saleTotal = sale.reduce((sum, item) => sum + item.price * item.quantity, 0);
                                const itemCount = sale.reduce((sum, item) => sum + item.quantity, 0);
                                return (
                                    <div key={index} className="flex items-center justify-between bg-cyan-50/50 p-4 rounded-lg">
                                        <div>
                                            <p className="font-bold text-slate-700">Satış #{index + 1}</p>
                                            <p className="text-sm text-slate-500">{itemCount} ürün - Toplam: {saleTotal.toFixed(2)} ₺</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => onDelete(index)} className="bg-red-100 text-red-700 hover:bg-red-200 font-semibold py-2 px-4 rounded-lg transition text-sm">Sil</button>
                                            <button onClick={() => onRestore(index)} className="bg-cyan-100 text-cyan-700 hover:bg-cyan-200 font-bold py-2 px-4 rounded-lg transition text-sm">Satışa Dön</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>
                 <footer className="p-2 border-t bg-cyan-50/80 flex justify-end">
                    <button onClick={onClose} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-6 rounded-lg transition">Kapat</button>
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
            `}</style>
        </div>
    );
};


const SaleView: React.FC<SaleViewProps> = ({ products, onSaleComplete, suspendedSales, setSuspendedSales, currentSale, setCurrentSale, updateProductPrice, updatePricesByAnaStokKodu, companyInfo, customers, onAddCustomer }) => {
  const [barcode, setBarcode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSuspendedSalesModalOpen, setIsSuspendedSalesModalOpen] = useState(false);
  const [isBulkPriceModalOpen, setIsBulkPriceModalOpen] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [editingPrice, setEditingPrice] = useState<{ barcode: string; value: string } | null>(null);
  const [expandedSearchResult, setExpandedSearchResult] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Customer related state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const customerSearchRef = useRef<HTMLDivElement>(null);

  const defaultWidths = { name: 300, barcode: 150, quantity: 120, stock: 90, price: 120, total: 120, stokKodu: 130, marka: 110, model: 110, renk: 90, beden: 90, anaStokKodu: 140, actions: 60 };
  const defaultHidden = new Set(['stokKodu', 'marka', 'model', 'renk', 'beden', 'anaStokKodu', 'stock']);
  const defaultOrder = allColumns.map(c => c.id);

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
      try {
          const savedWidths = localStorage.getItem(COLUMN_WIDTHS_KEY);
          return savedWidths ? { ...defaultWidths, ...JSON.parse(savedWidths) } : defaultWidths;
      } catch (e) {
          console.error("Failed to load column widths from localStorage", e);
          return defaultWidths;
      }
  });

  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(() => {
      try {
          const savedHidden = localStorage.getItem(HIDDEN_COLUMNS_KEY);
          return savedHidden ? new Set(JSON.parse(savedHidden)) : defaultHidden;
      } catch (e) {
          console.error("Failed to load hidden columns from localStorage", e);
          return defaultHidden;
      }
  });

  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    try {
        const savedOrder = localStorage.getItem(COLUMN_ORDER_KEY);
        if (savedOrder) {
            const parsedOrder = JSON.parse(savedOrder);
            // Ensure all default columns are present in the saved order
            if (defaultOrder.every(id => parsedOrder.includes(id))) {
                return parsedOrder;
            }
        }
        return defaultOrder;
    } catch (e) {
        console.error("Failed to load column order from localStorage", e);
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


  const focusBarcodeInput = useCallback(() => {
    barcodeInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleDeleteSelected = () => {
        if (currentSale.length === 0) return;
        setCurrentSale([]);
        setBarcode('');
        setSearchQuery('');
        focusBarcodeInput();
    };

    const handleRefresh = (e: any) => {
        if (e.detail?.viewId === 'new-sale') {
            setSearchQuery('');
            setBarcode('');
            setError(null);
            focusBarcodeInput();
        }
    };

    const handlePaste = (e: any) => {
        const text = e.detail;
        if (text) {
            setBarcode(text);
            focusBarcodeInput();
        }
    };

    window.addEventListener('app-delete-selected', handleDeleteSelected);
    window.addEventListener('app-refresh-view', handleRefresh);
    window.addEventListener('app-paste', handlePaste);

    return () => {
        window.removeEventListener('app-delete-selected', handleDeleteSelected);
        window.removeEventListener('app-refresh-view', handleRefresh);
        window.removeEventListener('app-paste', handlePaste);
    };
  }, [currentSale.length, setCurrentSale, focusBarcodeInput]);

  useEffect(() => {
    focusBarcodeInput();
  }, [focusBarcodeInput]);

  useEffect(() => {
    try {
        localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(columnWidths));
    } catch (e) {
        console.error("Failed to save column widths to localStorage", e);
    }
  }, [columnWidths]);

  useEffect(() => {
    try {
        localStorage.setItem(HIDDEN_COLUMNS_KEY, JSON.stringify(Array.from(hiddenColumns)));
    } catch (e) {
        console.error("Failed to save hidden columns to localStorage", e);
    }
  }, [hiddenColumns]);

  useEffect(() => {
    try {
        localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(columnOrder));
    } catch (e) {
        console.error("Failed to save column order to localStorage", e);
    }
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
      if (customerSearchRef.current && !customerSearchRef.current.contains(event.target as Node)) {
        setCustomerSearch('');
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  const showError = useCallback((message: string) => {
      setError(message);
      playErrorSound();
      setTimeout(() => setError(null), 3000);
  }, []);

  const cancelSale = () => {
    if (currentSale.length > 0) {
      setCurrentSale([]);
      setSelectedCustomer(null);
      setError(null);
      setBarcode('');
      setSearchQuery('');
      barcodeInputRef.current?.focus();
    }
  };

  const addProductToSale = useCallback((product: Product, quantityToAdd: number = 1) => {
    if (product.isActivated === false) {
        showError('Bu ürün satışa kapalı. Satış yapmak için önce bir alış faturasına eklenmelidir.');
        setBarcode('');
        barcodeInputRef.current?.focus();
        return;
    }

    setError(null);
    setCurrentSale(prevSale => {
      const existingItem = prevSale.find(item => item.barcode === product.barcode);
      const quantityInCart = existingItem ? existingItem.quantity : 0;
      
      if (product.stock < quantityInCart + quantityToAdd) {
          if (product.stock <= 0) {
               showError(`Stokta yok! "${product.name}" ürünü tükenmiştir.`);
          } else {
               showError(`Stok yetersiz! "${product.name}" için kalan stok: ${product.stock}. Sepete daha fazla eklenemez.`);
          }
          return prevSale;
      }
  
      if (existingItem) {
        return prevSale.map(item =>
          item.barcode === product.barcode ? { ...item, quantity: item.quantity + quantityToAdd } : item
        );
      } else {
        return [...prevSale, { ...product, quantity: quantityToAdd }];
      }
    });

    setBarcode('');
    setSearchQuery('');
    barcodeInputRef.current?.focus();
  }, [setCurrentSale, showError]);

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

    const product = products.find(p => p.barcode === actualBarcode || (p.secondaryBarcodes && p.secondaryBarcodes.includes(actualBarcode)));

    if (product) {
      addProductToSale(product, quantity);
    } else {
      showError('Ürün bulunamadı. Lütfen barkodu kontrol edin.');
    }
  }, [products, addProductToSale, showError]);

  const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBarcode = e.target.value;
    setBarcode(newBarcode);

    const trimmedBarcode = newBarcode.trim();
    // Auto-process if it looks like a complete, single barcode (e.g., from a scanner)
    if (!trimmedBarcode.includes('*') && /^\d{12,13}$/.test(trimmedBarcode)) {
        const hasProduct = products.some(p => 
            p.barcode === trimmedBarcode || 
            (p.secondaryBarcodes && p.secondaryBarcodes.includes(trimmedBarcode))
        );
        if (hasProduct) {
             processBarcode(trimmedBarcode);
        }
    }
  };
  
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processBarcode(barcode);
  };
  
  const handleSearchSelect = (product: Product) => {
    addProductToSale(product, 1);
    setExpandedSearchResult(null);
  };

  const updateQuantity = (barcode: string, delta: number) => {
    const itemInCart = currentSale.find(item => item.barcode === barcode);
    if (!itemInCart) return;

    const newQuantity = itemInCart.quantity + delta;
    
    if (newQuantity <= 0) {
        removeItem(barcode);
        return;
    }

    const productInStock = products.find(p => p.barcode === barcode);
    if (productInStock && newQuantity > productInStock.stock) {
        showError(`Stok yetersiz! ${productInStock.name} için stok: ${productInStock.stock}`);
        return;
    }
    
    setCurrentSale(currentSale.map(item =>
      item.barcode === barcode ? { ...item, quantity: newQuantity } : item
    ));
  };
  
  const removeItem = (barcode: string) => {
      setCurrentSale(currentSale.filter(item => item.barcode !== barcode));
  };

  const handlePriceUpdate = () => {
    if (!editingPrice) return;
    const newPrice = parseFloat(editingPrice.value.replace(',', '.'));
    if (!isNaN(newPrice) && newPrice >= 0) {
        updateProductPrice(editingPrice.barcode, newPrice);
    } else {
        showError("Geçersiz fiyat değeri.");
    }
    setEditingPrice(null);
  };

  const handlePriceInputKeyDown = (e: React.KeyboardEvent, currentBarcode: string) => {
    const currentIndex = currentSale.findIndex(item => item.barcode === currentBarcode);

    switch (e.key) {
        case 'Enter':
        case 'ArrowDown':
            e.preventDefault();
            handlePriceUpdate();
            if (currentIndex < currentSale.length - 1) {
                const nextItem = currentSale[currentIndex + 1];
                setEditingPrice({ barcode: nextItem.barcode, value: nextItem.price.toString() });
            } else {
                setEditingPrice(null);
            }
            break;

        case 'ArrowUp':
            e.preventDefault();
            handlePriceUpdate();
            if (currentIndex > 0) {
                const prevItem = currentSale[currentIndex - 1];
                setEditingPrice({ barcode: prevItem.barcode, value: prevItem.price.toString() });
            }
            break;

        case 'Escape':
            e.preventDefault();
            setEditingPrice(null);
            break;
        
        case 'Tab':
            handlePriceUpdate();
            break;
    }
  };

  const total = currentSale.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = currentSale.reduce((sum, item) => sum + item.quantity, 0);

 const handleCompleteSale = (paymentMethod: PaymentMethod) => {
  if (currentSale.length === 0) return;
  
  const newRecord: SaleRecord = {
    id: `sale-${Date.now()}`,
    items: currentSale,
    total: total,
    date: new Date().toISOString(),
    paymentMethod: paymentMethod,
    customerId: selectedCustomer?.id,
  };
  
  onSaleComplete(newRecord);
};

  const handleSuspendSale = () => {
    if (currentSale.length === 0) return;
    setSuspendedSales(prev => [...prev, currentSale]);
    setCurrentSale([]);
    setSelectedCustomer(null);
    setError(null);
    setBarcode('');
    setSearchQuery('');
  };

  const handleRestoreSale = (saleIndex: number) => {
    if (currentSale.length > 0) {
        if (!window.confirm('Mevcut sepet temizlenecek ve bekleyen satış yüklenecektir. Emin misiniz?')) {
            return;
        }
    }
    const saleToRestore = suspendedSales[saleIndex];
    if (saleToRestore) {
        setCurrentSale(saleToRestore);
        setSelectedCustomer(null); // Suspended sales don't save customer info for simplicity
        setSuspendedSales(prev => prev.filter((_, index) => index !== saleIndex));
        setIsSuspendedSalesModalOpen(false);
    }
  };
  
  const handleDeleteSuspendedSale = (saleIndex: number) => {
      if (window.confirm(`Bekleyen Satış #${saleIndex + 1} silinecektir. Emin misiniz?`)) {
        setSuspendedSales(prev => prev.filter((_, index) => index !== saleIndex));
      }
  };

  const handlePrintReceipt = () => {
    if (currentSale.length === 0) {
        showError("Yazdırmak için sepette ürün olmalıdır.");
        return;
    }

    const receiptHtml = generateReceiptHtml(currentSale, total, companyInfo.name);
    
    const printWindow = window.open('', '_blank', 'height=800,width=500,scrollbars=yes,resizable=yes');

    if (printWindow) {
      printWindow.document.write(receiptHtml);
      printWindow.document.close();
      printWindow.focus();
    } else {
      showError("Yazdırma penceresi açılamadı. Lütfen pop-up engelleyicinizi kontrol edin.");
    }
  };

  // FIX: Added return type and return statement to satisfy the 'onSave' prop type of AddCustomerModal.
  const handleSaveAndSelectCustomer = (customer: Omit<Customer, 'id'>): Customer => {
      const newCustomer = onAddCustomer(customer);
      setSelectedCustomer(newCustomer);
      setIsAddCustomerModalOpen(false);
      return newCustomer;
  };

  const filteredCustomers = useMemo(() => {
    if (customerSearch.length < 2) return [];
    const lowerCaseQuery = customerSearch.toLowerCase();
    return customers
      .filter(c => 
        c.name.toLowerCase().includes(lowerCaseQuery) ||
        c.phone?.includes(lowerCaseQuery)
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [customerSearch, customers]);

  const searchResultGroups = useMemo(() => {
    if (searchQuery.length < 2) {
      return [];
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    const groups = new Map<string, Product[]>();

    products.forEach(product => {
      const isMatch =
        product.name.toLowerCase().includes(lowerCaseQuery) ||
        product.barcode.includes(lowerCaseQuery) ||
        (product.secondaryBarcodes && product.secondaryBarcodes.some(bc => bc.includes(lowerCaseQuery))) ||
        product.stokKodu.toLowerCase().includes(lowerCaseQuery) ||
        product.anaStokKodu.toLowerCase().includes(lowerCaseQuery) ||
        product.model.toLowerCase().includes(lowerCaseQuery) ||
        product.marka.toLowerCase().includes(lowerCaseQuery);

      if (isMatch) {
        if (!groups.has(product.anaStokKodu)) {
          groups.set(product.anaStokKodu, []);
        }
        groups.get(product.anaStokKodu)!.push(product);
      }
    });

    return Array.from(groups.values()).sort((a, b) => a[0].name.localeCompare(b[0].name, 'tr'));
  }, [searchQuery, products]);

  const navigableItems = useMemo(() => {
    const items: Array<{
      type: 'group' | 'variant';
      product: Product;
    }> = [];
    
    searchResultGroups.forEach((group) => {
        const mainProduct = group[0];
        const hasVariants = group.length > 1;
        
        items.push({ type: 'group', product: mainProduct });

        if (hasVariants && expandedSearchResult === mainProduct.anaStokKodu) {
            group.forEach((variant) => {
                items.push({ type: 'variant', product: variant });
            });
        }
    });
    return items;
  }, [searchResultGroups, expandedSearchResult]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchQuery, expandedSearchResult]);

  useEffect(() => {
    const highlightedElement = searchResultsRef.current?.querySelector('.search-item-highlighted');
    if (highlightedElement) {
        highlightedElement.scrollIntoView({
            block: 'nearest',
        });
    }
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
                const hasVariants = group.length > 1;
                if (hasVariants) {
                    setExpandedSearchResult(prev => prev === item.product.anaStokKodu ? null : item.product.anaStokKodu);
                } else {
                    if (item.product.stock > 0) handleSearchSelect(item.product);
                }
            } else if (item.type === 'variant') {
                if (item.product.stock > 0) handleSearchSelect(item.product);
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
          if (newSet.has(columnId)) {
              newSet.delete(columnId);
          } else {
              newSet.add(columnId);
          }
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
    
    return allColumns.slice().sort((a, b) => {
        return currentOrder.indexOf(a.id) - currentOrder.indexOf(b.id);
    });
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
    <div className="w-full h-full flex flex-col gap-2">
      <SuspendedSalesModal
        isOpen={isSuspendedSalesModalOpen}
        onClose={() => setIsSuspendedSalesModalOpen(false)}
        sales={suspendedSales}
        onRestore={handleRestoreSale}
        onDelete={handleDeleteSuspendedSale}
      />
      <BulkPriceUpdateModal
        isOpen={isBulkPriceModalOpen}
        onClose={() => setIsBulkPriceModalOpen(false)}
        currentSale={currentSale}
        onSave={(updates, mode) => {
          if (mode === 'anaStokKodu') {
            updatePricesByAnaStokKodu(updates);
          } else {
            // If barcode mode, call updateProductPrice for each barcode
            Object.entries(updates).forEach(([barcode, price]) => {
              updateProductPrice(barcode, price);
            });
          }
        }}
      />
       {isAddCustomerModalOpen && <AddCustomerModal isOpen={isAddCustomerModalOpen} onClose={() => setIsAddCustomerModalOpen(false)} onSave={handleSaveAndSelectCustomer} />}
      <style>{`
            .drag-over-indicator-sale::before {
                content: '';
                position: absolute;
                top: 10%;
                left: -2px;
                width: 4px;
                height: 80%;
                background-color: #0ea5e9;
                border-radius: 4px;
            }
        `}</style>
      <div className="flex-grow flex flex-col bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden">
        <div className="px-2 py-1 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 bg-slate-100 dark:bg-slate-900">
            <div className="flex items-start gap-3">
                <form onSubmit={handleBarcodeSubmit} className="relative flex-grow">
                  <Icon name="barcode" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-600 z-10" />
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcode}
                    onChange={handleBarcodeChange}
                    placeholder="Barkod okutun (Örn: 2 * 12345...)"
                    className="input-style w-full pl-11 bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-900/30 font-bold"
                  />
                </form>
                <div className="relative flex-grow" ref={searchContainerRef}>
                    <Icon name="tag" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600 z-10" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder="Ürün adı, model, stok kodu ile ara..."
                        className="input-style w-full pl-11 bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-900/30"
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
                                onClick={() => { if (hasVariants) { setExpandedSearchResult(prev => prev === mainProduct.anaStokKodu ? null : mainProduct.anaStokKodu) } else { if (mainProduct.stock > 0) handleSearchSelect(mainProduct) } }}
                                className={`p-3 hover:bg-cyan-50 flex justify-between items-center cursor-pointer ${isGroupHighlighted ? 'bg-cyan-100 search-item-highlighted' : ''}`}
                                >
                                <div className="flex-1 mr-2">
                                    <p className="font-semibold truncate text-sm">{mainProduct.name.replace(/\s*\(.+\)$/, '')} - {mainProduct.marka}</p>
                                    <p className="text-xs text-slate-500">{hasVariants ? `${group.length} varyasyon bulundu` : `${mainProduct.renk} - ${mainProduct.beden}`}</p>
                                </div>
                                <div className="flex items-center text-right flex-shrink-0">
                                    {mainProduct.stock <= 0 && !hasVariants && <span className="text-xs font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded-full mr-3">STOKTA YOK</span>}
                                    {!hasVariants && <p className="text-xs text-cyan-600 font-bold mr-3">{mainProduct.price.toFixed(2)} ₺</p>}
                                    {hasVariants && <Icon name="arrows-vertical" className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />}
                                </div>
                                </div>
                                {isExpanded && (
                                <div className="bg-slate-50 p-2">
                                    {group.map(variant => {
                                    const isVariantHighlighted = highlightedIndex >= 0 && navigableItems[highlightedIndex]?.type === 'variant' && navigableItems[highlightedIndex]?.product.barcode === variant.barcode;
                                    return (
                                        <div
                                        key={variant.barcode}
                                        onClick={() => { if (variant.stock > 0) handleSearchSelect(variant) }}
                                        className={`flex justify-between items-center p-2 rounded-md transition-colors text-xs ${variant.stock > 0 ? 'hover:bg-cyan-100 cursor-pointer' : 'opacity-50 cursor-not-allowed'} ${isVariantHighlighted ? 'bg-cyan-100 search-item-highlighted' : ''}`}
                                        >
                                        <div className="flex-1"><span className="font-medium text-slate-700">{variant.beden}</span><span className="text-slate-500"> / {variant.renk}</span></div>
                                        <div className="text-right flex items-center gap-3">
                                            {variant.stock <= 0 && <span className="text-[10px] font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded-full">STOKTA YOK</span>}
                                            <p className="font-bold text-cyan-600">{variant.price.toFixed(2)} ₺</p>
                                        </div>
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
                <div className="relative flex-grow" ref={customerSearchRef}>
                    {selectedCustomer ? (
                        <div className="flex h-10 items-center justify-between rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3">
                            <div className="flex items-center gap-2">
                                <Icon name="customer" className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                                <span className="font-semibold text-cyan-700 dark:text-cyan-400">{selectedCustomer.name}</span>
                            </div>
                            <button onClick={() => setSelectedCustomer(null)} className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline">
                                <Icon name="x-circle" className="h-4 w-4" /> Kaldır
                            </button>
                        </div>
                    ) : (
                        <div className="relative">
                            <Icon name="customer" className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-rose-600 z-10" />
                            <input
                                type="text"
                                value={customerSearch}
                                onChange={e => setCustomerSearch(e.target.value)}
                                placeholder="Müşteri Ara veya Seç"
                                className="input-style w-full pl-11 bg-rose-50/50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-900/30"
                            />
                            {filteredCustomers.length > 0 && (
                                <div className="absolute top-full z-30 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg">
                                    {filteredCustomers.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); }}
                                            className="w-full p-3 text-left hover:bg-cyan-50 dark:hover:bg-slate-700"
                                        >
                                            <p className="font-semibold dark:text-white">{c.name}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">{c.phone}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                    <button onClick={() => setIsAddCustomerModalOpen(true)} className="btn-secondary" title="Yeni Müşteri">
                        <Icon name="plus" className="w-5 h-5"/>
                    </button>
                    <button onClick={() => setIsBulkPriceModalOpen(true)} disabled={currentSale.length === 0} className="btn-secondary" title="Toplu Fiyat Değiştir">
                        <Icon name="edit" className="w-5 h-5"/>
                    </button>
                    <div className="relative" ref={columnManagerRef}>
                        <button onClick={() => setIsColumnManagerOpen(prev => !prev)} className="btn-secondary" title="Sütunlar">
                            <Icon name="view-columns" className="w-5 h-5"/>
                        </button>
                        {isColumnManagerOpen && (
                            <div className="absolute top-full mt-2 right-0 w-80 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-xl z-30 p-4">
                                <p className="text-sm font-bold text-slate-600 px-2 pb-2 border-b mb-2">Gösterilecek Sütunlar</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                {allColumns.filter(c => c.id !== 'actions').map(col => (
                                    <label key={col.id} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                        <input type="checkbox" checked={!hiddenColumns.has(col.id)} onChange={() => toggleColumn(col.id)} className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" />
                                        <span className="text-slate-700 dark:text-slate-200 select-none">{col.label}</span>
                                    </label>
                                ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <button onClick={handlePrintReceipt} disabled={currentSale.length === 0} className="btn-secondary" title="Fiş Yazdır">
                        <Icon name="printer" className="w-5 h-5"/>
                    </button>
                </div>
            </div>
            {error && <p className="text-red-600 mt-2 text-center text-sm animate-pulse">{error}</p>}
        </div>
        <div className="flex-grow overflow-auto bg-white dark:bg-slate-800">
          <table className="w-full text-left table-fixed">
            <thead className="text-[11px] text-cyan-800 dark:text-cyan-300 uppercase bg-cyan-100 dark:bg-cyan-900/50 sticky top-0 z-10 select-none">
              <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                {visibleColumns.map(col => (
                  <th
                    key={col.id}
                    scope="col"
                    className={`px-2 py-1 font-bold relative group border-r border-slate-200 dark:border-slate-700 last:border-r-0 cursor-move ${draggedColumn.current === col.id ? 'opacity-30' : ''} ${dragOverColumn === col.id && draggedColumn.current !== col.id ? 'drag-over-indicator-sale' : ''}`}
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
                    <div onMouseDown={(e) => handleMouseDown(e, col.id)} className="absolute top-0 right-[-4px] h-full w-2 cursor-col-resize z-20 group-hover:bg-cyan-300/50 transition-colors"/>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-xs">
              {currentSale.length === 0 ? (
                <tr><td colSpan={visibleColumns.length} className="text-center py-10 h-full"><div className="flex flex-col items-center justify-center text-slate-400 p-8"><Icon name="new-sale" className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600"/><h3 className="text-xl font-medium text-slate-500 dark:text-slate-400">Yeni Satış</h3><p className="text-sm">Başlamak için bir ürünün barkodunu okutun.</p></div></td></tr>
              ) : (currentSale.map(item => (
                <tr key={item.barcode} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 last:border-0 hover:bg-cyan-50 dark:hover:bg-slate-700/50 transition-colors group/row">
                  {visibleColumns.map(col => {
                    let content: React.ReactNode = (item as any)[col.id] || '';
                    if (col.id === 'quantity') {
                        content = (<div className="flex items-center justify-center gap-1"><button onClick={() => updateQuantity(item.barcode, -1)} className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-red-200 dark:hover:bg-red-900/50 hover:text-red-700 dark:hover:text-red-400 transition"><Icon name="minus" className="w-4 h-4" /></button><span className="w-8 text-center font-bold text-sm text-slate-800 dark:text-slate-200">{item.quantity}</span><button onClick={() => updateQuantity(item.barcode, 1)} className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-green-200 dark:hover:bg-green-900/50 hover:text-green-700 dark:hover:text-green-400 transition"><Icon name="plus" className="w-4 h-4" /></button></div>);
                    } else if (col.id === 'price') {
                        content = editingPrice?.barcode === item.barcode ? (<input type="text" value={editingPrice.value} onChange={(e) => setEditingPrice({ ...editingPrice, value: e.target.value })} onBlur={handlePriceUpdate} onKeyDown={(e) => handlePriceInputKeyDown(e, item.barcode)} autoFocus onFocus={(e) => e.target.select()} className="w-20 text-right bg-white dark:bg-slate-700 border-2 border-cyan-500 rounded px-2 py-0.5 outline-none ring-2 ring-cyan-200 dark:text-white"/>) : (<div onClick={() => setEditingPrice({ barcode: item.barcode, value: item.price.toString() })} className="cursor-pointer p-1 -m-1 rounded hover:bg-cyan-100 dark:hover:bg-cyan-900/30 flex items-center justify-end" title="Fiyatı düzenle"><span>{`${item.price.toFixed(2)} ₺`}</span><Icon name="edit" className="w-3 h-3 ml-2 text-slate-400 opacity-0 group-hover/row:opacity-100 transition-opacity" /></div>);
                    } else if (col.id === 'total') {
                        content = `${(item.price * item.quantity).toFixed(2)} ₺`;
                    } else if (col.id === 'actions') {
                        content = (<div className="flex justify-center"><button onClick={() => removeItem(item.barcode)} className="p-1 rounded-full text-slate-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition"><Icon name="trash" className="w-4 h-4" /></button></div>);
                    }
                    return (<td key={col.id} className="px-2 py-0.5 border-r border-slate-200 dark:border-slate-700 last:border-r-0" style={{ textAlign: col.align || 'left', fontWeight: ['total', 'price', 'stock'].includes(col.id) ? 600 : 400, color: col.id === 'total' ? (companyInfo.darkMode ? '#22d3ee' : '#0e7490') : ''}}>{content}</td>);
                  })}
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-3 flex-shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col lg:flex-row items-center gap-4">
          
          {/* Information Section */}
          <div className="flex items-center gap-2 flex-grow w-full lg:w-auto">
            <div className="flex-1 lg:flex-none bg-white dark:bg-slate-800 px-6 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 shadow-sm">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Toplam Adet</span>
                <span className="text-xl font-black text-slate-800 dark:text-white leading-none">{totalItems} <small className="text-[10px] font-bold text-slate-400 uppercase">Ürün</small></span>
              </div>
            </div>
            
            <div className="flex-[2] lg:flex-none bg-cyan-600 dark:bg-cyan-700 px-8 py-2 rounded-2xl flex items-center gap-6 shadow-lg shadow-cyan-900/10 min-w-[240px]">
              <div className="bg-white/20 p-2 rounded-xl">
                 <Icon name="sale" className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-white/60 uppercase tracking-widest leading-none mb-1">Toplam Ödenecek</span>
                <span className="text-3xl font-black text-white tracking-tighter leading-none">{total.toFixed(2)} ₺</span>
              </div>
            </div>
          </div>

          {/* Action Buttons Section */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
             {/* Secondary Actions */}
             <div className="flex items-center gap-1 mr-2 px-3 border-r dark:border-slate-700">
                <button onClick={cancelSale} disabled={currentSale.length === 0} className="p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all" title="Satışı İptal Et">
                   <Icon name="trash" className="w-5 h-5" />
                </button>
                <button onClick={handleSuspendSale} disabled={currentSale.length === 0} className="p-2.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-all" title="Satışı Beklet">
                   <Icon name="refresh" className="w-5 h-5" />
                </button>
                <button onClick={() => setIsSuspendedSalesModalOpen(true)} className="relative p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all" title="Bekleyen Satışlar">
                   <Icon name="list-bullet" className="w-5 h-5" />
                   {suspendedSales.length > 0 && (
                     <span className="absolute top-1 right-1 w-4 h-4 bg-amber-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-slate-100 dark:border-slate-900 animate-pulse">{suspendedSales.length}</span>
                   )}
                </button>
             </div>

             {/* Primary Actions */}
             <div className="flex items-center gap-2">
                <button
                    onClick={() => handleCompleteSale('Nakit')}
                    disabled={currentSale.length === 0}
                    className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Icon name="check" className="w-5 h-5" /> NAKİT
                </button>
                <button
                    onClick={() => handleCompleteSale('Kredi Kartı')}
                    disabled={currentSale.length === 0}
                    className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Icon name="finance" className="w-5 h-5" /> KREDİ KARTI
                </button>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default SaleView;