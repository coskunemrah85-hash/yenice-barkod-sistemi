import React, { useState, useCallback, useEffect } from 'react';
import { Product, SaleRecord, View, SaleItem, ReturnRecord, Brand, Model, Color, Size, Group, AITask, Supplier, PurchaseRecord, PaymentRecord, Tab, TabIcon, EndOfDayRecord, User, AppBackup, CompanyInfo, ReturnItem, PurchaseItem, Customer, MissingListRecord } from './types';
import DashboardView from './views/DashboardView';
import SaleView from './views/SaleView';
import ProductsView from './views/ProductsView';
import ReportsView from './views/ReportsView';
import Navbar from './components/Navbar';
import ReturnView from './views/ReturnView';
import DefinitionsView from './views/DefinitionsView';
import { extractProductsFromContent } from './services/geminiService';
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
import LoginView from './views/LoginView';
import Icon from './components/Icon';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useFirestore, useFirestoreDoc } from './hooks/useFirestore';
import CalculatorView from './views/CalculatorView';

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
  // --- End of Data Persistence Logic ---

  // Ephemeral states (not persisted)
  const [suspendedSales, setSuspendedSales] = useState<SaleItem[][]>([]);
  const [currentSale, setCurrentSale] = useState<SaleItem[]>([]);
  const [currentReturn, setCurrentReturn] = useState<ReturnItem[]>([]);
  const [currentPurchase, setCurrentPurchase] = useState<PurchaseItem[]>([]);
  const [aiTasks, setAiTasks] = useState<AITask[]>([]);
  const [reviewingTask, setReviewingTask] = useState<AITask | null>(null);
  const [isManualOpen, setIsManualOpen] = useState(false);


  useEffect(() => {
    document.title = companyInfo.appTitle;
  }, [companyInfo.appTitle]);

  const navigateTo = useCallback((view: View, label: string, icon: TabIcon, payload?: any) => {
    setOpenTabs(prevTabs => {
        if (prevTabs.some(tab => tab.id === view)) {
            return prevTabs;
        }
        return [...prevTabs, { id: view, label, icon, payload }];
    });
    setActiveTabId(view);
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
      setProducts(prevProducts => {
          const productMap = new Map(prevProducts.map(p => [p.barcode, p]));
          let newProductCount = 0;
          let updatedProductCount = 0;
          newProducts.forEach(newProduct => {
              let barcode = String(newProduct.barcode || '').trim();
              if (!barcode || barcode.trim() === '') {
                  barcode = '20' + Math.floor(10000000000 + Math.random() * 90000000000).toString();
                  newProduct.barcode = barcode;
              }
              
              const parsedStock = parseInt(String(newProduct.stock), 10) || 0;
              const parsedBuyPrice = parseFloat(String(newProduct.buyPrice).replace(',', '.')) || 0;
              const parsedPrice = parseFloat(String(newProduct.price).replace(',', '.')) || 0;

              if (!productMap.has(barcode)) {
                  productMap.set(barcode, {
                      ...newProduct,
                      barcode,
                      stock: parsedStock,
                      buyPrice: parsedBuyPrice,
                      price: parsedPrice,
                      isActivated: true
                  });
                  newProductCount++;
              } else {
                  const existing = productMap.get(barcode)!;
                  productMap.set(barcode, {
                      ...existing,
                      name: newProduct.name || existing.name,
                      marka: newProduct.marka || existing.marka,
                      model: newProduct.model || existing.model,
                      renk: newProduct.renk || existing.renk,
                      beden: newProduct.beden || existing.beden,
                      stokKodu: newProduct.stokKodu || existing.stokKodu,
                      anaStokKodu: newProduct.anaStokKodu || existing.anaStokKodu,
                      group: newProduct.group || existing.group,
                      buyPrice: parsedBuyPrice > 0 ? parsedBuyPrice : existing.buyPrice,
                      price: parsedPrice > 0 ? parsedPrice : existing.price,
                      stock: (Number(existing.stock) || 0) + parsedStock,
                      isActivated: true
                  });
                  updatedProductCount++;
              }
          });
          console.log(`${newProductCount} yeni ürün eklendi, ${updatedProductCount} ürün güncellendi.`);
          return Array.from(productMap.values());
      });
  }, [setProducts]);

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
            onUpdateBrands={handleUpdateBrands}
            onUpdateModels={handleUpdateModels}
            onUpdateColors={handleUpdateColors}
            onUpdateSizes={handleUpdateSizes}
            onUpdateGroups={handleUpdateGroups}
            onUpdateSuppliers={handleUpdateSuppliers}
            onUpdateCustomers={handleUpdateCustomers}
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
      <main className="flex-1 w-full px-2 pb-2 pt-1 overflow-hidden">
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

      {/* Bağlantı Durumu Göstergesi - Sağ Üst (Saatin Yanına Küçük Işık) */}
      <div 
        className="fixed top-4 right-[280px] z-[100] flex items-center justify-center w-6 h-6 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 transition-all duration-300 cursor-help"
        title={isOnline ? 'Sistem Çevrimiçi' : 'Sistem Çevrimdışı (Yerel Kayıt)'}
      >
        <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`}></div>
      </div>

      {/* Otomatik Güncelleme Bildirimi */}
      {updateMessage && (
        <div className="fixed bottom-16 right-4 z-50 flex items-center gap-4 bg-slate-800 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 animate-fade-in-up">
          <div className="flex flex-col">
            <span className="text-sm font-medium">{updateMessage}</span>
          </div>
          {updateReady && (
            <button
              onClick={() => (window as any).require('electron').ipcRenderer.send('restart_app')}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-md whitespace-nowrap"
            >
              Yeniden Başlat ve Güncelle
            </button>
          )}
          <button onClick={() => setUpdateMessage(null)} className="text-slate-400 hover:text-white p-1">
            <Icon name="x-circle" className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default App;