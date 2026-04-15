import React, { useState, useMemo } from 'react';
import Icon from '../components/Icon';

interface MoneyItem {
  id: string;
  name: string;
  value: number;
  type: 'banknote' | 'coin';
}

const MONEY_ITEMS: MoneyItem[] = [
  { id: 'bnk500', name: '500 TL', value: 500, type: 'banknote' },
  { id: 'bnk200', name: '200 TL', value: 200, type: 'banknote' },
  { id: 'bnk100', name: '100 TL', value: 100, type: 'banknote' },
  { id: 'bnk50', name: '50 TL', value: 50, type: 'banknote' },
  { id: 'bnk20', name: '20 TL', value: 20, type: 'banknote' },
  { id: 'bnk10', name: '10 TL', value: 10, type: 'banknote' },
  { id: 'bnk5', name: '5 TL', value: 5, type: 'banknote' },
  { id: 'coin1', name: '1 TL', value: 1, type: 'coin' },
  { id: 'coin50k', name: '50 Kuruş', value: 0.5, type: 'coin' },
  { id: 'coin25k', name: '25 Kuruş', value: 0.25, type: 'coin' },
  { id: 'coin10k', name: '10 Kuruş', value: 0.1, type: 'coin' },
  { id: 'coin5k', name: '5 Kuruş', value: 0.05, type: 'coin' },
  { id: 'coin1k', name: '1 Kuruş', value: 0.01, type: 'coin' },
];

