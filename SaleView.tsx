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
                <header className="p-5 border-b flex justify-between items-center flex-shrink-0 bg-cyan-50/80">
                    <h2 className="text-2xl font-bold text-slate-800">Beklemedeki Satışlar</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-2 rounded-full -mr-2">
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>
                <main className="p-4 flex-grow overflow-y-auto max-h-[60vh]">
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
                 <footer className="p-4 border-t bg-cyan-50/80 flex justify-end">
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


  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

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

    const product = products.find(p => p.barcode === actualBarcode);

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
        if (products.some(p => p.barcode === trimmedBarcode)) {
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
    setSelectedCustomer(null);
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

  const handleWhatsAppReceipt = () => {
    if (currentSale.length === 0) return;
    
    let message = `*${companyInfo.name}* - Müşteri Bilgi Fişi\n`;
    message += `----------------------------\n`;
    currentSale.forEach(item => {
        message += `• ${item.name}\n  ${item.quantity} x ${item.price.toFixed(2)}₺ = *${(item.quantity * item.price).toFixed(2)}₺*\n`;
    });
    message += `----------------------------\n`;
    message += `*TOPLAM: ${total.toFixed(2)} ₺*\n\n`;
    message += `Bizi tercih ettiğiniz için teşekkür ederiz. 🙏`;

    const encodedMessage = encodeURIComponent(message);
    let phone = selectedCustomer?.phone?.replace(/\D/g, '') || '';
    
    // Türkiye numarası formatlama
    if (phone.length === 10 && phone.startsWith('5')) {
        phone = '90' + phone;
    } else if (phone.length === 11 && phone.startsWith('05')) {
        phone = '90' + phone.substring(1);
    }

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
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
    return customers.filter(c => 
        c.name.toLowerCase().includes(lowerCaseQuery) ||
        c.phone?.includes(lowerCaseQuery)
    );
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

    return Array.from(groups.values());
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
        onSave={updatePricesByAnaStokKodu}
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
      <div className="flex-grow flex flex-col bg-white border border-slate-200/80 rounded-lg shadow-lg overflow-hidden">
        <div className="p-2 border-b border-slate-200 flex-shrink-0 bg-slate-100">
            <div className="flex items-start gap-3">
                <form onSubmit={handleBarcodeSubmit} className="relative flex-grow">
                <Icon name="barcode" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-700" />
                <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcode}
                    onChange={handleBarcodeChange}
                    placeholder="Barkod okutun (Örn: 2 * 12345...)"
                    className="w-full h-10 bg-yellow-100 text-yellow-900 placeholder:text-yellow-700/70 border-2 border-yellow-300 rounded-lg pl-11 pr-4 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition"
                />
                </form>
                <div className="relative flex-grow" ref={searchContainerRef}>
                    <Icon name="tag" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-green-700" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder="Ürün adı, model, stok kodu ile ara..."
                        className="w-full h-10 bg-green-100 text-green-900 placeholder:text-green-700/70 border-2 border-green-300 rounded-lg pl-11 pr-4 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
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
                        <div className="flex h-10 items-center justify-between rounded-lg border-2 border-slate-300 bg-white px-3">
                            <div className="flex items-center gap-2">
                                <Icon name="customer" className="h-5 w-5 text-slate-600" />
                                <span className="font-semibold text-cyan-700">{selectedCustomer.name}</span>
                            </div>
                            <button onClick={() => setSelectedCustomer(null)} className="flex items-center gap-1 text-xs text-red-600 hover:underline">
                                <Icon name="x-circle" className="h-4 w-4" /> Kaldır
                            </button>
                        </div>
                    ) : (
                        <div className="relative">
                            <Icon name="customer" className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-red-700" />
                            <input
                                type="text"
                                value={customerSearch}
                                onChange={e => setCustomerSearch(e.target.value)}
                                placeholder="Müşteri Ara veya Seç"
                                className="h-10 w-full rounded-lg border-2 bg-red-100 text-red-900 placeholder:text-red-700/70 border-red-300 pl-11 pr-4 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                            />
                            {filteredCustomers.length > 0 && (
                                <div className="absolute top-full z-30 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-slate-300 bg-white shadow-lg">
                                    {filteredCustomers.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); }}
                                            className="w-full p-3 text-left hover:bg-cyan-50"
                                        >
                                            <p className="font-semibold">{c.name}</p>
                                            <p className="text-sm text-slate-500">{c.phone}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                    <button onClick={() => setIsAddCustomerModalOpen(true)} className="h-10 flex items-center gap-2 px-3 bg-sky-50 border-2 border-sky-200 text-sky-700 rounded-lg hover:bg-sky-100 transition focus:outline-none focus:ring-2 focus:ring-sky-500">
                        <Icon name="plus" className="w-4 h-4 text-sky-600"/><span className="font-semibold text-sm">Yeni Müşteri</span>
                    </button>
                    <button onClick={() => setIsBulkPriceModalOpen(true)} disabled={currentSale.length === 0} className="h-10 flex items-center gap-2 px-3 bg-purple-50 border-2 border-purple-200 text-purple-700 rounded-lg hover:bg-purple-100 transition focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-slate-200/50 disabled:cursor-not-allowed disabled:text-slate-500 disabled:border-slate-300">
                        <Icon name="edit" className="w-4 h-4 text-purple-600"/><span className="font-semibold text-sm">Toplu Fiyat</span>
                    </button>
                    <div className="relative" ref={columnManagerRef}>
                        <button onClick={() => setIsColumnManagerOpen(prev => !prev)} className="h-10 flex items-center gap-2 px-3 bg-slate-100 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-200 transition focus:outline-none focus:ring-2 focus:ring-slate-400">
                            <Icon name="view-columns" className="w-4 h-4 text-slate-600"/><span className="font-semibold text-sm text-slate-700">Sütunlar</span>
                        </button>
                        {isColumnManagerOpen && (
                            <div className="absolute top-full mt-2 right-0 w-80 bg-white border border-slate-300 rounded-lg shadow-xl z-30 p-4">
                                <p className="text-sm font-bold text-slate-600 px-2 pb-2 border-b mb-2">Gösterilecek Sütunlar</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                {allColumns.filter(c => c.id !== 'actions').map(col => (
                                    <label key={col.id} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-slate-100 cursor-pointer">
                                        <input type="checkbox" checked={!hiddenColumns.has(col.id)} onChange={() => toggleColumn(col.id)} className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" />
                                        <span className="text-slate-700 select-none">{col.label}</span>
                                    </label>
                                ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <button onClick={handlePrintReceipt} disabled={currentSale.length === 0} className="h-10 flex items-center gap-2 px-3 bg-blue-50 border-2 border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-200/50 disabled:cursor-not-allowed disabled:text-slate-500 disabled:border-slate-300">
                        <Icon name="printer" className="w-4 h-4 text-blue-600"/><span className="font-semibold text-sm">Önizleme</span>
                    </button>
                    <button onClick={handleWhatsAppReceipt} disabled={currentSale.length === 0} className="h-10 flex items-center gap-2 px-3 bg-emerald-50 border-2 border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-100 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-200/50 disabled:cursor-not-allowed disabled:text-slate-500 disabled:border-slate-300">
                        <Icon name="whatsapp" className="w-5 h-5 text-emerald-600"/><span className="font-semibold text-sm">WhatsApp</span>
                    </button>
                </div>
            </div>
            {error && <p className="text-red-600 mt-2 text-center text-sm animate-pulse">{error}</p>}
        </div>
        <div className="flex-grow overflow-auto">
          <table className="w-full text-left table-fixed">
            <thead className="text-[11px] text-cyan-800 uppercase bg-cyan-100 sticky top-0 z-10 select-none">
              <tr className="border-b-2 border-slate-200">
                {visibleColumns.map(col => (
                  <th
                    key={col.id}
                    scope="col"
                    className={`px-3 py-1.5 font-bold relative group border-r border-slate-200 last:border-r-0 cursor-move ${draggedColumn.current === col.id ? 'opacity-30' : ''} ${dragOverColumn === col.id && draggedColumn.current !== col.id ? 'drag-over-indicator-sale' : ''}`}
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
                <tr><td colSpan={visibleColumns.length} className="text-center py-10 h-full"><div className="flex flex-col items-center justify-center text-slate-400 p-8"><Icon name="new-sale" className="w-16 h-16 mx-auto mb-4 text-slate-300"/><h3 className="text-xl font-medium text-slate-500">Yeni Satış</h3><p className="text-sm">Başlamak için bir ürünün barkodunu okutun.</p></div></td></tr>
              ) : (currentSale.map(item => (
                <tr key={item.barcode} className="bg-white border-b last:border-0 hover:bg-cyan-50 transition-colors group/row">
                  {visibleColumns.map(col => {
                    let content: React.ReactNode = (item as any)[col.id] || '';
                    if (col.id === 'quantity') {
                        content = (<div className="flex items-center justify-center gap-1"><button onClick={() => updateQuantity(item.barcode, -1)} className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-200 text-slate-700 hover:bg-red-200 hover:text-red-700 transition"><Icon name="minus" className="w-4 h-4" /></button><span className="w-8 text-center font-bold text-sm text-slate-800">{item.quantity}</span><button onClick={() => updateQuantity(item.barcode, 1)} className="w-6 h-6 flex items-center justify-center rounded-md bg-slate-200 text-slate-700 hover:bg-green-200 hover:text-green-700 transition"><Icon name="plus" className="w-4 h-4" /></button></div>);
                    } else if (col.id === 'price') {
                        content = editingPrice?.barcode === item.barcode ? (<input type="text" value={editingPrice.value} onChange={(e) => setEditingPrice({ ...editingPrice, value: e.target.value })} onBlur={handlePriceUpdate} onKeyDown={(e) => handlePriceInputKeyDown(e, item.barcode)} autoFocus onFocus={(e) => e.target.select()} className="w-20 text-right bg-white border-2 border-cyan-500 rounded px-2 py-0.5 outline-none ring-2 ring-cyan-200"/>) : (<div onClick={() => setEditingPrice({ barcode: item.barcode, value: item.price.toString() })} className="cursor-pointer p-1 -m-1 rounded hover:bg-cyan-100 flex items-center justify-end" title="Fiyatı düzenle"><span>{`${item.price.toFixed(2)} ₺`}</span><Icon name="edit" className="w-3 h-3 ml-2 text-slate-400 opacity-0 group-hover/row:opacity-100 transition-opacity" /></div>);
                    } else if (col.id === 'total') {
                        content = `${(item.price * item.quantity).toFixed(2)} ₺`;
                    } else if (col.id === 'actions') {
                        content = (<div className="flex justify-center"><button onClick={() => removeItem(item.barcode)} className="p-1 rounded-full text-slate-400 hover:bg-red-100 hover:text-red-600 transition"><Icon name="trash" className="w-4 h-4" /></button></div>);
                    }
                    return (<td key={col.id} className="px-3 py-1 border-r border-slate-200 last:border-r-0" style={{ textAlign: col.align || 'left', fontWeight: ['total', 'price', 'stock'].includes(col.id) ? 600 : 400, color: col.id === 'total' ? '#0e7490' : ''}}>{content}</td>);
                  })}
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex-shrink-0 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-lg shadow-2xl p-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div>
                    <p className="text-base font-medium text-slate-200">Genel Toplam</p>
                    <p className="text-4xl font-bold tracking-tight text-cyan-300">{total.toFixed(2)}<span className="text-2xl ml-1">₺</span></p>
                </div>
                {totalItems > 0 && (
                    <>
                        <div className="h-12 w-px bg-slate-600"></div>
                        <div>
                            <p className="text-xs font-medium text-slate-200">Ürün Adedi</p>
                            <p className="text-xl font-bold text-white">{totalItems}</p>
                        </div>
                    </>
                )}
            </div>
            
            <div className="flex items-center gap-2">
                <button onClick={cancelSale} disabled={currentSale.length === 0} className="bg-red-500/20 text-red-300 hover:bg-red-500/40 font-semibold py-1.5 px-3 rounded-lg transition text-xs disabled:bg-slate-600/50 disabled:text-slate-400 disabled:cursor-not-allowed">İptal Et</button>
                <button onClick={handleSuspendSale} disabled={currentSale.length === 0} className="w-28 bg-orange-500 text-white font-bold text-xs py-2 rounded-lg transition shadow-md hover:shadow-orange-500/40 disabled:bg-slate-500 disabled:shadow-none disabled:cursor-not-allowed transform hover:-translate-y-0.5">Beklemeye Al</button>
                <button onClick={() => setIsSuspendedSalesModalOpen(true)} className="relative w-28 bg-yellow-500 text-white font-bold text-xs py-2 rounded-lg transition shadow-md hover:shadow-yellow-500/40 transform hover:-translate-y-0.5">
                    Bekleyenler
                    {suspendedSales.length > 0 && <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">{suspendedSales.length}</span>}
                </button>
                <button onClick={() => handleCompleteSale('Nakit')} disabled={currentSale.length === 0} className="w-36 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-sm py-2 rounded-lg transition shadow-lg hover:shadow-green-500/40 disabled:bg-slate-500 disabled:from-slate-500 disabled:shadow-none disabled:cursor-not-allowed transform hover:-translate-y-0.5">Nakit</button>
                <button onClick={() => handleCompleteSale('Kredi Kartı')} disabled={currentSale.length === 0} className="w-36 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold text-sm py-2 rounded-lg transition shadow-lg hover:shadow-blue-500/40 disabled:bg-slate-500 disabled:from-slate-500 disabled:shadow-none disabled:cursor-not-allowed transform hover:-translate-y-0.5">Kredi Kartı</button>
            </div>
        </div>
    </div>
  );
};

export default SaleView;