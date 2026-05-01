import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Icon from '../components/Icon';
import { Product, Definitions, CompanyInfo, LabelElement, LabelTemplate } from '../types';
import JsBarcode from 'jsbarcode';

type ElementType = 'text' | 'barcode' | 'price' | 'brand' | 'size' | 'qr' | 'shape' | 'stokKodu' | 'image' | 'line' | 'rect' | 'circle';

interface LabelDesignerProps {
    products: Product[];
    definitions: Definitions;
    templates: LabelTemplate[];
    setTemplates: (val: LabelTemplate[] | ((prev: LabelTemplate[]) => LabelTemplate[])) => void;
    companyInfo: CompanyInfo;
    onUpdateCompanyInfo: (info: CompanyInfo) => void;
}

const DEFAULT_TEMPLATES: LabelTemplate[] = [
    {
        id: 'std-4020',
        name: '40x20mm Standart',
        width: 40,
        height: 20,
        columns: 1,
        gap: 0,
        elements: [
            { id: 'e1', type: 'brand', x: 2, y: 2, width: 36, height: 4, fontSize: 7, fontWeight: '800', fontFamily: 'Inter', textAlign: 'center', visible: true, rotation: 0, opacity: 1, zIndex: 1, isVertical: false, binding: 'marka' },
            { id: 'e2', type: 'text', x: 2, y: 6, width: 36, height: 5, fontSize: 8, fontWeight: '600', fontFamily: 'Inter', textAlign: 'center', visible: true, rotation: 0, opacity: 1, zIndex: 2, isVertical: false, binding: 'name' },
            { id: 'e3', type: 'barcode', x: 5, y: 12, width: 30, height: 6, fontSize: 0, fontWeight: 'normal', fontFamily: 'Inter', textAlign: 'center', visible: true, rotation: 0, opacity: 1, zIndex: 3, isVertical: false, binding: 'barcode', barcodeType: 'EAN13', showHumanReadable: true },
            { id: 'e4', type: 'price', x: 25, y: 6, width: 13, height: 5, fontSize: 10, fontWeight: '900', fontFamily: 'Inter', textAlign: 'right', visible: true, rotation: 0, opacity: 1, zIndex: 4, isVertical: false, binding: 'price' },
        ]
    },
    {
        id: 'v-5-2040',
        name: '20x40mm Yanyana 5li (Dikey)',
        width: 20,
        height: 40,
        columns: 5,
        gap: 2,
        elements: [
            { id: 'v1', type: 'brand', x: 2, y: 2, width: 16, height: 4, fontSize: 6, fontWeight: '800', fontFamily: 'Inter', textAlign: 'center', visible: true, rotation: 0, opacity: 1, zIndex: 1, isVertical: false, binding: 'marka' },
            { id: 'v2', type: 'text', x: 2, y: 7, width: 16, height: 20, fontSize: 7, fontWeight: '600', fontFamily: 'Inter', textAlign: 'center', visible: true, rotation: 0, opacity: 1, zIndex: 2, isVertical: true, binding: 'name' },
            { id: 'v3', type: 'barcode', x: 2, y: 32, width: 16, height: 6, fontSize: 0, fontWeight: 'normal', fontFamily: 'Inter', textAlign: 'center', visible: true, rotation: 0, opacity: 1, zIndex: 3, isVertical: false, binding: 'barcode', barcodeType: 'EAN13', showHumanReadable: true },
            { id: 'v4', type: 'price', x: 2, y: 28, width: 16, height: 4, fontSize: 10, fontWeight: '900', fontFamily: 'Inter', textAlign: 'center', visible: true, rotation: 0, opacity: 1, zIndex: 4, isVertical: false, binding: 'price' },
        ]
    }
];

const Barcode = ({ value, format = 'CODE128', width = 1, height = 30, displayValue = false, fontSize = 10 }: any) => {
    const svgRef = useRef<SVGSVGElement>(null);
    useEffect(() => {
        if (svgRef.current && value) {
            try {
                JsBarcode(svgRef.current, value, {
                    format: format === 'QR' ? 'CODE128' : format, // Handle QR separately if needed, for now use CODE128
                    width,
                    height,
                    displayValue,
                    fontSize,
                    margin: 0,
                    background: 'transparent'
                });
            } catch (e) {
                console.error('Barcode error:', e);
            }
        }
    }, [value, format, width, height, displayValue, fontSize]);
    return <svg ref={svgRef} className="w-full h-full" />;
};

