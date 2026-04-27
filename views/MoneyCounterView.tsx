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

interface MoneyCounterViewProps {
  counts: Record<string, number>;
  setCounts: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  creditCard: number;
  setCreditCard: React.Dispatch<React.SetStateAction<number>>;
  note: string;
  setNote: React.Dispatch<React.SetStateAction<string>>;
  history: Array<{ timestamp: string; total: number; note: string }>;
  setHistory: React.Dispatch<React.SetStateAction<Array<{ timestamp: string; total: number; note: string }>>>;
}

const MoneyCounterView: React.FC<MoneyCounterViewProps> = ({
  counts, setCounts, creditCard, setCreditCard, note, setNote, history, setHistory
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'counter' | 'history'>('counter');
  const [filterDate, setFilterDate] = useState('');
  const [filterNote, setFilterNote] = useState('');

  const handleCountChange = (id: string, value: number) => {
    setCounts(prev => ({
      ...prev,
      [id]: Math.max(0, value),
    }));
  };

  const total = useMemo(() => {
    const cashTotal = MONEY_ITEMS.reduce((sum, item) => {
      return sum + (counts[item.id] || 0) * item.value;
    }, 0);
    return cashTotal + (creditCard || 0);
  }, [counts, creditCard]);

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
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const dayName = days[now.getDay()];
    
    const timeString = now.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const dateString = now.toLocaleDateString('tr-TR');

    const newRecord = {
      timestamp: `${dateString} | ${timeString} | ${dayName}`,
      total,
      note: note || 'Not yok',
      details: {
        banknotes: banknotesTotal,
        coins: coinsTotal,
        card: creditCard
      }
    };

    setHistory(prev => [newRecord, ...prev]);

    // Kayıt sonrası sıfırla
    setCounts({});
    setCreditCard(0);
    setNote('');
    alert('Sayım başarıyla kaydedildi.');
  };

  const handleReset = () => {
    // Kullanıcı confirm çalışmıyor dediği için direkt sıfırlama yapıyoruz veya daha güvenli bir tetikleyici kullanıyoruz
    setCounts({});
    setCreditCard(0);
    setNote('');
  };

  const filteredHistory = history.filter(item => {
    const matchesDate = filterDate ? item.timestamp.includes(filterDate) : true;
    const matchesNote = filterNote ? item.note.toLowerCase().includes(filterNote.toLowerCase()) : true;
    return matchesDate && matchesNote;
  });

  const handleClearHistory = () => {
    setHistory([]);
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
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Header & Tabs */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 shrink-0">
        <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <Icon name="finance" className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 dark:text-white tracking-tight uppercase">Para Sayma & Kasa</h1>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Nakit ve Kart Kontrolü</p>
            </div>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveSubTab('counter')}
              className={`px-4 py-1.5 rounded-md text-[10px] font-black transition-all ${
                activeSubTab === 'counter' 
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                : 'text-slate-50 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              PARA SAYMA
            </button>
            <button
              onClick={() => setActiveSubTab('history')}
              className={`px-4 py-1.5 rounded-md text-[10px] font-black transition-all ${
                activeSubTab === 'history' 
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                : 'text-slate-50 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              KAYIT GEÇMİŞİ
            </button>
          </div>
        </div>
      </div>

      {/* İçerik */}
      <div className="flex-1 overflow-hidden p-2 lg:p-3 flex flex-col w-full gap-2">
        {activeSubTab === 'counter' ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm flex flex-col h-full gap-3 overflow-hidden">
            
            {/* 2-Column Grid for Tables */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0 overflow-hidden">
              
              {/* Banknotlar */}
              <div className="flex flex-col bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden h-fit">
                <div className="bg-slate-100 dark:bg-slate-800 py-1 px-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
                  <h3 className="font-bold text-slate-700 dark:text-slate-300 text-[10px] text-center uppercase tracking-widest">Banknotlar</h3>
                </div>
                <div className="p-1">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="text-slate-500 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800">
                        <th className="py-1 px-2 text-left font-bold uppercase tracking-wider">Birim</th>
                        <th className="py-1 px-2 text-center font-bold uppercase tracking-wider">Adet</th>
                        <th className="py-1 px-2 text-right font-bold uppercase tracking-wider">Toplam</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MONEY_ITEMS.filter(i => i.type === 'banknote').map(item => (
                        <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800/30 last:border-0 hover:bg-white dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-1 px-2 font-bold text-slate-900 dark:text-white">{item.name}</td>
                          <td className="py-1 px-2">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleCountChange(item.id, (counts[item.id] || 0) - 1)}
                                className="w-5 h-5 flex items-center justify-center bg-rose-500/10 text-rose-600 dark:text-rose-500 rounded hover:bg-rose-500/20 active:scale-95 transition-all text-xs font-bold"
                                tabIndex={-1}
                              >−</button>
                              <input
                                type="number"
                                min="0"
                                value={counts[item.id] || 0}
                                onChange={(e) => handleCountChange(item.id, parseInt(e.target.value) || 0)}
                                className="w-10 h-5 text-center border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold outline-none focus:border-emerald-500 text-[10px] hide-arrows"
                              />
                              <button
                                onClick={() => handleCountChange(item.id, (counts[item.id] || 0) + 1)}
                                className="w-5 h-5 flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 rounded hover:bg-emerald-500/20 active:scale-95 transition-all text-xs font-bold"
                                tabIndex={-1}
                              >+</button>
                            </div>
                          </td>
                          <td className="py-1 px-2 text-right font-bold text-slate-900 dark:text-emerald-500">
                            ₺{((counts[item.id] || 0) * item.value).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Madeni Paralar */}
              <div className="flex flex-col bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden h-fit">
                <div className="bg-slate-100 dark:bg-slate-800 py-1 px-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
                  <h3 className="font-bold text-slate-700 dark:text-slate-300 text-[10px] text-center uppercase tracking-widest">Madeni Paralar</h3>
                </div>
                <div className="p-1">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr className="text-slate-500 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800">
                        <th className="py-1 px-2 text-left font-bold uppercase tracking-wider">Birim</th>
                        <th className="py-1 px-2 text-center font-bold uppercase tracking-wider">Adet</th>
                        <th className="py-1 px-2 text-right font-bold uppercase tracking-wider">Toplam</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MONEY_ITEMS.filter(i => i.type === 'coin').map(item => (
                        <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800/30 last:border-0 hover:bg-white dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-1 px-2 font-bold text-slate-900 dark:text-white">{item.name}</td>
                          <td className="py-1 px-2">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleCountChange(item.id, (counts[item.id] || 0) - 1)}
                                className="w-5 h-5 flex items-center justify-center bg-rose-500/10 text-rose-600 dark:text-rose-500 rounded hover:bg-rose-500/20 active:scale-95 transition-all text-xs font-bold"
                                tabIndex={-1}
                              >−</button>
                              <input
                                type="number"
                                min="0"
                                value={counts[item.id] || 0}
                                onChange={(e) => handleCountChange(item.id, parseInt(e.target.value) || 0)}
                                className="w-10 h-5 text-center border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold outline-none focus:border-emerald-500 text-[10px] hide-arrows"
                              />
                              <button
                                onClick={() => handleCountChange(item.id, (counts[item.id] || 0) + 1)}
                                className="w-5 h-5 flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 rounded hover:bg-emerald-500/20 active:scale-95 transition-all text-xs font-bold"
                                tabIndex={-1}
                              >+</button>
                            </div>
                          </td>
                          <td className="py-1 px-2 text-right font-bold text-slate-900 dark:text-emerald-500">
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
            <div className="shrink-0 flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              
              {/* Kredi Kartı ve Özet Kartları */}
              <div className="flex flex-col md:flex-row gap-2">
                <div className="flex-[1.2] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-xl border border-indigo-500/20 p-2 flex flex-col justify-center">
                  <span className="text-[8px] text-indigo-600 dark:text-indigo-400 uppercase font-black tracking-widest flex items-center gap-2 px-1 mb-1">
                    <Icon name="reports" className="w-3 h-3" /> KREDİ KARTI
                  </span>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-500">₺</span>
                    <input 
                      type="number"
                      value={creditCard || ''}
                      onChange={(e) => setCreditCard(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full h-8 bg-white dark:bg-slate-950 border border-indigo-500/20 rounded pl-7 pr-3 text-sm font-black text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-800 px-3 py-0.5 flex justify-between items-center">
                    <span className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">Banknot</span>
                    <span className="text-[11px] font-bold text-slate-900 dark:text-white">₺{banknotesTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-800 px-3 py-0.5 flex justify-between items-center">
                    <span className="text-[8px] text-slate-500 uppercase font-bold tracking-widest">Madeni</span>
                    <span className="text-[11px] font-bold text-slate-900 dark:text-white">₺{coinsTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex-1 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-xl border border-emerald-500/20 p-2 flex flex-col items-center justify-center">
                  <span className="text-[8px] text-emerald-600 dark:text-emerald-400 uppercase font-black tracking-widest mb-0.5">Nakit Toplam</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">₺{(banknotesTotal + coinsTotal).toFixed(2)}</span>
                </div>

                <div className="flex-[1.3] bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-xl p-2 flex flex-col items-center justify-center shadow-lg border border-white/10">
                  <span className="text-[9px] text-emerald-100 uppercase font-bold tracking-[0.1em] mb-0.5">GENEL TOPLAM</span>
                  <span className="text-xl font-black text-white tabular-nums">₺{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Aksiyon Butonları ve Not */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icon name="reports" className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Not ekle..."
                    className="w-full h-8 pl-9 pr-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-500 outline-none text-[10px] transition-all"
                  />
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={handleReset}
                    className="px-3 h-8 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 font-bold rounded-lg transition-all flex items-center justify-center gap-2 text-[9px] uppercase tracking-wider"
                  >
                    Sıfırla
                  </button>
                  <button
                    onClick={handlePrint}
                    className="px-3 h-8 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 font-bold rounded-lg transition-all flex items-center justify-center gap-2 text-[9px] uppercase tracking-wider"
                  >
                    <Icon name="printer" className="w-3.5 h-3.5" /> Yazdır
                  </button>
                  <button
                    onClick={handleSaveCounting}
                    className="px-5 h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 text-[9px] uppercase tracking-wider shadow-sm"
                  >
                    Kaydet
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm flex flex-col h-full gap-3 overflow-hidden">
            <div className="flex flex-col md:flex-row items-center gap-3 shrink-0">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon name="calendar" className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Tarih Filtrele..."
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full h-8 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 text-[10px] outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon name="reports" className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Not İçinde Ara..."
                    value={filterNote}
                    onChange={(e) => setFilterNote(e.target.value)}
                    className="w-full h-8 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 text-[10px] outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <button
                onClick={handleClearHistory}
                className="px-3 h-8 bg-rose-500/10 text-rose-600 dark:text-rose-500 font-bold rounded-lg text-[9px] uppercase tracking-wider hover:bg-rose-500/20 transition-all"
              >
                TÜMÜNÜ SİL
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
              <div className="space-y-1.5">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((item, index) => (
                    <div key={index} className="bg-slate-50 dark:bg-slate-800/30 rounded-lg border border-slate-100 dark:border-slate-800 p-2.5 hover:border-emerald-500/30 transition-all group">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0">
                            <Icon name="finance" className="w-4 h-4 text-emerald-500" />
                          </div>
                          <div>
                            <div className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight">
                              {item.timestamp}
                            </div>
                            <div className="text-[9px] text-slate-500 font-medium italic mt-0.5">
                              "{item.note}"
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-[7px] text-slate-400 uppercase font-black tracking-[0.2em]">Toplam</div>
                            <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                              ₺{item.total.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-40 flex flex-col items-center justify-center text-slate-400">
                    <Icon name="reports" className="w-10 h-10 opacity-20 mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Kayıt Bulunamadı</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .hide-arrows::-webkit-outer-spin-button,
        .hide-arrows::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
        }
      `}</style>
    </div>
  );
};

export default MoneyCounterView;
