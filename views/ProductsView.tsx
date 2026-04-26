import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { Product, Brand, Model, Color, Size, Group, ProductFilters, Supplier, CompanyInfo, SaleRecord } from '../types';
import Icon from '../components/Icon';
import AddProductModal from '../components/AddProductModal';
import AiProductModal from '../components/AiProductModal';
import ProductFiltersPanel from '../components/ProductFilters';
import EditProductModal from '../components/EditProductModal';
import { playErrorSound } from '../services/soundService';

interface Definitions {
    brands: Brand[];
    models: Model[];
    colors: Color[];
    sizes: Size[];
    groups: Group[];
}
interface ProductsViewProps {
  products: Product[];
  suppliers: Supplier[];
  salesHistory: SaleRecord[];
  onAddProduct: (product: Product) => void;
  onAddMultipleProducts: (products: Product[]) => void;
  onStartAiTask: (file: File, prompt: string) => void;
  definitions: Definitions;
  onDeleteProduct: (barcode: string) => void;
  onRestoreProduct: (barcode: string) => void;
  onUpdateProductPrice: (barcode: string, newPrice: number) => void;
  onUpdateProductBuyPrice: (barcode: string, newBuyPrice: number) => void;
  onUpdateProduct: (originalBarcode: string, updates: Partial<Product>) => boolean;
  onUpdateProductStock: (barcode: string, newStock: number) => void;
  onBulkUpdateProducts?: (updates: { barcode: string, updates: Partial<Product> }[]) => void;
  onAddDefinition?: (type: 'brand' | 'model' | 'group' | 'color' | 'size', data: any) => void;
  onMinimizeTask?: (task: any) => void;
  restoreSignal?: number;
  companyInfo: CompanyInfo;
}

const allColumns = [
  { id: 'name', label: 'Stok Adı', minWidth: 250 },
  { id: 'description', label: 'Açıklama', minWidth: 300 },
  { id: 'marka', label: 'Marka', minWidth: 100 },
  { id: 'model', label: 'Model', minWidth: 100 },
  { id: 'anaStokKodu', label: 'Ana Stok Kodu', minWidth: 120 },
  { id: 'shelfLocation', label: 'Raf/Konum', minWidth: 120 },
  { id: 'stock', label: 'Stok', minWidth: 100, align: 'right' as const },
  { id: 'buyPrice', label: 'Alış Fiyatı', minWidth: 120, align: 'right' as const },
  { id: 'price', label: 'Satış Fiyatı', minWidth: 120, align: 'right' as const },
  { id: 'profit', label: 'Kar (₺)', minWidth: 100, align: 'right' as const },
  { id: 'profitMargin', label: '% Kar', minWidth: 80, align: 'right' as const },
  { id: 'stokKodu', label: 'Stok Kodu', minWidth: 120 },
  { id: 'barcode', label: 'Barkod', minWidth: 140 },
  { id: 'renk', label: 'Renk', minWidth: 80 },
  { id: 'beden', label: 'Beden', minWidth: 80 },
  { id: 'group', label: 'Grup', minWidth: 100 },
  { id: 'midGroup', label: 'Ara Grup', minWidth: 100 },
  { id: 'subGroup', label: 'Alt Grup', minWidth: 100 },
  { id: 'actions', label: 'İşlemler', minWidth: 100, align: 'center' as const },
];

const CSV_HEADERS = [
  'Stok Kodu', 'Ana Stok Kodu',  'Stok Adı', 'Kalan Miktar', 'ALIŞ FİYATI 1', 'SATIŞ FİYATI 1', 'Kar (₺)', '% Kar',
  'Barkodu', 'Beden', 'Renk', 'Grubu', 'Ara Grubu', 'Alt Grubu', 'Marka', 'Model'
];

const COLUMN_WIDTHS_KEY = 'yenice_products_view_column_widths';
const HIDDEN_COLUMNS_KEY = 'yenice_products_view_hidden_columns';
const COLUMN_ORDER_KEY = 'yenice_products_view_column_order';

const defaultWidths = allColumns.reduce<Record<string, number>>((acc, col) => ({ ...acc, [col.id]: col.minWidth }), {});
const defaultHidden = new Set(['stokKodu', 'barcode', 'renk', 'beden', 'group', 'midGroup', 'subGroup', 'description']);
const defaultOrder = allColumns.map(c => c.id);


