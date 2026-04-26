export interface Definitions {
  brands: Brand[];
  models: Model[];
  colors: Color[];
  sizes: Size[];
  groups: Group[];
}

export interface Brand {
  id: string;
  name: string;
}

export interface Model {
  id: string;
  brandId: string;
  name: string;
}

export interface Color {
  id: string;
  name: string;
}

export interface Size {
  id: string;
  name: string;
}

export interface Group {
  id: string;
  name: string;
  parentId: string | null;
  brandId: string | null;
}

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
}

export interface CompanyInfo {
  name: string;
  appTitle: string;
  address?: string;
  phone?: string;
  taxOffice?: string;
  taxNumber?: string;
  autoEndOfDayEnabled?: boolean;
  autoEndOfDayTime?: string; // HH:mm format
  aiEnabled?: boolean;
  geminiApiKey?: string;
  darkMode?: boolean;
  labelEngine?: 'bartender' | 'argox' | 'native';
  labelTemplatePath?: string;
  labelAppPath?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface Product {
  barcode: string;
  name: string;
  description?: string;
  buyPrice: number;
  price: number;
  stock: number;
  stokKodu: string;
  marka: string;
  model: string;
  renk: string;
  beden: string;
  anaStokKodu: string;
  group: string;
  midGroup: string;
  subGroup: string;
  supplierId?: string;
  shelfLocation?: string;
  minStock?: number;
  isDeleted?: boolean;
  isActivated?: boolean;
}

export interface SaleItem extends Product {
  quantity: number;
}

export interface SaleRecord {
  id: string;
  items: SaleItem[];
  total: number;
  date: string;
  paymentMethod: 'Nakit' | 'Kredi Kartı';
  customerId?: string;
}

export interface ReturnItem extends Product {
  quantity: number;
}

export interface ReturnRecord {
  id: string;
  items: ReturnItem[];
  total: number;
  date: string;
}

export interface Supplier {
  id: string;
  name: string; // tedarikçi ünvanı
  code?: string; // cari kodu
  firstName?: string; // adı
  lastName?: string; // soyadı
  district?: string; // ilçesi
  city?: string; // ili
  mobilePhone?: string; // cep telefonu
  email?: string; // email
  group?: string; // grubu
  taxOffice?: string; // vergi dairesi
  taxNumber?: string; // vergi no
  nationalId?: string; // t.c no
  discountRate?: number;
  whatsapp?: string;
}


export interface PurchaseItem extends Product {
  quantity: number;
  isNew?: boolean;
}

export interface PurchaseRecord {
  id: string;
  supplierId: string;
  items: PurchaseItem[];
  total: number;
  date: string;
}

export interface MissingListItem {
  barcode: string;
  name: string;
  model: string;
  stokKodu: string;
  stock: number;
  orderQuantity: number;
  reason?: string;
}

export interface MissingListRecord {
  id: string;
  date: string;
  supplierId: string;
  supplierName: string;
  items: MissingListItem[];
  totalQuantity: number;
  totalCost: number;
}

export interface PaymentRecord {
  id: string;
  supplierId: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface EndOfDayRecord {
  id?: string;
  date: string; // YYYY-MM-DD
  totalRevenue: number;
  totalReturn: number;
  netRevenue: number;
  cashSales: number;
  cardSales: number;
  totalSalesCount: number;
  totalItemsSoldCount: number;
  totalPurchase?: number;
  totalPaymentsToSuppliers?: number;
}


export enum View {
  DASHBOARD = 'DASHBOARD',
  SALE = 'SALE',
  RETURN = 'RETURN',
  PRODUCTS = 'PRODUCTS',
  REPORTS = 'REPORTS',
  DEFINITIONS = 'DEFINITIONS',
  PURCHASE = 'PURCHASE',
  FINANCE = 'FINANCE',
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  STORAGE_MANAGEMENT = 'STORAGE_MANAGEMENT',
  SETTINGS = 'SETTINGS',
  REMOTE_ACCESS = 'REMOTE_ACCESS',
  STOCK_COUNT = 'STOCK_COUNT',
  ANALYSIS = 'ANALYSIS',
  AI_SETTINGS = 'AI_SETTINGS',
  AI_MENU = 'AI_MENU',
  EXCEL_OPERATIONS = 'EXCEL_OPERATIONS',
  PURCHASE_MENU = 'PURCHASE_MENU',
  AI_PRICE_UPDATE = 'AI_PRICE_UPDATE',
  CALCULATOR = 'CALCULATOR',
  CALCULATOR_MENU = 'CALCULATOR_MENU',
  MONEY_COUNTER = 'MONEY_COUNTER',
  SERIAL_LABEL = 'SERIAL_LABEL',
  BULK_PRICE_UPDATE = 'BULK_PRICE_UPDATE',
  STOCK_ORDER = 'STOCK_ORDER',
}

export type TabIcon = 'dashboard' | 'new-sale' | 'products' | 'reports' | 'back' | 'settings' | 'purchase' | 'finance' | 'tag' | 'list-bullet' | 'users' | 'logout' | 'database' | 'sales-management' | 'refresh' | 'chart' | 'customer' | 'ai' | 'excel' | 'pdf' | 'whatsapp' | 'barcode' | 'calculator-menu' | 'supplier';

export interface Tab {
  id: View;
  label: string;
  icon: TabIcon;
  payload?: any;
}

export interface ProductFilters {
  name?: string;
  stokKodu?: string;
  anaStokKodu?: string;
  barcode?: string;
  marka?: string;
  model?: string;
  renk?: string;
  beden?: string;
  group?: string;
  midGroup?: string;
  subGroup?: string;
  shelfLocation?: string;
  minPrice?: string;
  maxPrice?: string;
  stockStatus?: 'all' | 'inStock' | 'outOfStock' | 'lowStock';
  showDeleted?: boolean;
}

export type AITaskStatus = 'processing' | 'completed' | 'error';

export interface AITask {
    id: string;
    fileName: string;
    status: AITaskStatus;
    results?: Partial<PurchaseItem>[];
    error?: string;
}

export interface AITaskSupplier {
    id: string;
    fileName: string;
    status: AITaskStatus;
    results?: Partial<Supplier>[];
    error?: string;
}

export interface AITaskPriceUpdate {
    id: string;
    fileName: string;
    status: AITaskStatus;
    results?: { barcode?: string; stokKodu?: string; newBuyPrice: number; name?: string }[];
    error?: string;
}

export interface LabelElement {
    id: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
    fontWeight: string;
    fontStyle?: 'normal' | 'italic';
    textDecoration?: 'none' | 'underline';
    fontFamily: string;
    textAlign: 'left' | 'center' | 'right';
    color?: string;
    content?: string;
    rotation: number;
    opacity: number;
    zIndex: number;
    locked?: boolean;
    visible?: boolean;
    isVertical?: boolean;
    shapeType?: 'rect' | 'line' | 'circle';
    binding?: keyof Product;
    barcodeType?: 'EAN13' | 'CODE128' | 'QR';
    showHumanReadable?: boolean;
    src?: string;
}

export interface LabelTemplate {
    id: string;
    name: string;
    width: number;
    height: number;
    columns: number;
    gap: number;
    elements: LabelElement[];
}

export interface AppBackup {
// ... existing
  users: User[];
  companyInfo: CompanyInfo;
  products: Product[];
  salesHistory: SaleRecord[];
  returnHistory: ReturnRecord[];
  endOfDayHistory: EndOfDayRecord[];
  brands: Brand[];
  models: Model[];
  colors: Color[];
  sizes: Size[];
  groups: Group[];
  suppliers: Supplier[];
  customers: Customer[];
  purchaseHistory: PurchaseRecord[];
  paymentHistory: PaymentRecord[];
}
