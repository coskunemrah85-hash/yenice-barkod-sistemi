

import { useState } from 'react';
import { Product, SaleRecord, Brand, Model, Color, Size, Group, Supplier, PurchaseRecord, PaymentRecord, EndOfDayRecord } from '../types';

export const mockBrands: Brand[] = [
  { id: '1', name: 'Yenice' },
  { id: '2', name: 'Kom' },
  { id: '3', name: 'NBB' },
  { id: '4', name: 'Yenice Kids' },
];

export const mockModels: Model[] = [
  { id: '1', brandId: '1', name: 'Basic' },
  { id: '2', brandId: '1', name: 'Lace' },
  { id: '3', brandId: '1', name: 'Comfort' },
  { id: '4', brandId: '1', name: 'Thermal' },
  { id: '5', brandId: '1', name: 'Satin' },
  { id: '6', brandId: '1', name: 'Minimizer' },
  { id: '7', brandId: '1', name: 'Bamboo' },
  { id: '8', brandId: '4', name: 'Patterned' },
  { id: '9', brandId: '2', name: 'Classic' },
  { id: '10', brandId: '3', name: 'Seamless' },
];

export const mockColors: Color[] = [
  { id: '1', name: 'Beyaz' },
  { id: '2', name: 'Siyah' },
  { id: '3', name: 'Ekru' },
  { id: '4', name: 'Bordo' },
  { id: '5', name: 'Ten' },
  { id: '6', name: 'Karışık' },
];

export const mockSizes: Size[] = [
  { id: '1', name: 'S' },
  { id: '2', name: 'M' },
  { id: '3', name: 'L' },
  { id: '4', name: 'XL' },
  { id: '5', name: '85B' },
  { id: '6', name: '2-3 Yaş' },
];

export const mockGroups: Group[] = [
  // Groups (Level 0)
  // FIX: Added missing brandId property to conform to Group type
  { id: 'g1', name: 'Kadın', parentId: null, brandId: null },
  { id: 'g2', name: 'Erkek', parentId: null, brandId: null },
  { id: 'g3', name: 'Çocuk', parentId: null, brandId: null },
  
  // Mid-Groups (Level 1)
  // FIX: Added missing brandId property to conform to Group type
  { id: 'mg1', name: 'Üst Giyim', parentId: 'g1', brandId: null },
  { id: 'mg2', name: 'Alt Giyim', parentId: 'g1', brandId: null },
  { id: 'mg3', name: 'Ev Giyim', parentId: 'g1', brandId: null },
  { id: 'mg4', name: 'Üst Giyim', parentId: 'g2', brandId: null },
  { id: 'mg5', name: 'Alt Giyim', parentId: 'g2', brandId: null },
  { id: 'mg6', name: 'Çorap', parentId: 'g3', brandId: null },

  // Sub-Groups (Level 2)
  // FIX: Added missing brandId property to conform to Group type
  { id: 'sg1', name: 'Sütyen', parentId: 'mg1', brandId: null },
  { id: 'sg2', name: 'Bralet', parentId: 'mg1', brandId: null },
  { id: 'sg3', name: 'Külot', parentId: 'mg2', brandId: null },
  { id: 'sg4', name: 'Pijama Takımı', parentId: 'mg3', brandId: null },
  { id: 'sg5', name: 'Atlet', parentId: 'mg4', brandId: null },
  { id: 'sg6', name: 'Boxer', parentId: 'mg5', brandId: null },
];

export const mockSuppliers: Supplier[] = [
    { id: 'sup1', name: 'Ana Tedarikçi A.Ş.', discountRate: 15 },
    { id: 'sup2', name: 'Toptancı B' },
    { id: 'sup3', name: 'Yenice Fabrika', discountRate: 25 },
    { id: 'sup4', name: 'Kom Toptan' },
];