const ProductsView: React.FC<ProductsViewProps> = (props) => {
    const { products, suppliers, salesHistory, onAddProduct, onAddMultipleProducts, onStartAiTask, definitions, onDeleteProduct, onRestoreProduct, onUpdateProductPrice, onUpdateProductBuyPrice, onUpdateProduct, onUpdateProductStock, onBulkUpdateProducts, onAddDefinition, onMinimizeTask } = props;

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const [filters, setFilters] = useState<ProductFilters>({});
    const [editingProductGroup, setEditingProductGroup] = useState<Product[] | null>(null);

    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const excelInputRef = useRef<HTMLInputElement>(null);
    const [isExcelMenuOpen, setIsExcelMenuOpen] = useState(false);
    const excelMenuRef = useRef<HTMLDivElement>(null);
    const [isFabOpen, setIsFabOpen] = useState(false);
    
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [editingCell, setEditingCell] = useState<{ barcode: string; field: 'stock' | 'buyPrice' | 'price'; isGroup?: boolean } | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
        try { 
            const saved = localStorage.getItem(COLUMN_WIDTHS_KEY); 
            const parsed = saved ? JSON.parse(saved) : null;
            return parsed && typeof parsed === 'object' ? { ...defaultWidths, ...parsed } : defaultWidths; 
        } 
        catch (e) { return defaultWidths; }
    });
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(() => {
        try { 
            const saved = localStorage.getItem(HIDDEN_COLUMNS_KEY); 
            const parsed = saved ? JSON.parse(saved) : null;
            return parsed && Array.isArray(parsed) ? new Set(parsed) : defaultHidden; 
        } 
        catch (e) { return defaultHidden; }
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (excelMenuRef.current && !excelMenuRef.current.contains(event.target as Node)) {
                setIsExcelMenuOpen(false);
            }
            if (columnManagerRef.current && !columnManagerRef.current.contains(event.target as Node)) {
                setIsColumnManagerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Auto-open logic for restored tasks
    useEffect(() => {
        if (props.restoreSignal && props.restoreSignal > 0) {
            setIsAddModalOpen(true);
        }
    }, [props.restoreSignal]);

    const showNotificationMessage = useCallback((type: 'success' | 'error', message: string) => {
      setNotification({ type, message });
      setTimeout(() => setNotification(null), 5000);
    }, []);

    const showSuccess = useCallback((message: string) => showNotificationMessage('success', message), [showNotificationMessage]);
    
    const showError = useCallback((message: string) => {
        playErrorSound();
        showNotificationMessage('error', message);
    }, [showNotificationMessage]);



    const [searchQuery, setSearchQuery] = useState('');
    const [activeSearchQuery, setActiveSearchQuery] = useState('');

    const handleSearch = () => {
        setActiveSearchQuery(searchQuery);
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const [columnOrder, setColumnOrder] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(COLUMN_ORDER_KEY);
            if(saved) { 
                const parsed = JSON.parse(saved); 
                if (Array.isArray(parsed) && defaultOrder.every(id => parsed.includes(id))) return parsed; 
            }
            return defaultOrder;
        } catch (e) { return defaultOrder; }
    });

    const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
    const columnManagerRef = useRef<HTMLDivElement>(null);
    const isResizing = useRef<string | null>(null);
    const draggedColumn = useRef<string | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
    const [selectedBarcodes, setSelectedBarcodes] = useState<Set<string>>(new Set());

    const visibleCols = useMemo(() => {
        return columnOrder
            .map(id => allColumns.find(col => col.id === id)!)
            .filter(col => !hiddenColumns.has(col.id));
    }, [columnOrder, hiddenColumns]);
    
    // Helper to get consistent group key
    const getGroupKey = useCallback((p: Product) => {
        return (p.anaStokKodu && p.anaStokKodu.trim() !== '') 
            ? p.anaStokKodu 
            : (p.model && p.model.trim() !== '')
                ? p.model
                : (p.stokKodu && p.stokKodu.trim() !== '') 
                    ? p.stokKodu 
                    : p.barcode;
    }, []);

    // 1. Calculate filtered products first so they can be referenced
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            // Quick Search Filter (Triggered by Enter or Button)
            if (activeSearchQuery.trim() !== '') {
                const q = activeSearchQuery.toLowerCase();
                const matchesQuick = 
                    p.name.toLowerCase().includes(q) ||
                    p.stokKodu.toLowerCase().includes(q) ||
                    (p.anaStokKodu && p.anaStokKodu.toLowerCase().includes(q)) ||
                    p.barcode.includes(q) ||
                    p.model.toLowerCase().includes(q) ||
                    p.marka.toLowerCase().includes(q);
                
                if (!matchesQuick) return false;
            }

            // Advanced Filters Panel
            const f = filters;
            if (f.showDeleted) {
                if(!p.isDeleted) return false;
            } else {
                if(p.isDeleted) return false;
            }
            if (f.name && !p.name.toLowerCase().includes(f.name.toLowerCase())) return false;
            if (f.stokKodu && !p.stokKodu.toLowerCase().includes(f.stokKodu.toLowerCase())) return false;
            if (f.anaStokKodu && !p.anaStokKodu.toLowerCase().includes(f.anaStokKodu.toLowerCase())) return false;
            if (f.barcode && !p.barcode.includes(f.barcode)) return false;
            if (f.marka && p.marka !== f.marka) return false;
            if (f.model && p.model !== f.model) return false;
            if (f.group && p.group !== f.group) return false;
            if (f.midGroup && p.midGroup !== f.midGroup) return false;
            if (f.subGroup && p.subGroup !== f.subGroup) return false;
            if (f.shelfLocation && !p.shelfLocation?.toLowerCase().includes(f.shelfLocation.toLowerCase())) return false;
            
            if (f.minPrice && p.price < parseFloat(f.minPrice)) return false;
            if (f.maxPrice && p.price > parseFloat(f.maxPrice)) return false;
            
            if (f.stockStatus === 'inStock' && p.stock <= 0) return false;
            if (f.stockStatus === 'outOfStock' && p.stock > 0) return false;
            if (f.stockStatus === 'lowStock' && p.stock > 10) return false;
            
            return true;
        });
    }, [products, filters, activeSearchQuery]);

    const productGroups = useMemo(() => {
        const groups = new Map<string, Product[]>();
        filteredProducts.forEach(product => {
            const key = getGroupKey(product);
            
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(product);
        });
        groups.forEach((groupProducts, key) => {
            groupProducts.sort((a, b) => {
                // If a product's stokKodu or barcode matches the key exactly, it's likely the parent
                const aIsParent = a.stokKodu === key || a.barcode === key;
                const bIsParent = b.stokKodu === key || b.barcode === key;
                if (aIsParent && !bIsParent) return -1;
                if (!aIsParent && bIsParent) return 1;
                // Fallback to name length (shorter names are usually parents)
                return a.name.length - b.name.length;
            });
        });
        return Array.from(groups.values()).sort((a, b) => (a[0]?.name || '').localeCompare(b[0]?.name || ''));
    }, [filteredProducts]);

    // 2. Refs and state that use computed values
    const [displayLimit, setDisplayLimit] = useState(100);
    const filteredProductsRef = useRef<Product[]>([]);

    const handleExportStock = useCallback(async () => {
        try {
            console.log('handleExportStock started with ExcelJS...');
            
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Stok Listesi');

            // Define headers
            const headers = [
                'Grup Kodu / Model', 'Barkod', 'Ürün Adı', 'Stok', 
                'Alış Fiyatı', 'Satış Fiyatı', 'Kar (₺)', '% Kar', 'Stok Kodu', 'Ana Stok Kodu', 
                'Raf/Konum', 'Marka', 'Model', 'Renk', 'Beden', 'Grup', 'Durum'
            ];

            const headerRow = worksheet.addRow(headers);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF0891B2' } // Cyan-600
            };
            headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

            let rowIndex = 0;
            // If there are selected items, only export those. Otherwise export all filtered groups.
            const groupsToExport = selectedBarcodes.size > 0 
                ? productGroups.map(group => group.filter(p => selectedBarcodes.has(p.barcode))).filter(g => g.length > 0)
                : productGroups;

            groupsToExport.forEach((group) => {
                const mainP = group[0];
                const groupKey = mainP.anaStokKodu || mainP.model || mainP.stokKodu || mainP.barcode;
                const bgColor = rowIndex % 2 === 0 ? 'FFFFFFFF' : 'FFD1FAE5'; // White vs Emerald-100

                group.forEach((p, idx) => {
                    const profit = p.price - p.buyPrice;
                    const margin = p.buyPrice > 0 ? (profit / p.buyPrice) * 100 : 0;
                    const rowData = [
                        idx === 0 ? groupKey : '',
                        p.barcode || '',
                        p.name || '',
                        p.stock ?? 0,
                        p.buyPrice ?? 0,
                        p.price ?? 0,
                        profit.toFixed(2),
                        margin.toFixed(2) + '%',
                        p.stokKodu || '',
                        p.anaStokKodu || '',
                        p.shelfLocation || '',
                        p.marka || '',
                        p.model || '',
                        p.renk || '',
                        p.beden || '',
                        p.group || '',
                        p.isActivated ? 'Aktif' : 'Pasif'
                    ];
                    const row = worksheet.addRow(rowData);
                    
                    // Apply background color to all cells in the row
                    row.eachCell((cell) => {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: bgColor }
                        };
                        cell.border = {
                            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                        };
                    });
                });
                
                // Add an empty separator row if needed, or just increment index
                // worksheet.addRow([]); 
                rowIndex++;
            });

            // Auto-filter and column widths
            worksheet.autoFilter = {
                from: { row: 1, column: 1 },
                to: { row: 1, column: headers.length }
            };

            worksheet.columns.forEach(column => {
                column.width = 20;
            });

            // Generate buffer and save
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Stok_Listesi_${new Date().toLocaleDateString('tr-TR')}.xlsx`;
            link.click();
            
            setIsExcelMenuOpen(false);
            showSuccess("Renkli Excel dosyası başarıyla oluşturuldu.");

        } catch (err: any) {
            console.error('Export error:', err);
            showError(`Dışa aktarma hatası: ${err.message}`);
        }
    }, [productGroups, selectedBarcodes, showError, showSuccess]);

    // 3. Effects
    useEffect(() => {
        const ipcRenderer = (window as any).require?.('electron')?.ipcRenderer;
        if (ipcRenderer) {
            const handleSuccess = (_event: any, path: string) => showSuccess(`Dosya başarıyla kaydedildi: ${path}`);
            const handleError = (_event: any, msg: string) => showError(`Kayıt hatası: ${msg}`);
            
            ipcRenderer.on('save-excel-success', handleSuccess);
            ipcRenderer.on('save-excel-error', handleError);
            
            return () => {
                ipcRenderer.removeListener('save-excel-success', handleSuccess);
                ipcRenderer.removeListener('save-excel-error', handleError);
            };
        }
    }, [showSuccess, showError]);

    useEffect(() => {
        filteredProductsRef.current = filteredProducts;
    }, [filteredProducts]);

    // Reset display limit when filters change to show fresh results
    useEffect(() => {
        setDisplayLimit(100);
    }, [filters]);

    // Listen to global selection events
    useEffect(() => {
        (window as any).handleExportStock = handleExportStock;
        return () => {
            delete (window as any).handleExportStock;
        };
    }, [handleExportStock]);

    useEffect(() => {
        const handleSelectAll = () => {
            const allBarcodes = new Set(filteredProductsRef.current.map(p => p.barcode));
            setSelectedBarcodes(allBarcodes);
        };
        const handleDeselectAll = () => {
            setSelectedBarcodes(new Set());
        };
        const handleExternalExport = () => {
            console.log('--- GLOBAL EXCEL SIGNAL RECEIVED ---');
            handleExportStock();
        };

        window.addEventListener('app-select-all', handleSelectAll);
        window.addEventListener('app-deselect-all', handleDeselectAll);
        window.addEventListener('app-export-excel', handleExternalExport);
        return () => {
            window.removeEventListener('app-select-all', handleSelectAll);
            window.removeEventListener('app-deselect-all', handleDeselectAll);
            window.removeEventListener('app-export-excel', handleExternalExport);
        };
    }, [handleExportStock]);


    useEffect(() => { try { localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(columnWidths)); } catch(e) { console.error(e); } }, [columnWidths]);
    useEffect(() => { try { localStorage.setItem(HIDDEN_COLUMNS_KEY, JSON.stringify(Array.from(hiddenColumns))); } catch(e) { console.error(e); } }, [hiddenColumns]);
    useEffect(() => { try { localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(columnOrder)); } catch(e) { console.error(e); } }, [columnOrder]);


    const toggleSelection = useCallback((barcode: string) => {
        setSelectedBarcodes(prev => {
            const next = new Set(prev);
            if (next.has(barcode)) next.delete(barcode);
            else next.add(barcode);
            return next;
        });
    }, []);

    const toggleGroupSelection = useCallback((groupKey: string, productsInGroup: Product[]) => {
        const barcodesInGroup = productsInGroup.map(p => p.barcode);
        
        setSelectedBarcodes(prev => {
            const next = new Set(prev);
            const allSelected = barcodesInGroup.every(b => prev.has(b));
            if (allSelected) {
                barcodesInGroup.forEach(b => next.delete(b));
            } else {
                barcodesInGroup.forEach(b => next.add(b));
            }
            return next;
        });
    }, []);

    const normalizeHeader = (s: string) => {
        if (!s) return "";
        return s.trim().toLowerCase()
            .replace(/ı/g, 'i')
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/_/g, '') // Alt çizgileri kaldır
            .replace(/\s+/g, '')
            .replace(/[^a-z0-9]/g, '');
    };

    const CSV_PRODUCT_HEADER_MAP: { [key: string]: keyof Partial<Product> } = {
        'stokkodu': 'stokKodu',
        'stokkod': 'stokKodu',
        'skodu': 'stokKodu',
        'stokno': 'stokKodu',
        'urunno': 'stokKodu',
        'anastokkodu': 'anaStokKodu',
        'anastokkod': 'anaStokKodu',
        'askodu': 'anaStokKodu',
        'anastokno': 'anaStokKodu',
        'stokadi': 'name',
        'stokisimi': 'name',
        'urunadi': 'name',
        'urunisimi': 'name',
        'stokaciklamasi': 'name',
        'adi': 'name',
        'isimi': 'name',
        'kalanmiktar': 'stock',
        'stok': 'stock',
        'miktar': 'stock',
        'adet': 'stock',
        'mevcut': 'stock',
        'mevcutstok': 'stock',
        'bakiyemiktar': 'stock',
        'alis' : 'buyPrice',
        'alisfiyati': 'buyPrice',
        'alisfiyat': 'buyPrice',
        'alisfiyati1': 'buyPrice',
        'birimalis': 'buyPrice',
        'maliyet': 'buyPrice',
        'satis': 'price',
        'satisfiyati': 'price',
        'satisfiyat': 'price',
        'satisfiyati1': 'price',
        'satisfiyat1': 'price',
        'birimsatis': 'price',
        'fiyati': 'price',
        'fiyat': 'price',
        'barkodu': 'barcode',
        'barkod': 'barcode',
        'barkodno': 'barcode',
        'beden': 'beden',
        'bedeni': 'beden',
        'olcu': 'beden',
        'renk': 'renk',
        'renki': 'renk',
        'renkkodu': 'renk',
        'grubu': 'group',
        'grup': 'group',
        'kategori': 'group',
        'grupp': 'group',
        'aragrubu': 'midGroup',
        'aragrup': 'midGroup',
        'arakategori': 'midGroup',
        'altgrubu': 'subGroup',
        'altgrup': 'subGroup',
        'altkategori': 'subGroup',
        'marka': 'marka',
        'markasi': 'marka',
        'model': 'model',
        'modeli': 'model',
        'raf': 'shelfLocation',
        'konum': 'shelfLocation',
        'raflokasyonu': 'shelfLocation',
        'rafno': 'shelfLocation',
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

    const handleDownloadTemplate = () => {
        const csvHeader = CSV_HEADERS.join(';');
        downloadFile(csvHeader, 'urunler_sablonu.csv', 'text/csv;charset=utf-8;');
        setIsExcelMenuOpen(false);
    };



    const handleExcelUploadClick = () => {
        excelInputRef.current?.click();
        setIsExcelMenuOpen(false);
    };

    const handleExcelFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        console.log("[Excel] Dosya Seçildi:", file.name, "Boyut:", file.size);

        const fileNameLower = file.name.toLowerCase();
        const isExcel = fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls');
        const isCsv = fileNameLower.endsWith('.csv');
        
        if (!isExcel && !isCsv) {
            showError("Lütfen geçerli bir Excel (.xlsx, .xls) veya CSV dosyası seçin.");
            return;
        }

        const reader = new FileReader();

        reader.onload = (event) => {
            showNotificationMessage('success', 'Dosya analiz ediliyor... Lütfen bekleyin.');

            setTimeout(() => {
                try {
                    const data = event.target?.result;
                    if (!data) throw new Error("Dosya içeriği okunamadı.");

                    const workbook = XLSX.read(data, { type: isExcel ? 'array' : 'string' });
                    let rawData: any[][] = [];
                    let foundSheetName = "";

                    // Try all sheets until we find one with data
                    for (const sheetName of workbook.SheetNames) {
                        const worksheet = workbook.Sheets[sheetName];
                        const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
                        
                        if (sheetData.length > 0) {
                            rawData = sheetData;
                            foundSheetName = sheetName;
                            // Check if this sheet has any valid headers
                            let hasHeaders = false;
                            for (let i = 0; i < Math.min(sheetData.length, 10); i++) {
                                if (sheetData[i].some(cell => {
                                    const norm = normalizeHeader(String(cell));
                                    return CSV_PRODUCT_HEADER_MAP[norm];
                                })) {
                                    hasHeaders = true;
                                    break;
                                }
                            }
                            if (hasHeaders) break;
                        }
                    }

                    if (rawData.length === 0) throw new Error("Dosyada işlenebilir veri bulunamadı.");
                    console.log(`[Excel] Kullanılan Sayfa: "${foundSheetName}", Satır Sayısı: ${rawData.length}`);

                    // 1. Find Header Row
                    let headerRowIndex = -1;
                    let foundHeaders: { [key: string]: number } = {};

                    for (let i = 0; i < Math.min(rawData.length, 20); i++) { // Increase scan to 20 rows
                        const row = rawData[i];
                        const tempMap: { [key: string]: number } = {};
                        let matchCount = 0;

                        row.forEach((cell: any, cellIdx: number) => {
                            const normalized = normalizeHeader(String(cell));
                            const fieldKey = CSV_PRODUCT_HEADER_MAP[normalized];
                            if (fieldKey) {
                                tempMap[fieldKey as string] = cellIdx;
                                if (['name', 'barcode', 'stokKodu', 'price', 'stock'].includes(fieldKey as string)) matchCount++;
                            }
                        });

                        if (matchCount >= 1) { 
                            headerRowIndex = i;
                            foundHeaders = tempMap;
                            console.log(`[Excel] Başlık satırı bulundu (Satır ${i+1}):`, tempMap);
                            break;
                        }
                    }

                    if (headerRowIndex === -1 || !foundHeaders['name']) {
                        throw new Error("Başlıklar anlaşılamadı. 'Ürün Adı' veya 'Stok Adı' gibi temel sütunları bulamadım.");
                    }

                    const allNewProducts: Product[] = [];
                    let totalSkipped = 0;
                    let lastValidParent: Partial<Product> | null = null;

                    // 2. Process Data Rows
                    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
                        const row = rawData[i];
                        if (!row || row.length === 0 || row.every(c => !c)) continue;

                        const getValue = (field: string) => {
                            const idx = foundHeaders[field];
                            return idx !== undefined ? String(row[idx] || "").trim() : "";
                        };

                        const currentName = getValue('name');
                        const currentAnaKod = getValue('anaStokKodu');
                        const currentBrand = getValue('marka');
                        const currentModel = getValue('model');
                        const currentGroup = getValue('group');

                        // If this row has a name and anaStokKodu, it's a potential parent
                        if (currentName && currentAnaKod) {
                            lastValidParent = {
                                name: currentName,
                                marka: currentBrand,
                                model: currentModel,
                                group: currentGroup,
                                midGroup: getValue('midGroup'),
                                subGroup: getValue('subGroup'),
                                anaStokKodu: currentAnaKod,
                                shelfLocation: getValue('shelfLocation')
                            };
                        }

                        let finalName = currentName;
                        let finalBrand = currentBrand;
                        let finalModel = currentModel;
                        let finalGroup = currentGroup;
                        let finalAnaKod = currentAnaKod;

                        // Inheritance logic: If missing name/brand but we have a parent, inherit
                        if (!finalName && lastValidParent) {
                            finalName = lastValidParent.name;
                            if (!finalBrand) finalBrand = lastValidParent.marka;
                            if (!finalModel) finalModel = lastValidParent.model;
                            if (!finalGroup) finalGroup = lastValidParent.group;
                            if (!finalAnaKod) finalAnaKod = lastValidParent.anaStokKodu;
                        }

                        if (!finalName) {
                            totalSkipped++;
                            continue;
                        }

                        const parseNum = (field: string) => {
                            const val = getValue(field);
                            if (!val) return 0;
                            const cleaned = val.replace(/[^\d,.-]/g, '').replace(',', '.');
                            const parsed = parseFloat(cleaned);
                            return isNaN(parsed) ? 0 : parsed;
                        };

                        let barcode = getValue('barcode');
                        if (!barcode) {
                            barcode = getValue('stokKodu') || '20' + Math.floor(10000000000 + Math.random() * 90000000000).toString();
                        }

                        allNewProducts.push({
                            barcode: barcode,
                            name: finalName || "",
                            buyPrice: parseNum('buyPrice'),
                            price: parseNum('price'),
                            stock: Math.round(parseNum('stock')),
                            stokKodu: getValue('stokKodu'),
                            marka: finalBrand || "",
                            model: finalModel || "",
                            renk: getValue('renk'),
                            beden: getValue('beden'),
                            anaStokKodu: finalAnaKod || "",
                            group: finalGroup || "",
                            midGroup: getValue('midGroup') || (lastValidParent?.midGroup || ""),
                            subGroup: getValue('subGroup') || (lastValidParent?.subGroup || ""),
                            shelfLocation: getValue('shelfLocation') || (lastValidParent?.shelfLocation || ""),
                            isActivated: true,
                        });
                    }

                    console.log(`[Excel] İşleme bitti. Başarılı: ${allNewProducts.length}, Atlanan: ${totalSkipped}`);

                    if (allNewProducts.length > 0) {
                        onAddMultipleProducts(allNewProducts);
                        showSuccess(`${allNewProducts.length} ürün başarıyla işlendi!`);
                    } else {
                        showError("Yüklenecek geçerli ürün verisi bulunamadı.");
                    }

                } catch (err: any) {
                    showError(`Hata: ${err.message}`);
                    console.error("[Excel Hatası]", err);
                }
            }, 50);
        };
        
        if (isExcel) reader.readAsArrayBuffer(file);
        else reader.readAsText(file, 'UTF-8');
        
        if (e.target) e.target.value = '';
    };

    const handleApplyFilters = (newFilters: ProductFilters) => {
        setFilters(newFilters);
        setIsFiltersOpen(false);
    };

    const handleSaveAndCloseAddModal = (productsToAdd: Product[]) => {
        onAddMultipleProducts(productsToAdd);
        setIsAddModalOpen(false);
    };

    const handleSaveAndCloseEditModal = (allProducts: Product[]) => {
        if (allProducts.length > 0) {
            onAddMultipleProducts(allProducts);
            setNotification({ type: 'success', message: `${allProducts.length} ürün ve varyasyon başarıyla güncellendi/eklendi.` });
            setTimeout(() => setNotification(null), 3000);
        }
        
        setEditingProductGroup(null);
    };
    
    const handleEditProductGroup = (groupKey: string) => {
        const group = products.filter(p => getGroupKey(p) === groupKey);
        
        if(group.length > 0) {
            setEditingProductGroup(group);
        } else {
            alert("Bu ürüne ait varyasyon grubu bulunamadı.");
        }
    };

    const toggleGroup = (key: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };
    
    const handleEditStart = (barcode: string, field: 'stock' | 'buyPrice' | 'price', value: number, isGroup: boolean = false) => {
        setEditingCell({ barcode, field, isGroup });
        setEditValue(value.toString().replace('.', ','));
    };

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditValue(e.target.value);
    };

    const handleEditCommit = () => {
        if (!editingCell) return;
        const { barcode, field, isGroup } = editingCell;
        
        // If it's a group, find ANY product in that group to use as a reference
        const originalProduct = isGroup 
            ? products.find(p => getGroupKey(p) === barcode)
            : products.find(p => p.barcode === barcode);
            
        if (!originalProduct) {
            setEditingCell(null);
            return;
        }

        const newValue = parseFloat(editValue.replace(',', '.'));

        if (isNaN(newValue) || newValue < 0) {
            showError('Geçersiz değer girdiniz.');
            setEditingCell(null);
            return;
        }

        const currentVal = Number(originalProduct[field] || 0);

        if (currentVal !== newValue) {
            if (field === 'stock' && !isGroup) {
                onUpdateProductStock(barcode, Math.round(newValue));
            } else if (isGroup) {
                // If editing from the Group Row, sync across the entire group
                const groupKey = barcode; // For groups, 'barcode' stores the groupKey
                const variations = products.filter(p => getGroupKey(p) === groupKey);
                
                if (onBulkUpdateProducts) {
                    const updates = variations.map(v => ({
                        barcode: v.barcode,
                        updates: { [field]: newValue }
                    }));
                    onBulkUpdateProducts(updates);
                } else {
                    // Fallback to individual updates
                    if (field === 'buyPrice') {
                        variations.forEach(v => onUpdateProductBuyPrice(v.barcode, newValue));
                    } else if (field === 'price') {
                        variations.forEach(v => onUpdateProductPrice(v.barcode, newValue));
                    }
                }
            } else {
                // Individual variation edit
                if (field === 'buyPrice') {
                    onUpdateProductBuyPrice(barcode, newValue);
                } else if (field === 'price') {
                    onUpdateProductPrice(barcode, newValue);
                }
            }
        }
        setEditingCell(null);
    };

    const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleEditCommit();
        } else if (e.key === 'Escape') {
            setEditingCell(null);
        }
    };

    const renderEditableCell = (product: Product, field: 'stock' | 'buyPrice' | 'price', isGroup: boolean = false) => {
        const isEditing = editingCell?.barcode === product.barcode && editingCell?.field === field && !!editingCell?.isGroup === isGroup;
        const value = product[field];

        if (isEditing) {
            return (
                <input
                    type="text"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={handleEditCommit}
                    onKeyDown={handleEditKeyDown}
                    autoFocus
                    onFocus={e => e.target.select()}
                    className="w-24 text-right bg-white dark:bg-slate-700 border-2 border-cyan-500 rounded px-2 py-1 outline-none ring-2 ring-cyan-200 dark:text-white"
                />
            );
        }

        return (
            <div 
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingCell({ barcode: product.barcode, field, isGroup });
                    setEditValue(value.toString().replace('.', ','));
                }}
                className="cursor-pointer p-1 -m-1 rounded hover:bg-cyan-100/70 dark:hover:bg-cyan-900/30"
                title={`${field === 'stock' ? 'Stok' : field === 'buyPrice' ? 'Alış Fiyatı' : 'Satış Fiyatı'} düzenlemek için çift tıklayın`}
            >
                {field === 'stock' ? value : `${value.toFixed(2)} ₺`}
            </div>
        );
    };

    const orderedColumns = useMemo(() => {
        const currentOrder = [...columnOrder];
        defaultOrder.forEach(id => {
            if (!currentOrder.includes(id)) currentOrder.push(id);
        });
        return allColumns.slice().sort((a, b) => currentOrder.indexOf(a.id) - currentOrder.indexOf(b.id));
    }, [columnOrder]);
    const visibleColumns = useMemo(() => orderedColumns.filter(c => !hiddenColumns.has(c.id)), [orderedColumns, hiddenColumns]);

    const handleMouseDown = useCallback((e: React.MouseEvent, columnId: string) => {
      e.preventDefault();
      isResizing.current = columnId;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      const startX = e.clientX;
      const startWidth = columnWidths[columnId] || 100;
      const minWidth = allColumns.find(c => c.id === columnId)?.minWidth || 50;

      const handleMouseMove = (event: MouseEvent) => {
          if (isResizing.current) {
              const deltaX = event.clientX - startX;
              const newWidth = Math.max(startWidth + deltaX, minWidth);
              
              setColumnWidths(prev => ({
                  ...prev,
                  [columnId]: newWidth
              }));
          }
      };

      const handleMouseUp = () => {
          isResizing.current = null;
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
          
          // Save to localStorage on completion
          setColumnWidths(current => {
              localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(current));
              return current;
          });
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }, [columnWidths]);

    const toggleColumn = (columnId: string) => {
      setHiddenColumns(prev => {
          const newSet = new Set(prev);
          if (newSet.has(columnId)) newSet.delete(columnId); else newSet.add(columnId);
          return newSet;
      });
    };

    const handleDragStart = (e: React.DragEvent<HTMLTableHeaderCellElement>, columnId: string) => {
        draggedColumn.current = columnId; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', columnId);
    };
    const handleDragOver = (e: React.DragEvent<HTMLTableHeaderCellElement>) => e.preventDefault();
    const handleDrop = (e: React.DragEvent<HTMLTableHeaderCellElement>, targetColumnId: string) => {
        e.preventDefault();
        const sourceColumnId = draggedColumn.current;
        if (!sourceColumnId || sourceColumnId === targetColumnId) return;
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
    const handleDragEnd = () => { draggedColumn.current = null; setDragOverColumn(null); };
    const handleDragEnter = (e: React.DragEvent<HTMLTableHeaderCellElement>, columnId: string) => {
        if (draggedColumn.current && draggedColumn.current !== columnId) setDragOverColumn(columnId);
    };

// Memoized Individual Row Component for high performance
const ProductRow = React.memo(({ 
    product, 
    visibleColumns, 
    columnWidths, 
    selectedBarcodes, 
    toggleSelection, 
    renderEditableCell, 
    handleEditProductGroup, 
    onDeleteProduct, 
    onRestoreProduct, 
    getGroupKey 
}: { 
    product: Product; 
    visibleColumns: any[]; 
    columnWidths: Record<string, number>; 
    selectedBarcodes: Set<string>; 
    toggleSelection: (barcode: string) => void; 
    renderEditableCell: (p: Product, f: any) => React.ReactNode; 
    handleEditProductGroup: (key: string) => void; 
    onDeleteProduct: (b: string) => void; 
    onRestoreProduct: (b: string) => void; 
    getGroupKey: (p: Product) => string; 
}) => {
    return (
        <tr key={product.barcode} className="border-b dark:border-slate-700 last:border-b-0 bg-white dark:bg-slate-900/40 hover:bg-rose-50/50 dark:hover:bg-rose-900/20 transition-colors">
            <td className="p-1 text-center border-r dark:border-slate-700">
                <input 
                    type="checkbox" 
                    checked={selectedBarcodes.has(product.barcode)}
                    onChange={() => toggleSelection(product.barcode)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                />
            </td>
            <td className="border-r dark:border-slate-700"></td>
            {visibleColumns.map(col => (
                <td key={col.id} className={`px-2 py-1 border-r dark:border-slate-700 last:border-r-0 ${['buyPrice', 'price', 'stock', 'profit', 'profitMargin'].includes(col.id) ? '' : 'truncate'}`} style={{ textAlign: col.align || 'left'}}>
                    {(() => {
                        if (col.id === 'name') return <div className="flex flex-col"><span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">{product.renk} / {product.beden}</span><span className="text-slate-400 dark:text-slate-500 font-mono text-[9px]">{product.barcode}</span></div>;
                        if (col.id === 'stock') return <div className="w-full flex justify-end">{renderEditableCell(product, 'stock')}</div>;
                        if (col.id === 'buyPrice') return <div className="w-full flex justify-end">{renderEditableCell(product, 'buyPrice')}</div>;
                        if (col.id === 'price') return <div className="w-full flex justify-end">{renderEditableCell(product, 'price')}</div>;
                        if (col.id === 'profit') return <div className="text-right w-full font-medium text-emerald-500 text-[11px]">{(product.price - product.buyPrice).toFixed(2)} ₺</div>;
                        if (col.id === 'profitMargin') {
                            const margin = product.buyPrice > 0 ? ((product.price - product.buyPrice) / product.buyPrice) * 100 : 0;
                            return <div className="text-right w-full font-medium text-slate-400 text-[10px]">{margin.toFixed(1)}%</div>;
                        }
                        if (col.id === 'actions') return (
                            <div className="flex items-center justify-center gap-0.5" onClick={e => e.stopPropagation()}>
                                <button onClick={() => handleEditProductGroup(getGroupKey(product))} className="p-1 rounded-full text-slate-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 hover:text-cyan-600" title="Düzenle"><Icon name="edit" className="w-3.5 h-3.5"/></button>
                                {product.isDeleted ? 
                                    <button onClick={() => onRestoreProduct(product.barcode)} className="p-1 rounded-full text-slate-400 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600" title="Geri Yükle"><Icon name="restore" className="w-3.5 h-3.5"/></button> : 
                                    <button onClick={() => onDeleteProduct(product.barcode)} className="p-1 rounded-full text-slate-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600" title="Arşivle"><Icon name="trash" className="w-3.5 h-3.5"/></button>
                                }
                            </div>
                        );
                        return <span className="text-[11px]">{(product as any)[col.id] || '--'}</span>;
                    })()}
                </td>
            ))}
        </tr>
    );
});

// Memoized Group Row Component
const GroupRow = React.memo(({ 
    group, 
    visibleColumns, 
    columnWidths, 
    selectedBarcodes, 
    isExpanded, 
    toggleGroup, 
    toggleGroupSelection, 
    renderEditableCell, 
    handleEditProductGroup, 
    getGroupKey 
}: { 
    group: Product[]; 
    visibleColumns: any[]; 
    columnWidths: Record<string, number>; 
    selectedBarcodes: Set<string>; 
    isExpanded: boolean; 
    toggleGroup: (key: string, e: any) => void; 
    toggleGroupSelection: (key: string, items: Product[]) => void; 
    renderEditableCell: (p: Product, f: any, isG: boolean) => React.ReactNode; 
    handleEditProductGroup: (key: string) => void; 
    getGroupKey: (p: Product) => string; 
}) => {
    const mainProduct = group[0];
    const groupKey = getGroupKey(mainProduct);
    const totalStock = group.reduce((sum, p) => sum + (p.stock || 0), 0);
    const baseName = mainProduct.name.replace(/\s*\(.*\)$/, '').trim();

    return (
        <tr className={`border-b dark:border-slate-700 font-semibold transition-colors ${isExpanded ? 'bg-cyan-50/50 dark:bg-cyan-900/10' : 'bg-white dark:bg-slate-800'} hover:bg-rose-100/60 dark:hover:bg-rose-900/20`}>
            <td className="p-1.5 text-center border-r dark:border-slate-700" onClick={(e) => { e.stopPropagation(); toggleGroupSelection(groupKey, group); }}>
                <div className="flex items-center justify-center">
                    <input 
                        type="checkbox" 
                        checked={group.every(p => selectedBarcodes.has(p.barcode))}
                        onChange={() => {}}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                    />
                </div>
            </td>
            <td 
                className="p-1.5 text-center border-r dark:border-slate-700 cursor-pointer hover:bg-rose-200/50 dark:hover:bg-rose-800/30 transition-colors"
                onClick={(e) => toggleGroup(groupKey, e)}
            >
                <div className="flex items-center justify-center w-full">
                    <Icon name={isExpanded ? 'chevron-down' : 'chevron-right'} className={`w-3.5 h-3.5 text-rose-600 dark:text-rose-400`} />
                </div>
            </td>
            {visibleColumns.map(col => (
                <td key={col.id} className={`px-2 py-1.5 border-r dark:border-slate-700 last:border-r-0 truncate`} style={{ textAlign: col.align || 'left'}}>
                    {(() => {
                        if (col.id === 'name') return (
                            <div className="flex flex-col">
                                <span className="text-slate-900 dark:text-slate-100 font-bold truncate text-[12px]" title={baseName}>{baseName}</span>
                                <span className="text-[9px] text-cyan-600 dark:text-cyan-400 font-medium flex items-center gap-1">
                                    <Icon name="list-bullet" className="w-2.5 h-2.5" />
                                    {group.length} Varyasyon
                                </span>
                            </div>
                        );
                        if (col.id === 'stock') return (
                            <div className="flex flex-col items-end">
                                <span className={`text-[12px] font-bold ${totalStock <= 5 ? 'text-red-600' : 'text-slate-700 dark:text-slate-300'}`}>{totalStock}</span>
                                <span className="text-[8px] text-slate-400 font-normal">Toplam</span>
                            </div>
                        );
                        if (col.id === 'actions') return (
                            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                                 <button onClick={() => handleEditProductGroup(groupKey)} className="p-1.5 rounded-full text-slate-500 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 hover:text-cyan-600" title="Ürün Grubunu Düzenle">
                                    <Icon name="edit" className="w-4 h-4"/>
                                </button>
                            </div>
                        );
                        if (['buyPrice', 'price'].includes(col.id)) {
                            return <div className="w-full flex justify-end text-[12px]">{renderEditableCell(mainProduct, col.id as any, true)}</div>;
                        }
                        if (col.id === 'profit') {
                            const avgBuy = group.reduce((sum, p) => sum + p.buyPrice, 0) / group.length;
                            const avgPrice = group.reduce((sum, p) => sum + p.price, 0) / group.length;
                            return <div className="text-right w-full font-bold text-emerald-600 text-[12px]">{(avgPrice - avgBuy).toFixed(2)} ₺</div>;
                        }
                        return <span className="text-[12px]">{(mainProduct as any)[col.id] || '--'}</span>;
                    })()}
                </td>
            ))}
        </tr>
    );
});

    const groupEntries = productGroups; // productGroups is already Array<Product[]> from line 255

    return (
        <div className="flex flex-col h-full bg-slate-950 text-white overflow-hidden">
            {/* FAB for Mobile Actions */}
            <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-3 pointer-events-none lg:hidden">
                <div className={`flex flex-col items-end gap-3 transition-all duration-300 transform ${isFabOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-0 opacity-0 translate-y-10'}`}>
                    <button onClick={() => { setIsAddModalOpen(true); setIsFabOpen(false); }} className="pointer-events-auto w-12 h-12 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full shadow-lg flex items-center justify-center transition-all active:scale-90">
                        <Icon name="plus" className="w-6 h-6" />
                    </button>
                    <button onClick={() => { setIsAiModalOpen(true); setIsFabOpen(false); }} className="pointer-events-auto w-12 h-12 bg-pink-600 hover:bg-pink-500 text-white rounded-full shadow-lg flex items-center justify-center transition-all active:scale-90">
                        <Icon name="ai" className="w-6 h-6" />
                    </button>
                </div>
                <button onClick={() => setIsFabOpen(!isFabOpen)} className="pointer-events-auto w-14 h-14 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-full shadow-2xl flex items-center justify-center transition-all active:scale-95 group">
                    <Icon name={isFabOpen ? 'x-circle' : 'plus'} className={`w-8 h-8 transition-transform duration-300 ${isFabOpen ? 'rotate-90' : ''}`} />
                </button>
            </div>

            {/* Header / Search Area */}
            <header className="flex-shrink-0 bg-slate-900/50 backdrop-blur-xl border-b border-white/5 p-3 z-40">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                         <div className="w-9 h-9 bg-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-400">
                             <Icon name="list-bullet" className="w-5 h-5"/>
                         </div>
                         <div>
                            <h1 className="text-lg font-black uppercase tracking-tight italic leading-none">Stok Yönetimi</h1>
                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">ENVANTER & FİYAT KONTROLÜ</p>
                         </div>
                    </div>

                    <div className="flex items-center gap-2 flex-grow max-w-2xl">
                        <div className="relative flex-grow">
                            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"/>
                            <input 
                                type="text" 
                                placeholder="Ürün, Barkod veya Stok Kodu Ara..." 
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-[11px] font-bold text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                            />
                        </div>
                        <button 
                            onClick={handleSearch}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-cyan-900/20 transition-all active:scale-95 flex-shrink-0"
                        >
                            ARA
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Excel İşlemleri Dropdown */}
                        <div className="relative" ref={excelMenuRef}>
                            <button 
                                onClick={() => setIsExcelMenuOpen(!isExcelMenuOpen)} 
                                className="h-9 px-3 flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                <Icon name="excel" className="w-4 h-4"/>
                                <span className="hidden sm:inline">Excel</span>
                                <Icon name="chevron-down" className={`w-3 h-3 transition-transform ${isExcelMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isExcelMenuOpen && (
                                <div className="absolute top-full mt-2 right-0 w-56 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl">
                                    <button onClick={handleDownloadTemplate} className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 transition-colors">
                                        <Icon name="download" className="w-4 h-4 text-slate-400" />
                                        <span className="font-bold text-[10px] uppercase tracking-wider text-slate-200">Şablon İndir</span>
                                    </button>
                                    <button onClick={handleExcelUploadClick} className="w-full text-left px-4 py-3 hover:bg-white/5 flex items-center gap-3 border-t border-white/5 transition-colors">
                                        <Icon name="upload" className="w-4 h-4 text-slate-400" />
                                        <span className="font-bold text-[10px] uppercase tracking-wider text-slate-200">Şablon Yükle</span>
                                    </button>
                                    <button onClick={handleExportStock} className="w-full text-left px-4 py-3 hover:bg-emerald-500/10 flex items-center gap-3 border-t border-white/5 transition-colors">
                                        <Icon name="excel" className="w-4 h-4 text-emerald-500" />
                                        <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-400">Dışa Aktar</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <button onClick={() => setIsColumnManagerOpen(!isColumnManagerOpen)} className="h-9 w-9 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all">
                            <Icon name="view-columns" className="w-5 h-5"/>
                        </button>

                        <button onClick={() => setIsFiltersOpen(!isFiltersOpen)} className={`h-9 px-4 flex items-center gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${Object.keys(filters).length > 0 ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-slate-400 border border-white/10'}`}>
                            <Icon name="filter" className="w-4 h-4"/> FİLTRE {Object.keys(filters).length > 0 && `(${Object.keys(filters).length})`}
                        </button>

                        <button onClick={() => setIsAddModalOpen(true)} className="h-9 px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2">
                            <Icon name="plus" className="w-4 h-4"/> EKLE
                        </button>
                    </div>
                </div>
            </header>

            {/* Products Table Area */}
            <main className="flex-grow overflow-hidden flex flex-col relative bg-slate-950/50">
                <div className="flex-grow overflow-auto custom-scrollbar relative">
                    <table className="w-full text-left border-collapse table-fixed min-w-[1200px]">
                        <thead className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md">
                            <tr className="border-b border-white/5">
                                <th className="p-2 w-10 text-center">
                                    <button 
                                        onClick={() => {
                                            if (selectedBarcodes.size === filteredProducts.length) setSelectedBarcodes(new Set());
                                            else setSelectedBarcodes(new Set(filteredProducts.map(p => p.barcode)));
                                        }} 
                                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${selectedBarcodes.size === filteredProducts.length ? 'bg-cyan-500 border-cyan-400' : 'border-white/20 hover:border-white/40'}`}
                                    >
                                        {selectedBarcodes.size === filteredProducts.length && <Icon name="check" className="w-2 h-2 text-slate-900"/>}
                                    </button>
                                </th>
                                <th className="p-2 w-8"></th>
                                {visibleCols.map(col => (
                                    <th 
                                        key={col.id} 
                                        className={`p-2 text-[8px] font-black text-slate-500 uppercase tracking-widest relative group select-none ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                                        style={{ width: columnWidths[col.id] || 100 }}
                                    >
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {productGroups.length === 0 ? (
                                <tr><td colSpan={visibleCols.length + 2} className="text-center py-20 text-slate-500 font-bold uppercase tracking-widest text-[10px]">Ürün bulunamadı</td></tr>
                            ) : productGroups.slice(0, displayLimit).map((group) => {
                                const mainProduct = group[0];
                                const groupKey = getGroupKey(mainProduct);
                                const isExpanded = expandedGroups.has(groupKey);
                                const totalStock = group.reduce((s, p) => s + (p.stock || 0), 0);

                                return (
                                    <React.Fragment key={groupKey}>
                                        <tr className={`group transition-colors hover:bg-white/[0.03] ${isExpanded ? 'bg-cyan-500/[0.05]' : ''}`}>
                                            <td className="p-1.5 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    checked={group.every(p => selectedBarcodes.has(p.barcode))}
                                                    onChange={() => toggleGroupSelection(groupKey, group)}
                                                    className="w-3 h-3 rounded border-white/10 bg-white/5 text-cyan-600 focus:ring-cyan-500/50"
                                                />
                                            </td>
                                            <td className="p-1.5 text-center cursor-pointer" onClick={() => toggleGroup(groupKey)}>
                                                <Icon name={isExpanded ? 'chevron-down' : 'chevron-right'} className={`w-3 h-3 transition-transform ${isExpanded ? 'text-rose-500' : 'text-slate-600'}`} />
                                            </td>
                                            {visibleCols.map(col => (
                                                <td key={col.id} className={`p-1.5 text-[10px] font-bold truncate ${col.align === 'right' ? 'text-right' : ''}`}>
                                                    {col.id === 'name' ? (
                                                        <div className="flex flex-col">
                                                            <span className="text-white truncate">{mainProduct.name}</span>
                                                            <span className="text-[7px] text-cyan-500 uppercase tracking-tighter">{group.length} Varyasyon</span>
                                                        </div>
                                                    ) : col.id === 'stock' ? (
                                                        <span className={totalStock <= 0 ? 'text-rose-500' : totalStock <= 5 ? 'text-amber-500' : 'text-slate-300'}>{totalStock}</span>
                                                    ) : col.id === 'price' ? (
                                                        <span className="text-cyan-400" onDoubleClick={() => handleEditStart(groupKey, 'price', mainProduct.price, true)}>
                                                            {editingCell?.barcode === groupKey && editingCell?.field === 'price' ? (
                                                                <input autoFocus className="bg-cyan-500/20 w-16 px-1 border-none outline-none text-white" value={editValue} onChange={handleEditChange} onBlur={handleEditCommit} onKeyDown={e => e.key === 'Enter' && handleEditCommit()} />
                                                            ) : mainProduct.price.toFixed(2) + ' ₺'}
                                                        </span>
                                                    ) : col.id === 'buyPrice' ? (
                                                        <span className="text-emerald-500" onDoubleClick={() => handleEditStart(groupKey, 'buyPrice', mainProduct.buyPrice, true)}>
                                                            {editingCell?.barcode === groupKey && editingCell?.field === 'buyPrice' ? (
                                                                <input autoFocus className="bg-emerald-500/20 w-16 px-1 border-none outline-none text-white" value={editValue} onChange={handleEditChange} onBlur={handleEditCommit} onKeyDown={e => e.key === 'Enter' && handleEditCommit()} />
                                                            ) : (mainProduct.buyPrice || 0).toFixed(2) + ' ₺'}
                                                        </span>
                                                    ) : col.id === 'actions' ? (
                                                        <button onClick={() => handleEditProductGroup(groupKey)} className="w-6 h-6 rounded bg-white/5 text-slate-400 flex items-center justify-center hover:bg-cyan-600 hover:text-white transition-all">
                                                            <Icon name="edit" className="w-3.5 h-3.5"/>
                                                        </button>
                                                    ) : col.id === 'profit' ? (
                                                        <span className="text-emerald-500 font-bold">{(mainProduct.price - (mainProduct.buyPrice || 0)).toFixed(2)} ₺</span>
                                                    ) : col.id === 'profitMargin' ? (
                                                        <span className="text-emerald-500 font-bold">
                                                            {mainProduct.buyPrice > 0 
                                                                ? (((mainProduct.price - mainProduct.buyPrice) / mainProduct.buyPrice) * 100).toFixed(1) 
                                                                : '0'}%
                                                        </span>
                                                    ) : (mainProduct as any)[col.id] || '-'}
                                                </td>
                                            ))}
                                        </tr>
                                        {isExpanded && group.map(p => (
                                            <tr key={p.barcode} className="bg-white/[0.01] border-l-2 border-cyan-500/30">
                                                <td className="p-1"></td>
                                                <td className="p-1"></td>
                                                {visibleCols.map(col => (
                                                    <td key={col.id} className={`p-1.5 text-[9px] font-medium text-slate-500 ${col.align === 'right' ? 'text-right' : ''}`}>
                                                        {col.id === 'name' ? (
                                                            <span className="text-slate-400">{p.renk} / {p.beden}</span>
                                                        ) : col.id === 'barcode' ? (
                                                            <span className="font-mono text-[8px] text-slate-600">{p.barcode}</span>
                                                        ) : col.id === 'stock' ? (
                                                            <span className="cursor-pointer hover:text-white" onDoubleClick={() => handleEditStart(p.barcode, 'stock', p.stock)}>
                                                                {editingCell?.barcode === p.barcode && editingCell?.field === 'stock' ? <input autoFocus className="w-10 bg-slate-800 text-white outline-none px-1" value={editValue} onChange={handleEditChange} onBlur={handleEditCommit} /> : p.stock}
                                                            </span>
                                                        ) : col.id === 'profit' ? (
                                                            <span className="text-emerald-600/70">{(p.price - (p.buyPrice || 0)).toFixed(2)} ₺</span>
                                                        ) : col.id === 'profitMargin' ? (
                                                            <span className="text-emerald-600/70">
                                                                {p.buyPrice > 0 
                                                                    ? (((p.price - p.buyPrice) / p.buyPrice) * 100).toFixed(1) 
                                                                    : '0'}%
                                                            </span>
                                                        ) : (p as any)[col.id] || '-'}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                    
                    {displayLimit < productGroups.length && (
                        <div className="p-8 flex flex-col items-center justify-center gap-2 border-t border-white/5 bg-slate-900/20">
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Görüntülenen: {displayLimit} / {productGroups.length} Grup</p>
                            <button 
                                onClick={() => setDisplayLimit(prev => prev + 250)}
                                className="px-10 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-cyan-500 font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 shadow-2xl"
                            >
                                DAHA FAZLA YÜKLE (+250)
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Modals & Popups */}
            <AddProductModal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                onSave={handleSaveAndCloseAddModal}
                suppliers={suppliers}
                definitions={definitions}
                products={products}
                onAddDefinition={onAddDefinition}
                onMinimize={onMinimizeTask}
            />

            {isAiModalOpen && (
                <AiProductModal
                    onClose={() => setIsAiModalOpen(false)}
                    onStartTask={onStartAiTask}
                />
            )}

            {editingProductGroup && (
                <EditProductModal
                    isOpen={true}
                    onClose={() => setEditingProductGroup(null)}
                    onSave={handleSaveAndCloseEditModal}
                    products={editingProductGroup}
                    suppliers={suppliers}
                    definitions={definitions}
                    onAddDefinition={onAddDefinition}
                    onMinimize={onMinimizeTask}
                />
            )}

            <ProductFiltersPanel
                isOpen={isFiltersOpen}
                onClose={() => setIsFiltersOpen(false)}
                onApply={handleApplyFilters}
                currentFilters={filters}
                definitions={definitions}
            />

            <input
                type="file"
                ref={excelInputRef}
                onChange={handleExcelFileSelected}
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
            />

            {notification && (
                <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl shadow-2xl z-[100] flex items-center gap-2 border border-white/10 backdrop-blur-xl animate-fade-in-up ${notification.type === 'success' ? 'bg-emerald-500/90' : 'bg-rose-500/90'}`}>
                    <Icon name={notification.type === 'success' ? 'check-circle' : 'exclamation-circle'} className="w-4 h-4 text-white" />
                    <span className="text-[10px] font-black uppercase text-white tracking-wide">{notification.message}</span>
                </div>
            )}
        </div>
    );
}

export default ProductsView;