const LabelDesigner: React.FC<LabelDesignerProps> = ({ products, definitions, templates, setTemplates, companyInfo, onUpdateCompanyInfo }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterBrand, setFilterBrand] = useState('');
    const [filterModel, setFilterModel] = useState('');
    const [filterColor, setFilterColor] = useState('');
    const [filterSize, setFilterSize] = useState('');
    const [filterCode, setFilterCode] = useState('');

    const [itemsToPrint, setItemsToPrint] = useState<{ product: Product, count: number, templateId?: string }[]>([]);
    const [printQueue, setPrintQueue] = useState<{ product: Product, count: number, printer?: string, templateId?: string }[]>([]);

    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(templates[0]?.id || null);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [zoom, setZoom] = useState(6); // px per mm
    const [showGrid, setShowGrid] = useState(true);
    const [snapToGrid, setSnapToGrid] = useState(false);

    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeHandle, setResizeHandle] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isRotating, setIsRotating] = useState(false);
    const [dragState, setDragState] = useState<{ x: number, y: number, width: number, height: number, rotation: number } | null>(null);



    const [history, setHistory] = useState<LabelTemplate[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [showSaveMessage, setShowSaveMessage] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);
    const [openTemplateIds, setOpenTemplateIds] = useState<string[]>([templates[0]?.id]);
    const [clipboard, setClipboard] = useState<LabelElement | null>(null);

    const canvasRef = useRef<HTMLDivElement>(null);
    const mouseCoordsRef = useRef<HTMLSpanElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const requestRef = useRef<number | null>(null);

    const [engine, setEngine] = useState<'bartender' | 'argox' | 'native'>(companyInfo.labelEngine || 'native');
    const [btwPath, setBtwPath] = useState(companyInfo.labelTemplatePath || '');
    const [appPath, setAppPath] = useState(companyInfo.labelAppPath || '');

    // Sync from Firestore if changed elsewhere
    useEffect(() => {
        if (companyInfo.labelEngine) setEngine(companyInfo.labelEngine);
        if (companyInfo.labelTemplatePath) setBtwPath(companyInfo.labelTemplatePath);
        if (companyInfo.labelAppPath) setAppPath(companyInfo.labelAppPath);
    }, [companyInfo.labelEngine, companyInfo.labelTemplatePath, companyInfo.labelAppPath]);

    const saveSettings = (updates: Partial<CompanyInfo>) => {
        onUpdateCompanyInfo({ ...companyInfo, ...updates });
    };

    const [activeTab, setActiveTab] = useState<'template' | 'form' | 'products'>('products');
    const [leftPanel, setLeftPanel] = useState<'tools' | 'objects'>('tools');
    const [propTab, setPropTab] = useState<'general' | 'style' | 'data' | 'symbology'>('general');

    const activeTemplate = useMemo(() => {
        const found = templates.find(t => t.id === selectedTemplateId) || templates[0];
        if (found) return found;
        return DEFAULT_TEMPLATES[0]; // Boşsa varsayılanı kullan
    }, [templates, selectedTemplateId]);

    const selectedElement = useMemo(() => {
        if (!activeTemplate || !activeTemplate.elements) return null;
        return activeTemplate.elements.find(e => e.id === selectedElementId) || null;
    }, [activeTemplate, selectedElementId]);

    // Refs for stable event listeners (Must be after state/memo declarations)
    const dragStateRef = useRef(dragState);
    const isDraggingRef = useRef(isDragging);
    const isResizingRef = useRef(isResizing);
    const isRotatingRef = useRef(isRotating);
    const selectedElementIdRef = useRef(selectedElementId);
    const resizeHandleRef = useRef(resizeHandle);
    const dragOffsetRef = useRef(dragOffset);
    const zoomRef = useRef(zoom);
    const activeTemplateRef = useRef(activeTemplate);

    useEffect(() => { dragStateRef.current = dragState; }, [dragState]);
    useEffect(() => { isDraggingRef.current = isDragging; }, [isDragging]);
    useEffect(() => { isResizingRef.current = isResizing; }, [isResizing]);
    useEffect(() => { isRotatingRef.current = isRotating; }, [isRotating]);
    useEffect(() => { selectedElementIdRef.current = selectedElementId; }, [selectedElementId]);
    useEffect(() => { resizeHandleRef.current = resizeHandle; }, [resizeHandle]);
    useEffect(() => { dragOffsetRef.current = dragOffset; }, [dragOffset]);
    useEffect(() => { zoomRef.current = zoom; }, [zoom]);
    useEffect(() => { activeTemplateRef.current = activeTemplate; }, [activeTemplate]);

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.barcode.includes(searchQuery);
            const matchesBrand = !filterBrand || p.marka.toLowerCase().includes(filterBrand.toLowerCase());
            const matchesModel = !filterModel || p.model.toLowerCase().includes(filterModel.toLowerCase());
            const matchesColor = !filterColor || p.renk.toLowerCase().includes(filterColor.toLowerCase());
            const matchesSize = !filterSize || p.beden.toLowerCase().includes(filterSize.toLowerCase());
            const matchesCode = !filterCode || (p.stokKodu || '').toLowerCase().includes(filterCode.toLowerCase()) || (p.anaStokKodu || '').toLowerCase().includes(filterCode.toLowerCase());

            return matchesSearch && matchesBrand && matchesModel && matchesColor && matchesSize && matchesCode;
        });
    }, [products, searchQuery, filterBrand, filterModel, filterColor, filterSize, filterCode]);

    // Unique values for dropdowns
    const uniqueBrands = useMemo(() => Array.from(new Set(products.map(p => p.marka).filter(Boolean))), [products]);
    const uniqueModels = useMemo(() => Array.from(new Set(products.map(p => p.model).filter(Boolean))), [products]);
    const uniqueColors = useMemo(() => Array.from(new Set(products.map(p => p.renk).filter(Boolean))), [products]);
    const uniqueSizes = useMemo(() => Array.from(new Set(products.map(p => p.beden).filter(Boolean))), [products]);
    const uniqueCodes = useMemo(() => Array.from(new Set([...products.map(p => p.stokKodu), ...products.map(p => p.anaStokKodu)].filter(Boolean))), [products]);

    // Removed localStorage effect as we use Firestore now
    // Settings are saved via saveSettings helper

    const saveToHistory = useCallback((currentTemplates: LabelTemplate[]) => {
        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1);
            return [...newHistory, JSON.parse(JSON.stringify(currentTemplates))].slice(-20); // Son 20 işlem
        });
        setHistoryIndex(prev => prev + 1);
    }, [historyIndex]);

    const undo = () => {
        if (historyIndex > 0) {
            const prevTemplates = history[historyIndex - 1];
            setTemplates(prevTemplates);
            setHistoryIndex(historyIndex - 1);
        }
    };

    const updateElement = useCallback((id: string, updates: Partial<LabelElement>) => {
        setTemplates(prev => {
            const newTemplates = prev.map(t => {
                if (t.id === selectedTemplateId) {
                    return {
                        ...t,
                        elements: t.elements.map(e => e.id === id ? { ...e, ...updates } : e)
                    };
                }
                return t;
            });
            return newTemplates;
        });
    }, [selectedTemplateId, setTemplates]);

    // Değişiklikleri tarihe kaydet (sadece sürükleme/boyutlandırma bitince veya değer değişince)
    useEffect(() => {
        if (!isDragging && !isResizing && !isRotating) {
            saveToHistory(templates);
        }
    }, [isDragging, isResizing, isRotating]);

    const createNewTemplate = () => {
        const newTemp: LabelTemplate = {
            id: `temp-${Date.now()}`,
            name: 'Yeni Tasarım ' + (templates.length + 1),
            width: 40,
            height: 20,
            columns: 1,
            gap: 0,
            elements: []
        };
        setTemplates(prev => [...prev, newTemp]);
        setOpenTemplateIds(prev => [...prev, newTemp.id]);
        setSelectedTemplateId(newTemp.id);
        setActiveMenu(null);
    };

    const openTemplate = (id: string) => {
        if (!openTemplateIds.includes(id)) {
            setOpenTemplateIds(prev => [...prev, id]);
        }
        setSelectedTemplateId(id);
        setActiveMenu(null);
    };

    const closeTemplate = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('Bu şablonu kapatmak istediğinizden emin misiniz? (Tüm değişiklikler kaydedildi)')) {
            const nextOpen = openTemplateIds.filter(tid => tid !== id);
            setOpenTemplateIds(nextOpen);
            if (selectedTemplateId === id && nextOpen.length > 0) {
                setSelectedTemplateId(nextOpen[nextOpen.length - 1]);
            } else if (nextOpen.length === 0) {
                setSelectedTemplateId(null);
            }
        }
    };

    const addElement = (type: ElementType, extraProps: Partial<LabelElement> = {}) => {
        const nextZIndex = activeTemplate.elements.length > 0
            ? Math.max(...activeTemplate.elements.map(e => e.zIndex || 0)) + 1
            : 1;

        const defaultWidth = type === 'line' ? 20 : (type === 'image' ? 20 : (type === 'barcode' ? 30 : 15));
        const defaultHeight = type === 'line' ? 0.5 : (type === 'image' ? 20 : (type === 'barcode' ? 8 : 10));

        // Otomatik ortala (Barkod için özel hassasiyet)
        const centeredX = Math.round(((activeTemplate.width - defaultWidth) / 2) * 10) / 10;
        const centeredY = Math.round(((activeTemplate.height - defaultHeight) / 2) * 10) / 10;

        const newElement: LabelElement = {
            id: `el-${Date.now()}`,
            type,
            x: centeredX,
            y: centeredY,
            width: defaultWidth,
            height: defaultHeight,
            fontSize: type === 'barcode' ? 2 : 10,
            fontWeight: 'bold',
            fontFamily: 'Inter',
            textAlign: 'center',
            content: type === 'text' ? 'ÖRNEK METİN' : '',
            visible: true,
            rotation: 0,
            opacity: 1,
            zIndex: nextZIndex,
            isVertical: false,
            barcodeType: type === 'barcode' ? 'EAN13' : undefined,
            showHumanReadable: type === 'barcode' ? true : undefined,
            shapeType: type === 'shape' ? 'rect' : undefined,
            ...extraProps
        };

        setTemplates(prev => prev.map(t => {
            if (t.id === selectedTemplateId) {
                return { ...t, elements: [...t.elements, newElement] };
            }
            return t;
        }));
        setSelectedElementId(newElement.id);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const src = event.target?.result as string;
                addElement('image', { src, width: 20, height: 20 });
            };
            reader.readAsDataURL(file);
        }
    };

    const copyElement = () => {
        const el = activeTemplate.elements.find(e => e.id === selectedElementId);
        if (el) {
            setClipboard({ ...el, id: `el-${Date.now()}` });
        }
        setActiveMenu(null);
    };

    const cutElement = () => {
        const el = activeTemplate.elements.find(e => e.id === selectedElementId);
        if (el) {
            setClipboard({ ...el, id: `el-${Date.now()}` });
            deleteElement(selectedElementId!);
        }
        setActiveMenu(null);
    };

    const pasteElement = () => {
        if (clipboard) {
            const newEl = { ...clipboard, id: `el-${Date.now()}`, x: clipboard.x + 2, y: clipboard.y + 2 };
            setTemplates(prev => prev.map(t => t.id === selectedTemplateId ? { ...t, elements: [...t.elements, newEl] } : t));
            setSelectedElementId(newEl.id);
            setClipboard({ ...newEl });
        }
        setActiveMenu(null);
    };
    const handlePrint = () => {
        executePrint();
        setActiveMenu(null);
    };

    const handlePrintItem = (item: { product: Product, count: number, templateId?: string }) => {
        console.log('Printing single item:', item);
        executePrint([item]);
    };

    const moveZIndex = (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
        setTemplates(prev => prev.map(t => {
            if (t.id === selectedTemplateId) {
                const elements = [...t.elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
                const index = elements.findIndex(e => e.id === id);
                if (index === -1) return t;

                const newElements = [...elements];
                if (direction === 'up' && index < newElements.length - 1) {
                    const temp = newElements[index].zIndex;
                    newElements[index].zIndex = newElements[index + 1].zIndex;
                    newElements[index + 1].zIndex = temp;
                } else if (direction === 'down' && index > 0) {
                    const temp = newElements[index].zIndex;
                    newElements[index].zIndex = newElements[index - 1].zIndex;
                    newElements[index - 1].zIndex = temp;
                } else if (direction === 'top') {
                    const maxZ = Math.max(...newElements.map(e => e.zIndex || 0));
                    newElements[index].zIndex = maxZ + 1;
                } else if (direction === 'bottom') {
                    const minZ = Math.min(...newElements.map(e => e.zIndex || 0));
                    newElements[index].zIndex = minZ - 1;
                }

                return { ...t, elements: newElements };
            }
            return t;
        }));
    };

    const deleteElement = (id: string) => {
        setTemplates(prev => prev.map(t => t.id === selectedTemplateId ? { ...t, elements: t.elements.filter(e => e.id !== id) } : t));
        setSelectedElementId(null);
    };

    const onMouseDown = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault(); // Tarayıcının varsayılan hayalet sürükleme davranışını (özellikle barkod/SVG için) engeller.
        setSelectedElementId(id);

        const el = activeTemplate.elements.find(el => el.id === id);
        if (el && canvasRef.current) {
            const labelEl = canvasRef.current.querySelector('.relative.bg-white');
            if (!labelEl) return;
            const rect = labelEl.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left) / zoom;
            const mouseY = (e.clientY - rect.top) / zoom;

            const offset = { x: mouseX - el.x, y: mouseY - el.y };
            setDragOffset(offset);
            setDragState({ x: el.x, y: el.y, width: el.width, height: el.height, rotation: el.rotation });
            setIsDragging(true);
            setIsResizing(false);
            setIsRotating(false);
        }
    };

    const onResizeStart = (e: React.MouseEvent, id: string, handle: string) => {
        e.stopPropagation();
        e.preventDefault();
        setSelectedElementId(id);
        setResizeHandle(handle);

        const el = activeTemplate.elements.find(el => el.id === id);
        if (el) {
            setDragState({ x: el.x, y: el.y, width: el.width, height: el.height, rotation: el.rotation });
            setIsResizing(true);
            setIsDragging(false);
            setIsRotating(false);
        }
    };

    const onRotationStart = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault();
        setSelectedElementId(id);
        const el = activeTemplate.elements.find(el => el.id === id);
        if (el) {
            setDragState({ x: el.x, y: el.y, width: el.width, height: el.height, rotation: el.rotation });
            setIsRotating(true);
            setIsDragging(false);
            setIsResizing(false);
        }
    };

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!isDraggingRef.current && !isResizingRef.current && !isRotatingRef.current) return;
        if (!selectedElementIdRef.current || !canvasRef.current || !dragStateRef.current) return;

        const labelEl = canvasRef.current.querySelector('.relative.bg-white');
        if (!labelEl) return;
        const rect = labelEl.getBoundingClientRect();

        const currentZoom = zoomRef.current;
        const currentActiveTemplate = activeTemplateRef.current;
        const currentDragOffset = dragOffsetRef.current;
        const currentDragState = dragStateRef.current;

        if (requestRef.current) cancelAnimationFrame(requestRef.current);

        requestRef.current = requestAnimationFrame(() => {
            const mouseX = (e.clientX - rect.left) / currentZoom;
            const mouseY = (e.clientY - rect.top) / currentZoom;

            if (mouseCoordsRef.current) {
                mouseCoordsRef.current.innerText = `X: ${mouseX.toFixed(1)}mm Y: ${mouseY.toFixed(1)}mm`;
            }

            const precision = 100; // Milimetre altı hassasiyet (0.01mm)

            if (isDraggingRef.current) {
                let newX = mouseX - currentDragOffset.x;
                let newY = mouseY - currentDragOffset.y;

                // Tüm otomatik yapışma (snapping) özellikleri kaldırıldı, fare ne derse o.
                newX = Math.round(newX * precision) / precision;
                newY = Math.round(newY * precision) / precision;

                setDragState(prev => prev ? { ...prev, x: newX, y: newY } : null);
            } else if (isResizingRef.current && resizeHandleRef.current) {
                let { x, y, width, height, rotation } = currentDragState;
                const curX = Math.round(mouseX * precision) / precision;
                const curY = Math.round(mouseY * precision) / precision;

                switch (resizeHandleRef.current) {
                    case 'br': width = Math.max(0.1, curX - x); height = Math.max(0.1, curY - y); break;
                    case 'tr': width = Math.max(0.1, curX - x); height = Math.max(0.1, height + (y - curY)); y = curY; break;
                    case 'bl': width = Math.max(0.1, width + (x - curX)); x = curX; height = Math.max(0.1, curY - y); break;
                    case 'tl': width = Math.max(0.1, width + (x - curX)); x = curX; height = Math.max(0.1, height + (y - curY)); y = curY; break;
                    case 'r': width = Math.max(0.1, curX - x); break;
                    case 'b': height = Math.max(0.1, curY - y); break;
                    case 'l': width = Math.max(0.1, width + (x - curX)); x = curX; break;
                    case 't': height = Math.max(0.1, height + (y - curY)); y = curY; break;
                }
                setDragState({ x, y, width, height, rotation });
            } else if (isRotatingRef.current) {
                const centerX = (currentDragState.x + currentDragState.width / 2) * currentZoom + rect.left;
                const centerY = (currentDragState.y + currentDragState.height / 2) * currentZoom + rect.top;

                const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
                let finalAngle = (angle + 90 + 360) % 360;

                // Serbest döndürme: 0.01 derece hassasiyet
                finalAngle = Math.round(finalAngle * 100) / 100;

                setDragState(prev => prev ? { ...prev, rotation: finalAngle } : null);
            }
        });
    }, []);

    const onMouseUp = useCallback(() => {
        const state = dragStateRef.current;
        const id = selectedElementIdRef.current;

        if ((isDraggingRef.current || isResizingRef.current || isRotatingRef.current) && id && state) {
            updateElement(id, {
                x: Math.round(state.x * 100) / 100,
                y: Math.round(state.y * 100) / 100,
                width: Math.round(state.width * 100) / 100,
                height: Math.round(state.height * 100) / 100,
                rotation: Math.round(state.rotation * 100) / 100
            });
        }

        setIsDragging(false);
        setIsResizing(false);
        setIsRotating(false);
        setResizeHandle(null);
        setDragState(null);
    }, [updateElement]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!selectedElementId) return;

            // Input veya textarea içindeyse işlemleri engelle
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                deleteElement(selectedElementId);
            }

            // Ok Tuşları ile Milimetrik Kaydırma (0.1mm)
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                const step = e.shiftKey ? 1.0 : 0.1; // Shift ile 1mm, normalde 0.1mm
                const el = activeTemplate.elements.find(el => el.id === selectedElementId);
                if (el) {
                    let nx = el.x;
                    let ny = el.y;
                    if (e.key === 'ArrowUp') ny -= step;
                    if (e.key === 'ArrowDown') ny += step;
                    if (e.key === 'ArrowLeft') nx -= step;
                    if (e.key === 'ArrowRight') nx += step;

                    updateElement(selectedElementId, {
                        x: Math.round(nx * 10) / 10,
                        y: Math.round(ny * 10) / 10
                    });
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedElementId]);

    useEffect(() => {
        if (isDragging || isResizing || isRotating) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        } else {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [isDragging, isResizing, isRotating, onMouseMove, onMouseUp]);

    const previewProduct = (printQueue[0]?.product || products[0] || { name: 'ÖRNEK ÜRÜN ADI', barcode: '8690000000001', price: 149.90, marka: 'MARKA', stokKodu: 'STK-001' }) as Product;

    const executePrint = (items = printQueue) => {
        if (items.length === 0) {
            alert('Yazdırılacak ürün bulunamadı! Lütfen önce ürün ekleyin.');
            return;
        }
        if (engine === 'native') {
            setItemsToPrint(items);
            setTimeout(() => {
                window.print();
                setItemsToPrint([]);
            }, 1000);
            return;
        }
        if (!btwPath) return;
        const ipcRenderer = (window as any).require?.('electron')?.ipcRenderer;
        if (!ipcRenderer) return;

        const dataToSend = items.flatMap(item => Array.from({ length: item.count }).map(() => ({
            BARKODU: item.product.barcode,
            STOKKODU: item.product.stokKodu || '',
            STOK_ADI: item.product.name,
            KSF1: item.product.price.toFixed(2),
            KAF1: item.product.buyPrice?.toFixed(2) || '0.00',
            ALT_GRUBU: item.product.marka || '',
            BIRIMI: 'ADET',
            RENK: item.product.renk || '',
            BEDEN: item.product.beden || ''
        })));
        ipcRenderer.send('print-to-label-software', { engine, templatePath: btwPath, data: dataToSend, appPath });
    };

    const renderElementContent = (el: LabelElement, product: Product, isPrinting: boolean = false) => {
        const value = el.binding ? (product[el.binding as keyof Product] || el.binding) : (el.content || '');
        const z = isPrinting ? 1 : (zoom / 6); // Printing uses mm directly, preview uses zoom

        if (el.type === 'text' || el.type === 'price' || el.type === 'brand') {
            return (
                <div className={`w-full h-full flex items-center font-bold text-black ${el.isVertical ? 'writing-vertical' : ''}`}
                    style={{
                        fontSize: `${el.fontSize * z}px`,
                        fontFamily: el.fontFamily,
                        textAlign: el.textAlign,
                        justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start'
                    }}>
                    {value}
                </div>
            );
        }
        if (el.type === 'barcode' || el.type === 'qr') {
            return (
                <div className="w-full h-full bg-white flex items-center justify-center p-1">
                    <Barcode
                        value={product.barcode}
                        format={el.barcodeType || 'CODE128'}
                        displayValue={el.showHumanReadable}
                        fontSize={el.fontSize}
                    />
                </div>
            );
        }
        if (el.type === 'image' && el.src) {
            return <img src={el.src} className="w-full h-full object-contain" />;
        }
        if (el.type === 'rect' || el.type === 'circle' || el.type === 'shape') {
            return <div className="w-full h-full border-2 border-black" style={{ borderRadius: el.shapeType === 'circle' ? '50%' : '0' }} />;
        }
        return null;
    };

    return (
        <div className="w-full h-full flex flex-col bg-[#0f172a] text-slate-300 font-sans overflow-hidden select-none">
            <header className="flex-shrink-0 bg-slate-900 border-b border-white/10 z-[60] shadow-2xl relative no-print">
                {/* ROW 1: MENUS & STATUS */}
                <div className="h-8 px-3 flex items-center justify-between text-[11px] font-bold text-slate-400 border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <button onClick={() => setActiveMenu(activeMenu === 'dosya' ? null : 'dosya')} className={`transition-all hover:text-white ${activeMenu === 'dosya' ? 'text-white' : ''}`}>Dosya</button>
                            {activeMenu === 'dosya' && (
                                <div className="absolute top-full left-0 mt-1 w-44 bg-slate-900 border border-white/10 rounded-lg shadow-2xl py-1.5 z-[100] animate-in fade-in slide-in-from-top-1">
                                    <button onClick={createNewTemplate} className="w-full px-4 py-2 text-left hover:bg-indigo-600 hover:text-white flex items-center justify-between text-[13px]">
                                        <span>Yeni Şablon</span>
                                        <span className="text-[10px] opacity-50">Ctrl+N</span>
                                    </button>
                                    <button onClick={() => { setShowSaveMessage(true); setTimeout(() => setShowSaveMessage(false), 2000); setActiveMenu(null); }} className="w-full px-4 py-2 text-left hover:bg-indigo-600 hover:text-white flex items-center justify-between text-[13px]">
                                        <span>Kaydet</span>
                                        <span className="text-[10px] opacity-50">Ctrl+S</span>
                                    </button>
                                    <div className="h-px bg-white/5 my-1" />
                                    <div className="relative group/sub">
                                        <button className="w-full px-4 py-2 text-left hover:bg-indigo-600 hover:text-white flex items-center justify-between text-[13px]">
                                            <span>Şablon Aç</span>
                                            <Icon name="list-bullet" className="w-3.5 h-3.5" />
                                        </button>
                                        <div className="absolute left-full top-0 ml-1 w-48 bg-slate-900 border border-white/10 rounded-lg shadow-2xl py-1.5 hidden group-hover/sub:block">
                                            {templates.map(t => (
                                                <button key={t.id} onClick={() => openTemplate(t.id)} className={`w-full px-4 py-2 text-left hover:bg-indigo-600 hover:text-white text-[12px] ${selectedTemplateId === t.id ? 'text-indigo-400 font-black' : ''}`}>{t.name}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="relative group">
                            <button onClick={() => setActiveMenu(activeMenu === 'duzen' ? null : 'duzen')} className={`transition-all hover:text-white ${activeMenu === 'duzen' ? 'text-white' : ''}`}>Düzen</button>
                            {activeMenu === 'duzen' && (
                                <div className="absolute top-full left-0 mt-1 w-44 bg-slate-900 border border-white/10 rounded-lg shadow-2xl py-1.5 z-[100]">
                                    <button onClick={() => { undo(); setActiveMenu(null); }} className="w-full px-4 py-2 text-left hover:bg-indigo-600 hover:text-white flex items-center justify-between text-[13px]">
                                        <span>Geri Al</span>
                                        <span className="text-[10px] opacity-50">Ctrl+Z</span>
                                    </button>
                                    <div className="h-px bg-white/5 my-1" />
                                    <button onClick={copyElement} className="w-full px-4 py-2 text-left hover:bg-indigo-600 hover:text-white text-[13px]">Kopyala</button>
                                    <button onClick={pasteElement} className="w-full px-4 py-2 text-left hover:bg-indigo-600 hover:text-white text-[13px]">Yapıştır</button>
                                    <button onClick={() => { selectedElementId && deleteElement(selectedElementId); setActiveMenu(null); }} className="w-full px-4 py-2 text-left hover:bg-rose-600 hover:text-white text-[13px]">Sil</button>
                                </div>
                            )}
                        </div>

                        <div className="relative group">
                            <button onClick={() => setActiveMenu(activeMenu === 'gorunum' ? null : 'gorunum')} className={`transition-all hover:text-white ${activeMenu === 'gorunum' ? 'text-white' : ''}`}>Görünüm</button>
                            {activeMenu === 'gorunum' && (
                                <div className="absolute top-full left-0 mt-1 w-44 bg-slate-900 border border-white/10 rounded-lg shadow-2xl py-1.5 z-[100]">
                                    <button onClick={() => { setShowGrid(!showGrid); setActiveMenu(null); }} className="w-full px-4 py-2 text-left hover:bg-indigo-600 hover:text-white flex items-center justify-between text-[13px]">
                                        <span>Izgara Göster</span>
                                        <Icon name={showGrid ? 'check-circle' : 'plus'} className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="relative group">
                            <button onClick={() => setActiveMenu(activeMenu === 'ayarlar' ? null : 'ayarlar')} className={`transition-all hover:text-white ${activeMenu === 'ayarlar' ? 'text-white' : ''}`}>Ayarlar</button>
                            {activeMenu === 'ayarlar' && (
                                <div className="absolute top-full left-0 mt-1 w-52 bg-slate-900 border border-white/10 rounded-lg shadow-2xl py-1.5 z-[100]">
                                    {(['bartender', 'argox', 'native'] as const).map(lib => (
                                        <button key={lib} onClick={() => { setEngine(lib); saveSettings({ labelEngine: lib }); setActiveMenu(null); }} className={`w-full px-4 py-2 text-left hover:bg-indigo-600 hover:text-white text-[13px] flex items-center justify-between ${engine === lib ? 'text-indigo-400 font-bold' : ''}`}>
                                            <span className="capitalize">{lib} Driver</span>
                                            {engine === lib && <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {showSaveMessage && <span className="text-emerald-400 animate-pulse flex items-center gap-1 text-[9px]"><Icon name="check-circle" className="w-3 h-3" /> KAYDEDİLDİ</span>}
                        <div className="w-px h-3 bg-white/10 mx-1" />
                        <span className="text-slate-500 text-[9px] tracking-widest font-black">STUDIO v9.2.3</span>
                    </div>
                </div>

                {/* ROW 2: MAIN TOOLBAR */}
                <div className="h-11 px-3 flex items-center justify-between bg-slate-900/50 backdrop-blur-md">
                    <div className="flex items-center gap-1 bg-slate-950/40 p-0.5 rounded-lg border border-white/5">
                        <button
                            onClick={() => setActiveTab('products')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${activeTab === 'products' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <Icon name="search" className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-black uppercase tracking-wider">Ürün Seç</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('template')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${activeTab === 'template' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <Icon name="plus" className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-black uppercase tracking-wider">Tasarım</span>
                        </button>

                        <div className="flex items-center bg-slate-950/50 p-1 rounded-md border border-white/10 mx-1">
                            <button onClick={() => setZoom(Math.max(2, zoom - 1))} className="p-1 hover:text-white text-slate-400 transition-all"><Icon name="minus" className="w-3 h-3" /></button>
                            <span className="text-[10px] font-black w-8 text-center text-indigo-400">{Math.round((zoom / 6) * 100)}%</span>
                            <button onClick={() => setZoom(Math.min(15, zoom + 1))} className="p-1 hover:text-white text-slate-400 transition-all"><Icon name="plus" className="w-3 h-3" /></button>
                        </div>

                        <div className="w-px h-5 bg-white/10 mx-0.5" />

                        <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-all shadow-lg shadow-emerald-900/20 active:scale-95">
                            <Icon name="printer" className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-black uppercase tracking-wider">Yazdır</span>
                        </button>
                    </div>

                    {/* CONTEXTUAL TOOLS */}
                    <div className="flex items-center gap-3">
                        {selectedElement && activeTab === 'template' && (
                            <div className="flex items-center gap-2 pr-2 border-r border-white/10 animate-in slide-in-from-right-4">
                                <div className="flex items-center bg-slate-950/50 rounded-lg p-0.5 border border-white/5">
                                    <select value={selectedElement.fontFamily} onChange={e => updateElement(selectedElementId!, { fontFamily: e.target.value })} className="bg-transparent text-[10px] font-bold text-slate-300 px-1.5 py-1 outline-none border-r border-white/10 cursor-pointer">
                                        <option value="Inter">Inter</option>
                                        <option value="Roboto">Roboto</option>
                                        <option value="Arial">Arial</option>
                                    </select>
                                    <input type="number" value={selectedElement.fontSize} onChange={e => updateElement(selectedElementId!, { fontSize: parseInt(e.target.value) })} className="bg-transparent text-[10px] font-bold text-indigo-400 w-8 text-center outline-none" />
                                </div>
                                <div className="flex items-center gap-0.5">
                                    <button onClick={() => moveZIndex(selectedElementId!, 'top')} className="p-1.5 hover:bg-white/5 rounded-md text-slate-400 hover:text-white" title="Öne Getir"><Icon name="plus" className="w-3 h-3" /></button>
                                    <button onClick={() => moveZIndex(selectedElementId!, 'bottom')} className="p-1.5 hover:bg-white/5 rounded-md text-slate-400 hover:text-white" title="Arkaya Gönder"><Icon name="minus" className="w-3 h-3" /></button>
                                </div>
                            </div>
                        )}
                        <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sistem Hazır</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-hidden flex bg-slate-950 no-print">
                {activeTab === 'products' ? (
                    <div className="flex-1 flex overflow-hidden animate-in fade-in duration-500">
                        {/* SOL: GELİŞMİŞ FİLTRELEME VE ARAMA SONUÇLARI */}
                        <div className="w-[300px] border-r border-white/5 flex flex-col bg-slate-900/40 backdrop-blur-xl">
                            <div className="p-4 border-b border-white/5 space-y-3">
                                <h3 className="text-white font-black text-[10px] uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                    <Icon name="filter" className="w-4 h-4 text-indigo-400" /> ARA VE FİLTRELE
                                </h3>

                                <div className="grid grid-cols-1 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest ml-1">Genel Arama</label>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                placeholder="Ürün adı veya barkod..."
                                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:border-indigo-500 outline-none transition-all pl-8"
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                            />
                                            <Icon name="search" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within:text-indigo-400" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest ml-1">Marka</label>
                                            <input
                                                type="text"
                                                list="brand-list"
                                                placeholder="Marka..."
                                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-white focus:border-indigo-500 outline-none transition-all"
                                                value={filterBrand}
                                                onChange={e => setFilterBrand(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest ml-1">Model</label>
                                            <input
                                                type="text"
                                                list="model-list"
                                                placeholder="Model..."
                                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-white focus:border-indigo-500 outline-none transition-all"
                                                value={filterModel}
                                                onChange={e => setFilterModel(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest ml-1">Renk</label>
                                            <input
                                                type="text"
                                                list="color-list"
                                                placeholder="Renk..."
                                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-white focus:border-indigo-500 outline-none transition-all"
                                                value={filterColor}
                                                onChange={e => setFilterColor(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest ml-1">Beden</label>
                                            <input
                                                type="text"
                                                list="size-list"
                                                placeholder="Beden..."
                                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-white focus:border-indigo-500 outline-none transition-all"
                                                value={filterSize}
                                                onChange={e => setFilterSize(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest ml-1">Stok Kodu</label>
                                        <input
                                            type="text"
                                            list="code-list"
                                            placeholder="Kod ara..."
                                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:border-indigo-500 outline-none transition-all"
                                            value={filterCode}
                                            onChange={e => setFilterCode(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setFilterBrand('');
                                    setFilterModel('');
                                    setFilterColor('');
                                    setFilterSize('');
                                    setFilterCode('');
                                }}
                                className="w-full py-1 text-[9px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors"
                            >
                                Sıfırla
                            </button>

                            <div className="flex-1 overflow-hidden flex flex-col">
                                <div className="px-4 py-2 border-b border-white/5 bg-slate-950/30 flex items-center justify-between">
                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Arama Sonuçları</span>
                                    <span className="text-[10px] text-indigo-400 font-black">{filteredProducts.length} Ürün</span>
                                </div>
                                <div className="flex-1 overflow-auto p-2 space-y-1 custom-scrollbar">
                                    {filteredProducts.map(product => (
                                        <button
                                            key={product.barcode}
                                            onClick={() => setPrintQueue(prev => {
                                                const tId = selectedTemplateId ?? undefined;
                                                const existingIndex = prev.findIndex(item => item.product.barcode === product.barcode && item.templateId === tId);
                                                if (existingIndex >= 0) {
                                                    const newQueue = [...prev];
                                                    newQueue[existingIndex] = { ...newQueue[existingIndex], count: newQueue[existingIndex].count + 1 };
                                                    return newQueue;
                                                }
                                                return [...prev, { product, count: 1, templateId: tId }];
                                            })}
                                            className="w-full p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all flex items-center gap-3 group text-left"
                                        >
                                            <div className="w-10 h-10 bg-slate-950 rounded-lg flex items-center justify-center text-slate-600 group-hover:text-indigo-400 transition-colors">
                                                <Icon name="plus" className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[13px] font-bold text-slate-300 truncate group-hover:text-white">{product.name}</div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[9px] font-black text-indigo-500 uppercase">{product.marka}</span>
                                                    <span className="text-[9px] text-slate-600 font-mono">{product.barcode}</span>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                    {filteredProducts.length === 0 && (
                                        <div className="p-8 text-center text-slate-600 text-xs italic">Ürün bulunamadı.</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ORTA: BASILACAK ÜRÜNLER (KUYRUK) */}
                        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950/20 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]">
                            <div className="p-4 flex items-center justify-between border-b border-white/5 bg-slate-900/20">
                                <div>
                                    <h2 className="text-xl font-black text-white tracking-tighter mb-0.5">Baskı Listesi</h2>
                                    <p className="text-slate-500 text-[9px] uppercase tracking-widest font-bold">Hazırlanan Etiketler</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="bg-slate-900 px-4 py-2 rounded-xl border border-white/5 flex flex-col items-end">
                                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">TOPLAM</span>
                                        <span className="text-xl font-black text-emerald-400">{printQueue.reduce((acc, it) => acc + it.count, 0)}</span>
                                    </div>
                                    <button
                                        onClick={() => setPrintQueue([])}
                                        className="p-3 bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 rounded-xl border border-rose-500/20 transition-all active:scale-95"
                                        title="Listeyi Temizle"
                                    >
                                        <Icon name="trash" className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-auto p-4 space-y-2 custom-scrollbar">
                                {printQueue.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center space-y-6">
                                        <div className="w-32 h-32 bg-slate-900 rounded-full flex items-center justify-center border-4 border-dashed border-white/5">
                                            <Icon name="printer" className="w-16 h-16 opacity-10" />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-bold text-slate-500">Baskı listesi henüz boş</h3>
                                            <p className="text-sm max-w-xs mx-auto">Soldaki ürünlerden seçerek baskı listesini oluşturmaya başlayın.</p>
                                        </div>
                                    </div>
                                ) : (
                                    printQueue.map((item, idx) => (
                                        <div key={idx} className="bg-slate-900/60 border border-white/5 p-3 rounded-2xl flex items-center gap-4 group hover:bg-slate-900 hover:border-indigo-500/30 transition-all animate-in slide-in-from-right-4">
                                            {/* Ürün Bilgisi */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="px-1.5 py-0.5 bg-indigo-600/20 text-indigo-400 text-[9px] font-black rounded uppercase tracking-wider">{item.product.marka}</span>
                                                    <span className="text-[9px] text-slate-500 font-mono">{item.product.barcode}</span>
                                                </div>
                                                <div className="text-white font-black text-[14px] truncate leading-tight">{item.product.name}</div>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <div className="text-[9px] text-slate-400 font-bold bg-white/5 px-1.5 py-0.5 rounded">MODEL: <span className="text-slate-200">{item.product.model || '-'}</span></div>
                                                    <div className="text-[9px] text-slate-400 font-bold bg-white/5 px-1.5 py-0.5 rounded">RENK/BDN: <span className="text-slate-200">{item.product.renk}/{item.product.beden}</span></div>
                                                </div>
                                            </div>

                                            {/* Adet Kontrolü */}
                                            <div className="flex items-center bg-slate-950 p-1.5 rounded-xl border border-white/5 gap-1.5">
                                                <button
                                                    onClick={() => setPrintQueue(prev => prev.map((it, i) => i === idx ? { ...it, count: Math.max(1, it.count - 1) } : it))}
                                                    className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-rose-500 hover:text-white text-slate-400 rounded-lg transition-all"
                                                >
                                                    <Icon name="minus" className="w-4 h-4" />
                                                </button>
                                                <input
                                                    type="number"
                                                    value={item.count}
                                                    onChange={e => {
                                                        const val = parseInt(e.target.value) || 1;
                                                        setPrintQueue(prev => prev.map((it, i) => i === idx ? { ...it, count: val } : it));
                                                    }}
                                                    className="w-12 bg-transparent text-center text-[16px] font-black text-white outline-none"
                                                />
                                                <button
                                                    onClick={() => setPrintQueue(prev => prev.map((it, i) => i === idx ? { ...it, count: it.count + 1 } : it))}
                                                    className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-emerald-500 hover:text-white text-slate-400 rounded-lg transition-all"
                                                >
                                                    <Icon name="plus" className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Ek Özellikler: Yazıcı ve Şablon */}
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex flex-col">
                                                        <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest ml-1 mb-1">Şablon Seç</label>
                                                        <select
                                                            value={item.templateId}
                                                            onChange={e => setPrintQueue(prev => prev.map((it, i) => i === idx ? { ...it, templateId: e.target.value } : it))}
                                                            className="bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-indigo-400 font-bold outline-none focus:border-indigo-500 transition-all min-w-[140px]"
                                                        >
                                                            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <label className="text-[9px] text-slate-600 font-black uppercase tracking-widest ml-1 mb-1">Yazıcı Seç</label>
                                                        <select
                                                            className="bg-slate-950 border border-white/5 rounded-xl px-3 py-2 text-xs text-slate-400 font-bold outline-none focus:border-indigo-500 transition-all min-w-[140px]"
                                                        >
                                                            <option>Varsayılan Yazıcı</option>
                                                            <option>Zebra GK420t</option>
                                                            <option>Argox CP-2140</option>
                                                            <option>Ağ Yazıcısı</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Etiketi Bas & Sil */}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handlePrintItem(item)}
                                                    className="px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center gap-2 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-900/20 active:scale-95 transition-all"
                                                >
                                                    <Icon name="printer" className="w-3.5 h-3.5" />
                                                    BAS
                                                </button>
                                                <button
                                                    onClick={() => setPrintQueue(prev => prev.filter((_, i) => i !== idx))}
                                                    className="p-3 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                                >
                                                    <Icon name="trash" className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* ALT PANEL: TOPLU İŞLEMLER */}
                            {printQueue.length > 0 && (
                                <div className="p-4 bg-slate-900 border-t border-white/10 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">TOPLAM ÜRÜN</span>
                                            <span className="text-md font-black text-white">{printQueue.length} Çeşit</span>
                                        </div>
                                        <div className="w-px h-8 bg-white/5" />
                                        <div className="flex flex-col">
                                            <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">TOPLAM BASKI</span>
                                            <span className="text-md font-black text-indigo-400">{printQueue.reduce((acc, it) => acc + it.count, 0)} Adet</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handlePrint}
                                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all shadow-2xl shadow-indigo-900/40 flex items-center justify-center gap-3 text-[16px] active:scale-[0.98]"
                                    >
                                        <div className="p-1.5 bg-white/20 rounded-lg">
                                            <Icon name="printer" className="w-5 h-5" />
                                        </div>
                                        TOPLU YAZDIR
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex overflow-hidden">
                        {/* LEFT PANEL */}
                        <aside className="w-[240px] flex-shrink-0 border-r border-white/10 bg-slate-900/50 flex flex-col z-50">
                            <div className="flex p-2 gap-1 border-b border-white/5">
                                <button onClick={() => setLeftPanel('tools')} className={`flex-1 py-2 rounded-lg text-[11px] font-black uppercase transition-all ${leftPanel === 'tools' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}>Araçlar</button>
                                <button onClick={() => setLeftPanel('objects')} className={`flex-1 py-2 rounded-lg text-[11px] font-black uppercase transition-all ${leftPanel === 'objects' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}>Katmanlar</button>
                            </div>

                            <div className="flex-grow overflow-y-auto custom-scrollbar p-4">
                                {leftPanel === 'tools' ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { name: 'Metin', icon: 'list-bullet', type: 'text' },
                                            { name: 'Barkod', icon: 'barcode', type: 'barcode' },
                                            { name: 'QR Kod', icon: 'barcode', type: 'qr' },
                                            { name: 'Resim', icon: 'list-bullet', type: 'image' },
                                            { name: 'Çizgi', icon: 'minus', type: 'line' },
                                            { name: 'Kutu', icon: 'plus', type: 'rect' }
                                        ].map(tool => (
                                            <button key={tool.type} onClick={() => addElement(tool.type as any)} className="flex flex-col items-center justify-center p-4 bg-slate-950/50 border border-white/5 rounded-xl hover:border-indigo-500/50 transition-all group">
                                                <Icon name={tool.icon as any} className="w-5 h-5 mb-2 text-slate-500 group-hover:text-indigo-400 transition-all" />
                                                <span className="text-[10px] font-black text-slate-600 group-hover:text-slate-300 uppercase">{tool.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {activeTemplate.elements.sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0)).map((el, idx) => (
                                            <div
                                                key={el.id}
                                                onClick={() => setSelectedElementId(el.id)}
                                                className={`group p-2 rounded-xl flex items-center gap-2 cursor-pointer transition-all border ${selectedElementId === el.id ? 'bg-indigo-600/20 border-indigo-500/30' : 'border-transparent hover:bg-white/5'}`}
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center text-slate-500 group-hover:text-indigo-400 flex-shrink-0">
                                                    <Icon name={el.type === 'text' ? 'list-bullet' : 'barcode'} className="w-5 h-5" />
                                                </div>
                                                <div className="flex-grow min-w-0 px-1">
                                                    <div className="text-[12px] font-black text-white truncate uppercase">{el.binding || el.content || 'BOŞ NESNE'}</div>
                                                    <div className="text-[9px] text-slate-500 font-bold uppercase">Katman {el.zIndex}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </aside>

                        {/* CANVAS AREA */}
                        <div className="flex-grow relative bg-[#1e293b] flex flex-col overflow-hidden">
                            <div className="h-6 bg-slate-900 border-b border-white/10 flex relative shadow-lg z-30" style={{ paddingLeft: '24px' }}>
                                {Array.from({ length: 100 }).map((_, i) => (
                                    <div key={i} className="flex-shrink-0 border-l border-white/10 relative" style={{ width: `${zoom}px`, height: i % 10 === 0 ? '100%' : i % 5 === 0 ? '60%' : '30%' }}>
                                        {i % 10 === 0 && <span className="absolute left-1 top-0 text-[7px] text-slate-500 font-bold">{i}</span>}
                                    </div>
                                ))}
                            </div>
                            <div className="flex-grow flex overflow-hidden relative">
                                <div className="w-6 bg-slate-900 border-r border-white/10 flex flex-col relative shadow-lg z-30">
                                    {Array.from({ length: 100 }).map((_, i) => (
                                        <div key={i} className="flex-shrink-0 border-t border-white/10 relative" style={{ height: `${zoom}px`, width: i % 10 === 0 ? '100%' : i % 5 === 0 ? '60%' : '30%' }}>
                                            {i % 10 === 0 && <span className="absolute left-0 top-1 text-[7px] text-slate-500 font-bold -rotate-90">{i}</span>}
                                        </div>
                                    ))}
                                </div>
                                <div
                                    ref={canvasRef}
                                    onMouseMove={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const rawX = (e.clientX - rect.left) / zoom;
                                        const rawY = (e.clientY - rect.top) / zoom;
                                        const mmX = Math.round(rawX * 10) / 10;
                                        const mmY = Math.round(rawY * 10) / 10;
                                        if (mouseCoordsRef.current) {
                                            mouseCoordsRef.current.innerText = `X: ${mmX.toFixed(1)}mm Y: ${mmY.toFixed(1)}mm`;
                                        }
                                    }}
                                    className="flex-grow overflow-auto p-20 custom-scrollbar flex items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"
                                >
                                    <div className="flex" style={{ gap: `${activeTemplate.gap * zoom}px` }}>
                                        {Array.from({ length: activeTemplate.columns || 1 }).map((_, colIndex) => (
                                            <div key={colIndex} className={`relative bg-white shadow-2xl ring-1 ring-white/10 ${colIndex > 0 ? 'opacity-40 grayscale-[0.5]' : ''}`} style={{ width: `${activeTemplate.width * zoom}px`, height: `${activeTemplate.height * zoom}px`, backgroundImage: showGrid && colIndex === 0 ? `linear-gradient(#f1f5f9 1px, transparent 1px), linear-gradient(90deg, #f1f5f9 1px, transparent 1px)` : 'none', backgroundSize: `${5 * zoom}px ${5 * zoom}px` }}>
                                                {/* Ortaya Hizalama Kılavuzları */}
                                                {isDragging && colIndex === 0 && dragState && (
                                                    <>
                                                        {Math.abs(dragState.x - (activeTemplate.width - dragState.width) / 2) < 0.1 && (
                                                            <div className="absolute top-0 bottom-0 border-l border-indigo-500/50 border-dashed z-[100]" style={{ left: '50%', transform: 'translateX(-50%)' }} />
                                                        )}
                                                        {Math.abs(dragState.y - (activeTemplate.height - dragState.height) / 2) < 0.1 && (
                                                            <div className="absolute left-0 right-0 border-t border-indigo-500/50 border-dashed z-[100]" style={{ top: '50%', transform: 'translateY(-50%)' }} />
                                                        )}
                                                    </>
                                                )}
                                                {activeTemplate.elements.map(el => {
                                                    const isCurrentActive = colIndex === 0 && (isDragging || isResizing || isRotating) && selectedElementId === el.id;
                                                    const x = isCurrentActive && dragState ? dragState.x : el.x;
                                                    const y = isCurrentActive && dragState ? dragState.y : el.y;
                                                    const w = isCurrentActive && dragState ? dragState.width : el.width;
                                                    const h = isCurrentActive && dragState ? dragState.height : el.height;
                                                    const rot = isCurrentActive && dragState ? dragState.rotation : el.rotation;
                                                    return (
                                                        <div key={el.id} onMouseDown={colIndex === 0 ? (e) => onMouseDown(e, el.id) : undefined} className={`absolute ${colIndex === 0 ? 'cursor-move' : ''} transition-shadow ${colIndex === 0 && selectedElementId === el.id ? 'ring-2 ring-indigo-500 ring-offset-2 z-[999]' : ''}`} style={{ left: `${x * zoom}px`, top: `${y * zoom}px`, width: `${w * zoom}px`, height: `${h * zoom}px`, transform: `rotate(${rot}deg)`, opacity: el.opacity, zIndex: el.zIndex, display: el.visible ? 'block' : 'none' }}>
                                                            <div className="w-full h-full relative">
                                                                {renderElementContent(el, previewProduct)}
                                                                {colIndex === 0 && selectedElementId === el.id && !el.locked && (
                                                                    <>
                                                                        {/* 4 Köşe Resize Handle */}
                                                                        <div onMouseDown={e => onResizeStart(e, el.id, 'tl')} className="absolute -left-2 -top-2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full cursor-nwse-resize z-[1000] shadow-xl hover:scale-125 transition-transform" />
                                                                        <div onMouseDown={e => onResizeStart(e, el.id, 'tr')} className="absolute -right-2 -top-2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full cursor-nesw-resize z-[1000] shadow-xl hover:scale-125 transition-transform" />
                                                                        <div onMouseDown={e => onResizeStart(e, el.id, 'bl')} className="absolute -left-2 -bottom-2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full cursor-nesw-resize z-[1000] shadow-xl hover:scale-125 transition-transform" />
                                                                        <div onMouseDown={e => onResizeStart(e, el.id, 'br')} className="absolute -right-2 -bottom-2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full cursor-nwse-resize z-[1000] shadow-xl hover:scale-125 transition-transform" />

                                                                        {/* Kenar Resize Handles */}
                                                                        <div onMouseDown={e => onResizeStart(e, el.id, 't')} className="absolute left-1/2 -top-2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full cursor-ns-resize z-[1000] shadow-xl hover:scale-125 transition-transform" />
                                                                        <div onMouseDown={e => onResizeStart(e, el.id, 'b')} className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full cursor-ns-resize z-[1000] shadow-xl hover:scale-125 transition-transform" />
                                                                        <div onMouseDown={e => onResizeStart(e, el.id, 'l')} className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full cursor-ew-resize z-[1000] shadow-xl hover:scale-125 transition-transform" />
                                                                        <div onMouseDown={e => onResizeStart(e, el.id, 'r')} className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full cursor-ew-resize z-[1000] shadow-xl hover:scale-125 transition-transform" />

                                                                        <div onMouseDown={e => onRotationStart(e, el.id)} className="absolute left-1/2 -top-12 -translate-x-1/2 w-10 h-10 bg-indigo-600 text-white rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center shadow-2xl z-[1001] hover:scale-110 transition-all border-4 border-white">
                                                                            <Icon name="refresh" className="w-5 h-5" />
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT PANEL */}
                        <aside className="w-[260px] flex-shrink-0 flex flex-col border-l border-white/10 bg-slate-900/80 backdrop-blur-3xl z-50 shadow-2xl">
                            <div className="p-3 border-b border-white/10 flex items-center justify-between bg-slate-900">
                                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] flex items-center gap-2">
                                    <Icon name="settings" className="w-4 h-4" /> ÖZELLİKLER
                                </h3>
                                {selectedElement && (
                                    <button onClick={() => deleteElement(selectedElementId!)} className="p-2 text-slate-600 hover:text-rose-500 transition-all">
                                        <Icon name="trash" className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <div className="flex-grow overflow-y-auto custom-scrollbar p-4 space-y-6">
                                {selectedElement ? (
                                    <div className="space-y-4">
                                        <div className="flex bg-slate-950 p-1 rounded-lg border border-white/5 mb-4">
                                            {['general', 'style', 'data', 'symbology'].map(id => (
                                                <button key={id} onClick={() => setPropTab(id as any)} className={`flex-1 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${propTab === id ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>{id}</button>
                                            ))}
                                        </div>
                                        {propTab === 'general' && (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    {['x', 'y', 'width', 'height'].map(f => (
                                                        <div key={f}>
                                                            <label className="text-[11px] font-black text-slate-500 uppercase block mb-1.5">{f}</label>
                                                            <input type="number" step="0.1" value={(selectedElement as any)[f]} onChange={e => updateElement(selectedElementId!, { [f]: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-950 border border-white/5 rounded-lg py-2 px-3 text-white text-sm font-bold" />
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 mt-4">
                                                    <button
                                                        onClick={() => updateElement(selectedElementId!, { x: Math.round(((activeTemplate.width - selectedElement.width) / 2) * 10) / 10 })}
                                                        className="flex items-center justify-center gap-2 py-2 bg-slate-950 border border-white/5 rounded-lg text-[10px] font-black text-slate-400 hover:text-white hover:border-indigo-500/50 transition-all uppercase"
                                                    >
                                                        <Icon name="refresh" className="w-3.5 h-3.5 rotate-90" /> YATAY ORTALA
                                                    </button>
                                                    <button
                                                        onClick={() => updateElement(selectedElementId!, { y: Math.round(((activeTemplate.height - selectedElement.height) / 2) * 10) / 10 })}
                                                        className="flex items-center justify-center gap-2 py-2 bg-slate-950 border border-white/5 rounded-lg text-[10px] font-black text-slate-400 hover:text-white hover:border-indigo-500/50 transition-all uppercase"
                                                    >
                                                        <Icon name="refresh" className="w-3.5 h-3.5" /> DİKEY ORTALA
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {propTab === 'style' && (
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-[11px] font-black text-slate-500 uppercase block mb-1.5">Font Boyutu</label>
                                                    <input type="number" value={selectedElement.fontSize} onChange={e => updateElement(selectedElementId!, { fontSize: parseInt(e.target.value) })} className="w-full bg-slate-950 border border-white/5 rounded-lg py-2 px-3 text-white text-sm font-bold" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-600 italic text-sm p-12">Lütfen düzenlemek için bir nesne seçin.</div>
                                )}
                            </div>
                        </aside>
                    </div>
                )}
            </main>

            <footer className="h-7 bg-indigo-600 border-t border-white/20 px-4 flex items-center justify-between text-[10px] font-black text-white uppercase tracking-widest z-[70] shadow-2xl no-print">
                <div className="flex items-center gap-6">
                    <span className="flex items-center gap-2"><div className="w-2 h-2 bg-white rounded-full shadow-lg"></div> SİSTEM AKTİF</span>
                    <span ref={mouseCoordsRef} className="text-indigo-100/70 border-l border-white/20 pl-6 flex items-center gap-2">X: 0mm Y: 0mm</span>
                </div>
                <div className="flex items-center gap-6">
                    <span className="bg-white/10 px-3 py-0.5 rounded-full">{activeTemplate.width} x {activeTemplate.height} mm</span>
                    <span className="font-black tracking-tighter">STUDIO PRO v9.0</span>
                </div>
            </footer>

            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />

            {/* Datalists for searchable dropdowns */}
            <datalist id="brand-list">
                {uniqueBrands.map(b => <option key={b} value={b} />)}
            </datalist>
            <datalist id="model-list">
                {uniqueModels.map(m => <option key={m} value={m} />)}
            </datalist>
            <datalist id="color-list">
                {uniqueColors.map(c => <option key={c} value={c} />)}
            </datalist>
            <datalist id="size-list">
                {uniqueSizes.map(s => <option key={s} value={s} />)}
            </datalist>
            <datalist id="code-list">
                {uniqueCodes.map(c => <option key={c} value={c} />)}
            </datalist>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6366f1; }
                .writing-vertical { writing-mode: vertical-rl; }
                .print-area { display: none; }
                @media print {
                    @page { margin: 0; }
                    body { background: white !important; margin: 0 !important; padding: 0 !important; }
                    /* Arka plandaki tüm uygulama görünümünü gizler */
                    body * { visibility: hidden; }
                    /* Sadece etiketleri görünür yapar */
                    .print-area, .print-area * { visibility: visible; }
                    .print-area { display: block !important; position: absolute; left: 0; top: 0; width: 100%; z-index: 99999; background: white; margin: 0; padding: 0; }
                    /* Çok sayfalı baskılarda kesilmeyi önler */
                    html, body, #root, .overflow-hidden, .h-full, .h-screen {
                        overflow: visible !important;
                        height: auto !important;
                    }
                }
            `}</style>

            {/* PRINT AREA (ONLY VISIBLE ON PRINT) */}
            <div className="print-area">
                {(() => {
                    // Flatten items into individual labels and group by template for correct row management
                    const allLabels = itemsToPrint.flatMap(item => {
                        const template = templates.find(t => t.id === item.templateId) || activeTemplate;
                        return Array.from({ length: item.count }).map(() => ({ item, template }));
                    });

                    // Group by template to handle different layouts in the same job
                    const templateGroups: Record<string, typeof allLabels> = {};
                    allLabels.forEach(l => {
                        const tid = l.template.id;
                        if (!templateGroups[tid]) templateGroups[tid] = [];
                        templateGroups[tid].push(l);
                    });

                    return Object.entries(templateGroups).map(([tid, labels]) => {
                        const template = labels[0].template;
                        const columns = template.columns || 1;

                        // Chunk into rows
                        const rows = [];
                        for (let i = 0; i < labels.length; i += columns) {
                            rows.push(labels.slice(i, i + columns));
                        }

                        return rows.map((row, rowIdx) => (
                            <div key={`${tid}-${rowIdx}`}
                                className="flex no-print-screen"
                                style={{
                                    display: 'flex',
                                    gap: `${template.gap}mm`,
                                    pageBreakAfter: 'always',
                                    width: 'max-content',
                                    background: 'white'
                                }}>
                                {row.map((labelInstance, colIdx) => (
                                    <div key={colIdx}
                                        className="relative bg-white"
                                        style={{
                                            width: `${template.width}mm`,
                                            height: `${template.height}mm`,
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}>
                                        {template.elements.map(el => (
                                            <div key={el.id}
                                                className="absolute"
                                                style={{
                                                    left: `${el.x}mm`,
                                                    top: `${el.y}mm`,
                                                    width: `${el.width}mm`,
                                                    height: `${el.height}mm`,
                                                    transform: `rotate(${el.rotation}deg)`,
                                                    opacity: el.opacity,
                                                    zIndex: el.zIndex
                                                }}>
                                                {renderElementContent(el, labelInstance.item.product, true)}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        ));
                    });
                })()}
            </div>
        </div>
    );
};

export default LabelDesigner;