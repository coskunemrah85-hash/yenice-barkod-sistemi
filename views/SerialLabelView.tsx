import React, { useState, useMemo } from 'react';
import { Product, Brand, Model, Color, Size, Group } from '../types';
import Icon from '../components/Icon';

interface SerialLabelViewProps {
  products: Product[];
  brands: Brand[];
  models: Model[];
  colors: Color[];
  sizes: Size[];
  groups: Group[];
}

const SerialLabelView: React.FC<SerialLabelViewProps> = ({
  products,
  brands,
  models,
  colors,
  sizes,
  groups,
}) => {
  const [filters, setFilters] = useState({
    marka: '',
    model: '',
    renk: '',
    beden: '',
    group: '',
    stokKodu: '',
  });

  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [labelSize, setLabelSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [printPreview, setPrintPreview] = useState(false);
  const [quantityPerProduct, setQuantityPerProduct] = useState<Record<string, number>>({});

  // Filtre değişikliği
  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  // Filtrelenmiş ürünler
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      if (filters.marka && product.marka !== filters.marka) return false;
      if (filters.model && product.model !== filters.model) return false;
      if (filters.renk && product.renk !== filters.renk) return false;
      if (filters.beden && product.beden !== filters.beden) return false;
      if (filters.group && product.group !== filters.group) return false;
      if (filters.stokKodu && !product.stokKodu.includes(filters.stokKodu)) return false;
      return true;
    });
  }, [products, filters]);

  // Ürün seçme/seçimi kaldırma
  const toggleProductSelection = (barcode: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(barcode)) {
      newSelected.delete(barcode);
      const newQuantities = { ...quantityPerProduct };
      delete newQuantities[barcode];
      setQuantityPerProduct(newQuantities);
    } else {
      newSelected.add(barcode);
      setQuantityPerProduct(prev => ({ ...prev, [barcode]: 1 }));
    }
    setSelectedProducts(newSelected);
  };

  // Tümünü seç/Seçimi kaldır
  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
      setQuantityPerProduct({});
    } else {
      const newSelected = new Set(filteredProducts.map(p => p.barcode));
      const newQuantities: Record<string, number> = {};
      filteredProducts.forEach(p => {
        newQuantities[p.barcode] = 1;
      });
      setSelectedProducts(newSelected);
      setQuantityPerProduct(newQuantities);
    }
  };

  // Yazdırma fonksiyonu
  const handlePrint = () => {
    const selectedProductsArray = filteredProducts.filter(p => selectedProducts.has(p.barcode));
    if (selectedProductsArray.length === 0) {
      alert('Lütfen en az bir ürün seçin!');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Yazdırma penceresi açılamadı. Popup engelini kontrol edin.');
      return;
    }

    let printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Barkod Etiketi Yazdırma</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Arial', sans-serif; padding: 5mm; }
          .label-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(${labelSize === 'small' ? '60mm' : labelSize === 'medium' ? '80mm' : '100mm'}, 1fr)); gap: 5mm; }
          .label {
            border: 1px solid #333;
            padding: ${labelSize === 'small' ? '3mm' : labelSize === 'medium' ? '5mm' : '8mm'};
            text-align: center;
            page-break-inside: avoid;
            background: white;
          }
          .label-title { font-weight: bold; font-size: ${labelSize === 'small' ? '10px' : labelSize === 'medium' ? '12px' : '14px'}; margin-bottom: 3mm; }
          .label-info { font-size: ${labelSize === 'small' ? '8px' : labelSize === 'medium' ? '10px' : '12px'}; margin-bottom: 2mm; }
          .label-barcode { 
            margin: 5mm 0;
            font-family: 'Code128', monospace;
            font-size: ${labelSize === 'small' ? '16px' : labelSize === 'medium' ? '20px' : '28px'};
            font-weight: bold;
            letter-spacing: 2px;
          }
          .label-price { font-size: ${labelSize === 'small' ? '10px' : labelSize === 'medium' ? '12px' : '14px'}; font-weight: bold; color: #d63031; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="label-grid">
    `;

    selectedProductsArray.forEach(product => {
      const quantity = quantityPerProduct[product.barcode] || 1;
      for (let i = 0; i < quantity; i++) {
        printContent += `
          <div class="label">
            <div class="label-title">${product.name}</div>
            <div class="label-info">${product.marka} ${product.model}</div>
            <div class="label-info">${product.renk} - ${product.beden}</div>
            <div class="label-barcode">${product.barcode}</div>
            <div class="label-price">₺${product.price.toFixed(2)}</div>
          </div>
        `;
      }
    });

    printContent += `
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // Sütun genişliği değerleri
  const colWidthClass = {
    name: 'flex-1',
    marka: 'w-20',
    model: 'w-20',
    renk: 'w-20',
    beden: 'w-16',
    price: 'w-20',
    stok: 'w-16',
    action: 'w-12',
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Icon name="barcode" className="w-6 h-6 text-cyan-600" />
          Barkod Etiketi Tasarımı
        </h1>

        {/* Filtreler */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Marka</label>
            <select
              value={filters.marka}
              onChange={(e) => handleFilterChange('marka', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="">Tümü</option>
              {brands.map(b => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Model</label>
            <select
              value={filters.model}
              onChange={(e) => handleFilterChange('model', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="">Tümü</option>
              {models.map(m => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Renk</label>
            <select
              value={filters.renk}
              onChange={(e) => handleFilterChange('renk', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="">Tümü</option>
              {colors.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Beden</label>
            <select
              value={filters.beden}
              onChange={(e) => handleFilterChange('beden', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="">Tümü</option>
              {sizes.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Grup</label>
            <select
              value={filters.group}
              onChange={(e) => handleFilterChange('group', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="">Tümü</option>
              {groups.map(g => (
                <option key={g.id} value={g.name}>{g.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Stok Kodu</label>
            <input
              type="text"
              value={filters.stokKodu}
              onChange={(e) => handleFilterChange('stokKodu', e.target.value)}
              placeholder="Ara..."
              className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Kontrol butonları */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 px-3 py-2 bg-cyan-100 dark:bg-cyan-900/30 border border-cyan-200 dark:border-cyan-700 rounded-lg cursor-pointer hover:bg-cyan-200 dark:hover:bg-cyan-900/50 transition-colors">
            <input
              type="checkbox"
              checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4"
            />
            <span className="text-sm font-semibold text-cyan-900 dark:text-cyan-200">
              Tümünü Seç ({selectedProducts.size}/{filteredProducts.length})
            </span>
          </label>

          <div className="flex items-center gap-2 px-3 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Etiket Boyutu:</label>
            <select
              value={labelSize}
              onChange={(e) => setLabelSize(e.target.value as 'small' | 'medium' | 'large')}
              className="px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
            >
              <option value="small">Küçük</option>
              <option value="medium">Orta</option>
              <option value="large">Büyük</option>
            </select>
          </div>

          <button
            onClick={() => setPrintPreview(!printPreview)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <Icon name="refresh" className="w-4 h-4" />
            {printPreview ? 'Listeyi Göster' : 'Önizleme'}
          </button>

          <button
            onClick={handlePrint}
            disabled={selectedProducts.size === 0}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <Icon name="products" className="w-4 h-4" />
            Yazdır ({selectedProducts.size})
          </button>
        </div>
      </div>

      {/* İçerik */}
      <div className="flex-1 overflow-auto">
        {!printPreview ? (
          // Ürün Listesi
          <div className="p-4">
            {filteredProducts.length === 0 ? (
              <div className="text-center text-slate-500 dark:text-slate-400 py-12">
                <Icon name="products" className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Seçilen filtrelere uygun ürün bulunamadı.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredProducts.map(product => (
                  <div
                    key={product.barcode}
                    className={`flex items-center gap-3 p-3 border rounded-lg transition-colors cursor-pointer ${
                      selectedProducts.has(product.barcode)
                        ? 'bg-cyan-100 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                    onClick={() => toggleProductSelection(product.barcode)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(product.barcode)}
                      onChange={() => {}}
                      className="w-5 h-5 cursor-pointer"
                    />
                    <div className={`flex-1 ${colWidthClass.name}`}>
                      <p className="font-semibold text-slate-800 dark:text-white">{product.name}</p>
                    </div>
                    <div className={`${colWidthClass.marka} text-sm text-slate-600 dark:text-slate-400`}>{product.marka}</div>
                    <div className={`${colWidthClass.model} text-sm text-slate-600 dark:text-slate-400`}>{product.model}</div>
                    <div className={`${colWidthClass.renk} text-sm text-slate-600 dark:text-slate-400`}>{product.renk}</div>
                    <div className={`${colWidthClass.beden} text-sm text-slate-600 dark:text-slate-400`}>{product.beden}</div>
                    <div className={`${colWidthClass.price} text-sm font-semibold text-cyan-600 dark:text-cyan-400`}>₺{product.price.toFixed(2)}</div>
                    <div className={`${colWidthClass.stok} text-sm text-slate-600 dark:text-slate-400`}>{product.stock}</div>
                    {selectedProducts.has(product.barcode) && (
                      <input
                        type="number"
                        min="1"
                        value={quantityPerProduct[product.barcode] || 1}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          setQuantityPerProduct(prev => ({ ...prev, [product.barcode]: val }));
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-14 px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-center"
                        placeholder="1"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Yazdırma Önizlemesi
          <div className="p-8 bg-white dark:bg-slate-800">
            <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-white">Yazdırma Önizlemesi</h2>
            <div className={`grid gap-5 ${labelSize === 'small' ? 'grid-cols-4' : labelSize === 'medium' ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {filteredProducts
                .filter(p => selectedProducts.has(p.barcode))
                .flatMap(product => {
                  const quantity = quantityPerProduct[product.barcode] || 1;
                  return Array(quantity).fill(null).map((_, idx) => (
                    <div key={`${product.barcode}-${idx}`} className="border-2 border-slate-300 dark:border-slate-600 p-4 text-center bg-white dark:bg-slate-700">
                      <p className="font-bold text-sm text-slate-800 dark:text-white mb-2">{product.name}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{product.marka} {product.model}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">{product.renk} - {product.beden}</p>
                      <p className="text-2xl font-bold font-mono text-slate-800 dark:text-white mb-2">{product.barcode}</p>
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">₺{product.price.toFixed(2)}</p>
                    </div>
                  ));
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SerialLabelView;