const mockProducts: Product[] = [
  { barcode: '869000000001', name: 'Pamuklu Kadın Külot', buyPrice: 47.99, price: 79.99, stock: 50, stokKodu: 'YN-KL-001', marka: 'Yenice', model: 'Basic', renk: 'Beyaz', beden: 'M', anaStokKodu: 'YN-KL', group: 'Kadın', midGroup: 'Alt Giyim', subGroup: 'Külot' },
  { barcode: '869000000002', name: 'Dantelli Bralet', buyPrice: 89.94, price: 149.90, stock: 35, stokKodu: 'YN-BR-001', marka: 'Yenice', model: 'Lace', renk: 'Siyah', beden: 'S', anaStokKodu: 'YN-BR', group: 'Kadın', midGroup: 'Üst Giyim', subGroup: 'Bralet' },
  { barcode: '869000000003', name: 'Erkek Boxer (3\'lü Paket)', buyPrice: 131.70, price: 219.50, stock: 40, stokKodu: 'YN-BX-001', marka: 'Yenice', model: 'Comfort', renk: 'Karışık', beden: 'L', anaStokKodu: 'YN-BX', group: 'Erkek', midGroup: 'Alt Giyim', subGroup: 'Boxer' },
  { barcode: '869000000004', name: 'Termal Atlet', buyPrice: 77.40, price: 129.00, stock: 25, stokKodu: 'YN-AT-002', marka: 'Yenice', model: 'Thermal', renk: 'Ekru', beden: 'XL', anaStokKodu: 'YN-AT', group: 'Erkek', midGroup: 'Üst Giyim', subGroup: 'Atlet' },
  { barcode: '869000000005', name: 'Saten Pijama Takımı', buyPrice: 209.99, price: 349.99, stock: 15, stokKodu: 'YN-PJ-001', marka: 'Yenice', model: 'Satin', renk: 'Bordo', beden: 'M', anaStokKodu: 'YN-PJ', group: 'Kadın', midGroup: 'Ev Giyim', subGroup: 'Pijama Takımı' },
  { barcode: '869000000006', name: 'Toparlayıcı Sütyen', buyPrice: 113.94, price: 189.90, stock: 30, stokKodu: 'YN-SY-005', marka: 'Yenice', model: 'Minimizer', renk: 'Ten', beden: '85B', anaStokKodu: 'YN-SY', group: 'Kadın', midGroup: 'Üst Giyim', subGroup: 'Sütyen' },
  { barcode: '869000000007', name: 'Çocuk Çorap (5\'li)', buyPrice: 59.40, price: 99.00, stock: 60, stokKodu: 'YN-CR-003', marka: 'Yenice Kids', model: 'Patterned', renk: 'Karışık', beden: '2-3 Yaş', anaStokKodu: 'YN-CR', group: 'Çocuk', midGroup: 'Çorap', subGroup: '' },
  { barcode: '869000000008', name: 'Bambu Erkek Atlet', buyPrice: 53.99, price: 89.99, stock: 8, stokKodu: 'YN-AT-001', marka: 'Yenice', model: 'Bamboo', renk: 'Beyaz', beden: 'L', anaStokKodu: 'YN-AT', group: 'Erkek', midGroup: 'Üst Giyim', subGroup: 'Atlet' },
];

const initialSalesHistory: SaleRecord[] = [
    {
        id: 'sale-1',
        items: [
            { barcode: '869000000001', name: 'Pamuklu Kadın Külot', buyPrice: 47.99, price: 79.99, quantity: 2, stock: 0, stokKodu: 'YN-KL-001', marka: 'Yenice', model: 'Basic', renk: 'Beyaz', beden: 'M', anaStokKodu: 'YN-KL', group: 'Kadın', midGroup: 'Alt Giyim', subGroup: 'Külot' },
            { barcode: '869000000002', name: 'Dantelli Bralet', buyPrice: 89.94, price: 149.90, quantity: 1, stock: 0, stokKodu: 'YN-BR-001', marka: 'Yenice', model: 'Lace', renk: 'Siyah', beden: 'S', anaStokKodu: 'YN-BR', group: 'Kadın', midGroup: 'Üst Giyim', subGroup: 'Bralet' }
        ],
        total: 309.88,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        paymentMethod: 'Kredi Kartı',
    },
    {
        id: 'sale-2',
        items: [
            { barcode: '869000000003', name: 'Erkek Boxer (3\'lü Paket)', buyPrice: 131.70, price: 219.50, quantity: 1, stock: 0, stokKodu: 'YN-BX-001', marka: 'Yenice', model: 'Comfort', renk: 'Karışık', beden: 'L', anaStokKodu: 'YN-BX', group: 'Erkek', midGroup: 'Alt Giyim', subGroup: 'Boxer' }
        ],
        total: 219.50,
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        paymentMethod: 'Nakit',
    }
];

export const mockPurchaseHistory: PurchaseRecord[] = [
    {
        id: 'pch-1',
        supplierId: 'sup1',
        items: [
            { ...(mockProducts.find(p => p.barcode === '869000000001')!), quantity: 100 },
            { ...(mockProducts.find(p => p.barcode === '869000000002')!), quantity: 50 },
        ],
        total: (47.99 * 100) + (89.94 * 50), // 9296
        date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: 'pch-2',
        supplierId: 'sup3',
        items: [
            { ...(mockProducts.find(p => p.barcode === '869000000003')!), quantity: 80 },
        ],
        total: 131.70 * 80, // 10536
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: 'pch-3',
        supplierId: 'sup1',
        items: [
            { ...(mockProducts.find(p => p.barcode === '869000000006')!), quantity: 30 },
        ],
        total: 113.94 * 30, // 3418.2
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    }
];

export const mockPaymentHistory: PaymentRecord[] = [
    {
        id: 'pay-1',
        supplierId: 'sup1',
        amount: 8000,
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Banka transferi'
    },
    {
        id: 'pay-2',
        supplierId: 'sup3',
        amount: 10000,
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Nakit ödeme'
    }
];

export const mockEndOfDayHistory: EndOfDayRecord[] = [
    {
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        totalRevenue: 1250.75,
        totalReturn: 80.00,
        netRevenue: 1170.75,
        cashSales: 800.25,
        cardSales: 450.50,
        totalSalesCount: 15,
        totalItemsSoldCount: 25,
    },
    {
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        totalRevenue: 309.88,
        totalReturn: 0,
        netRevenue: 309.88,
        cashSales: 0,
        cardSales: 309.88,
        totalSalesCount: 1,
        totalItemsSoldCount: 3,
    },
    {
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        totalRevenue: 219.50,
        totalReturn: 0,
        netRevenue: 219.50,
        cashSales: 219.50,
        cardSales: 0,
        totalSalesCount: 1,
        totalItemsSoldCount: 1,
    }
];


export const useMockData = () => {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>(initialSalesHistory);

  return { products, setProducts, salesHistory, setSalesHistory };
};