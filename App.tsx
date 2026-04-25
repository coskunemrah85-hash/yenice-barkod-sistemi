import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Product, SaleRecord, View, SaleItem, ReturnRecord, Brand, Model, Color, Size, Group, AITask, Supplier, PurchaseRecord, PaymentRecord, Tab, TabIcon, EndOfDayRecord, User, AppBackup, CompanyInfo, ReturnItem, PurchaseItem, Customer, MissingListRecord } from './types';
import DashboardView from './views/DashboardView';
import SaleView from './views/SaleView';
import ProductsView from './views/ProductsView';
import ReportsView from './views/ReportsView';
import Navbar from './components/Navbar';
import ReturnView from './views/ReturnView';
import DefinitionsView from './views/DefinitionsView';
import { extractProductsFromContent, extractSuppliersFromContent, extractPurchaseItemsFromContent, extractPriceUpdatesFromContent } from './services/geminiService';
import AiReviewModal from './components/AiReviewModal';
import UserManualModal from './components/UserManualModal';
import PurchaseView from './views/PurchaseView';
import PurchaseMenuView from './views/PurchaseMenuView';
import FinanceView from './views/FinanceView';
import UserManagementView from './views/UserManagementView';
import StorageManagementView from './views/StorageManagementView';
import SettingsView from './views/SettingsView';
import RemoteAccessView from './views/RemoteAccessView';
import { useIndexedDB } from './hooks/useIndexedDB';
import StockCountView from './views/StockCountView';
import AnalysisView from './views/AnalysisView';
import AiSettingsView from './views/AiSettingsView';
import AiMenuView from './views/AiMenuView';
import ExcelOperationsView from './views/ExcelOperationsView';
import AiPriceUpdateView from './views/AiPriceUpdateView';
import CalculatorView from './views/CalculatorView';
import CalculatorMenuView from './views/CalculatorMenuView';
import MoneyCounterView from './views/MoneyCounterView';
import LabelDesigner from './views/LabelDesigner';
import BulkPriceUpdateView from './views/BulkPriceUpdateView';
import StockOrderView from './views/StockOrderView';
import LoginView from './views/LoginView';
import Icon from './components/Icon';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useFirestore, useFirestoreDoc } from './hooks/useFirestore';
import UpdateCheckModal from './components/UpdateCheckModal';
import packageJson from './package.json';
import ContextMenu from './components/ContextMenu';
import * as XLSX from 'xlsx';

const initialAdmin: User = {
  id: 'admin-1',
  name: 'Yönetici',
  email: 'admin@yeniceicgiyim.com.tr',
  password: 'password',
  role: 'admin',
};