const MoneyCounterView: React.FC = () => {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [note, setNote] = useState<string>('');
  const [history, setHistory] = useState<Array<{ timestamp: string; total: number; note: string }>>([]);

  const handleCountChange = (id: string, value: number) => {
    setCounts(prev => ({
      ...prev,
      [id]: Math.max(0, value),
    }));
  };

  const total = useMemo(() => {
    return MONEY_ITEMS.reduce((sum, item) => {
      return sum + (counts[item.id] || 0) * item.value;
    }, 0);
  }, [counts]);

  const banknotesTotal = useMemo(() => {
    return MONEY_ITEMS.filter(item => item.type === 'banknote')
      .reduce((sum, item) => sum + (counts[item.id] || 0) * item.value, 0);
  }, [counts]);

  const coinsTotal = useMemo(() => {
    return MONEY_ITEMS.filter(item => item.type === 'coin')
      .reduce((sum, item) => sum + (counts[item.id] || 0) * item.value, 0);
  }, [counts]);

  const handleSaveCounting = () => {
    if (total === 0) {
      alert('Lütfen en az bir para birimi sayın!');
      return;
    }

    const now = new Date();
    const timeString = now.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    setHistory(prev => [
      { timestamp: `${now.toLocaleDateString('tr-TR')} ${timeString}`, total, note: note || 'Not yok' },
      ...prev,
    ]);

    setCounts({});
    setNote('');
  };

  const handleReset = () => {
    if (confirm('Sayımı sıfırlamak istediğinize emin misiniz?')) {
      setCounts({});
    }
  };

  const handleClearHistory = () => {
    if (confirm('Tüm geçmişi silmek istediğinize emin misiniz?')) {
      setHistory([]);
    }
  };

  const handlePrint = () => {
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
        <title>Kasa Sayımı Raporu</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Arial', sans-serif; padding: 20px; }
          .container { max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #333; padding-bottom: 20px; }
          .header h1 { font-size: 24px; margin-bottom: 10px; }
          .header p { color: #666; font-size: 14px; }
          .content { margin-bottom: 30px; }
          .section { margin-bottom: 25px; }
          .section-title { font-weight: bold; font-size: 16px; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dotted #ccc; }
          .item-name { flex: 1; }
          .item-amount { text-align: right; font-weight: bold; min-width: 100px; }
          .summary { margin-top: 20px; padding: 15px; background: #f0f0f0; border-radius: 5px; }
          .summary-row { display: flex; justify-content: space-between; font-size: 16px; margin-bottom: 10px; }
          .summary-row.total { font-size: 20px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; color: #d63031; }
          .note { margin-top: 15px; padding: 10px; background: #fff3cd; border-left: 4px solid #ffc107; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Kasa Sayımı Raporu</h1>
            <p>${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')}</p>
          </div>
          
          <div class="content">
            <div class="section">
              <div class="section-title">Banknotlar</div>
    `;

    MONEY_ITEMS.filter(item => item.type === 'banknote').forEach(item => {
      const count = counts[item.id] || 0;
      if (count > 0) {
        const amount = count * item.value;
        printContent += `
          <div class="item">
            <span class="item-name">${item.name}</span>
            <span class="item-amount">${count} adet = ₺${amount.toFixed(2)}</span>
          </div>
        `;
      }
    });

    printContent += `
              <div class="summary-row">
                <span>Banknot Toplamı:</span>
                <span>₺${banknotesTotal.toFixed(2)}</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Madeni Paralar</div>
    `;

    MONEY_ITEMS.filter(item => item.type === 'coin').forEach(item => {
      const count = counts[item.id] || 0;
      if (count > 0) {
        const amount = count * item.value;
        printContent += `
          <div class="item">
            <span class="item-name">${item.name}</span>
            <span class="item-amount">${count} adet = ₺${amount.toFixed(2)}</span>
          </div>
        `;
      }
    });

    printContent += `
              <div class="summary-row">
                <span>Madeni Para Toplamı:</span>
                <span>₺${coinsTotal.toFixed(2)}</span>
              </div>
            </div>

            <div class="section">
              <div class="summary">
                <div class="summary-row total">
                  <span>GENEL TOPLAM:</span>
                  <span>₺${total.toFixed(2)}</span>
                </div>
              </div>
              ${note ? `<div class="note"><strong>Not:</strong> ${note}</div>` : ''}
            </div>
          </div>
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

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
          <Icon name="finance" className="w-6 h-6 text-green-600" />
          Para Sayma Aracı
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Kasada bulunan nakit parayı sayın ve toplam tutarı hesaplayın
        </p>
      </div>

      {/* İçerik */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sol taraf - Para Sayım Alanı */}
            <div className="lg:col-span-2 space-y-6">
              {/* Banknotlar */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  Banknotlar
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {MONEY_ITEMS.filter(item => item.type === 'banknote').map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-200 dark:border-orange-700">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCountChange(item.id, (counts[item.id] || 0) - 1)}
                          className="px-2 py-1 bg-red-200 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-300 dark:hover:bg-red-900/50 transition-colors"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={counts[item.id] || 0}
                          onChange={(e) => handleCountChange(item.id, parseInt(e.target.value) || 0)}
                          className="w-16 px-2 py-1 text-center border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold"
                        />
                        <button
                          onClick={() => handleCountChange(item.id, (counts[item.id] || 0) + 1)}
                          className="px-2 py-1 bg-green-200 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded hover:bg-green-300 dark:hover:bg-green-900/50 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Madeni Paralar */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  Madeni Paralar
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {MONEY_ITEMS.filter(item => item.type === 'coin').map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCountChange(item.id, (counts[item.id] || 0) - 1)}
                          className="px-2 py-1 bg-red-200 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-300 dark:hover:bg-red-900/50 transition-colors"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={counts[item.id] || 0}
                          onChange={(e) => handleCountChange(item.id, parseInt(e.target.value) || 0)}
                          className="w-16 px-2 py-1 text-center border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold"
                        />
                        <button
                          onClick={() => handleCountChange(item.id, (counts[item.id] || 0) + 1)}
                          className="px-2 py-1 bg-green-200 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded hover:bg-green-300 dark:hover:bg-green-900/50 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Not */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Sayım Notu (İsteğe Bağlı)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Sayımla ilgili notlar veya ek açıklamalar..."
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 outline-none"
                  rows={3}
                />
              </div>
            </div>

            {/* Sağ taraf - Özet ve İşlemler */}
            <div className="space-y-4">
              {/* Özet Kutusu */}
              <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-900/20 dark:to-cyan-800/20 rounded-xl border-2 border-cyan-300 dark:border-cyan-700 p-6 shadow-lg">
                <h3 className="text-lg font-bold text-cyan-900 dark:text-cyan-200 mb-4">TOPLAM TUTAR</h3>
                
                <div className="space-y-3 mb-6 pb-6 border-b-2 border-cyan-300 dark:border-cyan-700">
                  <div className="flex justify-between text-cyan-800 dark:text-cyan-300">
                    <span className="text-sm">Banknotlar:</span>
                    <span className="font-semibold">₺{banknotesTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-cyan-800 dark:text-cyan-300">
                    <span className="text-sm">Madeni Paralar:</span>
                    <span className="font-semibold">₺{coinsTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-4">
                  <div className="text-center">
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Genel Toplam</p>
                    <p className="text-4xl font-bold text-cyan-600 dark:text-cyan-400">
                      ₺{total.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="text-xs text-cyan-800 dark:text-cyan-300 bg-white dark:bg-slate-700 rounded p-3">
                  <p className="mb-2">📊 <strong>Sayım Özeti:</strong></p>
                  <p>
                    {Object.values(counts).reduce((a, b) => a + b, 0)} adet para sayıldı
                  </p>
                </div>
              </div>

              {/* İşlem Butonları */}
              <div className="space-y-2">
                <button
                  onClick={handleSaveCounting}
                  className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Icon name="refresh" className="w-5 h-5" />
                  Kaydet & Yeni Sayım
                </button>

                <button
                  onClick={handlePrint}
                  className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Icon name="products" className="w-5 h-5" />
                  Yazdır
                </button>

                <button
                  onClick={handleReset}
                  className="w-full px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Icon name="refresh" className="w-5 h-5" />
                  Sıfırla
                </button>
              </div>

              {/* Geçmiş */}
              {history.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-slate-800 dark:text-white">Sayım Geçmişi</h4>
                    <button
                      onClick={handleClearHistory}
                      className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                    >
                      Temizle
                    </button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {history.map((entry, idx) => (
                      <div key={idx} className="text-xs bg-slate-50 dark:bg-slate-700 p-2 rounded border border-slate-200 dark:border-slate-600">
                        <p className="font-semibold text-slate-700 dark:text-slate-300">{entry.timestamp}</p>
                        <p className="text-green-600 dark:text-green-400 font-bold">₺{entry.total.toFixed(2)}</p>
                        <p className="text-slate-600 dark:text-slate-400 text-[10px]">{entry.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoneyCounterView;
