import React, { useState, useRef, useEffect, useMemo } from 'react';
import Icon from '../components/Icon';
import JsBarcode from 'jsbarcode';
import { Product } from '../types';

interface LabelDesignerProps {
  products: Product[];
}

// Güvenli Barkod Bileşeni (React useRef ile çökme yapmaz)
const BarcodeSvg: React.FC<{ value: string; height?: number }> = ({ value, height = 40 }) => {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current && value) {
      try {
        JsBarcode(barcodeRef.current, value, {
          width: 1.5,
          height,
          displayValue: false,
          margin: 0,
          background: 'transparent',
          lineColor: '#000000'
        });
      } catch (error) {
        console.error('Barkod oluşturma hatası:', error);
      }
    }
  }, [value, height]);

  return <svg ref={barcodeRef} className="max-w-full h-auto" />;
};

const LabelDesigner: React.FC<LabelDesignerProps> = ({ products }) => {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [labelWidth, setLabelWidth] = useState<number>(50); // mm cinsinden genişlik
  const [labelHeight, setLabelHeight] = useState<number>(30); // mm cinsinden yükseklik
  const [printCount, setPrintCount] = useState<number>(1); // Yazdırılacak etiket adedi
  const [isVertical, setIsVertical] = useState<boolean>(false); // Yatay/Dikey yönlendirme
  const [selectedPrinter, setSelectedPrinter] = useState('Varsayılan Yazıcı');
  // Eğer ürün varsa ilkini varsayılan olarak seç


  // Gelişmiş filtre state'leri
  const [filterBarcode, setFilterBarcode] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterSubGroup, setFilterSubGroup] = useState('');
  const [filterStockCode, setFilterStockCode] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [filterAnaStokKodu, setFilterAnaStokKodu] = useState('');

  // Filtreleme butonuna basıldığında uygulanacak asıl filtre durumu
  const [appliedFilters, setAppliedFilters] = useState({
    barcode: '',
    name: '',
    group: '',
    subGroup: '',
    stockCode: '',
    model: '',
    anaStokKodu: ''
  });
  const [isListCleared, setIsListCleared] = useState<boolean>(false);

  // Etiket bileşenleri seçimi
  const [labelFields, setLabelFields] = useState<{ name: boolean; barcode: boolean; barcodeText: boolean; markaBeden: boolean; price: boolean }>({
    name: true,
    barcode: true,
    barcodeText: true,
    markaBeden: true,
    price: true,
  });
  const labelFieldNames = {
    name: 'Ürün Adı',
    barcode: 'Barkod',
    barcodeText: 'Barkod Yazısı',
    markaBeden: 'Marka/Beden',
    price: 'Fiyat',
  };

  // Etiket bileşenleri tekil yön ayarları
  const [elementRotations, setElementRotations] = useState<{ name: boolean; barcode: boolean; barcodeText: boolean; markaBeden: boolean; price: boolean }>({
    name: false,
    barcode: false,
    barcodeText: false,
    markaBeden: false,
    price: false,
  });

  // Filtrelenmiş ürünler
  const filteredProducts = useMemo(() => {
    if (isListCleared) return [];
    return products.filter(p =>
      (!appliedFilters.barcode || (p.barcode && p.barcode.toLowerCase().includes(appliedFilters.barcode.toLowerCase()))) &&
      (!appliedFilters.name || (p.name && p.name.toLowerCase().includes(appliedFilters.name.toLowerCase()))) &&
      (!appliedFilters.group || (p.group && p.group.toLowerCase().includes(appliedFilters.group.toLowerCase()))) &&
      (!appliedFilters.subGroup || (p.subGroup && p.subGroup.toLowerCase().includes(appliedFilters.subGroup.toLowerCase()))) &&
      (!appliedFilters.stockCode || (p.stokKodu && p.stokKodu.toLowerCase().includes(appliedFilters.stockCode.toLowerCase()))) &&
      (!appliedFilters.model || (p.model && p.model.toLowerCase().includes(appliedFilters.model.toLowerCase()))) &&
      (!appliedFilters.anaStokKodu || (p.anaStokKodu && p.anaStokKodu.toLowerCase().includes(appliedFilters.anaStokKodu.toLowerCase())))
    );
  }, [products, appliedFilters, isListCleared]);

  const handleApplyFilter = () => {
    setAppliedFilters({
      barcode: filterBarcode,
      name: filterName,
      group: filterGroup,
      subGroup: filterSubGroup,
      stockCode: filterStockCode,
      model: filterModel,
      anaStokKodu: filterAnaStokKodu
    });
    setIsListCleared(false);
  };

  const handleClearFilter = () => {
    setFilterBarcode('');
    setFilterName('');
    setFilterGroup('');
    setFilterSubGroup('');
    setFilterStockCode('');
    setFilterModel('');
    setFilterAnaStokKodu('');
    setAppliedFilters({ barcode: '', name: '', group: '', subGroup: '', stockCode: '', model: '', anaStokKodu: '' });
    setIsListCleared(true);
  };

  useEffect(() => {
    if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].barcode);
    }
  }, [products, selectedProductId]);

  const selectedProduct = products.find(p => p.barcode === selectedProductId) || undefined;

  const handlePrint = () => {
    if (!selectedProduct) {
      alert('Yazdırılacak ürün bulunamadı. Lütfen stoklarınıza ürün ekleyin.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Yazdırma penceresi açılamadı. Tarayıcınızın açılır pencere engelleyicisini kontrol edin.');
      return;
    }

    let labelsHtml = '';
    // JSBarcode ile HTML String için SVG oluşturma
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    try {
      JsBarcode(svg, selectedProduct.barcode || '', { width: 1.5, height: 40, displayValue: false, margin: 0 });
    } catch (e) {}

    for (let i = 0; i < printCount; i++) {
      labelsHtml += `
        <div class="label-page">
          <div class="content-wrapper ${isVertical ? 'vertical' : ''}">
            ${labelFields.name ? `<div class="product-name ${elementRotations.name ? 'rotated' : ''}">${selectedProduct.name || ''}</div>` : ''}
            ${labelFields.barcode ? `<div class="barcode-box ${elementRotations.barcode ? 'rotated' : ''}">${svg.outerHTML}</div>` : ''}
            ${labelFields.barcodeText ? `<div class="barcode-text ${elementRotations.barcodeText ? 'rotated' : ''}">${selectedProduct.barcode || ''}</div>` : ''}
            ${labelFields.markaBeden ? `<div class="details ${elementRotations.markaBeden ? 'rotated' : ''}">${selectedProduct.marka || 'Marka'}${selectedProduct.beden ? '- ' + selectedProduct.beden : ''}</div>` : ''}
            ${labelFields.price ? `<div class="price ${elementRotations.price ? 'rotated' : ''}">₺${(selectedProduct.price || 0).toFixed(2)}</div>` : ''}
          </div>
        </div>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Etiket Yazdır</title>
        <style>
          @page {
            size: ${labelWidth}mm ${labelHeight}mm;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            background-color: #fff;
            color: #000;
            font-family: 'Arial', sans-serif;
          }
          .label-page {
            width: ${labelWidth}mm;
            height: ${labelHeight}mm;
            box-sizing: border-box;
            display: flex;
            align-items: center;
            justify-content: center;
            page-break-after: always;
            overflow: hidden;
          }
          .content-wrapper {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            width: 100%;
            height: 100%;
            padding: 2mm;
            box-sizing: border-box;
          }
          .content-wrapper.vertical {
            transform: rotate(-90deg);
            width: ${labelHeight}mm;
            height: ${labelWidth}mm;
          }
          .rotated {
            writing-mode: vertical-rl;
            transform: rotate(180deg);
          }
          .product-name {
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 2px;
            max-height: 26px;
            overflow: hidden;
            line-height: 1.1;
          }
          .barcode-box {
            display: flex;
            justify-content: center;
            width: 100%;
            margin-bottom: 1px;
          }
          .barcode-box svg {
            height: ${Math.max(20, (isVertical ? labelWidth : labelHeight) * 0.3)}px !important;
            max-width: 90%;
          }
          .barcode-text {
            font-size: 10px;
            letter-spacing: 2px;
            font-family: monospace;
            font-weight: bold;
          }
          .details {
            font-size: 9px;
            color: #333;
            margin-top: 1px;
          }
          .price {
            font-size: 16px;
            font-weight: 900;
            margin-top: 2px;
          }
        </style>
      </head>
      <body>
        ${labelsHtml}
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
              window.close();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="flex h-full w-full bg-slate-900 text-slate-200 overflow-hidden font-sans">
      {/* Özel Arka Plan Deseni */}
      <style>
        {`
          .bg-checkerboard {
            background-color: #0f172a;
            background-image: linear-gradient(45deg, #1e293b 25%, transparent 25%), 
                              linear-gradient(-45deg, #1e293b 25%, transparent 25%), 
                              linear-gradient(45deg, transparent 75%, #1e293b 75%), 
                              linear-gradient(-45deg, transparent 75%, #1e293b 75%);
            background-size: 20px 20px;
            background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
          }
        `}
      </style>

      {/* Sol Menü - Ayarlar */}
      <div className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col shadow-2xl z-20">
        <div className="p-5 border-b border-slate-700 bg-slate-800/80">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Icon name="barcode" className="w-6 h-6 text-cyan-500" /> Etiket Tasarımcısı
          </h2>
          <p className="text-xs text-slate-400 mt-1">Barkod yazıcınız için etiket oluşturun.</p>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-6">
          {/* Ürün Seçimi */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Yazdırılacak Ürün</label>
            <select 
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-white outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {products.length === 0 && <option value="">Ürün bulunamadı</option>}
              {products.map(p => (
                <option key={p.barcode} value={p.barcode}>{p.name} ({p.barcode})</option>
              ))}
            </select>
          </div>

          {/* Etiket Boyutları */}
          <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-700/50">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Etiket Boyutu (mm)</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-500 mb-1 block">Genişlik (G)</span>
                <div className="relative">
                  <input type="number" min="10" max="200" value={labelWidth} onChange={(e) => setLabelWidth(Number(e.target.value) || 50)} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-500 text-center" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">mm</span>
                </div>
              </div>
              <div>
                <span className="text-xs text-slate-500 mb-1 block">Yükseklik (Y)</span>
                <div className="relative">
                  <input type="number" min="10" max="200" value={labelHeight} onChange={(e) => setLabelHeight(Number(e.target.value) || 30)} className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-500 text-center" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">mm</span>
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Yazım Yönü</label>
              <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-600">
                <button
                  onClick={() => setIsVertical(false)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${!isVertical ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                  Yatay
                </button>
                <button
                  onClick={() => setIsVertical(true)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${isVertical ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                  Dikey
                </button>
              </div>
            </div>
          </div>

          {/* Yazdırma Ayarları */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Baskı Adedi</label>
            <input 
              type="number" min="1" max="1000" 
              value={printCount} 
              onChange={(e) => setPrintCount(Number(e.target.value) || 1)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-lg font-bold text-center text-white outline-none focus:ring-2 focus:ring-cyan-500" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Hedef Yazıcı Seçimi</label>
            <select 
              value={selectedPrinter}
              onChange={e => setSelectedPrinter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-300 outline-none focus:ring-2 focus:ring-slate-500"
            >
              <option>Varsayılan Sistem Yazıcısı</option>
              <option>Zebra Termal Barkod Yazıcı</option>
              <option>Argox / Xprinter</option>
            </select>
          </div>
        </div>

        <div className="p-5 border-t border-slate-700 bg-slate-800/80">
          <button 
            onClick={handlePrint}
            disabled={!selectedProduct}
            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white py-4 rounded-xl font-black text-lg shadow-lg shadow-green-900/50 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
          >
            <Icon name="printer" className="w-6 h-6" />
            BASKIYI BAŞLAT
          </button>
        </div>
      </div>


      {/* SOL MENÜ: Gelişmiş Ürün Filtre ve Etiket Bileşen Seçimi */}
      <div className="flex flex-row w-full">
        {/* Sol Menü */}
        <div className="w-80 min-w-[280px] bg-slate-800 border-r border-slate-700 flex flex-col gap-6 p-6">
          <h3 className="text-lg font-bold text-white mb-2">Ürün Filtrele</h3>
          <div className="flex flex-col gap-2">
            <input className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white" placeholder="Barkod" value={filterBarcode} onChange={e => setFilterBarcode(e.target.value)} />
            <input className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white" placeholder="Ürün Adı" value={filterName} onChange={e => setFilterName(e.target.value)} />
            <input className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white" placeholder="Grup" value={filterGroup} onChange={e => setFilterGroup(e.target.value)} />
            <input className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white" placeholder="Alt Grup" value={filterSubGroup} onChange={e => setFilterSubGroup(e.target.value)} />
            <input className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white" placeholder="Stok Kodu" value={filterStockCode} onChange={e => setFilterStockCode(e.target.value)} />
            <input className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white" placeholder="Model Kodu" value={filterModel} onChange={e => setFilterModel(e.target.value)} />
            <input className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white" placeholder="Stok Adı" value={filterAnaStokKodu} onChange={e => setFilterAnaStokKodu(e.target.value)} />
            
            <div className="flex gap-2 mt-2">
              <button onClick={handleApplyFilter} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded-lg text-xs transition-colors shadow-sm">
                Filtrele
              </button>
              <button onClick={handleClearFilter} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-2 rounded-lg text-xs transition-colors shadow-sm">
                Temizle
              </button>
            </div>
          </div>
          <h3 className="text-lg font-bold text-white mt-6 mb-2">Etiket Bileşenleri</h3>
          <div className="flex flex-col gap-3">
            {(Object.keys(labelFields) as Array<keyof typeof labelFields>).map((key) => (
              <div key={key} className="flex items-center justify-between bg-slate-900/50 px-3 py-2 rounded-xl border border-slate-700/50">
                <label className="flex items-center gap-3 text-slate-200 text-sm cursor-pointer flex-1">
                  <input 
                    type="checkbox" 
                    checked={labelFields[key]} 
                    onChange={() => setLabelFields(f => ({ ...f, [key]: !f[key] }))}
                    className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500 bg-slate-800"
                  />
                  {labelFieldNames[key]}
                </label>
                {labelFields[key] && (
                  <button
                    onClick={() => setElementRotations(r => ({ ...r, [key]: !r[key] }))}
                    className={`flex items-center justify-center text-[10px] px-3 py-1.5 rounded-lg font-bold transition-colors shadow-sm ${elementRotations[key] ? 'bg-cyan-600 text-white shadow-cyan-900/50' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    title="Yönü Değiştir (Yatay/Dikey)"
                  >
                    {elementRotations[key] ? 'DİKEY' : 'YATAY'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sağ: Ürün Listesi ve Tasarım Alanı */}
        <div className="flex-1 flex flex-col">
          {/* Ürün Listesi */}
          <div className="w-full bg-slate-900 border-b border-slate-700 p-4">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-800 text-slate-400">
                <tr>
                  <th className="py-2 px-3">Adı</th>
                  <th className="py-2 px-3">Barkod</th>
                  <th className="py-2 px-3">Grup</th>
                  <th className="py-2 px-3">Alt Grup</th>
                  <th className="py-2 px-3">Stok Kodu</th>
                  <th className="py-2 px-3">Model Kodu</th>
                  <th className="py-2 px-3">Stok Adı</th>
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      {isListCleared ? 'Arama yapmak için "Filtrele" butonuna tıklayın.' : 'Kriterlere uygun ürün bulunamadı.'}
                    </td>
                  </tr>
                )}
                {filteredProducts.map((p) => (
                  <tr key={p.barcode} className={`hover:bg-slate-800 transition ${selectedProductId === p.barcode ? 'bg-cyan-900/30' : ''}`}>
                    <td className="py-2 px-3">{p.name}</td>
                    <td className="py-2 px-3">{p.barcode}</td>
                    <td className="py-2 px-3">{p.group || ''}</td>
                    <td className="py-2 px-3">{p.subGroup || ''}</td>
                    <td className="py-2 px-3">{p.stokKodu || ''}</td>
                    <td className="py-2 px-3">{p.model || ''}</td>
                    <td className="py-2 px-3">{p.anaStokKodu || ''}</td>
                    <td className="py-2 px-3">
                      <button
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded font-bold"
                        onClick={() => setSelectedProductId(p.barcode)}
                      >
                        Seç
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sağ Kısım - Önizleme Alanı (Canvas) */}
          <div className="flex-1 relative bg-checkerboard flex flex-col items-center justify-center overflow-auto shadow-inner">
        
        {/* Önizleme Bilgi Kutusu */}
        <div className="absolute top-6 bg-slate-900/80 backdrop-blur-md px-6 py-2 rounded-full border border-slate-700 shadow-xl flex items-center gap-4 z-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-xs font-bold text-slate-300 tracking-wider">CANLI ÖNİZLEME</span>
          </div>
          <span className="text-xs text-slate-500 border-l border-slate-700 pl-4">Ölçek: 400% (Detay Görünümü)</span>
        </div>

        {/* 5'li Dikey Etiket Örneği - Döndürülebilir */}
        {/* Gerçek ürün ve adet kadar 5'li etiket */}
        {selectedProduct && printCount > 0 ? (
          <div className="flex flex-row items-end justify-center gap-4 w-full py-8">
            {Array.from({ length: Math.min(printCount, 5) }).map((_, i) => (
              <div
                key={i}
                className="bg-white text-black flex flex-col items-center justify-center shadow-[0_0_16px_rgba(0,0,0,0.10)] rounded-lg border border-slate-300 transition-all duration-300 ease-out relative"
                style={{
                  width: `${labelWidth * 4}px`,
                  height: `${labelHeight * 4}px`,
                  marginLeft: i === 0 ? 0 : '4px',
                  marginRight: i === 4 ? 0 : '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <div 
                  style={{
                    transform: isVertical ? 'rotate(-90deg)' : 'none',
                    width: isVertical ? `${labelHeight * 4}px` : '100%',
                    height: isVertical ? `${labelWidth * 4}px` : '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '10px 4px',
                    boxSizing: 'border-box',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {labelFields.name && selectedProduct && (
                    <div className="text-center font-bold overflow-hidden leading-tight flex items-center justify-center" style={{ width: elementRotations.name ? 'auto' : '100%', fontSize: '13px', maxHeight: '30px', lineHeight: 1.1, ...(elementRotations.name ? { writingMode: 'vertical-rl', transform: 'rotate(180deg)' } : {}) }}>
                      {selectedProduct.name}
                    </div>
                  )}
                  {labelFields.barcode && selectedProduct && (
                    <div className="flex justify-center mt-2 mb-1 pointer-events-none" style={{ width: elementRotations.barcode ? 'auto' : '100%', ...(elementRotations.barcode ? { writingMode: 'vertical-rl', transform: 'rotate(180deg)' } : {}) }}>
                      <BarcodeSvg value={selectedProduct.barcode} height={isVertical ? labelWidth * 1.1 : labelHeight * 1.1} />
                    </div>
                  )}
                  {labelFields.barcodeText && selectedProduct && (
                    <div className="text-center font-mono tracking-[0.2em] font-bold flex items-center justify-center" style={{ fontSize: '11px', ...(elementRotations.barcodeText ? { writingMode: 'vertical-rl', transform: 'rotate(180deg)' } : {}) }}>
                      {selectedProduct.barcode}
                    </div>
                  )}
                  {labelFields.markaBeden && selectedProduct && (
                    <div className="text-center text-gray-700 font-medium mt-1 uppercase flex items-center justify-center" style={{ fontSize: '9px', ...(elementRotations.markaBeden ? { writingMode: 'vertical-rl', transform: 'rotate(180deg)' } : {}) }}>
                      {(selectedProduct.marka || 'Marka')}{selectedProduct.beden ? ` - ${selectedProduct.beden}` : ''}
                    </div>
                  )}
                  {labelFields.price && selectedProduct && (
                    <div className="text-center font-black tracking-tighter mt-auto flex items-center justify-center" style={{ fontSize: '18px', ...(elementRotations.price ? { writingMode: 'vertical-rl', transform: 'rotate(180deg)' } : {}) }}>
                      ₺{(selectedProduct.price || 0).toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-500 p-10 bg-slate-800/50 rounded-3xl border border-slate-700 border-dashed backdrop-blur-md">
            <Icon name="products" className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-xl font-semibold">Stoklarınızda ürün bulunamadı</p>
            <p className="text-sm mt-2">Etiket yazdırmak için önce sisteme ürün eklemelisiniz.</p>
          </div>
        )}
                  </div>
                </div>
      </div>
    </div>
  );
}

export default LabelDesigner;