const App: React.FC = () => {
  const [fbUser, setFbUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [openTabs, setOpenTabs] = useState<Tab[]>([{ id: View.DASHBOARD, label: 'Gösterge Paneli', icon: 'dashboard' }]);
  const [activeTabId, setActiveTabId] = useState<View>(View.DASHBOARD);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [minimizedTasks, setMinimizedTasks] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFbUser(user);
      setIsAuthReady(true);
      if (user) {
        setCurrentUser({
          id: user.uid,
          email: user.email || '',
          name: user.displayName || 'Kullanıcı',
          password: '',
          role: user.email === 'coskunemrah85@gmail.com' ? 'admin' : 'user'
        });
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // İnternet bağlantı durumunu dinle
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Electron Otomatik Güncelleme Dinleyicisi
  useEffect(() => {
    const ipcRenderer = (window as any).require?.('electron')?.ipcRenderer;
    if (ipcRenderer) {
      ipcRenderer.on('updater_status', (_event: any, message: string) => {
        setUpdateMessage(message);
      });
      ipcRenderer.on('updater_error', (_event: any, message: string) => {
        setUpdateMessage(message);
      });
      ipcRenderer.on('updater_hide', () => {
        setUpdateMessage(null);
      });
      ipcRenderer.on('update_available', () => {
        setUpdateMessage('Yeni bir güncelleme bulundu. Arka planda indiriliyor...');
      });
      ipcRenderer.on('update_downloaded', () => {
        setUpdateMessage('Güncelleme hazır. Yüklemek için uygulamayı yeniden başlatın.');
        setUpdateReady(true);
      });
      return () => {
        ipcRenderer.removeAllListeners('updater_status');
        ipcRenderer.removeAllListeners('updater_error');
        ipcRenderer.removeAllListeners('updater_hide');
        ipcRenderer.removeAllListeners('update_available');
        ipcRenderer.removeAllListeners('update_downloaded');
      };
    }
  }, []);

  // --- Data Persistence Logic using Firestore ---
  const [users, setUsers] = useFirestore<User>('users', [initialAdmin]);
  const [products, setProducts] = useFirestore<Product>('products', []);
  const [salesHistory, setSalesHistory] = useFirestore<SaleRecord>('salesHistory', []);
  const [returnHistory, setReturnHistory] = useFirestore<ReturnRecord>('returnHistory', []);
  const [endOfDayHistory, setEndOfDayHistory] = useFirestore<EndOfDayRecord>('endOfDayHistory', []);
  const [companyInfo, setCompanyInfo] = useFirestoreDoc<CompanyInfo>('companyInfo', 'settings', {
    name: 'Firma Adınız',
    appTitle: 'Barkodlu Satış Programı',
    address: '',
    phone: '',
    taxOffice: '',
    taxNumber: '',
    darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
  });
  const [brands, setBrands] = useFirestore<Brand>('brands', []);
  const [models, setModels] = useFirestore<Model>('models', []);
  const [colors, setColors] = useFirestore<Color>('colors', []);
  const [sizes, setSizes] = useFirestore<Size>('sizes', []);
  const [groups, setGroups] = useFirestore<Group>('groups', []);
  const [suppliers, setSuppliers] = useFirestore<Supplier>('suppliers', []);
  const [customers, setCustomers] = useFirestore<Customer>('customers', []);
  const [purchaseHistory, setPurchaseHistory] = useFirestore<PurchaseRecord>('purchaseHistory', []);
  const [paymentHistory, setPaymentHistory] = useFirestore<PaymentRecord>('paymentHistory', []);
  const [missingLists, setMissingLists] = useFirestore<MissingListRecord>('missingLists', []);
  const [restoreAddProductSignal, setRestoreAddProductSignal] = useState(0); 

  // Koyu Mod (Dark Mode) Uygulayıcı
  useEffect(() => {
    const ipcRenderer = (window as any).require?.('electron')?.ipcRenderer;
    if (companyInfo.darkMode) {
      document.documentElement.classList.add('dark');
      if (ipcRenderer) ipcRenderer.send('set-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      if (ipcRenderer) ipcRenderer.send('set-theme', 'light');
    }
  }, [companyInfo.darkMode]);
  // --- End of Data Persistence Logic ---

  // Ephemeral states (not persisted)
  const [suspendedSales, setSuspendedSales] = useState<SaleItem[][]>([]);
  const [currentSale, setCurrentSale] = useState<SaleItem[]>([]);
  const [currentReturn, setCurrentReturn] = useState<ReturnItem[]>([]);
  const [currentPurchase, setCurrentPurchase] = useState<PurchaseItem[]>([]);
  const [aiTasks, setAiTasks] = useState<AITask[]>([]);
  const [reviewingTask, setReviewingTask] = useState<AITask | null>(null);
  const [isManualOpen, setIsManualOpen] = useState(false);
  
  // Update check states
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{ version: string; changelog: string; releaseDate: string } | null>(null);
  const [currentAppVersion, setCurrentAppVersion] = useState(packageJson.version);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  }, []);


  useEffect(() => {
    document.title = companyInfo.appTitle;
  }, [companyInfo.appTitle]);

  const navigateTo = useCallback((view: View, label: string, icon: TabIcon, payload?: any) => {
    console.log('Navigating to:', view, label);
    setOpenTabs(prevTabs => {
        if (prevTabs.some(tab => tab.id === view)) {
            return prevTabs;
        }
        return [...prevTabs, { id: view, label, icon, payload }];
    });
    setActiveTabId(view);
  }, []);

  // Güncelleme kontrol fonksiyonu
  const checkForUpdates = useCallback(async () => {
    setIsCheckingUpdates(true);
    setUpdateInfo(null);
    
    try {
      // GitHub API kullanarak direkt release bilgisi al
      const response = await fetch('https://api.github.com/repos/coskunemrah85-hash/yenice-barkod-sistemi/releases');
      if (!response.ok) throw new Error('GitHub releases API erişilemiyor');
      
      const releases = await response.json();
      
      // En son release'ı bul (draft ve prerelease olmayan)
      const latestRelease = releases.find((r: any) => !r.draft && !r.prerelease);
      
      if (!latestRelease) {
        throw new Error('Yayımlanmış release bulunamadı');
      }
      
      const latestVersion = latestRelease.tag_name.replace('v', '');
      
      // Versiyon karşılaştırması
      if (latestVersion !== currentAppVersion) {
        setUpdateInfo({
          version: latestVersion,
          changelog: latestRelease.body || 'Değişiklik detayı yok.',
          releaseDate: latestRelease.published_at || new Date().toISOString(),
        });
      } else {
        setUpdateInfo(null); // Sistem güncel
      }
    } catch (error) {
      console.error('Güncelleme kontrol hatası:', error);
      alert(`❌ Güncelleme kontrol yapılamadı: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}\n\nLütfen internet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.`);
    } finally {
      setIsCheckingUpdates(false);
      setShowUpdateModal(true);
    }
  }, [currentAppVersion]);

  const handleDirectUpdate = useCallback(() => {
    const ipcRenderer = (window as any).require?.('electron')?.ipcRenderer;
    if (ipcRenderer) {
      console.log('📲 Electron-updater tetikleniyor...');
      ipcRenderer.send('check_for_updates');
      // Modal'ı kapatmıyoruz, güncelleme mesajlarını göstermesine izin veriyoruz
      setTimeout(() => {
        setShowUpdateModal(false);
      }, 2000);
    } else {
      alert('⚠️ Electron ortamı algılanamadı. Lütfen uygulamayı yeniden başlatın.');
    }
  }, []);

  const handleCloseTab = useCallback((tabIdToClose: View) => {
    if (tabIdToClose === View.DASHBOARD) return; // Gösterge paneli kapatılamaz

    const tabIndex = openTabs.findIndex(tab => tab.id === tabIdToClose);
    const newTabs = openTabs.filter(tab => tab.id !== tabIdToClose);

    if (activeTabId === tabIdToClose) {
        // If the closed tab was active, activate the one to the left,
        // or the new last one if the one on the left doesn't exist.
        // Fallback to Dashboard.
        const newActiveTab = newTabs[tabIndex - 1] || newTabs[newTabs.length - 1];
        setActiveTabId(newActiveTab ? newActiveTab.id : View.DASHBOARD);
    }
    
    setOpenTabs(newTabs);
  }, [activeTabId, openTabs]);
  
  const handleUpdateBrands = (newBrands: Brand[]) => setBrands(newBrands);
  const handleUpdateModels = (newModels: Model[]) => setModels(newModels);
  const handleUpdateColors = (newColors: Color[]) => setColors(newColors);
  const handleUpdateSizes = (newSizes: Size[]) => setSizes(newSizes);
  const handleUpdateGroups = (newGroups: Group[]) => setGroups(newGroups);
  const handleUpdateSuppliers = (newSuppliers: Supplier[]) => setSuppliers(newSuppliers);
  const handleUpdateCustomers = (newCustomers: Customer[]) => setCustomers(newCustomers);
  const handleUpdateCompanyInfo = (newInfo: CompanyInfo) => setCompanyInfo(newInfo);

  const handleAddCustomer = (customer: Omit<Customer, 'id'>): Customer => {
    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      ...customer,
    };
    setCustomers(prev => [...prev, newCustomer]);
    return newCustomer;
  };


  const addSaleRecord = useCallback((record: SaleRecord) => {
    setSalesHistory(prevHistory => [...prevHistory, record]);
    
    setProducts(currentProducts => {
        const productsMap: Map<string, Product> = new Map(currentProducts.map(p => [p.barcode, { ...p }]));
        for (const item of record.items) {
            const product = productsMap.get(item.barcode);
            if (product) {
                product.stock = (Number(product.stock) || 0) - (Number(item.quantity) || 0);
                productsMap.set(item.barcode, product);
            }
        }
        return Array.from(productsMap.values());
    });
    setCurrentSale([]);
  }, [setSalesHistory, setProducts]);

  const addReturnRecord = useCallback((record: ReturnRecord) => {
    setReturnHistory(prev => [...prev, record]);
    setProducts(currentProducts => {
        const productsMap: Map<string, Product> = new Map(currentProducts.map(p => [p.barcode, { ...p }]));
        for (const item of record.items) {
            const product = productsMap.get(item.barcode);
            if (product) {
                product.stock = (Number(product.stock) || 0) + (Number(item.quantity) || 0);
                productsMap.set(item.barcode, product);
            }
        }
        return Array.from(productsMap.values());
    });
    setCurrentReturn([]);
  }, [setProducts]);

  const addEndOfDayRecord = useCallback((record: EndOfDayRecord) => {
      setEndOfDayHistory(prev => {
          const existingIndex = prev.findIndex(r => r.date === record.date);
          if (existingIndex > -1) {
              const newHistory = [...prev];
              newHistory[existingIndex] = record;
              return newHistory;
          }
          return [...prev, record].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });
  }, []);

  // Automatic End of Day Logic
  useEffect(() => {
    if (!companyInfo.autoEndOfDayEnabled || !companyInfo.autoEndOfDayTime) return;

    const checkAutoEndOfDay = () => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const todayStr = now.toISOString().split('T')[0];

      if (currentTime === companyInfo.autoEndOfDayTime) {
        // We need the latest data, but we are in a closure. 
        // However, this effect will re-run when settings change.
        // To get latest history, we can check the state.
        
        setEndOfDayHistory(currentHistory => {
          const isAlreadyClosed = currentHistory.some(r => r.date === todayStr);
          if (isAlreadyClosed) return currentHistory;

          // If not closed, we proceed. 
          // Note: We are inside setEndOfDayHistory, so we can't easily access other states like salesHistory here
          // without them being in dependencies.
          return currentHistory; 
        });

        // Actually, it's better to just use the states from dependencies and let the effect re-run.
        // The interval will be short-lived enough or we can just check once a minute.
        
        const isAlreadyClosed = endOfDayHistory.some(r => r.date === todayStr);
        if (isAlreadyClosed) return;

        const dayStart = new Date(now);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(now);
        dayEnd.setHours(23, 59, 59, 999);

        const daySales = salesHistory.filter(s => { const d = new Date(s.date); return d >= dayStart && d <= dayEnd; });
        const dayReturns = returnHistory.filter(r => { const d = new Date(r.date); return d >= dayStart && d <= dayEnd; });
        const dayPurchases = purchaseHistory.filter(p => { const d = new Date(p.date); return d >= dayStart && d <= dayEnd; });
        const dayPaymentsToSuppliers = paymentHistory.filter(p => { const d = new Date(p.date); return d >= dayStart && d <= dayEnd; });

        if (daySales.length === 0 && dayReturns.length === 0 && dayPurchases.length === 0 && dayPaymentsToSuppliers.length === 0) {
          return; // No activity, skip auto-close
        }

        const totalRevenue = daySales.reduce((sum, s) => sum + s.total, 0);
        const totalReturn = dayReturns.reduce((sum, r) => sum + r.total, 0);
        const netRevenue = totalRevenue - totalReturn;
        const cashSales = daySales.filter(s => s.paymentMethod === 'Nakit').reduce((s, i) => s + i.total, 0);
        const cardSales = daySales.filter(s => s.paymentMethod === 'Kredi Kartı').reduce((s, i) => s + i.total, 0);
        const totalSalesCount = daySales.length;
        const totalItemsSoldCount = daySales.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
        const totalPurchase = dayPurchases.reduce((sum, p) => sum + p.total, 0);
        const totalPaymentsToSuppliers = dayPaymentsToSuppliers.reduce((sum, p) => sum + p.amount, 0);

        const record: EndOfDayRecord = {
          date: todayStr,
          totalRevenue,
          totalReturn,
          netRevenue,
          cashSales,
          cardSales,
          totalSalesCount,
          totalItemsSoldCount,
          totalPurchase,
          totalPaymentsToSuppliers,
        };

        addEndOfDayRecord(record);
        console.log(`Otomatik gün sonu alındı: ${todayStr}`);
      }
    };

    const interval = setInterval(checkAutoEndOfDay, 60000);
    return () => clearInterval(interval);
  }, [
    companyInfo.autoEndOfDayEnabled, 
    companyInfo.autoEndOfDayTime, 
    endOfDayHistory, 
    salesHistory, 
    returnHistory, 
    purchaseHistory, 
    paymentHistory, 
    addEndOfDayRecord
  ]);
  
  const addPurchaseRecord = useCallback((record: PurchaseRecord) => {
    setPurchaseHistory(prev => [...prev, record]);

    const newProductsFromPurchase = record.items
      .filter((item): item is PurchaseItem & { isNew: true } => (item as PurchaseItem).isNew === true)
      .map(item => {
          const { quantity, isNew, ...productData } = item;
          return productData as Product;
      });

    setProducts(currentProducts => {
        const productsMap: Map<string, Product> = new Map(currentProducts.map(p => [p.barcode, { ...p }]));
        
        // Add new products to the map
        for (const newProduct of newProductsFromPurchase) {
            if (!productsMap.has(newProduct.barcode)) {
                productsMap.set(newProduct.barcode, newProduct);
            }
        }

        // Update stock, buy prices, and activation status for all items in the purchase
        for (const item of record.items) {
            const product = productsMap.get(item.barcode);
            if (product) {
                product.stock = (Number(product.stock) || 0) + (Number(item.quantity) || 0);
                product.buyPrice = Number(item.buyPrice) || product.buyPrice;
                product.price = Number(item.price) || product.price;
                product.isActivated = true; // Activate the product
                productsMap.set(item.barcode, product);
            }
        }
        return Array.from(productsMap.values());
    });
    setCurrentPurchase([]); // Clear the cart
  }, [setPurchaseHistory, setProducts]);

  const addPaymentRecord = useCallback((payment: Omit<PaymentRecord, 'id' | 'date'>) => {
    const newPayment: PaymentRecord = {
      ...payment,
      id: `payment-${Date.now()}`,
      date: new Date().toISOString(),
    };
    setPaymentHistory(prev => [...prev, newPayment]);
  }, []);

  const addMissingListRecord = useCallback((record: MissingListRecord) => {
    setMissingLists(prev => [...prev, record]);
  }, [setMissingLists]);

  const updatePaymentRecord = useCallback((updatedPayment: PaymentRecord) => {
    setPaymentHistory(prev => prev.map(p => p.id === updatedPayment.id ? updatedPayment : p));
  }, []);

  const deletePaymentRecord = useCallback((id: string) => {
    setPaymentHistory(prev => prev.filter(p => p.id !== id));
  }, []);

  const handleAddProduct = useCallback((newProduct: Product) => {
    setProducts(prevProducts => {
        let barcode = newProduct.barcode;
        if (!barcode || barcode.trim() === '') {
            barcode = '20' + Math.floor(10000000000 + Math.random() * 90000000000).toString();
            newProduct.barcode = barcode;
        }
        const existing = prevProducts.find(p => p.barcode === barcode);
        if (existing) {
            alert("Bu barkod zaten kullanımda!");
            return prevProducts;
        }
        return [...prevProducts, newProduct];
    });
  }, [setProducts]);

  const handleAddMultipleProducts = useCallback((newProducts: Product[]) => {
      // 1. Create a mapping of names to IDs for all definition types to ensure consistency
      const brandMap = new Map(brands.map(b => [b.name.trim().toLowerCase(), b.id]));
      const modelMap = new Map(models.map(m => [m.name.trim().toLowerCase(), m.id]));
      const groupMap = new Map(groups.map(g => [g.name.trim().toLowerCase(), g.id]));
      const colorMap = new Map(colors.map(c => [c.name.trim().toLowerCase(), c.id]));
      const sizeMap = new Map(sizes.map(s => [s.name.trim().toLowerCase(), s.id]));

      const newBrands: Brand[] = [];
      const newModels: Model[] = [];
      const newGroups: Group[] = [];
      const newColors: Color[] = [];
      const newSizes: Size[] = [];

      // Relationship mapping for models to brands
      const modelToBrand = new Map<string, string>(); // modelName -> brandName

      newProducts.forEach(p => {
          const bName = p.marka?.trim();
          const mName = p.model?.trim();
          const gName = p.group?.trim();
          const cName = p.renk?.trim();
          const sName = p.beden?.trim();

          if (bName && !brandMap.has(bName.toLowerCase())) {
              const id = `brand-${Date.now()}-${Math.random()}`;
              brandMap.set(bName.toLowerCase(), id);
              newBrands.push({ id, name: bName });
          }

          if (mName && bName) {
              modelToBrand.set(mName.toLowerCase(), bName.toLowerCase());
          }

          if (mName && !modelMap.has(mName.toLowerCase())) {
              const id = `model-${Date.now()}-${Math.random()}`;
              modelMap.set(mName.toLowerCase(), id);
              newModels.push({ id, name: mName, brandId: '' }); // Will fill brandId below
          }

          if (gName && !groupMap.has(gName.toLowerCase())) {
              const id = `group-${Date.now()}-${Math.random()}`;
              groupMap.set(gName.toLowerCase(), id);
              newGroups.push({ id, name: gName, parentId: null, brandId: null });
          }

          if (cName && !colorMap.has(cName.toLowerCase())) {
              const id = `color-${Date.now()}-${Math.random()}`;
              colorMap.set(cName.toLowerCase(), id);
              newColors.push({ id, name: cName, code: '#CCCCCC' });
          }

          if (sName && !sizeMap.has(sName.toLowerCase())) {
              const id = `size-${Date.now()}-${Math.random()}`;
              sizeMap.set(sName.toLowerCase(), id);
              newSizes.push({ id, name: sName });
          }
      });

      // Update brand IDs in newly created models
      newModels.forEach(m => {
          const bName = modelToBrand.get(m.name.toLowerCase());
          if (bName) {
              m.brandId = brandMap.get(bName) || '';
          }
      });

      // 2. Commit new definitions
      if (newBrands.length > 0) setBrands(prev => [...prev, ...newBrands]);
      if (newModels.length > 0) setModels(prev => [...prev, ...newModels]);
      if (newGroups.length > 0) setGroups(prev => [...prev, ...newGroups]);
      if (newColors.length > 0) setColors(prev => [...prev, ...newColors]);
      if (newSizes.length > 0) setSizes(prev => [...prev, ...newSizes]);

      // 3. Update Products
      setProducts(prevProducts => {
          const productMap = new Map(prevProducts.map(p => [p.barcode, p]));
          let newCount = 0;
          let updateCount = 0;

          newProducts.forEach(newP => {
              let barcode = String(newP.barcode || '').trim();
              if (!barcode) {
                  barcode = '20' + Math.floor(10000000000 + Math.random() * 90000000000).toString();
                  newP.barcode = barcode;
              }
              
              const parsedStock = parseInt(String(newP.stock), 10) || 0;
              const parsedBuyPrice = parseFloat(String(newP.buyPrice).replace(',', '.')) || 0;
              const parsedPrice = parseFloat(String(newP.price).replace(',', '.')) || 0;

              if (!productMap.has(barcode)) {
                  productMap.set(barcode, {
                      ...newP,
                      barcode,
                      stock: parsedStock,
                      buyPrice: parsedBuyPrice,
                      price: parsedPrice,
                      isActivated: true
                  });
                  newCount++;
              } else {
                  const existing = productMap.get(barcode)!;
                  productMap.set(barcode, {
                      ...existing,
                      name: newP.name || existing.name,
                      marka: newP.marka || existing.marka,
                      model: newP.model || existing.model,
                      renk: newP.renk || existing.renk,
                      beden: newP.beden || existing.beden,
                      stokKodu: newP.stokKodu || existing.stokKodu,
                      anaStokKodu: newP.anaStokKodu || existing.anaStokKodu,
                      group: newP.group || existing.group,
                      buyPrice: parsedBuyPrice > 0 ? parsedBuyPrice : existing.buyPrice,
                      price: parsedPrice > 0 ? parsedPrice : existing.price,
                      stock: parsedStock,
                      isActivated: true
                  });
                  updateCount++;
              }
          });

          console.log(`${newCount} yeni ürün eklendi, ${updateCount} ürün güncellendi.`);
          return Array.from(productMap.values());
      });
  }, [setProducts, setBrands, setModels, setGroups, setColors, setSizes]);

  const handleStartAiTask = useCallback(async (file: File, prompt: string) => {
    const taskId = `task-${Date.now()}`;
    const newTask: AITask = { id: taskId, fileName: file.name, status: 'processing' };
    setAiTasks(prev => [...prev, newTask]);

    try {
        const results = await extractProductsFromContent(file, prompt);
        setAiTasks(prev => prev.map(task => 
            task.id === taskId ? { ...task, status: 'completed', results } : task
        ));
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.';
        setAiTasks(prev => prev.map(task => 
            task.id === taskId ? { ...task, status: 'error', error: errorMessage } : task
        ));
    }
  }, []);

  const handleReviewAiTask = useCallback((taskId: string) => {
      const task = aiTasks.find(t => t.id === taskId);
      if (task && task.status === 'completed') {
          setReviewingTask(task);
      }
  }, [aiTasks]);
  
  const handleDismissAiTask = useCallback((taskId: string) => {
      setAiTasks(prev => prev.filter(t => t.id !== taskId));
      if (reviewingTask?.id === taskId) {
          setReviewingTask(null);
      }
  }, [reviewingTask]);

  const handleCommitAiResults = useCallback((taskId: string, productsToCommit: Product[]) => {
      handleAddMultipleProducts(productsToCommit);
      handleDismissAiTask(taskId);
  }, [handleAddMultipleProducts, handleDismissAiTask]);

  const updateProductPrice = useCallback((barcode: string, newPrice: number) => {
    setProducts(prevProducts =>
        prevProducts.map(p =>
            p.barcode === barcode ? { ...p, price: newPrice } : p
        )
    );

    setCurrentSale(prevSale =>
        prevSale.map(item =>
            item.barcode === barcode ? { ...item, price: newPrice } : item
        )
    );

    setSuspendedSales(prevSuspended =>
        prevSuspended.map(sale =>
            sale.map(item =>
                item.barcode === barcode ? { ...item, price: newPrice } : item
            )
        )
    );
  }, [setProducts, setCurrentSale, setSuspendedSales]);

  const handleStartAiSupplierTask = useCallback(async (file: File, prompt: string) => {
    // For now, extract and directly add instead of reviewing for suppliers
    try {
        const results = await extractSuppliersFromContent(file, prompt);
        if (results.length > 0) {
            setSuppliers(prev => [...prev, ...results as Supplier[]]);
            alert(`${results.length} tedarikçi başarıyla aktarıldı.`);
        }
    } catch (error) {
        alert("AI Tedarikçi Aktarımı Hatası: " + (error instanceof Error ? error.message : "Bilinmeyen hata"));
    }
  }, [setSuppliers]);

  const updateProductBuyPrice = useCallback((barcode: string, newBuyPrice: number) => {
    setProducts(prevProducts =>
        prevProducts.map(p =>
            p.barcode === barcode ? { ...p, buyPrice: newBuyPrice } : p
        )
    );

    setCurrentSale(prevSale =>
        prevSale.map(item =>
            item.barcode === barcode ? { ...item, buyPrice: newBuyPrice } : item
        )
    );

    setSuspendedSales(prevSuspended =>
        prevSuspended.map(sale =>
            sale.map(item =>
                item.barcode === barcode ? { ...item, buyPrice: newBuyPrice } : item
            )
        )
    );
  }, [setProducts, setCurrentSale, setSuspendedSales]);

  const updatePricesByAnaStokKodu = useCallback((updates: { [anaStokKodu: string]: number }) => {
    const updatedAnaStokKodlari = Object.keys(updates);
    if (updatedAnaStokKodlari.length === 0) return;

    setProducts(prevProducts =>
        prevProducts.map(p => {
            if (updates[p.anaStokKodu] !== undefined) {
                return { ...p, price: updates[p.anaStokKodu] };
            }
            return p;
        })
    );

    setCurrentSale(prevSale =>
        prevSale.map(item => {
            if (updates[item.anaStokKodu] !== undefined) {
                return { ...item, price: updates[item.anaStokKodu] };
            }
            return item;
        })
    );

    setSuspendedSales(prevSuspended =>
        prevSuspended.map(sale =>
            sale.map(item => {
                if (updates[item.anaStokKodu] !== undefined) {
                    return { ...item, price: updates[item.anaStokKodu] };
                }
                return item;
            })
        )
    );
  }, [setProducts, setCurrentSale, setSuspendedSales]);

  const handleDeleteProduct = useCallback((barcode: string) => {
    setProducts(prevProducts =>
        prevProducts.map(p =>
            p.barcode === barcode ? { ...p, isDeleted: true } : p
        )
    );
  }, [setProducts]);

  const handleRestoreProduct = useCallback((barcode: string) => {
    setProducts(prevProducts =>
        prevProducts.map(p =>
            p.barcode === barcode ? { ...p, isDeleted: false } : p
        )
    );
  }, [setProducts]);

  const handleUpdateProductStock = useCallback((barcode: string, newStock: number) => {
    setProducts(prevProducts =>
      prevProducts.map(p => 
        p.barcode === barcode ? { ...p, stock: Number(newStock) || 0 } : p
      )
    );
  }, [setProducts]);

  const handleBulkStockUpdate = useCallback((updates: { barcode: string; newStock: number }[]) => {
    setProducts(prevProducts => {
      const productsMap: Map<string, Product> = new Map(prevProducts.map(p => [p.barcode, { ...p }]));
      for (const update of updates) {
        const product = productsMap.get(update.barcode);
        if (product) {
          product.stock = Number(update.newStock) || 0;
          productsMap.set(update.barcode, product);
        }
      }
      return Array.from(productsMap.values());
    });
  }, [setProducts]);

  const handleUpdateProduct = useCallback((originalBarcode: string, updates: Partial<Product>): boolean => {
    if (updates.barcode && updates.barcode !== originalBarcode) {
        if (products.some(p => p.barcode === updates.barcode)) {
            alert("Bu barkod zaten başka bir ürün tarafından kullanılıyor!");
            return false;
        }
    }

    const updateItem = <T extends { barcode: string }>(item: T): T => 
        item.barcode === originalBarcode ? { ...item, ...updates } : item;

    setProducts(prev => prev.map(updateItem));
    setCurrentSale(prev => prev.map(updateItem));
    setSuspendedSales(prev => prev.map(sale => sale.map(updateItem)));

    return true;
  }, [products]);

  const handleBulkUpdateProducts = useCallback((updates: { barcode: string, updates: Partial<Product> }[]) => {
    console.log(`[PriceUpdate] ${updates.length} ürün güncelleniyor...`);
    
    setProducts(prev => {
        const updateMap = new Map(updates.map(u => [u.barcode, u.updates]));
        const newProducts = prev.map(p => {
            const productUpdates = updateMap.get(p.barcode);
            if (productUpdates) {
                return { ...p, ...productUpdates };
            }
            return p;
        });
        console.log('[PriceUpdate] Güncelleme tamamlandı, liste yenileniyor.');
        return newProducts;
    });
  }, [setProducts]);
  
  const handleLogout = () => {
    auth.signOut();
  };

  const handleAddUser = (user: Omit<User, 'id'>) => {
    const newUser: User = {
      ...user,
      id: `user-${Date.now()}`
    };
    setUsers(prev => [...prev, newUser]);
  };
  
  const handleDeleteUser = (userId: string) => {
    if (window.confirm("Kullanıcıyı silmek istediğinizden emin misiniz?")) {
      setUsers(prev => prev.filter(u => u.id !== userId));
    }
  };

  const handleQuickAddDefinition = useCallback((type: 'brand' | 'model' | 'group' | 'color' | 'size', data: any) => {
    switch (type) {
      case 'brand': setBrands(prev => [...prev, data]); break;
      case 'model': setModels(prev => [...prev, data]); break;
      case 'group': setGroups(prev => [...prev, data]); break;
      case 'color': setColors(prev => [...prev, data]); break;
      case 'size': setSizes(prev => [...prev, data]); break;
    }
  }, [setBrands, setModels, setGroups, setColors, setSizes]);

  const toggleTaskMinimize = (task: any) => {
    setMinimizedTasks(prev => {
        const exists = prev.find(t => t.id === task.id);
        if (exists) {
            if (task.type === 'add-product') {
                setRestoreAddProductSignal(s => s + 1); // Sinyali tetikle
            }
            return prev.filter(t => t.id !== task.id);
        }
        return [...prev, task];
    });
  };

  const handleExportData = () => {
    const backupData: AppBackup = {
      users,
      companyInfo,
      products,
      salesHistory,
      returnHistory,
      endOfDayHistory,
      brands,
      models,
      colors,
      sizes,
      groups,
      suppliers,
      customers,
      purchaseHistory,
      paymentHistory
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(backupData, null, 2)
    )}`;
    
    const link = document.createElement("a");
    link.href = jsonString;
    const date = new Date().toISOString().split('T')[0];
    link.download = `yenice-giyim-yedek-${date}.json`;

    link.click();
  };

  const handleImportData = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error("Dosya içeriği okunamadı.");
        }
        const data: AppBackup = JSON.parse(text);

        // Basic validation
        if (!data.users || !data.products || !data.salesHistory || !data.brands) {
          throw new Error("Yedek dosyası geçersiz veya bozuk.");
        }

        // Set all state from backup
        setUsers(data.users || [initialAdmin]);
        setCompanyInfo(data.companyInfo || { name: 'Yenice İç Giyim', appTitle: 'Yenice Satış Programı' });
        setProducts(data.products || []);
        setSalesHistory(data.salesHistory || []);
        setReturnHistory(data.returnHistory || []);
        setEndOfDayHistory(data.endOfDayHistory || []);
        setBrands(data.brands || []);
        setModels(data.models || []);
        setColors(data.colors || []);
        setSizes(data.sizes || []);
        setGroups(data.groups || []);
        setSuppliers(data.suppliers || []);
        setCustomers(data.customers || []);
        setPurchaseHistory(data.purchaseHistory || []);
        setPaymentHistory(data.paymentHistory || []);

        // Reset runtime state
        setCurrentSale([]);
        setSuspendedSales([]);
        setCurrentPurchase([]);
        
        alert("Veriler başarıyla geri yüklendi. Uygulama yenileniyor.");
        // Log out to force a clean start
        handleLogout();

      } catch (error) {
        console.error("Yedek yükleme hatası:", error);
        alert(`Yedek yüklenirken bir hata oluştu: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
      }
    };
    reader.readAsText(file);
  };
  
  const handleResetApplication = () => {
    // Clear transactional and definition data
    setProducts([]);
    setSalesHistory([]);
    setReturnHistory([]);
    setEndOfDayHistory([]);
    setPurchaseHistory([]);
    setPaymentHistory([]);
    setBrands([]);
    setModels([]);
    setColors([]);
    setSizes([]);
    setGroups([]);
    setSuppliers([]);
    setCustomers([]);
    
    // Keep only the initial admin user
    setUsers([initialAdmin]);

    // Reset runtime state
    setCurrentSale([]);
    setSuspendedSales([]);
    setCurrentPurchase([]);
    
    alert("Uygulama başarıyla sıfırlandı. Uygulama yenileniyor.");
    // Log out to force a clean start
    handleLogout();
  };

  const renderView = () => {
    const definitions = { brands, models, colors, sizes, groups };
    const activeTab = openTabs.find(tab => tab.id === activeTabId);
    const viewPayload = activeTab?.payload;

    console.log('Rendering View:', activeTabId);
    switch (activeTabId) {
      case View.SALE:
        return <SaleView 
            products={products} 
            onSaleComplete={addSaleRecord} 
            suspendedSales={suspendedSales}
            setSuspendedSales={setSuspendedSales}
            currentSale={currentSale}
            setCurrentSale={setCurrentSale}
            updateProductPrice={updateProductPrice}
            updatePricesByAnaStokKodu={updatePricesByAnaStokKodu}
            companyInfo={companyInfo}
            customers={customers}
            onAddCustomer={handleAddCustomer}
        />;
      case View.RETURN:
        return <ReturnView 
          products={products}
          onReturnComplete={addReturnRecord}
          companyInfo={companyInfo}
          currentReturn={currentReturn}
          setCurrentReturn={setCurrentReturn}
        />;
      case View.PRODUCTS:
        return <ProductsView 
            products={products} 
            suppliers={suppliers}
            salesHistory={salesHistory}
            onAddProduct={handleAddProduct}
            onAddMultipleProducts={handleAddMultipleProducts}
            onStartAiTask={handleStartAiTask}
            definitions={definitions}
            onDeleteProduct={handleDeleteProduct}
            onRestoreProduct={handleRestoreProduct}
            onUpdateProductPrice={updateProductPrice}
            onUpdateProductBuyPrice={updateProductBuyPrice}
            onUpdateProduct={handleUpdateProduct}
            onUpdateProductStock={handleUpdateProductStock}
            onBulkUpdateProducts={handleBulkUpdateProducts}
            onAddDefinition={handleQuickAddDefinition}
            onMinimizeTask={toggleTaskMinimize}
            restoreSignal={restoreAddProductSignal}
            companyInfo={companyInfo}
        />;
      case View.REPORTS:
        return <ReportsView 
            salesHistory={salesHistory} 
            products={products} 
            purchaseHistory={purchaseHistory}
            paymentHistory={paymentHistory}
            returnHistory={returnHistory}
            suppliers={suppliers}
            customers={customers}
            endOfDayHistory={endOfDayHistory}
            addEndOfDayRecord={addEndOfDayRecord}
            initialTab={viewPayload?.initialTab}
            companyInfo={companyInfo}
        />;
      case View.DEFINITIONS:
        return <DefinitionsView 
            definitions={definitions}
            suppliers={suppliers}
            customers={customers}
            products={products}
            companyInfo={companyInfo}
            onUpdateBrands={handleUpdateBrands}
            onUpdateModels={handleUpdateModels}
            onUpdateColors={handleUpdateColors}
            onUpdateSizes={handleUpdateSizes}
            onUpdateGroups={handleUpdateGroups}
            onUpdateSuppliers={handleUpdateSuppliers}
            onUpdateCustomers={handleUpdateCustomers}
            onStartAiSupplierTask={handleStartAiSupplierTask}
        />;
      case View.PURCHASE:
        return <PurchaseView 
            products={products}
            suppliers={suppliers}
            salesHistory={salesHistory}
            missingLists={missingLists}
            onAddMissingList={addMissingListRecord}
            onPurchaseComplete={addPurchaseRecord}
            onUpdateProductPrice={updateProductPrice}
            onUpdateProductBuyPrice={updateProductBuyPrice}
            currentPurchase={currentPurchase}
            setCurrentPurchase={setCurrentPurchase}
            definitions={definitions}
            onUpdateBrands={handleUpdateBrands}
            onUpdateModels={handleUpdateModels}
            onUpdateColors={handleUpdateColors}
            onUpdateSizes={handleUpdateSizes}
            onUpdateGroups={handleUpdateGroups}
            onUpdateSuppliers={handleUpdateSuppliers}
            companyInfo={companyInfo}
            payload={viewPayload}
        />;
      case View.PURCHASE_MENU:
        return <PurchaseMenuView 
            onNavigate={navigateTo}
            companyInfo={companyInfo}
        />;
      case View.FINANCE:
        return <FinanceView 
          suppliers={suppliers}
          purchaseHistory={purchaseHistory}
          paymentHistory={paymentHistory}
          onAddPayment={addPaymentRecord}
          onUpdatePayment={updatePaymentRecord}
          onDeletePayment={deletePaymentRecord}
        />;
       case View.USER_MANAGEMENT:
        return <UserManagementView 
          users={users}
          onAddUser={handleAddUser}
          onDeleteUser={handleDeleteUser}
        />;
      case View.STORAGE_MANAGEMENT:
        return <StorageManagementView onExportData={handleExportData} onImportData={handleImportData} onResetApplication={handleResetApplication} />;
      case View.SETTINGS:
        return <SettingsView 
          currentUser={currentUser!}
          companyInfo={companyInfo}
          onUpdateCompanyInfo={handleUpdateCompanyInfo}
          onCheckUpdates={checkForUpdates}
          currentVersion={currentAppVersion}
        />;
       case View.REMOTE_ACCESS:
        return <RemoteAccessView 
          salesHistory={salesHistory}
          products={products}
          suspendedSales={suspendedSales}
          onNavigate={navigateTo}
          suppliers={suppliers}
        />;
      case View.STOCK_COUNT:
        return <StockCountView 
            products={products} 
            onBulkStockUpdate={handleBulkStockUpdate}
        />;
      case View.ANALYSIS:
        return <AnalysisView
          salesHistory={salesHistory}
          products={products}
          purchaseHistory={purchaseHistory}
          returnHistory={returnHistory}
          paymentHistory={paymentHistory}
          suppliers={suppliers}
        />;
      case View.AI_SETTINGS:
        return <AiSettingsView 
          onNavigate={navigateTo} 
          companyInfo={companyInfo}
          onUpdateCompanyInfo={handleUpdateCompanyInfo}
        />;
      case View.AI_MENU:
        return <AiMenuView 
          onNavigate={navigateTo} 
          companyInfo={companyInfo}
          onUpdateCompanyInfo={handleUpdateCompanyInfo}
        />;
      case View.EXCEL_OPERATIONS:
        return <ExcelOperationsView 
          onNavigate={navigateTo} 
          products={products}
          salesHistory={salesHistory}
          purchaseHistory={purchaseHistory}
        />;
      case View.AI_PRICE_UPDATE:
        return <AiPriceUpdateView 
          products={products}
          onUpdateProducts={setProducts}
          onNavigate={navigateTo}
        />;
      case View.CALCULATOR:
        return <CalculatorView />;
      case View.CALCULATOR_MENU:
        return <CalculatorMenuView 
          onNavigate={navigateTo}
        />;
      case View.MONEY_COUNTER:
        return <MoneyCounterView />;
      case View.BULK_PRICE_UPDATE:
        console.log('Rendering BulkPriceUpdateView');
        return <BulkPriceUpdateView 
            products={products} 
            definitions={definitions}
            onUpdateProducts={handleBulkUpdateProducts}
            onNavigate={navigateTo}
        />;
      case View.STOCK_ORDER:
        console.log('Rendering StockOrderView');
        return <StockOrderView 
            products={products}
            suppliers={suppliers}
            definitions={definitions}
            onNavigate={navigateTo}
        />;
      case View.SERIAL_LABEL:
        return (
          <LabelDesigner 
            products={products}
            definitions={definitions}
          />
        );
      case View.DASHBOARD:
      default:
        return <DashboardView 
            onNavigate={navigateTo} 
            onOpenManual={() => setIsManualOpen(true)}
            currentUser={currentUser!}
            salesHistory={salesHistory}
            products={products}
            companyInfo={companyInfo}
        />;
    }
  };

  const handleExportCurrentViewToExcel = useCallback(() => {
    let data: any[] = [];
    let filename = "yenice_disa_aktarim.xlsx";

    switch (activeTabId) {
      // Products view handles its own hierarchical export via event
      case View.REPORTS:
        data = salesHistory.map(s => ({
          'Tarih': new Date(s.date).toLocaleString('tr-TR'),
          'İşlem No': s.id,
          'Toplam': s.total,
          'Ödeme': s.paymentMethod
        }));
        filename = "satis_raporu.xlsx";
        break;
      case View.PURCHASE:
        data = purchaseHistory.map(p => ({
          'Tarih': new Date(p.date).toLocaleString('tr-TR'),
          'Fatura No': p.id,
          'Toplam': p.total
        }));
        filename = "alis_raporu.xlsx";
        break;
      case View.FINANCE:
        data = paymentHistory.map(p => ({
          'Tarih': new Date(p.date).toLocaleString('tr-TR'),
          'Tutar': p.amount,
          'Tip': 'Ödeme',
          'Notlar': p.notes || ''
        }));
        filename = "finans_raporu.xlsx";
        break;
    }

    if (data.length === 0) {
      alert("Bu sayfa için dışa aktarılacak veri bulunamadı.");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Veri");
    XLSX.writeFile(wb, filename);
  }, [activeTabId, products, salesHistory, purchaseHistory, paymentHistory]);

  const contextMenuOptions = useMemo(() => [
    { label: 'Tümünü Seç', icon: 'check', onClick: () => window.dispatchEvent(new CustomEvent('app-select-all')), variant: 'default' as const },
    { label: 'Seçimi Kaldır', icon: 'x-circle', onClick: () => window.dispatchEvent(new CustomEvent('app-deselect-all')), variant: 'default' as const },
    { label: 'Excele Aktar', icon: 'excel', onClick: () => {
      console.log('Export requested for tab:', activeTabId);
      if (activeTabId === View.PRODUCTS) {
        if ((window as any).handleExportStock) {
           (window as any).handleExportStock();
        } else {
           window.dispatchEvent(new CustomEvent('app-export-excel'));
        }
      } else {
        handleExportCurrentViewToExcel();
      }
    }, variant: 'success' as const },
    { label: 'Kaydet / Değişiklikleri Uygula', icon: 'check', onClick: () => console.log('Save requested'), variant: 'default' as const },
    { label: 'Kopyala (Metin Seçiliyse)', icon: 'copy', onClick: () => document.execCommand('copy'), variant: 'default' as const },
    { label: 'Yedek Al (JSON)', icon: 'database', onClick: handleExportData, variant: 'default' as const },
    { label: 'Sil / Arşivle', icon: 'trash', onClick: () => console.log('Delete requested'), variant: 'danger' as const },
  ], [handleExportCurrentViewToExcel, handleExportData, activeTabId]);

  if (!isAuthReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Icon name="refresh" className="w-12 h-12 text-cyan-600 animate-spin" />
          <p className="text-slate-500 font-medium">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!fbUser) {
    return <LoginView onLoginSuccess={setFbUser} />;
  }

  return (
    <div className={`h-screen w-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 flex flex-col font-sans overflow-hidden ${companyInfo.darkMode ? 'dark' : ''}`}>
      <Navbar 
        onNavigate={navigateTo}
        aiTasks={aiTasks}
        onReviewAiTask={handleReviewAiTask}
        onDismissAiTask={handleDismissAiTask}
        currentUser={currentUser!}
        onLogout={handleLogout}
        companyInfo={companyInfo}
        openTabs={openTabs}
        activeTabId={activeTabId}
        onTabClick={setActiveTabId}
        onCloseTab={handleCloseTab}
        onOpenManual={() => setIsManualOpen(true)}
      />
      <main className="flex-1 w-full px-2 pb-2 pt-1 overflow-hidden" onContextMenu={handleContextMenu}>
        <div className="w-full h-full flex flex-col">
          {renderView()}
        </div>
      </main>
      <AiReviewModal
        task={reviewingTask}
        onClose={() => setReviewingTask(null)}
        onCommit={handleCommitAiResults}
        onDismiss={handleDismissAiTask}
      />
      <UserManualModal 
        isOpen={isManualOpen}
        onClose={() => setIsManualOpen(false)}
      />
      <UpdateCheckModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        updateInfo={updateInfo}
        isChecking={isCheckingUpdates}
        isUpdating={false}
        onUpdate={handleDirectUpdate}
        currentVersion={currentAppVersion}
      />

      <div 
        className="fixed top-4 right-[280px] z-[100] flex items-center justify-center w-6 h-6 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 transition-all duration-300 cursor-help"
        title={isOnline ? 'Sistem Çevrimiçi' : 'Sistem Çevrimdışı (Yerel Kayıt)'}
      >
        <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`}></div>
      </div>

      {updateMessage && (
        <div className="fixed bottom-4 left-4 z-[9999] max-w-sm animate-in slide-in-from-left duration-500">
          <div className={`p-4 rounded-2xl shadow-2xl border flex items-center gap-4 ${
            updateReady ? 'bg-green-600 border-green-500 text-white' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className={`shrink-0 p-2 rounded-xl ${updateReady ? 'bg-white/20' : 'bg-cyan-50 text-cyan-600'}`}>
              <Icon name={updateReady ? 'check' : 'refresh'} className={`w-6 h-6 ${!updateReady && 'animate-spin'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{updateMessage}</p>
              {updateReady && (
                <button 
                  onClick={() => (window as any).require('electron').ipcRenderer.send('restart_app')}
                  className="mt-2 w-full bg-white text-green-700 font-bold py-1.5 rounded-lg text-xs hover:bg-green-50 transition-colors"
                >
                  Şimdi Yeniden Başlat
                </button>
              )}
            </div>
            {!updateReady && (
              <button onClick={() => setUpdateMessage(null)} className="text-slate-400 hover:text-slate-600">
                <Icon name="x-circle" className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {showContextMenu && (
        <ContextMenu 
          options={contextMenuOptions} 
          onClose={() => setShowContextMenu(false)} 
          position={contextMenuPosition}
        />
      )}

      {/* Floating Task Bar for Minimized Modals */}
      {minimizedTasks.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex gap-3 p-3 bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl animate-fade-in-up">
              {minimizedTasks.map(task => (
                  <button 
                      key={task.id} 
                      onClick={() => {
                          if (task.type === 'add-product') navigateTo(View.PRODUCTS, 'Ürünler', 'products');
                          toggleTaskMinimize(task);
                      }}
                      className="flex items-center gap-3 px-5 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all group shadow-lg shadow-cyan-900/40"
                  >
                      <Icon name="products" className="w-4 h-4" />
                      <span>Ürün Ekleme (Devam Ediyor...)</span>
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                  </button>
              ))}
          </div>
      )}
    </div>
  );
};

export default App;