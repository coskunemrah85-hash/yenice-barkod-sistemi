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
        return s.trim().toLowerCase()
            .replace(/ı/g, 'i')
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/\s+/g, '')
            .replace(/[^a-z0-9]/g, '');
    };

    const CSV_PRODUCT_HEADER_MAP: { [key: string]: keyof Partial<Product> } = {
        'stokkodu': 'stokKodu',
        'stokkod': 'stokKodu',
        'skodu': 'stokKodu',
        'anastokkodu': 'anaStokKodu',
        'anastokkod': 'anaStokKodu',
        'askodu': 'anaStokKodu',
        'stokadi': 'name',
        'stokisimi': 'name',
        'urunadi': 'name',
        'urunisimi': 'name',
        'adi': 'name',
        'isimi': 'name',
        'kalanmiktar': 'stock',
        'stok': 'stock',
        'miktar': 'stock',
        'adet': 'stock',
        'alis' : 'buyPrice',
        'alisfiyati': 'buyPrice',
        'alisfiyati1': 'buyPrice',
        'birimalis': 'buyPrice',
        'satis': 'price',
        'satisfiyati': 'price',
        'satisfiyati1': 'price',
        'birimsatis': 'price',
        'fiyati': 'price',
        'barkodu': 'barcode',
        'barkod': 'barcode',
        'beden': 'beden',
        'olcu': 'beden',
        'renk': 'renk',
        'renkkodu': 'renk',
        'grubu': 'group',
        'grup': 'group',
        'kategori': 'group',
        'aragrubu': 'midGroup',
        'aragrup': 'midGroup',
        'arakategori': 'midGroup',
        'altgrubu': 'subGroup',
        'altgrup': 'subGroup',
        'altkategori': 'subGroup',
        'marka': 'marka',
        'model': 'model',
        'raf': 'shelfLocation',
        'konum': 'shelfLocation',
        'raflokasyonu': 'shelfLocation',
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

        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
        if (isExcel && !XLSX) {
            showError("Excel kütüphanesi yüklenemedi. İnternet bağlantınızı kontrol edin.");
            return;
        }

        const reader = new FileReader();

        reader.onload = (event) => {
            showNotificationMessage('success', 'Dosya okunuyor, veriler analiz ediliyor... Lütfen bekleyin.');

            setTimeout(() => {
                try {
                    const data = event.target?.result;
                    if (!data) throw new Error("Dosya boş veya okunamıyor.");

                    let jsonData: any[] = [];
                    if (isExcel) {
                        const workbook = XLSX.read(data, { type: 'array' });
                        const firstSheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[firstSheetName];
                        jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
                    } else {
                        // Handle CSV separately but still using XLSX for consistency if possible
                        const workbook = XLSX.read(data, { type: 'string' });
                        const firstSheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[firstSheetName];
                        jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
                    }

                    if (jsonData.length === 0) throw new Error("Dosyada işlenecek veri bulunamadı.");

                    const allNewProducts: Product[] = [];
                    let totalSkipped = 0;
                    let skipReasons: string[] = [];

                    // Create a normalized map of headers from the first row
                    const originalHeaders = Object.keys(jsonData[0]);
                    const headerMap: { [key: string]: string } = {};
                    
                    originalHeaders.forEach(h => {
                        const normalized = normalizeHeader(h);
                        const fieldKey = CSV_PRODUCT_HEADER_MAP[normalized];
                        if (fieldKey) headerMap[h] = fieldKey as string;
                    });

                    jsonData.forEach((row, idx) => {
                        const product: Partial<Product> = {};
                        
                        // Map row data using our header map
                        Object.keys(row).forEach(key => {
                            const fieldKey = headerMap[key];
                            if (fieldKey) {
                                let value = row[key];
                                
                                // Clean numeric fields
                                if (['buyPrice', 'price', 'stock'].includes(fieldKey)) {
                                    const cleanedValue = String(value)
                                        .replace(/[^\d,.-]/g, '')
                                        .replace(',', '.');
                                    const parsed = parseFloat(cleanedValue);
                                    value = isNaN(parsed) ? 0 : parsed;
                                }
                                
                                (product as any)[fieldKey] = value;
                            }
                        });

                        // Validation
                        if (!product.name) {
                            totalSkipped++;
                            if (totalSkipped < 5) skipReasons.push(`Satır ${idx + 2}: Ürün adı eksik.`);
                            return;
                        }

                        // Ensure barcode exists
                        let barcode = String(product.barcode || '').trim();
                        if (!barcode) {
                            barcode = '20' + Math.floor(10000000000 + Math.random() * 90000000000).toString();
                        }

                        allNewProducts.push({
                            barcode: barcode,
                            name: String(product.name),
                            buyPrice: Number(product.buyPrice) || 0,
                            price: Number(product.price) || 0,
                            stock: Number(product.stock) || 0,
                            stokKodu: String(product.stokKodu || ''),
                            marka: String(product.marka || ''),
                            model: String(product.model || ''),
                            renk: String(product.renk || ''),
                            beden: String(product.beden || ''),
                            anaStokKodu: String(product.anaStokKodu || ''),
                            group: String(product.group || ''),
                            midGroup: String(product.midGroup || ''),
                            subGroup: String(product.subGroup || ''),
                            shelfLocation: String(product.shelfLocation || ''),
                            isActivated: true,
                        });
                    });

                    if (allNewProducts.length > 0) {
                        onAddMultipleProducts(allNewProducts);
                        let msg = `${allNewProducts.length} ürün başarıyla eklendi.`;
                        if (totalSkipped > 0) msg += ` (${totalSkipped} satır atlandı)`;
                        showSuccess(msg);
                    } else {
                        showError("Dosyadan yüklenebilecek geçerli ürün bulunamadı. Lütfen başlıkları kontrol edin.");
                    }

                } catch (err: any) {
                    showError(`Dosya işlenirken hata: ${err.message}`);
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
    
    const handleEditCommit = () => {
        if (!editingCell) return;
        const { barcode, field } = editingCell;
        const originalProduct = products.find(p => p.barcode === barcode);
        if (!originalProduct) return;

        const newValue = parseFloat(editValue.replace(',', '.'));

        if (isNaN(newValue) || newValue < 0) {
            showError('Geçersiz değer girdiniz.');
            setEditingCell(null);
            return;
        }

        if (originalProduct[field] !== newValue) {
            if (field === 'stock') {
                onUpdateProductStock(barcode, Math.round(newValue));
            } else if (editingCell.isGroup) {
                // If editing from the Group Row, sync across the entire group
                const groupKey = getGroupKey(originalProduct);
                const variations = products.filter(p => getGroupKey(p) === groupKey);
                
                if (onBulkUpdateProducts) {
                    const updates = variations.map(v => ({
                        barcode: v.barcode,
                        updates: { [field]: newValue }
                    }));
                    onBulkUpdateProducts(updates);
                } else {
                    // Fallback to individual updates if bulk is not provided
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

    return (
        <div className="w-full h-full flex flex-col gap-4 relative">

            <div className="view-header">
                <h1 className="view-title">Ürünler ve Stok Yönetimi</h1>
                <div className="view-actions flex-grow justify-between">
                    <div className="flex items-center gap-2 flex-grow max-w-xl">
                        <div className="relative flex-grow group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Icon name="search" className="h-5 w-5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" />
                            </div>
                            <input 
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                placeholder="Ürün ara ve Enter'a bas..."
                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all shadow-sm"
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => { setSearchQuery(''); setActiveSearchQuery(''); }}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                >
                                    <Icon name="x-circle" className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Excel İşlemleri Dropdown */}
                        <div className="relative" ref={excelMenuRef}>
                            <button 
                                onClick={() => setIsExcelMenuOpen(!isExcelMenuOpen)} 
                                className="btn-secondary flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                            >
                                <Icon name="excel" className="w-5 h-5"/>
                                <span>Excel İşlemleri</span>
                                <Icon name="chevron-down" className={`w-4 h-4 transition-transform ${isExcelMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isExcelMenuOpen && (
                                <div className="absolute top-full mt-2 right-0 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-30 overflow-hidden">
                                    <button onClick={handleDownloadTemplate} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors">
                                        <Icon name="download" className="w-5 h-5 text-slate-400" />
                                        <span className="font-medium text-slate-700 dark:text-slate-200">Şablon İndir</span>
                                    </button>
                                    <button onClick={handleExcelUploadClick} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3 border-t border-slate-100 dark:border-slate-700 transition-colors">
                                        <Icon name="upload" className="w-5 h-5 text-slate-400" />
                                        <span className="font-medium text-slate-700 dark:text-slate-200">Şablon Yükle</span>
                                    </button>
                                    <button onClick={handleExportStock} className="w-full text-left px-4 py-3 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-3 border-t border-slate-100 dark:border-slate-700 transition-colors">
                                        <Icon name="excel" className="w-5 h-5 text-emerald-600" />
                                        <span className="font-medium text-emerald-700 dark:text-emerald-400">Listeyi Dışa Aktar</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Sütun Yönetimi */}
                        <div className="relative" ref={columnManagerRef}>
                            <button onClick={() => setIsColumnManagerOpen(prev => !prev)} className="btn-secondary">
                                <Icon name="view-columns" className="w-5 h-5"/> 
                                <span className="hidden lg:inline ml-2">Sütunlar</span>
                            </button>
                            {isColumnManagerOpen && (
                                <div className="absolute top-full mt-2 right-0 w-80 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl shadow-xl z-30 p-4">
                                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300 px-2 pb-2 border-b border-slate-200 dark:border-slate-700 mb-2">Gösterilecek Sütunlar</p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                    {allColumns.filter(c => c.id !== 'actions').map(col => (
                                        <label key={col.id} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                            <input type="checkbox" checked={!hiddenColumns.has(col.id)} onChange={() => toggleColumn(col.id)} className="h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500" />
                                            <span className="text-slate-700 dark:text-slate-300 select-none">{col.label}</span>
                                        </label>
                                    ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <button onClick={() => setIsFiltersOpen(!isFiltersOpen)} className={`btn-secondary ${Object.keys(filters).length > 0 ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : ''}`}>
                            <Icon name="filter" className="w-5 h-5"/>
                        </button>

                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                        <button onClick={() => setIsAddModalOpen(true)} className="btn-primary flex items-center gap-2">
                            <Icon name="plus" className="w-5 h-5"/> 
                            <span className="hidden sm:inline">Ürün Ekle</span>
                        </button>
                        
                        {props.companyInfo.aiEnabled && (
                            <button onClick={() => setIsAiModalOpen(true)} className="btn-secondary text-pink-600 border-pink-200 hover:bg-pink-50 dark:hover:bg-pink-900/10">
                                <Icon name="ai" className="w-5 h-5"/>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-grow bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-lg shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 text-sm text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  Toplam {productGroups.length} ürün grubu ({filteredProducts.length} varyasyon) bulundu.
                </div>
                <div className="flex-grow overflow-auto">
                    <table className="w-full text-sm table-fixed">
                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 text-[11px] text-slate-600 dark:text-slate-400 uppercase z-10 select-none">
                            <tr>
                                <th className="p-2 w-10 border-r border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center justify-center">
                                        <input 
                                            type="checkbox" 
                                            checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedBarcodes.has(p.barcode))}
                                            onChange={() => {
                                                if (filteredProducts.length > 0 && filteredProducts.every(p => selectedBarcodes.has(p.barcode))) setSelectedBarcodes(new Set());
                                                else setSelectedBarcodes(new Set(filteredProducts.map(p => p.barcode)));
                                            }}
                                            className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                        />
                                    </div>
                                </th>
                                <th className="p-2 text-left w-10 border-r border-slate-200 dark:border-slate-700"></th>
                                {visibleColumns.map(col => (
                                    <th key={col.id} scope="col" className={`px-2 py-1.5 font-bold relative group border-r border-slate-200 dark:border-slate-700 last:border-r-0 cursor-move ${draggedColumn.current === col.id ? 'opacity-30' : ''} ${dragOverColumn === col.id && draggedColumn.current !== col.id ? 'drag-over-indicator-products' : ''}`} style={{ width: `${columnWidths[col.id]}px` }} draggable onDragStart={(e) => handleDragStart(e, col.id)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col.id)} onDragEnd={handleDragEnd} onDragEnter={(e) => handleDragEnter(e, col.id)}>
                                        <div className="flex items-center justify-between"><span style={{textAlign: col.align || 'left', width: '100%'}}>{col.label}</span><Icon name="arrows-vertical" className="w-3 h-3 ml-1 text-slate-400 shrink-0" /></div>
                                        <div 
                                            onMouseDown={(e) => handleMouseDown(e, col.id)} 
                                            className="absolute top-0 right-[-6px] h-full w-3 cursor-col-resize z-20 transition-all duration-200 hover:bg-cyan-500/20 group-hover:bg-slate-300/20 flex items-center justify-center"
                                        >
                                            <div className="w-[1px] h-4 bg-slate-300 dark:bg-slate-700 rounded-full group-hover:bg-cyan-500 transition-colors" />
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="text-xs">
                            {productGroups.length === 0 ? (
                                <tr><td colSpan={visibleColumns.length + 2} className="text-center p-16 text-slate-500 font-medium">Böyle bir ürün bulunamadı.</td></tr>
                            ) : productGroups.slice(0, displayLimit).map((group, index) => {
                                const mainProduct = group[0];
                                const groupKey = getGroupKey(mainProduct);

                                const totalStock = group.reduce((sum, p) => sum + p.stock, 0);
                                const isExpanded = expandedGroups.has(groupKey);
                                const baseName = mainProduct.name.replace(/\s*\(.*\)$/, '').trim();

                                return (
                                    <React.Fragment key={groupKey}>
                                        <tr 
                                            className={`border-b dark:border-slate-700 font-semibold transition-colors ${isExpanded ? 'bg-cyan-50/50 dark:bg-cyan-900/10' : (index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-emerald-100/50 dark:bg-emerald-900/20')} hover:bg-rose-100/60 dark:hover:bg-rose-900/20`}
                                        >
                                            <td className="p-2 text-center border-r dark:border-slate-700" onClick={(e) => { e.stopPropagation(); toggleGroupSelection(groupKey, group); }}>
                                                <div className="flex items-center justify-center">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={group.every(p => selectedBarcodes.has(p.barcode))}
                                                        onChange={() => {}} // Done in parent div click
                                                        className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                                    />
                                                </div>
                                            </td>
                                            <td 
                                                className="p-2 text-center border-r dark:border-slate-700 cursor-pointer hover:bg-rose-200/50 dark:hover:bg-rose-800/30 transition-colors"
                                                onClick={(e) => toggleGroup(groupKey, e)}
                                                title={isExpanded ? 'Kapat' : 'Genişlet'}
                                            >
                                                <div className="flex items-center justify-center w-full">
                                                    <Icon name={isExpanded ? 'chevron-down' : 'chevron-right'} className={`w-4 h-4 text-rose-600 dark:text-rose-400 transition-transform`} />
                                                </div>
                                            </td>
                                            {visibleColumns.map(col => (
                                                <td key={col.id} className={`px-2 py-2 border-r dark:border-slate-700 last:border-r-0 ${['buyPrice', 'price', 'stock', 'profit', 'profitMargin'].includes(col.id) ? '' : 'truncate'}`} style={{ textAlign: col.align || 'left'}}>
                                                    {(() => {
                                                        if (col.id === 'name') return (
                                                            <div className="flex flex-col">
                                                                <span className="text-slate-900 dark:text-slate-100 font-bold truncate" title={baseName}>{baseName}</span>
                                                                <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium flex items-center gap-1">
                                                                    <Icon name="list-bullet" className="w-3 h-3" />
                                                                    {group.length} Varyasyon
                                                                </span>
                                                            </div>
                                                        );
                                                        if (col.id === 'stock') return (
                                                            <div className="flex flex-col items-end">
                                                                <span className={`text-sm font-bold ${totalStock <= 5 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>{totalStock}</span>
                                                                <span className="text-[9px] text-slate-400 font-normal">Toplam</span>
                                                            </div>
                                                        );
                                                        if (col.id === 'anaStokKodu') return (
                                                            <div className="flex flex-col">
                                                                <span className="text-cyan-700 dark:text-cyan-400 font-mono text-[11px] truncate" title={groupKey}>{groupKey}</span>
                                                                <span className="text-[9px] text-slate-400 font-normal">Grup Kodu</span>
                                                            </div>
                                                        );
                                                        if (col.id === 'actions') return (
                                                            <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                                                                 <button onClick={() => handleEditProductGroup(groupKey)} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 hover:text-cyan-600 dark:hover:text-cyan-400" title="Ürün Grubunu Düzenle">
                                                                    <Icon name="edit" className="w-5 h-5"/>
                                                                </button>
                                                            </div>
                                                        );
                                                        
                                                        const values = new Set(group.map(p => (p as any)[col.id]));
                                                        if (values.size === 1 && !['buyPrice', 'price', 'renk', 'beden', 'barcode', 'stokKodu', 'description'].includes(col.id)) {
                                                            return (mainProduct as any)[col.id] || '--';
                                                        }
                                                        
                                                        if (['buyPrice', 'price'].includes(col.id)) {
                                                            return <div className="w-full flex justify-end">{renderEditableCell(mainProduct, col.id as any, true)}</div>;
                                                        }

                                                        if (col.id === 'profit') {
                                                            const avgBuy = group.reduce((sum, p) => sum + p.buyPrice, 0) / group.length;
                                                            const avgPrice = group.reduce((sum, p) => sum + p.price, 0) / group.length;
                                                            return <div className="text-right w-full font-bold text-emerald-600 dark:text-emerald-400">{(avgPrice - avgBuy).toFixed(2)} ₺</div>;
                                                        }
                                                        
                                                        if (col.id === 'profitMargin') {
                                                            const avgBuy = group.reduce((sum, p) => sum + p.buyPrice, 0) / group.length;
                                                            const avgPrice = group.reduce((sum, p) => sum + p.price, 0) / group.length;
                                                            const margin = avgBuy > 0 ? ((avgPrice - avgBuy) / avgBuy) * 100 : 0;
                                                            return <div className="text-right w-full font-bold text-slate-500">{margin.toFixed(1)}%</div>;
                                                        }
                                                        
                                                        return '--';
                                                    })()}
                                                </td>
                                            ))}
                                        </tr>
                                        {isExpanded && group.map(p => (
                                            <tr key={p.barcode} className="border-b dark:border-slate-700 last:border-b-0 bg-white dark:bg-slate-900/40 hover:bg-rose-50/50 dark:hover:bg-rose-900/20 transition-colors">
                                                <td className="p-2 text-center border-r dark:border-slate-700">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedBarcodes.has(p.barcode)}
                                                        onChange={() => toggleSelection(p.barcode)}
                                                        className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                                    />
                                                </td>
                                                <td className="border-r dark:border-slate-700"></td>
                                                {visibleColumns.map(col => (
                                                    <td key={col.id} className={`px-2 py-1.5 border-r dark:border-slate-700 last:border-r-0 ${['buyPrice', 'price', 'stock', 'profit', 'profitMargin'].includes(col.id) ? '' : 'truncate'}`} style={{ textAlign: col.align || 'left'}}>
                                                        {(() => {
                                                            if (col.id === 'name') return <div className="flex flex-col"><span className="font-semibold text-slate-700 dark:text-slate-300">{p.renk} / {p.beden}</span><span className="text-slate-400 dark:text-slate-500 font-mono text-[10px]">{p.barcode}</span></div>;
                                                            if (col.id === 'stock') return <div className="w-full flex justify-end">{renderEditableCell(p, 'stock')}</div>;
                                                            if (col.id === 'buyPrice') return <div className="w-full flex justify-end">{renderEditableCell(p, 'buyPrice')}</div>;
                                                            if (col.id === 'price') return <div className="w-full flex justify-end">{renderEditableCell(p, 'price')}</div>;
                                                            if (col.id === 'profit') return <div className="text-right w-full font-medium text-emerald-500">{(p.price - p.buyPrice).toFixed(2)} ₺</div>;
                                                            if (col.id === 'profitMargin') {
                                                                const margin = p.buyPrice > 0 ? ((p.price - p.buyPrice) / p.buyPrice) * 100 : 0;
                                                                return <div className="text-right w-full font-medium text-slate-400">{margin.toFixed(1)}%</div>;
                                                            }
                                                            if (col.id === 'actions') return <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}><button onClick={() => handleEditProductGroup(getGroupKey(p))} className="p-1.5 rounded-full text-slate-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 hover:text-cyan-600" title="Düzenle"><Icon name="edit" className="w-4 h-4"/></button>
{p.isDeleted ? <button onClick={() => onRestoreProduct(p.barcode)} className="p-1.5 rounded-full text-slate-400 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600" title="Geri Yükle"><Icon name="restore" className="w-4 h-4"/></button> : <button onClick={() => onDeleteProduct(p.barcode)} className="p-1.5 rounded-full text-slate-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600" title="Arşivle"><Icon name="trash" className="w-4 h-4"/></button>}</div>;
                                                            if (col.id === 'renk') return p.renk;
                                                            if (col.id === 'beden') return p.beden;
                                                            if (col.id === 'stokKodu') return p.stokKodu;
                                                            if (col.id === 'barcode') return p.barcode;
                                                            
                                                            const groupValue = (mainProduct as any)[col.id];
                                                            const val = (p as any)[col.id];
                                                            if (val === groupValue) return <span className="opacity-30">{val}</span>;
                                                            return val || '--';
                                                        })()}
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
                        <div className="p-4 flex justify-center border-t dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/10">
                            <button 
                                onClick={() => setDisplayLimit(prev => prev + 100)}
                                className="px-8 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full font-bold shadow-xl shadow-cyan-200 dark:shadow-none transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95"
                            >
                                <Icon name="refresh" className="w-5 h-5" />
                                Daha Fazla Ürün Yükle ({productGroups.length - displayLimit} varyasyon grubu kaldı)
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
              .btn-primary { display: inline-flex; align-items: center; gap: 0.5rem; background-color: #0ea5e9; color: white; font-weight: 600; padding: 0.6rem 1rem; border-radius: 0.5rem; transition: all 0.2s; }
              .btn-primary:hover { background-color: #0284c7; }
              .btn-secondary { display: inline-flex; align-items: center; gap: 0.5rem; background-color: white; border: 1px solid #cbd5e1; color: #334155; font-weight: 600; padding: 0.6rem 1rem; border-radius: 0.5rem; transition: all 0.2s; }
              .btn-secondary:hover { background-color: #f1f5f9; }
            `}</style>

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
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                style={{ display: 'none' }}
            />

            {notification && (
                <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-3 animate-bounce-in border-2 ${
                    notification.type === 'success' 
                        ? 'bg-emerald-500 border-emerald-400 text-white' 
                        : 'bg-rose-500 border-rose-400 text-white'
                }`}>
                    <Icon name={notification.type === 'success' ? 'check-circle' : 'exclamation-circle'} className="w-6 h-6" />
                    <span className="font-bold tracking-wide">{notification.message}</span>
                </div>
            )}
        </div>
    );
}

export default ProductsView;