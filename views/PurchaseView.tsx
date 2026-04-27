import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Product, PurchaseItem, Supplier, AITask, PurchaseRecord, Brand, Model, Color, Size, Group, SaleRecord, MissingListRecord, CompanyInfo } from '../types';
import Icon from '../components/Icon';
import AiPurchaseModal from '../components/AiPurchaseModal';
import AiPurchaseReviewModal from '../components/AiPurchaseReviewModal';
import MissingListModal from '../components/MissingListModal';
import { extractPurchaseItemsFromContent } from '../services/geminiService';
import { playErrorSound } from '../services/soundService';

interface Definitions {
    brands: Brand[];
    models: Model[];
    colors: Color[];
    sizes: Size[];
    groups: Group[];
}

interface PurchaseViewProps {
  products: Product[];
  suppliers: Supplier[];
  salesHistory: SaleRecord[];
  missingLists: MissingListRecord[];
  onAddMissingList: (record: MissingListRecord) => void;
  onPurchaseComplete: (record: PurchaseRecord) => void;
  onUpdateProductPrice: (barcode: string, newPrice: number) => void;
  onUpdateProductBuyPrice: (barcode: string, newBuyPrice: number) => void;
  currentPurchase: PurchaseItem[];
  setCurrentPurchase: React.Dispatch<React.SetStateAction<PurchaseItem[]>>;
  definitions: Definitions;
  onUpdateBrands: (brands: Brand[]) => void;
  onUpdateModels: (models: Model[]) => void;
  onUpdateColors: (colors: Color[]) => void;
  onUpdateSizes: (sizes: Size[]) => void;
  onUpdateGroups: (groups: Group[]) => void;
  onUpdateSuppliers: (suppliers: Supplier[]) => void;
  companyInfo: CompanyInfo;
  payload?: any;
}

const allColumns: { id: string; label: string; minWidth: number; align?: 'left' | 'right' | 'center' }[] = [
  { id: 'name', label: 'Stok Adı', minWidth: 200 },
  { id: 'barcode', label: 'Barkod', minWidth: 140 },
  { id: 'quantity', label: 'Miktar', minWidth: 120, align: 'center' },
  { id: 'stock', label: 'Stok (Alım Sonrası)', minWidth: 140, align: 'right' },
  { id: 'buyPrice', label: 'Alış Fiyatı', minWidth: 120, align: 'right' },
  { id: 'total', label: 'Toplam', minWidth: 120, align: 'right' },
  { id: 'stokKodu', label: 'Stok Kodu', minWidth: 120 },
  { id: 'marka', label: 'Marka', minWidth: 100 },
  { id: 'model', label: 'Model', minWidth: 100 },
  { id: 'renk', label: 'Renk', minWidth: 80 },
  { id: 'beden', label: 'Beden', minWidth: 80 },
  { id: 'anaStokKodu', label: 'Ana Stok Kodu', minWidth: 130 },
  { id: 'actions', label: '', minWidth: 50, align: 'center' },
];

const COLUMN_WIDTHS_KEY = 'yenice_purchase_view_column_widths';
const HIDDEN_COLUMNS_KEY = 'yenice_purchase_view_hidden_columns';
const COLUMN_ORDER_KEY = 'yenice_purchase_view_column_order';

const CSV_HEADERS = [
  'Stok Kodu', 'Ana Stok Kodu', 'Stok Adı', 'Kalan Miktar', 'ALIŞ FİYATI 1',
  'SATIŞ FİYATI 1', 'Barkodu', 'Beden', 'Renk', 'Grubu', 'Ara Grubu',
  'Alt Grubu', 'Marka', 'Model', 'Tedarikçi'
];

const CSV_HEADER_MAP: { [key: string]: keyof Partial<PurchaseItem> | 'tedarikçi' } = {
    'stokkodu': 'stokKodu',
    'anastokkodu': 'anaStokKodu',
    'stokadı': 'name',
    'kalanmiktar': 'quantity', // Mapped to purchase quantity
    'alışfiyatı1': 'buyPrice',
    'satışfiyatı1': 'price',
    'barkodu': 'barcode',
    'beden': 'beden',
    'renk': 'renk',
    'grubu': 'group',
    'aragrubu': 'midGroup',
    'altgrubu': 'subGroup',
    'marka': 'marka',
    'model': 'model',
    'tedarikçi': 'tedarikçi',
};

const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, content], { type: mimeType });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

type PurchaseState = 'SELECT_SUPPLIER' | 'CREATE_INVOICE' | 'PRICE_CONTROL' | 'INVOICE_SAVED';


const PriceUpdateModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    items: PurchaseItem[];
    onSave: (updates: { barcode: string; newBuyPrice: number; newPrice: number }[]) => void;
}> = ({ isOpen, onClose, items, onSave }) => {
    const [updatedItems, setUpdatedItems] = useState<{[barcode: string]: {buyPrice: string, price: string}}>({});

    useEffect(() => {
        if(isOpen) {
            const initial = items.reduce((acc, item) => {
                acc[item.barcode] = {
                    buyPrice: item.buyPrice.toString(),
                    price: item.price.toString()
                };
                return acc;
            }, {} as {[barcode: string]: {buyPrice: string, price: string}});
            setUpdatedItems(initial);
        }
    }, [isOpen, items]);

    if (!isOpen) return null;

    const handlePriceChange = (barcode: string, field: 'buyPrice' | 'price', value: string) => {
        setUpdatedItems(prev => ({
            ...prev,
            [barcode]: {
                ...prev[barcode],
                [field]: value
            }
        }));
    };

    const handleSave = () => {
        const updates: { barcode: string; newBuyPrice: number; newPrice: number }[] = [];
        for(const barcode of Object.keys(updatedItems)) {
            const originalItem = items.find(i => i.barcode === barcode);
            if (!originalItem) continue;

            const newBuyPriceNum = parseFloat(updatedItems[barcode].buyPrice.replace(',', '.'));
            const newPriceNum = parseFloat(updatedItems[barcode].price.replace(',', '.'));
            
            if (!isNaN(newBuyPriceNum) && !isNaN(newPriceNum) && (originalItem.buyPrice !== newBuyPriceNum || originalItem.price !== newPriceNum)) {
                updates.push({ barcode, newBuyPrice: newBuyPriceNum, newPrice: newPriceNum });
            }
        }
        onSave(updates);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <header className="p-3 border-b flex justify-between items-center bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-800">Fiyatları Kontrol Et ve Onayla</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-2 rounded-full"><Icon name="x-circle" className="w-7 h-7"/></button>
                </header>
                <main className="flex-grow overflow-y-auto">
                    <table className="w-full text-xs text-left">
                        <thead className="text-[10px] text-slate-600 uppercase bg-slate-100 sticky top-0">
                            <tr>
                                <th className="p-2">Ürün Adı</th>
                                <th className="p-2 text-right">Alış Fiyatı (₺)</th>
                                <th className="p-2 text-right">Satış Fiyatı (₺)</th>
                                <th className="p-2 text-right">Kar Oranı (%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => {
                                const currentData = updatedItems[item.barcode] || { buyPrice: '0', price: '0' };
                                const buyPrice = parseFloat(currentData.buyPrice.replace(',', '.')) || 0;
                                const sellPrice = parseFloat(currentData.price.replace(',', '.')) || 0;
                                const margin = buyPrice > 0 ? ((sellPrice - buyPrice) / buyPrice) * 100 : 0;

                                return (
                                <tr key={item.barcode} className="border-b last:border-b-0 hover:bg-slate-50">
                                    <td className="p-2 font-medium">{item.name}</td>
                                    <td className="p-2">
                                        <input type="text" value={currentData.buyPrice} onChange={e => handlePriceChange(item.barcode, 'buyPrice', e.target.value)} className="w-full input-style text-right"/>
                                    </td>
                                    <td className="p-2">
                                        <input type="text" value={currentData.price} onChange={e => handlePriceChange(item.barcode, 'price', e.target.value)} className="w-full input-style text-right"/>
                                    </td>
                                    <td className={`p-2 text-right font-bold ${margin < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                        {margin.toFixed(2)}%
                                    </td>
                                </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </main>
                <footer className="p-4 border-t bg-slate-100 flex justify-end gap-4">
                    <button onClick={onClose} className="btn-footer-modal bg-white border border-slate-300 text-slate-700 hover:bg-slate-100">İptal</button>
                    <button onClick={handleSave} className="btn-footer-modal bg-cyan-600 text-white hover:bg-cyan-700">Faturayı Onayla ve Kaydet</button>
                </footer>
            </div>
             <style>{`
                .input-style { background-color: white; border: 1px solid #cbd5e1; border-radius: 0.5rem; padding: 0.5rem; font-size: 1rem; transition: all 0.2s; }
                .input-style:focus { outline: none; box-shadow: 0 0 0 2px #e0f2fe, 0 0 0 4px #0ea5e9; border-color: #0ea5e9; }
            `}</style>
        </div>
    );
};

const PrintLabelModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    items: PurchaseItem[];
}> = ({ isOpen, onClose, items }) => {
    const [printList, setPrintList] = useState<{ [barcode: string]: { selected: boolean; quantity: string; } }>({});

    useEffect(() => {
        if (isOpen) {
            const initialList = items.reduce((acc, item) => {
                acc[item.barcode] = {
                    selected: true,
                    quantity: item.quantity.toString()
                };
                return acc;
            }, {} as { [barcode: string]: { selected: boolean; quantity: string; } });
            setPrintList(initialList);
        }
    }, [isOpen, items]);

    if (!isOpen) return null;

    const handleToggle = (barcode: string) => {
        setPrintList(prev => ({
            ...prev,
            [barcode]: { ...prev[barcode], selected: !prev[barcode].selected }
        }));
    };
    
    const handleQuantityChange = (barcode: string, newQuantity: string) => {
        if (/^\d*$/.test(newQuantity)) {
            setPrintList(prev => ({
                ...prev,
                [barcode]: { ...prev[barcode], quantity: newQuantity }
            }));
        }
    };

    const totalLabelsToPrint = Object.keys(printList)
        .filter(key => printList[key].selected)
        .reduce((sum, key) => sum + (parseInt(printList[key].quantity, 10) || 0), 0);

    const generateCode39SVG = (text: string): string => {
        const CODE39_CHARS: { [key: string]: string } = {
            '0': 'n-n-w-w-n', '1': 'w-n-n-n-w', '2': 'n-w-n-n-w', '3': 'w-w-n-n-n',
            '4': 'n-n-w-n-w', '5': 'w-n-w-n-n', '6': 'n-w-w-n-n', '7': 'n-n-n-w-w',
            '8': 'w-n-n-w-n', '9': 'n-w-n-w-n', 'A': 'w-n-n-n-w', 'B': 'n-w-n-n-w',
            'C': 'w-w-n-n-n', 'D': 'n-n-w-n-w', 'E': 'w-n-w-n-n', 'F': 'n-w-w-n-n',
            'G': 'n-n-n-w-w', 'H': 'w-n-n-w-n', 'I': 'n-w-n-w-n', 'J': 'n-n-w-w-n',
            'K': 'w-n-n-n-n', 'L': 'n-w-n-n-n', 'M': 'w-w-n-n-n', 'N': 'n-n-w-n-n',
            'O': 'w-n-w-n-n', 'P': 'n-w-w-n-n', 'Q': 'n-n-n-w-n', 'R': 'w-n-n-w-n',
            'S': 'n-w-n-w-n', 'T': 'n-n-w-w-n', 'U': 'w-n-w-n-n', 'V': 'n-w-w-n-n',
            'W': 'w-w-w-n-n', 'X': 'n-n-w-w-n', 'Y': 'w-n-w-w-n', 'Z': 'n-w-w-w-n',
            '-': 'n-n-n-w-w', '.': 'w-n-n-w-w', ' ': 'n-w-n-w-w', '$': 'n-n-n-n-w',
            '/': 'n-n-n-w-n', '+': 'n-n-w-n-n', '%': 'n-w-n-n-n', '*': 'n-n-w-n-w'
        };

        const fullText = `*${text.toUpperCase().replace(/[^A-Z0-9-.\s$/+%]/g, '')}*`;
        let svgContent = '';
        let currentX = 0;
        const narrowWidth = 1.5;
        const wideWidth = 3;
        const height = 40;

        for (const char of fullText) {
            const pattern = CODE39_CHARS[char];
            if (!pattern) continue;

            const bars = pattern.split('-');
            for (let i = 0; i < bars.length; i++) {
                const isBar = i % 2 === 0;
                const isWide = bars[i] === 'w';
                const width = isWide ? wideWidth : narrowWidth;
                if (isBar) {
                    svgContent += `<rect x="${currentX}" y="0" width="${width}" height="${height}" fill="#000" />`;
                }
                currentX += width;
            }
            currentX += narrowWidth; // Inter-character space
        }
        return `<svg width="${currentX}" height="${height}" viewBox="0 0 ${currentX} ${height}" xmlns="http://www.w3.org/2000/svg">${svgContent}</svg>`;
    };
    
    const generateLabelsHtml = (): string => {
        const labels: string[] = [];
        for (const item of items) {
            const printInfo = printList[item.barcode];
            if (printInfo && printInfo.selected) {
                const quantity = parseInt(printInfo.quantity, 10) || 0;
                if (quantity > 0) {
                    const barcodeSvg = generateCode39SVG(item.barcode);
                    for (let i = 0; i < quantity; i++) {
                        labels.push(`
                            <div class="label">
                                <p class="label-name">${item.name}</p>
                                <p class="label-price">${item.price.toFixed(2)} TL</p>
                                <div class="barcode-svg">${barcodeSvg}</div>
                                <p class="label-barcode">${item.barcode}</p>
                            </div>
                        `);
                    }
                }
            }
        }

        return `
            <!DOCTYPE html><html><head><title>Etiket Yazdır</title>
            <style>
                @page { size: A4; margin: 0.5cm; }
                body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"; }
                .label-container { display: flex; flex-wrap: wrap; justify-content: flex-start; align-content: flex-start; gap: 0; }
                .label {
                    box-sizing: border-box;
                    width: 38mm; /* 5 columns on A4 with some spacing */
                    height: 25.4mm; /* 1 inch height */
                    padding: 2mm;
                    display: flex; flex-direction: column; justify-content: center; align-items: center;
                    overflow: hidden; text-align: center; page-break-inside: avoid;
                }
                .label-name { font-size: 7pt; font-weight: 600; margin: 0 0 1mm 0; line-height: 1.1; max-height: 2.2em; overflow: hidden;}
                .label-price { font-size: 11pt; font-weight: bold; margin: 0 0 1mm 0; }
                .barcode-svg { margin-bottom: 0.5mm; }
                .barcode-svg svg { height: 18px; width: auto; max-width: 100%; }
                .label-barcode { font-family: monospace; font-size: 8pt; margin: 0; letter-spacing: 0.5px; }
                @media print {
                    .label-container { border: none; }
                }
            </style>
            </head><body><div class="label-container">${labels.join('')}</div></body></html>
        `;
    };

    const handlePrint = () => {
        if (totalLabelsToPrint === 0) {
            alert("Yazdırmak için en az bir etiket seçin.");
            return;
        }

        const htmlContent = generateLabelsHtml();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => { printWindow.print(); }, 500);
        } else {
            alert("Yazdırma penceresi açılamadı. Lütfen pop-up engelleyicinizi kontrol edin.");
        }
    };

    const handleToggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = e.target.checked;
        setPrintList(prev => {
            const newList = { ...prev };
            for (const barcode of Object.keys(newList)) {
                newList[barcode].selected = isChecked;
            }
            return newList;
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <header className="p-3 border-b flex justify-between items-center bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-800">Barkod Etiketi Yazdır</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-2 rounded-full"><Icon name="x-circle" className="w-7 h-7"/></button>
                </header>
                <main className="flex-grow overflow-y-auto">
                    <div className="p-4 border-b">
                        <label className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-100 cursor-pointer font-semibold">
                            <input type="checkbox" checked={Object.keys(printList).length > 0 && Object.keys(printList).every(key => printList[key].selected)} onChange={handleToggleAll} className="h-5 w-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"/>
                            Tümünü Seç / Kaldır
                        </label>
                    </div>
                    <ul className="divide-y">
                        {items.map(item => (
                            <li key={item.barcode} className="p-4 grid grid-cols-3 items-center gap-4 hover:bg-slate-50">
                                <div className="col-span-2 flex items-center gap-4">
                                     <label className="flex items-center">
                                        <input type="checkbox" checked={printList[item.barcode]?.selected || false} onChange={() => handleToggle(item.barcode)} className="h-5 w-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"/>
                                    </label>
                                    <div>
                                        <p className="font-semibold">{item.name}</p>
                                        <p className="text-sm text-slate-500 font-mono">{item.barcode}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label htmlFor={`qty-${item.barcode}`} className="text-sm font-medium text-slate-600">Adet:</label>
                                    <input
                                        id={`qty-${item.barcode}`}
                                        type="text"
                                        value={printList[item.barcode]?.quantity || '0'}
                                        onChange={(e) => handleQuantityChange(item.barcode, e.target.value)}
                                        className="w-20 bg-white border border-slate-300 rounded-md p-1.5 text-center font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    />
                                </div>
                            </li>
                        ))}
                    </ul>
                </main>
                <footer className="p-4 border-t bg-slate-100 flex justify-end gap-4">
                    <button onClick={onClose} className="btn-footer-modal bg-white border border-slate-300 text-slate-700 hover:bg-slate-100">İptal</button>
                    <button onClick={handlePrint} className="btn-footer-modal bg-cyan-600 text-white hover:bg-cyan-700">
                        Yazdır ({totalLabelsToPrint} Etiket)
                    </button>
                </footer>
            </div>
             <style>{`
                 .btn-footer-modal { font-semibold; padding: 0.5rem 1.5rem; border-radius: 0.5rem; transition: all 0.2s; }
            `}</style>
        </div>
    );
};


const PurchaseView: React.FC<PurchaseViewProps> = (props) => {
  const { 
    products, suppliers, salesHistory, missingLists, onAddMissingList,
    onPurchaseComplete, onUpdateProductPrice, onUpdateProductBuyPrice,
    currentPurchase, setCurrentPurchase, definitions, onUpdateBrands,
    onUpdateModels, onUpdateColors, onUpdateSizes, onUpdateGroups,
    onUpdateSuppliers, companyInfo, payload 
  } = props;
  const [purchaseState, setPurchaseState] = useState<PurchaseState>('SELECT_SUPPLIER');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [barcode, setBarcode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingBuyPrice, setEditingBuyPrice] = useState<{ barcode: string; value: string } | null>(null);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [lastPurchaseSummary, setLastPurchaseSummary] = useState<{ supplierName: string; total: number; totalItems: number; } | null>(null);
  const [lastPurchaseItems, setLastPurchaseItems] = useState<PurchaseItem[]>([]);

  useEffect(() => {
    if (payload?.initialAction === 'MISSING_LIST') {
      setIsMissingListModalOpen(true);
    } else if (payload?.initialAction === 'AI_PURCHASE') {
      setIsAiModalOpen(true);
    } else if (payload?.initialAction === 'EXCEL_PURCHASE') {
      setIsExcelMenuOpen(true);
    }
  }, [payload]);
  
  // AI and Excel states
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isMissingListModalOpen, setIsMissingListModalOpen] = useState(false);
  const [isExcelMenuOpen, setIsExcelMenuOpen] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [aiTasks, setAiTasks] = useState<AITask[]>([]);
  const [reviewingTask, setReviewingTask] = useState<AITask | null>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const excelMenuRef = useRef<HTMLDivElement>(null);


  // States for product search
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSearchResult, setExpandedSearchResult] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isDiscountApplied, setIsDiscountApplied] = useState(false);
  
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  
  const defaultWidths = { name: 300, barcode: 150, quantity: 120, stock: 150, buyPrice: 130, total: 120, stokKodu: 130, marka: 110, model: 110, renk: 90, beden: 90, anaStokKodu: 140, actions: 60 };
  const defaultHidden = new Set(['stokKodu', 'marka', 'model', 'renk', 'beden', 'anaStokKodu', 'barcode', 'stock']);
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

  const isResizing = useRef<string | null>(null);
  const draggedColumn = useRef<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const columnManagerRef = useRef<HTMLDivElement>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);

  const generateUniqueBarcode = useCallback((
    existingProducts: Product[],
    currentCart: PurchaseItem[],
    newItemsInThisBatch: PurchaseItem[]
  ): string => {
      let barcode: string;
      let isUnique = false;
      const existingBarcodes = new Set([
          ...existingProducts.map(p => p.barcode),
          ...currentCart.map(i => i.barcode),
          ...newItemsInThisBatch.map(i => i.barcode)
      ]);

      while (!isUnique) {
          barcode = '20' + Math.floor(10000000000 + Math.random() * 90000000000).toString();
          if (!existingBarcodes.has(barcode)) {
              isUnique = true;
          }
      }
      return barcode!;
  }, []);

  useEffect(() => {
    if (purchaseState === 'CREATE_INVOICE') {
      barcodeInputRef.current?.focus();
    }
  }, [purchaseState]);

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
       if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchQuery('');
        setExpandedSearchResult(null);
      }
      if (columnManagerRef.current && !columnManagerRef.current.contains(event.target as Node)) {
        setIsColumnManagerOpen(false);
      }
      if (excelMenuRef.current && !excelMenuRef.current.contains(event.target as Node)) {
        setIsExcelMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showError = useCallback((message: string) => {
    setError(message);
    playErrorSound();
    setTimeout(() => setError(null), 3000);
  }, []);
  
  const showSuccess = useCallback((message: string) => {
    // A non-blocking success message. Could be replaced with a toast notification library.
    setError(message); // Using the error state for success messages for simplicity
    setTimeout(() => setError(null), 4000);
  }, []);

  const addProductToCart = useCallback((product: Product, quantityToAdd: number = 1) => {
    setError(null);
    
    // TEDARİKÇİ DOĞRULAMA (ESNEK KİLİT)
    if (selectedSupplier) {
        const prodMarka = (product.marka || '').toLowerCase().trim();
        const supName = (selectedSupplier.name || '').toLowerCase().trim();
        
        // Eğer marka ismi tedarikçi ismiyle eşleşiyorsa izin ver (Her marka bir tedarikçidir mantığı)
        const isMatch = (prodMarka && (supName.includes(prodMarka) || prodMarka.includes(supName)));

        if (!isMatch) {
            console.warn(`[Tedarikçi Kilidi] Eşleşme Bulunamadı: Ürün Markası:${prodMarka} <=> Seçili Tedarikçi:${supName}`);
            showError(`HATA: "${product.name}" ürünü ${selectedSupplier.name} firmasına ait değil!`);
            return;
        }
    }

    setCurrentPurchase(prevCart => {
      const existingItem = prevCart.find(item => item.barcode === product.barcode);
      let productToAdd = { ...product };

      if (isDiscountApplied && selectedSupplier?.discountRate) {
          const discount = selectedSupplier.discountRate / 100;
          productToAdd.buyPrice = product.buyPrice * (1 - discount);
      }

      if (existingItem) {
        return prevCart.map(item =>
          item.barcode === product.barcode ? { ...item, quantity: item.quantity + quantityToAdd } : item
        );
      } else {
        return [...prevCart, { ...productToAdd, quantity: quantityToAdd }];
      }
    });
    setBarcode('');
    setSearchQuery('');
    setExpandedSearchResult(null);
    barcodeInputRef.current?.focus();
  }, [setCurrentPurchase, isDiscountApplied, selectedSupplier]);
  
  const handleToggleDiscount = () => {
      const willBeApplied = !isDiscountApplied;
      setIsDiscountApplied(willBeApplied);

      if (!selectedSupplier?.discountRate) return;
      const discountRate = selectedSupplier.discountRate / 100;

      setCurrentPurchase(currentCart => currentCart.map(item => {
          const originalProduct = products.find(p => p.barcode === item.barcode);
          if (!originalProduct) return item; // For new products, buyPrice should already be correct

          const newBuyPrice = willBeApplied
              ? originalProduct.buyPrice * (1 - discountRate)
              : originalProduct.buyPrice;
          
          return { ...item, buyPrice: newBuyPrice };
      }));
  };

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
      addProductToCart(product, quantity);
    } else {
      showError('Ürün bulunamadı. Lütfen barkodu kontrol edin.');
    }
  }, [products, addProductToCart, showError]);

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
    addProductToCart(product, 1);
  };

  const updateQuantity = (barcode: string, delta: number) => {
    const itemInCart = currentPurchase.find(item => item.barcode === barcode);
    if (!itemInCart) return;
    const newQuantity = itemInCart.quantity + delta;
    if (newQuantity <= 0) {
      removeItem(barcode);
    } else {
      setCurrentPurchase(currentPurchase.map(item => item.barcode === barcode ? { ...item, quantity: newQuantity } : item));
    }
  };

  const removeItem = (barcode: string) => {
    setCurrentPurchase(currentPurchase.filter((item: PurchaseItem) => item.barcode !== barcode));
  };

  const handleBuyPriceUpdate = () => {
    if (!editingBuyPrice) return;
    const newBuyPrice = parseFloat(editingBuyPrice.value.replace(',', '.'));
    if (!isNaN(newBuyPrice) && newBuyPrice >= 0) {
      setCurrentPurchase(prevCart =>
        prevCart.map(item =>
          item.barcode === editingBuyPrice.barcode ? { ...item, buyPrice: newBuyPrice } : item
        )
      );
    } else {
      showError("Geçerli fiyat değeri.");
    }
    setEditingBuyPrice(null);
  };
  
  const handlePriceInputKeyDown = (e: React.KeyboardEvent, currentBarcode: string) => {
    if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      handleBuyPriceUpdate();
      const currentIndex = currentPurchase.findIndex(item => item.barcode === currentBarcode);
      if ((e.key === 'Enter' || e.key === 'ArrowDown') && currentIndex < currentPurchase.length - 1) {
        const nextItem = currentPurchase[currentIndex + 1];
        setEditingBuyPrice({ barcode: nextItem.barcode, value: nextItem.buyPrice.toString() });
      } else if (e.key === 'ArrowUp' && currentIndex > 0) {
        const prevItem = currentPurchase[currentIndex - 1];
        setEditingBuyPrice({ barcode: prevItem.barcode, value: prevItem.buyPrice.toString() });
      }
    } else if (e.key === 'Escape') {
      setEditingBuyPrice(null);
    }
  };

  const cancelPurchase = () => {
    setConfirmModal({
        isOpen: true,
        title: 'Faturayı İptal Et',
        message: 'Mevcut alış faturası iptal edilecek ve başa dönülecektir. Emin misiniz?',
        onConfirm: () => {
            setCurrentPurchase([]);
            setSelectedSupplier(null);
            setPurchaseState('SELECT_SUPPLIER');
            setError(null);
            setBarcode('');
            setIsDiscountApplied(false);
            setConfirmModal(null);
        }
    });
  };
  
  const total = currentPurchase.reduce((sum, item) => sum + item.buyPrice * item.quantity, 0);
  const totalItems = currentPurchase.reduce((sum, item) => sum + item.quantity, 0);

  const originalTotal = useMemo(() => {
    return currentPurchase.reduce((sum, item) => {
        const originalProduct = products.find(p => p.barcode === item.barcode);
        // Use the original product's buy price for this calculation
        const price = originalProduct ? originalProduct.buyPrice : item.buyPrice;
        return sum + price * item.quantity;
    }, 0);
  }, [currentPurchase, products]);

  const discountAmount = (isDiscountApplied && selectedSupplier?.discountRate) ? originalTotal - total : 0;

  const savePurchase = () => {
    if (currentPurchase.length === 0) {
        showError('Faturaya ürün eklemelisiniz.');
        return;
    }
    setPurchaseState('PRICE_CONTROL');
  };

  const confirmAndSavePurchase = (finalItems: PurchaseItem[]) => {
     const finalTotal = finalItems.reduce((sum, item) => sum + item.buyPrice * item.quantity, 0);
     const purchaseRecord: PurchaseRecord = {
      id: `purchase-${Date.now()}`,
      supplierId: selectedSupplier!.id,
      items: finalItems,
      total: finalTotal,
      date: new Date().toISOString(),
    };
    onPurchaseComplete(purchaseRecord);
    
    setLastPurchaseSummary({
        supplierName: selectedSupplier!.name,
        total: finalTotal,
        totalItems: finalItems.reduce((sum, i) => sum + i.quantity, 0)
    });
    setLastPurchaseItems(finalItems);
    setPurchaseState('INVOICE_SAVED');
    setIsDiscountApplied(false);
  }

  const handleChangeSupplier = () => {
    if(currentPurchase.length > 0) {
        setConfirmModal({
            isOpen: true,
            title: 'Tedarikçi Değiştir',
            message: 'Mevcut fatura iptal edilecek ve tedarikçi değiştirilecektir. Emin misiniz?',
            onConfirm: () => {
                setCurrentPurchase([]);
                setIsDiscountApplied(false);
                setSelectedSupplier(null);
                setPurchaseState('SELECT_SUPPLIER');
                setConfirmModal(null);
            }
        });
        return;
    }
    setCurrentPurchase([]);
    setIsDiscountApplied(false);
    setSelectedSupplier(null);
    setPurchaseState('SELECT_SUPPLIER');
  }

  const handleStartNewPurchase = () => {
      setSelectedSupplier(null);
      setLastPurchaseSummary(null);
      setLastPurchaseItems([]);
      setPurchaseState('SELECT_SUPPLIER');
  };
  
  const handleSavePrices = (updates: { barcode: string; newBuyPrice: number; newPrice: number }[]) => {
    const updatedCart = currentPurchase.map(item => {
        const update = updates.find(u => u.barcode === item.barcode);
        if (update) {
            return { ...item, buyPrice: update.newBuyPrice, price: update.newPrice };
        }
        return item;
    });
    confirmAndSavePurchase(updatedCart);
  };
  
  const processImportedItems = useCallback((items: Partial<PurchaseItem>[]) => {
      let addedCount = 0;
      let notFoundCount = 0;
      const notFoundIdentifiers: string[] = [];
      const newCartItems: PurchaseItem[] = [];

      // Performans Optimizasyonu: Ürünleri hızlı arama için Map'e alıyoruz (O(1) erişim)
      const productByBarcode = new Map(products.map(p => [p.barcode, p]));
      const productByStokKodu = new Map(products.map(p => [p.stokKodu, p]));

      for (const item of items as (Partial<PurchaseItem> & { tedarikçi?: string })[]) {
          if (!item.quantity || item.quantity <= 0) continue;

          let product: Product | undefined;
          if (item.barcode) product = productByBarcode.get(item.barcode);
          if (!product && item.stokKodu) product = productByStokKodu.get(item.stokKodu);

          // TEDARİKÇİ FİLTRELEME: Excel'deki veya DB'deki ürünün markası seçili firma ile uyuşmuyorsa atla
          if (selectedSupplier) {
              const excelMarka = (item.marka || '').toLowerCase().trim();
              const excelTedarikci = (item.tedarikçi || '').toLowerCase().trim();
              const dbMarka = (product?.marka || '').toLowerCase().trim();
              const supName = (selectedSupplier.name || '').toLowerCase().trim();

              // Marka önceliği: Excel'deki marka yoksa DB'deki markaya bak
              const activeMarka = excelMarka || dbMarka;

              const isMatch = (activeMarka && (supName.includes(activeMarka) || activeMarka.includes(supName))) || 
                              (excelTedarikci && (supName.includes(excelTedarikci) || excelTedarikci.includes(supName)));

              if (!isMatch && (activeMarka || excelTedarikci)) {
                  continue; // Farklı bir tedarikçinin ürünü ise faturaya ekleme
              }
          }
          
          if (product) {
              const importedBuyPrice = item.buyPrice !== undefined ? item.buyPrice : product.buyPrice;
              const finalBuyPrice = isDiscountApplied && selectedSupplier?.discountRate
                  ? importedBuyPrice * (1 - selectedSupplier.discountRate / 100)
                  : importedBuyPrice;
              newCartItems.push({ ...product, quantity: item.quantity, buyPrice: finalBuyPrice });
              addedCount++;
          } else {
              // New product logic
              if (!item.name) { // A new product must have a name
                  notFoundCount++;
                  notFoundIdentifiers.push(item.barcode || item.stokKodu || 'İsimsiz Ürün');
                  continue;
              }

              let newProductBarcode = item.barcode;

              if (!newProductBarcode) {
                  // Generate a barcode if missing for a new product
                  newProductBarcode = generateUniqueBarcode(products, currentPurchase, newCartItems);
              } else {
                  // If barcode is provided, check if it's already in use
                  if (products.some(p => p.barcode === newProductBarcode) || 
                      currentPurchase.some(p => p.barcode === newProductBarcode) ||
                      newCartItems.some(p => p.barcode === newProductBarcode))
                  {
                       notFoundCount++;
                       notFoundIdentifiers.push(`${item.name} (Barkod ${newProductBarcode} zaten kullanımda)`);
                       continue;
                  }
              }

              addedCount++;
              const importedBuyPrice = item.buyPrice !== undefined ? item.buyPrice : 0;
              const finalBuyPrice = isDiscountApplied && selectedSupplier?.discountRate
                  ? importedBuyPrice * (1 - (selectedSupplier.discountRate / 100))
                  : importedBuyPrice;
              
              const newProductItem: PurchaseItem = {
                  name: item.name,
                  barcode: newProductBarcode,
                  buyPrice: finalBuyPrice,
                  price: item.price || finalBuyPrice * 1.5, // Default 50% margin
                  stock: 0,
                  stokKodu: item.stokKodu || '',
                  marka: item.marka || selectedSupplier?.name || 'Bilinmiyor',
                  model: item.model || 'Standart',
                  renk: item.renk || '',
                  beden: item.beden || '',
                  anaStokKodu: item.anaStokKodu || '',
                  group: item.group || '',
                  midGroup: item.midGroup || '',
                  subGroup: item.subGroup || '',
                  quantity: item.quantity,
                  isNew: true,
              };
              newCartItems.push(newProductItem);
          }
      }
      
      setCurrentPurchase(prevCart => {
          const cartMap = new Map<string, PurchaseItem>(prevCart.map(i => [i.barcode, { ...i }]));
          for (const newItem of newCartItems) {
              if (cartMap.has(newItem.barcode)) {
                  const existingItem = cartMap.get(newItem.barcode)!;
                  existingItem.quantity += newItem.quantity;
                  existingItem.buyPrice = newItem.buyPrice; // Overwrite price with the latest import
              } else {
                  cartMap.set(newItem.barcode, newItem);
              }
          }
          return Array.from(cartMap.values());
      });

      let message = `${addedCount} ürün faturaya eklendi/güncellendi.`;
      if (notFoundCount > 0) {
          message += ` ${notFoundCount} ürün geçersiz bilgi (isim eksik veya barkod çakışması) nedeniyle atlandı.`;
          console.warn("Eklenemeyen Ürünler:", notFoundIdentifiers);
      }
      showSuccess(message);

  }, [products, currentPurchase, selectedSupplier, isDiscountApplied, setCurrentPurchase, showSuccess, generateUniqueBarcode]);


  const handleStartAiTask = useCallback(async (file: File, prompt: string) => {
      const taskId = `task-${Date.now()}`;
      const newTask: AITask = { id: taskId, fileName: file.name, status: 'processing' };
      setAiTasks(prev => [...prev, newTask]);

      try {
          const results = await extractPurchaseItemsFromContent(file, prompt);
          const completedTask = { ...newTask, status: 'completed' as const, results };
          setAiTasks(prev => prev.map(task => 
              task.id === taskId ? completedTask : task
          ));
          setReviewingTask(completedTask);
      } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.';
          setAiTasks(prev => prev.map(task => 
              task.id === taskId ? { ...task, status: 'error', error: errorMessage } : task
          ));
          showError(errorMessage);
      }
  }, [showError]);

  const handleCommitAiResults = useCallback((taskId: string, itemsToCommit: Partial<PurchaseItem>[]) => {
      processImportedItems(itemsToCommit);
      setReviewingTask(null);
      setAiTasks(prev => prev.filter(t => t.id !== taskId));
  }, [processImportedItems]);
  
  const handleDismissAiTask = useCallback((taskId: string) => {
      setAiTasks(prev => prev.filter(t => t.id !== taskId));
      if (reviewingTask?.id === taskId) {
          setReviewingTask(null);
      }
  }, [reviewingTask]);

  const handleExcelUploadClick = () => {
      excelInputRef.current?.click();
      setIsExcelMenuOpen(false);
  };
  
  const handleDownloadTemplate = () => {
    const csvHeader = CSV_HEADERS.join(';');
    downloadFile(csvHeader, 'alis_faturasi_sablonu.csv', 'text/csv;charset=utf-8;');
    setIsExcelMenuOpen(false);
  };

  const handleExcelFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    if (isExcel && !XLSX) {
        showError("Excel kütüphanesi yüklenemedi.");
        if (excelInputRef.current) excelInputRef.current.value = '';
        return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
        showSuccess('Dosya okunuyor, ürünler ve tanımlar işleniyor... Lütfen bekleyin.');

        setTimeout(() => {
            try {
                const data = event.target?.result;
                if (!data) throw new Error("Dosya boş veya okunamıyor.");
                
                let text: string;
                if (isExcel) {
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    text = XLSX.utils.sheet_to_csv(worksheet, { FS: ';' });
                } else {
                    text = data as string;
                }

                const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
                if (lines.length < 2) throw new Error("Dosya boş veya sadece başlık içeriyor.");
                
                const headers = lines[0].split(';').map(h => h.trim().toLocaleLowerCase('tr-TR').replace(/"/g, '').replace(/\uFEFF/g, ''));

                // --- Start of new definition handling logic ---
                const brandMap = new Map(definitions.brands.map(b => [b.name.toLowerCase(), b]));
                const modelMap = new Map(definitions.models.map(m => [`${m.brandId}-${m.name.toLowerCase()}`, m]));
                const colorMap = new Map(definitions.colors.map(c => [c.name.toLowerCase(), c]));
                const sizeMap = new Map(definitions.sizes.map(s => [s.name.toLowerCase(), s]));
                const supplierMap = new Map(suppliers.map(s => [s.name.toLowerCase(), s]));

                const groupStructure = new Map<string | null, Map<string, Group>>();
                for (const g of definitions.groups) {
                    if (!groupStructure.has(g.parentId)) {
                        groupStructure.set(g.parentId, new Map());
                    }
                    groupStructure.get(g.parentId)!.set(g.name.toLowerCase(), g);
                }

                const newBrands: Brand[] = [];
                const newModels: Model[] = [];
                const newColors: Color[] = [];
                const newSizes: Size[] = [];
                const newGroups: Group[] = [];
                const newSuppliers: Supplier[] = [];
                // --- End of new definition handling setup ---

                const allImportedItems: (Partial<PurchaseItem> & { tedarikçi?: string })[] = [];
                let totalSkipped = 0;
                let mainProductTemplate: Partial<PurchaseItem> | null = null;
                
                const addGroupIfNeeded = (name: string, parentId: string | null): Group | undefined => {
                    if (!name) return undefined;
                    const groupName = name.trim();
                    const groupKey = groupName.toLowerCase();
                    let parentMap = groupStructure.get(parentId);
                    if (!parentMap) {
                        parentMap = new Map();
                        groupStructure.set(parentId, parentMap);
                    }
                    if (!parentMap.has(groupKey)) {
                        const newGroup: Group = { id: `group-excel-${Date.now()}-${Math.random()}`, name: groupName, parentId, brandId: null };
                        newGroups.push(newGroup);
                        parentMap.set(groupKey, newGroup);
                        return newGroup;
                    }
                    return parentMap.get(groupKey);
                };

                const CHUNK_SIZE = 500;
                let currentIndex = 1;

                const processChunk = () => {
                    const chunk = lines.slice(currentIndex, currentIndex + CHUNK_SIZE);
                    if (chunk.length === 0) {
                        // All chunks processed, update definitions and then items
                        if (newSuppliers.length > 0) onUpdateSuppliers([...suppliers, ...newSuppliers]);
                        if (newBrands.length > 0) onUpdateBrands([...definitions.brands, ...newBrands]);
                        if (newModels.length > 0) onUpdateModels([...definitions.models, ...newModels]);
                        if (newColors.length > 0) onUpdateColors([...definitions.colors, ...newColors]);
                        if (newSizes.length > 0) onUpdateSizes([...definitions.sizes, ...newSizes]);
                        if (newGroups.length > 0) onUpdateGroups([...definitions.groups, ...newGroups]);
                        
                        if (allImportedItems.length > 0) {
                            processImportedItems(allImportedItems);
                        } else {
                            showError("Dosyadan eklenecek geçerli ürün bulunamadı.");
                        }
                        return;
                    }

                    for (const line of chunk) {
                        if (!line.trim()) continue;
                        const data = line.split(';').map(d => d.trim().replace(/"/g, ''));
                        const item: Partial<PurchaseItem> & { tedarikçi?: string } = {};
                        
                        for (const [index, header] of headers.entries()) {
                            const fieldKey = CSV_HEADER_MAP[header.replace(/\s+/g, '')];
                            if(fieldKey) {
                                let value: string | number | undefined = data[index];
                                if(['quantity', 'buyPrice', 'price'].includes(String(fieldKey))) {
                                    const cleanedValue = String(value).replace(',', '.');
                                    value = cleanedValue ? parseFloat(cleanedValue) : undefined;
                                    if (isNaN(value as number)) value = undefined;
                                }
                                if (value !== undefined && String(value).trim() !== '') {
                                    (item as Record<string, any>)[fieldKey as string] = value;
                                }
                            }
                        }

                        // --- Automatic Definition Creation Logic ---
                        if (item.tedarikçi) {
                            const supplierName = item.tedarikçi.trim();
                            if (supplierName && !supplierMap.has(supplierName.toLowerCase())) {
                                const newSupplier: Supplier = { id: `sup-excel-${Date.now()}-${Math.random()}`, name: supplierName };
                                newSuppliers.push(newSupplier);
                                supplierMap.set(supplierName.toLowerCase(), newSupplier);
                            }
                        }
                        let brandId: string | undefined;
                        if (item.marka) {
                            const brandName = item.marka.trim();
                            if (brandName && !brandMap.has(brandName.toLowerCase())) {
                                const newBrand: Brand = { id: `brand-excel-${Date.now()}-${Math.random()}`, name: brandName };
                                newBrands.push(newBrand);
                                brandMap.set(brandName.toLowerCase(), newBrand);
                                brandId = newBrand.id;
                            } else {
                                brandId = brandMap.get(brandName.toLowerCase())?.id;
                            }
                        }
                        if (item.model && brandId) {
                            const modelName = item.model.trim();
                            if (modelName && !modelMap.has(`${brandId}-${modelName.toLowerCase()}`)) {
                                const newModel: Model = { id: `model-excel-${Date.now()}-${Math.random()}`, name: modelName, brandId };
                                newModels.push(newModel);
                                modelMap.set(`${brandId}-${modelName.toLowerCase()}`, newModel);
                            }
                        }
                        if (item.renk) {
                            const colorName = item.renk.trim();
                            if (colorName && !colorMap.has(colorName.toLowerCase())) {
                                const newColor: Color = { id: `color-excel-${Date.now()}-${Math.random()}`, name: colorName };
                                newColors.push(newColor);
                                colorMap.set(colorName.toLowerCase(), newColor);
                            }
                        }
                        if (item.beden) {
                            const sizeName = item.beden.trim();
                            if (sizeName && !sizeMap.has(sizeName.toLowerCase())) {
                                const newSize: Size = { id: `size-excel-${Date.now()}-${Math.random()}`, name: sizeName };
                                newSizes.push(newSize);
                                sizeMap.set(sizeName.toLowerCase(), newSize);
                            }
                        }
                        
                        const parentGroup = addGroupIfNeeded(item.group || '', null);
                        if (parentGroup) {
                            const midGroup = addGroupIfNeeded(item.midGroup || '', parentGroup.id);
                            if (midGroup) {
                                addGroupIfNeeded(item.subGroup || '', midGroup.id);
                            }
                        }
                        // --- End of Automatic Definition Creation ---

                        if (item.anaStokKodu && item.name && !item.barcode && !item.renk && !item.beden) {
                            mainProductTemplate = { ...item };
                            continue; 
                        }

                        let finalItem: Partial<PurchaseItem> = { ...item };
                        if (mainProductTemplate) {
                            finalItem = { ...mainProductTemplate, ...item };
                        }

                        if (!finalItem.quantity || finalItem.quantity <= 0 || (!finalItem.barcode && !finalItem.stokKodu && !finalItem.name)) {
                            totalSkipped++;
                            continue; 
                        }

                        allImportedItems.push(finalItem);
                    }

                    currentIndex += CHUNK_SIZE;
                    setTimeout(processChunk, 0);
                };

                processChunk();

            } catch (err: any) {
                showError(`Dosya okunurken bir hata oluştu: ${err.message}`);
                console.error(err);
            }
        }, 50);
    };
      
      if (isExcel) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file, 'UTF-8');
      }

      if (e.target) e.target.value = '';
  };
  
  const searchResultGroups = useMemo(() => {
    if (searchQuery.length < 2) return [];
    const lowerCaseQuery = searchQuery.toLowerCase();
    const supplierFilter = selectedSupplier?.name.toLowerCase().trim();
    const groups = new Map<string, Product[]>();
    
    for (const product of products) {
      // Önce tedarikçi filtresi (Sadece seçili tedarikçinin ürünleri)
      if (supplierFilter && (product.marka || '').toLowerCase().trim() !== supplierFilter) continue;

      const isMatch = product.name.toLowerCase().includes(lowerCaseQuery) || product.barcode.includes(lowerCaseQuery) || product.stokKodu.toLowerCase().includes(lowerCaseQuery) || product.anaStokKodu.toLowerCase().includes(lowerCaseQuery);
      if (isMatch) {
        if (!groups.has(product.anaStokKodu)) groups.set(product.anaStokKodu, []);
        groups.get(product.anaStokKodu)!.push(product);
      }
    }
    return Array.from(groups.values()).sort((a, b) => a[0].name.localeCompare(b[0].name, 'tr'));
  }, [searchQuery, products, selectedSupplier]);

  const navigableItems = useMemo(() => {
    const items: Array<{ type: 'group' | 'variant'; product: Product; }> = [];
    for (const group of searchResultGroups) {
        items.push({ type: 'group', product: group[0] });
        if (group.length > 1 && expandedSearchResult === group[0].anaStokKodu) {
            for (const variant of group) {
                items.push({ type: 'variant', product: variant });
            }
        }
    }
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
                    handleSearchSelect(item.product);
                }
            } else if (item.type === 'variant') {
                handleSearchSelect(item.product);
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
    for (const id of defaultOrder) {
        if (!currentOrder.includes(id)) {
            currentOrder.push(id);
        }
    }
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


  if (purchaseState === 'SELECT_SUPPLIER') {
    const filteredSuppliers = suppliers
        .filter(s => s.name.toLowerCase().includes(supplierSearchTerm.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-900">
            <div className="w-full max-w-2xl bg-white dark:bg-slate-800 p-8 rounded-xl shadow-xl border dark:border-slate-700">
                <h2 className="text-3xl font-bold text-center text-slate-800 dark:text-white mb-6">Alış Faturası İçin Tedarikçi Seçin</h2>
                <input
                    type="text"
                    value={supplierSearchTerm}
                    onChange={(e) => setSupplierSearchTerm(e.target.value)}
                    placeholder="Tedarikçi ara..."
                    className="w-full h-12 border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg px-4 text-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:text-white mb-4"
                    autoFocus
                />
                <div className="max-h-80 overflow-y-auto space-y-2">
                    {filteredSuppliers.map((s: Supplier) => (
                        <button
                            key={s.id}
                            onClick={() => {
                                setSelectedSupplier(s);
                                setPurchaseState('CREATE_INVOICE');
                            }}
                            className="w-full text-left p-4 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 hover:text-cyan-800 dark:hover:text-cyan-300 transition font-semibold text-slate-700 dark:text-slate-200"
                        >
                            {s.name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
  }

  if (purchaseState === 'INVOICE_SAVED' && lastPurchaseSummary) {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
            <div className="w-full max-w-2xl bg-white dark:bg-slate-800 p-6 rounded-xl shadow-xl border dark:border-slate-700 text-center">
                <Icon name="check" className="w-10 h-10 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Fatura Başarıyla Kaydedildi!</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                    <span className="font-bold">{lastPurchaseSummary.supplierName}</span> firmasından alınan
                    <span className="font-bold"> {lastPurchaseSummary.totalItems}</span> adet ürün
                    <span className="font-bold"> ({lastPurchaseSummary.total.toFixed(2)} ₺) </span>
                    stoklara eklendi.
                </p>
                <div className="flex justify-center gap-4">
                    <button onClick={handleStartNewPurchase} className="btn-action bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600">
                        <Icon name="plus" className="w-5 h-5"/> Yeni Fatura Oluştur
                    </button>
                    <button onClick={() => setIsPrintModalOpen(true)} className="btn-action bg-cyan-600 text-white hover:bg-cyan-700">
                       <Icon name="printer" className="w-5 h-5"/> Etiket Yazdır
                    </button>
                </div>
            </div>
             <PrintLabelModal
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                items={lastPurchaseItems}
            />
        </div>
    );
  }


  return (
    <div className="w-full h-full flex flex-col gap-4">
        {isAiModalOpen && <AiPurchaseModal onClose={() => setIsAiModalOpen(false)} onStartTask={handleStartAiTask} />}
        {reviewingTask && <AiPurchaseReviewModal task={reviewingTask} onClose={() => setReviewingTask(null)} onCommit={handleCommitAiResults} onDismiss={handleDismissAiTask} />}
        {confirmModal?.isOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
                    <div className="p-8 text-center">
                        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-600">
                            <Icon name="reports" className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight mb-2">{confirmModal.title}</h3>
                        <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px] leading-relaxed px-4">{confirmModal.message}</p>
                    </div>
                    <div className="flex border-t dark:border-slate-700">
                        <button onClick={() => setConfirmModal(null)} className="flex-1 h-20 font-black text-xs uppercase tracking-[0.2em] text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">VAZGEÇ</button>
                        <button onClick={confirmModal.onConfirm} className="flex-1 h-20 font-black text-xs uppercase tracking-[0.2em] bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-inner">EVET, ONAYLA</button>
                    </div>
                </div>
            </div>
        )}
        {isMissingListModalOpen && (
            <MissingListModal 
                isOpen={true} 
                onClose={() => setIsMissingListModalOpen(false)} 
                products={products} 
                suppliers={suppliers} 
                salesHistory={salesHistory}
                missingLists={missingLists}
                onAddMissingList={onAddMissingList}
            />
        )}
        <input type="file" ref={excelInputRef} style={{ display: 'none' }} accept=".csv, .xlsx, .xls" onChange={handleExcelFileSelected} />
        {purchaseState === 'PRICE_CONTROL' && 
            <PriceUpdateModal 
                isOpen={true}
                onClose={() => setPurchaseState('CREATE_INVOICE')}
                items={currentPurchase}
                onSave={handleSavePrices}
            />
        }
      <style>{`
          .drag-over-indicator::before {
              content: '';
              position: absolute;
              top: 10%;
              left: -2px;
              width: 4px;
              height: 80%;
              background-color: #0ea5e9;
              border-radius: 4px;
          }
          .btn-action {
              display: flex; align-items: center; justify-content: center; gap: 0.5rem; height: 2.5rem; padding: 0 1rem;
              border-radius: 0.5rem; font-weight: 600; transition: all 0.2s; white-space: nowrap;
              border: 2px solid transparent;
          }
      `}</style>
      <div className="flex-grow flex flex-col bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden">
        <header className="p-3 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
           <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-bold text-slate-800 dark:text-white">Alış Faturası Oluştur</h2>
             <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tedarikçi: </span>
                <div className="flex items-center gap-2 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800/50 px-4 py-1.5 rounded-xl shadow-sm">
                   <Icon name="supplier" className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                   <span className="font-bold text-cyan-800 dark:text-cyan-200">{selectedSupplier?.name}</span>
                </div>
                <button 
                  onClick={handleChangeSupplier} 
                  className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-[10px] font-black text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 transition-all uppercase tracking-tighter"
                >
                   <Icon name="refresh" className="w-3 h-3" /> DEĞİŞTİR
                </button>
              </div>
           </div>
          <div className="flex items-start gap-4">
              <form onSubmit={handleBarcodeSubmit} className="relative flex-grow">
                  <Icon name="barcode" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"/>
                  <input ref={barcodeInputRef} type="text" value={barcode} onChange={handleBarcodeChange} placeholder="Barkod okutun (Örn: 50 * 869...)" className="w-full h-10 bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-lg pl-12 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:text-white"/>
              </form>
              <div className="relative flex-grow" ref={searchContainerRef}>
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleSearchKeyDown} placeholder="Ürün adı, kod ile ara..." className="w-full h-10 bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 rounded-lg pl-4 pr-4 text-base focus:outline-none focus:ring-2 focus:ring-pink-500 dark:text-white"/>
                  {searchResultGroups.length > 0 && (
                      <div ref={searchResultsRef} className="absolute top-full mt-2 w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-lg z-20 max-h-80 overflow-y-auto">
                          {searchResultGroups.map((group: Product[]) => {
                              const mainProduct = group[0];
                              const hasVariants = group.length > 1;
                              const isExpanded = expandedSearchResult === mainProduct.anaStokKodu;
                              const isGroupHighlighted = highlightedIndex >= 0 && navigableItems[highlightedIndex]?.type === 'group' && navigableItems[highlightedIndex]?.product.barcode === mainProduct.barcode;
                              return (
                                  <div key={mainProduct.anaStokKodu} className="border-b dark:border-slate-700 last:border-b-0">
                                      <div onClick={() => hasVariants ? setExpandedSearchResult(p => p === mainProduct.anaStokKodu ? null : mainProduct.anaStokKodu) : handleSearchSelect(mainProduct)} className={`p-3 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 flex justify-between items-center cursor-pointer ${isGroupHighlighted ? 'bg-cyan-100 dark:bg-cyan-900/50 search-item-highlighted' : ''}`}>
                                          <div><p className="font-semibold text-slate-800 dark:text-slate-200">{mainProduct.name.replace(/\s*\(.+\)$/, '')} - {mainProduct.marka}</p><p className="text-sm text-slate-500 dark:text-slate-400">{hasVariants ? `${group.length} varyasyon` : `${mainProduct.renk} - ${mainProduct.beden}`}</p></div>
                                          {hasVariants && <Icon name="arrows-vertical" className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />}
                                      </div>
                                      {isExpanded && (
                                          <div className="bg-slate-50 dark:bg-slate-900/50 p-2">{group.map(v => {
                                              const isVariantHighlighted = highlightedIndex >= 0 && navigableItems[highlightedIndex]?.type === 'variant' && navigableItems[highlightedIndex]?.product.barcode === v.barcode;
                                              return (<div key={v.barcode} onClick={() => handleSearchSelect(v)} className={`flex justify-between p-2 rounded-md hover:bg-cyan-100 dark:hover:bg-cyan-900/30 cursor-pointer ${isVariantHighlighted ? 'bg-cyan-100 dark:bg-cyan-900/50 search-item-highlighted' : ''}`}>
                                                  <span className="text-slate-700 dark:text-slate-300">{v.beden} / {v.renk}</span> <span className="font-semibold text-slate-800 dark:text-slate-200">{v.buyPrice.toFixed(2)} ₺</span>
                                              </div>)
                                          })}</div>
                                      )}
                                  </div>
                              );
                          })}
                      </div>
                  )}
              </div>
              <div className="flex-shrink-0 flex items-center gap-2">
                <button onClick={() => setIsMissingListModalOpen(true)} className="btn-action bg-amber-500 hover:bg-amber-600 text-white">
                    <Icon name="list-bullet" />
                    <span>Eksik Listesi</span>
                </button>
                {companyInfo.aiEnabled && (
                  <button onClick={() => setIsAiModalOpen(true)} className="btn-action bg-pink-500 hover:bg-pink-600 text-white"><Icon name="ai" /><span>AI ile Yükle</span></button>
                )}
                <div className="relative" ref={excelMenuRef}>
                    <button onClick={() => setIsExcelMenuOpen(prev => !prev)} className="btn-action bg-green-600 hover:bg-green-700 text-white">
                        <Icon name="excel" />
                        <span>Excel İşlemleri</span>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1 opacity-80" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                    {isExcelMenuOpen && (
                        <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-xl z-20">
                            <button onClick={handleDownloadTemplate} className="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3"><Icon name="download" className="w-5 h-5 text-slate-500 dark:text-slate-400" /> <span className="font-medium text-slate-700 dark:text-slate-200">Şablon İndir</span></button>
                            <button onClick={handleExcelUploadClick} className="w-full text-left px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-3 border-t dark:border-slate-700"><Icon name="upload" className="w-5 h-5 text-slate-500 dark:text-slate-400" /> <span className="font-medium text-slate-700 dark:text-slate-200">Şablon Yükle</span></button>
                        </div>
                    )}
                </div>

                <div className="relative" ref={columnManagerRef}>
                    <button onClick={() => setIsColumnManagerOpen(prev => !prev)} className="h-10 flex items-center gap-2 px-4 bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition focus:outline-none focus:ring-2 focus:ring-slate-400 text-slate-700 dark:text-slate-200">
                        <Icon name="view-columns" className="w-5 h-5 text-slate-600"/>
                        <span className="font-semibold text-slate-700">Sütunlar</span>
                    </button>
                    {isColumnManagerOpen && (
                        <div className="absolute top-full mt-2 right-0 w-96 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xl z-30 p-4">
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-300 px-2 pb-2 border-b dark:border-slate-700 mb-2">Gösterilecek Sütunlar</p>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                            {allColumns.filter(c => c.id !== 'actions').map((col: any) => (
                                <label key={col.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                    <input type="checkbox" checked={!hiddenColumns.has(col.id)} onChange={() => toggleColumn(col.id)} className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" />
                                    <span className="text-slate-700 dark:text-slate-300 select-none">{col.label}</span>
                                </label>
                            ))}
                            </div>
                        </div>
                    )}
                </div>
                {selectedSupplier?.discountRate && (
                  <button onClick={handleToggleDiscount} className={`h-10 flex items-center gap-2 px-4 rounded-lg font-semibold transition ${isDiscountApplied ? 'bg-pink-600 text-white' : 'bg-white dark:bg-slate-800 border-2 border-pink-500 text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20'}`}>
                      <Icon name="tag" className="w-5 h-5"/>
                      <span>%{selectedSupplier.discountRate} İskonto {isDiscountApplied ? 'Aktif' : 'Uygula'}</span>
                  </button>
                )}
              </div>
          </div>
          {error && <p className="text-red-600 mt-2 text-center text-sm animate-pulse">{error}</p>}
        </header>
        <div className="flex-grow overflow-y-auto">
          <table className="w-full text-xs text-left table-fixed">
            <thead className="text-[11px] text-amber-800 dark:text-amber-200 uppercase bg-amber-100 dark:bg-amber-900/30 sticky top-0 z-10 select-none">
              <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                {visibleColumns.map((col: any) => (
                    <th 
                      key={col.id} 
                      scope="col" 
                      className={`px-2 py-1 font-bold relative group border-r border-slate-200 dark:border-slate-700 last:border-r-0 cursor-move ${draggedColumn.current === col.id ? 'opacity-30' : ''} ${dragOverColumn === col.id && draggedColumn.current !== col.id ? 'drag-over-indicator' : ''}`}
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
                          {col.id !== 'actions' && <Icon name="arrows-vertical" className="w-3 h-3 ml-1 text-slate-400 shrink-0" />}
                        </div>
                        {col.id !== 'actions' && 
                          <div 
                            onMouseDown={(e) => handleMouseDown(e, col.id)} 
                            className="absolute top-0 right-[-4px] h-full w-2 cursor-col-resize z-20 group-hover:bg-cyan-300/50 transition-colors"
                          />
                        }
                    </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentPurchase.length === 0 ? (
                <tr><td colSpan={visibleColumns.length} className="text-center py-10"><div className="flex flex-col items-center justify-center text-slate-400 p-8"><Icon name="purchase" className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600"/><h3 className="text-xl font-medium text-slate-500 dark:text-slate-400">Fatura Boş</h3><p className="text-sm">Başlamak için bir ürünün barkodunu okutun veya arayın.</p></div></td></tr>
              ) : (
                <>
                  {currentPurchase.slice(0, 200).map(item => (
                    <tr key={item.barcode} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 last:border-0 hover:bg-amber-50 dark:hover:bg-amber-900/20 group/row transition-colors">
                       {visibleColumns.map((col: any) => {
                          let content: React.ReactNode;
                          if (col.id === 'quantity') {
                              content = (
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => updateQuantity(item.barcode, -1)} className="btn-quantity dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"><Icon name="minus" className="w-4 h-4" /></button>
                                    <span className="w-8 text-center font-bold text-md text-slate-800 dark:text-slate-200">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.barcode, 1)} className="btn-quantity dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"><Icon name="plus" className="w-4 h-4" /></button>
                                  </div>
                              );
                          } else if (col.id === 'buyPrice') {
                              content = editingBuyPrice?.barcode === item.barcode ? 
                                  (<input type="text" value={editingBuyPrice.value} onChange={(e) => setEditingBuyPrice({ ...editingBuyPrice, value: e.target.value })} onBlur={handleBuyPriceUpdate} onKeyDown={(e) => handlePriceInputKeyDown(e, item.barcode)} autoFocus onFocus={(e) => e.target.select()} className="w-24 text-right bg-white dark:bg-slate-700 border-2 border-cyan-500 rounded px-2 py-1 outline-none ring-2 ring-cyan-200 dark:text-white"/>) : 
                                  (<div onClick={() => setEditingBuyPrice({ barcode: item.barcode, value: item.buyPrice.toString() })} className="cursor-pointer p-1 -m-1 rounded hover:bg-cyan-100 dark:hover:bg-cyan-900/30 flex items-center justify-end" title="Fiyatı düzenle"><span>{`${item.buyPrice.toFixed(2)} ₺`}</span><Icon name="edit" className="w-3 h-3 ml-2 text-slate-400 opacity-0 group-hover/row:opacity-100 transition-opacity" /></div>);
                          } else if (col.id === 'total') {
                              content = `${(item.buyPrice * item.quantity).toFixed(2)} ₺`;
                          } else if (col.id === 'stock') {
                              content = item.stock + item.quantity;
                          } else if (col.id === 'actions') {
                              content = <div className="flex justify-center"><button onClick={() => removeItem(item.barcode)} className="p-2 rounded-full text-slate-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition"><Icon name="trash" className="w-4 h-4" /></button></div>
                          } else {
                              content = (item as any)[col.id] ?? '';
                          }

                          return (
                              <td key={col.id} className="px-2 py-0.5 border-r border-slate-200 dark:border-slate-700 last:border-r-0" style={{ textAlign: col.align || 'left', fontWeight: ['total', 'buyPrice', 'stock'].includes(col.id) ? 600 : 400, color: col.id === 'total' ? (companyInfo.darkMode ? '#22d3ee' : '#0891b2') : ''}}>
                                  {content}
                              </td>
                          )
                       })}
                    </tr>
                  ))}
                  {currentPurchase.length > 200 && (
                    <tr className="bg-amber-50 dark:bg-amber-900/10">
                      <td colSpan={visibleColumns.length} className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-400 font-bold uppercase tracking-widest text-[10px]">
                          <Icon name="reports" className="w-4 h-4 animate-bounce" />
                          PERFORMANS İÇİN İLK 200 ÜRÜN GÖSTERİLİYOR. TOPLAM {currentPurchase.length} ÜRÜN İŞLEME ALINDI.
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex-shrink-0 bg-gradient-to-r from-slate-700 to-slate-800 dark:from-slate-900 dark:to-slate-950 text-white rounded-lg shadow-2xl p-2 flex items-center justify-between">
        <div className="flex items-center gap-6">
            <div>
                <p className="text-xs font-medium text-slate-300 dark:text-slate-400">Toplam Ürün Adedi</p>
                <p className="text-2xl font-bold tracking-tight text-white dark:text-slate-100">{totalItems}<span className="text-lg ml-2">adet</span></p>
            </div>
            <div className="h-10 w-px bg-slate-600 dark:bg-slate-800"></div>
            {isDiscountApplied && selectedSupplier?.discountRate && discountAmount > 0.005 && (
              <>
                <div>
                    <p className="text-xs font-medium text-slate-300 dark:text-slate-400">Uygulanan İskonto (%{selectedSupplier.discountRate})</p>
                    <p className="text-2xl font-bold tracking-tight text-pink-300 dark:text-pink-400">{discountAmount.toFixed(2)}<span className="text-lg ml-1">₺</span></p>
                </div>
                <div className="h-10 w-px bg-slate-600 dark:bg-slate-800"></div>
              </>
            )}
            <div>
                <p className="text-xs font-medium text-slate-300 dark:text-slate-400">Fatura Toplamı</p>
                <p className="text-2xl font-bold tracking-tight text-cyan-300 dark:text-cyan-400">{total.toFixed(2)}<span className="text-lg ml-1">₺</span></p>
            </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={cancelPurchase} 
            disabled={currentPurchase.length === 0} 
            className="flex items-center gap-2 px-6 h-12 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
          >
            <Icon name="trash" className="w-4 h-4" /> FATURAYI İPTAL ET
          </button>
          <button 
            onClick={savePurchase} 
            disabled={currentPurchase.length === 0} 
            className="flex items-center gap-3 px-10 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-black text-sm shadow-xl shadow-emerald-900/20 hover:shadow-emerald-500/40 hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
          >
            <Icon name="check" className="w-5 h-5" /> 
            <span>FATURAYI KAYDET</span>
          </button>
        </div>
      </div>
      <style>{`
          .btn-quantity { display: flex; align-items: center; justify-content: center; width: 1.75rem; height: 1.75rem; border-radius: 0.375rem; background-color: #e2e8f0; color: #334155; transition: all 0.2s; }
          .btn-quantity:hover { background-color: #94a3b8; color: #f8fafc; }
          .btn-footer { display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-semibold; padding: 0.5rem 1rem; border-radius: 0.5rem; transition: all 0.2s; }
          .btn-footer:disabled { background: #475569; color: #94a3b8; cursor: not-allowed; box-shadow: none; transform: none; }
      `}</style>
    </div>
  );
};

export default PurchaseView;