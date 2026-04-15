import React, { useState, useMemo } from 'react';
import Icon from '../components/Icon';

interface MoneyItem {
  id: string;
  name: string;
  value: number;
  type: 'banknote' | 'coin';
}

const MONEY_ITEMS: MoneyItem[] = [
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
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-3 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Icon name="finance" className="w-6 h-6 text-green-600" />
          Para Sayma Aracı
        </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
          Kasada bulunan nakit parayı sayın ve toplam tutarı hesaplayın
        </p>
        </div>
      </div>

      {/* İçerik */}
      <div className="flex-1 overflow-hidden p-3 flex flex-col max-w-5xl mx-auto w-full">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm flex flex-col h-full gap-4">
          
          {/* 2-Column Grid for Tables */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0 overflow-y-auto pr-2">
            
            {/* Banknotlar */}
            <div className="flex flex-col bg-orange-50/50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-900/30 overflow-hidden h-fit">
              <div className="bg-orange-100/50 dark:bg-orange-900/40 py-2 px-3 border-b border-orange-200 dark:border-orange-900/50 shrink-0">
                <h3 className="font-bold text-orange-800 dark:text-orange-300 text-sm text-center tracking-wide">Banknotlar</h3>
              </div>
              <div className="p-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                      <th className="py-1.5 px-2 text-left font-medium">Birim</th>
                      <th className="py-1.5 px-2 text-center font-medium">Adet</th>
                      <th className="py-1.5 px-2 text-right font-medium">Toplam</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MONEY_ITEMS.filter(i => i.type === 'banknote').map(item => (
                      <tr key={item.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                        <td className="py-2 px-2 font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">{item.name}</td>
                        <td className="py-2 px-2">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleCountChange(item.id, (counts[item.id] || 0) - 1)}
                              className="w-7 h-7 flex items-center justify-center bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-md hover:bg-red-200 dark:hover:bg-red-900/60 active:scale-95 transition-all text-base font-bold leading-none"
                              tabIndex={-1}
                            >−</button>
                            <input
                              type="number"
                              min="0"
                              value={counts[item.id] || 0}
                              onChange={(e) => handleCountChange(item.id, parseInt(e.target.value) || 0)}
                              className="w-16 h-7 text-center border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 hide-arrows"
                            />
                            <button
                              onClick={() => handleCountChange(item.id, (counts[item.id] || 0) + 1)}
                              className="w-7 h-7 flex items-center justify-center bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-md hover:bg-green-200 dark:hover:bg-green-900/60 active:scale-95 transition-all text-base font-bold leading-none"
                              tabIndex={-1}
                            >+</button>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right font-black text-cyan-700 dark:text-cyan-400">
                          ₺{((counts[item.id] || 0) * item.value).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Madeni Paralar */}
            <div className="flex flex-col bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 overflow-hidden h-fit">
              <div className="bg-blue-100/50 dark:bg-blue-900/40 py-2 px-3 border-b border-blue-200 dark:border-blue-900/50 shrink-0">
                <h3 className="font-bold text-blue-800 dark:text-blue-300 text-sm text-center tracking-wide">Madeni Paralar</h3>
              </div>
              <div className="p-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                      <th className="py-1.5 px-2 text-left font-medium">Birim</th>
                      <th className="py-1.5 px-2 text-center font-medium">Adet</th>
                      <th className="py-1.5 px-2 text-right font-medium">Toplam</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MONEY_ITEMS.filter(i => i.type === 'coin').map(item => (
                      <tr key={item.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-white dark:hover:bg-slate-800 transition-colors">
                        <td className="py-2 px-2 font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">{item.name}</td>
                        <td className="py-2 px-2">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleCountChange(item.id, (counts[item.id] || 0) - 1)}
                              className="w-7 h-7 flex items-center justify-center bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-md hover:bg-red-200 dark:hover:bg-red-900/60 active:scale-95 transition-all text-base font-bold leading-none"
                              tabIndex={-1}
                            >−</button>
                            <input
                              type="number"
                              min="0"
                              value={counts[item.id] || 0}
                              onChange={(e) => handleCountChange(item.id, parseInt(e.target.value) || 0)}
                              className="w-16 h-7 text-center border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 hide-arrows"
                            />
                            <button
                              onClick={() => handleCountChange(item.id, (counts[item.id] || 0) + 1)}
                              className="w-7 h-7 flex items-center justify-center bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-md hover:bg-green-200 dark:hover:bg-green-900/60 active:scale-95 transition-all text-base font-bold leading-none"
                              tabIndex={-1}
                            >+</button>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-right font-black text-cyan-700 dark:text-cyan-400">
                          ₺{((counts[item.id] || 0) * item.value).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Sabit Alt Kısım */}
          <div className="shrink-0 flex flex-col gap-3">
            {/* Özet Kartları */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/10 rounded-xl border border-orange-200 dark:border-orange-800/30 p-2 flex flex-col items-center justify-center">
                <span className="text-[11px] text-orange-800 dark:text-orange-400 uppercase font-black tracking-wider mb-0.5">Banknot Toplamı</span>
                <span className="text-xl font-bold text-orange-700 dark:text-orange-300">₺{banknotesTotal.toFixed(2)}</span>
              </div>
              <div className="flex-1 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800/30 p-2 flex flex-col items-center justify-center">
                <span className="text-[11px] text-blue-800 dark:text-blue-400 uppercase font-black tracking-wider mb-0.5">Madeni Para Toplamı</span>
                <span className="text-xl font-bold text-blue-700 dark:text-blue-300">₺{coinsTotal.toFixed(2)}</span>
              </div>
              <div className="flex-[1.5] bg-gradient-to-br from-cyan-500 to-blue-600 dark:from-cyan-700 dark:to-blue-900 rounded-xl border border-cyan-600 dark:border-cyan-800 p-2 flex flex-col items-center justify-center shadow-lg shadow-cyan-500/20">
                <span className="text-[11px] text-cyan-100 uppercase font-black tracking-widest mb-0.5">Genel Toplam</span>
                <span className="text-3xl font-black text-white drop-shadow-md">₺{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Aksiyon Butonları ve Not */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Icon name="tag" className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Sayımla ilgili not (isteğe bağlı)..."
                  className="w-full h-11 pl-9 pr-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-sm transition-all"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="px-5 h-11 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-sm active:scale-95"
                >
                  <Icon name="refresh" className="w-4 h-4" /> Sıfırla
                </button>
                <button
                  onClick={handlePrint}
                  className="px-5 h-11 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-sm active:scale-95"
                >
                  <Icon name="printer" className="w-4 h-4" /> Yazdır
                </button>
                <button
                  onClick={handleSaveCounting}
                  className="px-6 h-11 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-green-500/30 active:scale-95"
                >
                  <Icon name="check" className="w-4 h-4" /> Kaydet
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
      <style>{`
        .hide-arrows::-webkit-outer-spin-button,
        .hide-arrows::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      `}</style>
      </div>
  );
};

export default MoneyCounterView;
