import React, { useState, useEffect } from 'react';
import Icon from '../components/Icon';

interface CalculatorViewProps {
  display: string;
  setDisplay: React.Dispatch<React.SetStateAction<string>>;
  equation: string;
  setEquation: React.Dispatch<React.SetStateAction<string>>;
  previousValue: string;
  setPreviousValue: React.Dispatch<React.SetStateAction<string>>;
  operator: string;
  setOperator: React.Dispatch<React.SetStateAction<string>>;
  history: string[];
  setHistory: React.Dispatch<React.SetStateAction<string[]>>;
  rates: { USD: number; EUR: number; GA: number };
  prevRates: { USD: number; EUR: number; GA: number };
  loadingRates: boolean;
  onRefreshRates: () => Promise<void>;
}

const CalculatorView: React.FC<CalculatorViewProps> = ({
  display, setDisplay, equation, setEquation, previousValue, setPreviousValue, operator, setOperator, history, setHistory,
  rates, prevRates, loadingRates, onRefreshRates
}) => {
  const [convAmount, setConvAmount] = useState('');
  const [convType, setConvType] = useState<'USD' | 'EUR' | 'GA'>('USD');

  const safeCalculate = (leftOperand: string, op: string, rightOperand: string): number => {
    const left = parseFloat(leftOperand);
    const right = parseFloat(rightOperand);
    if (isNaN(left) || isNaN(right)) throw new Error('Geçersiz sayı');
    switch (op) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': 
        if (right === 0) throw new Error('Sıfıra bölünemez');
        return left / right;
      default: throw new Error('Geçersiz operatör');
    }
  };

  const handleNumber = (num: string) => {
    if (display === '0' || display === 'Hata') setDisplay(num);
    else setDisplay(display + num);
  };

  const handleBackspace = () => {
    setDisplay(prev => (prev === 'Hata' || prev.length <= 1) ? '0' : prev.slice(0, -1));
  };

  const handleOperator = (op: string) => {
    if (operator && display !== '0' && display !== 'Hata') {
      try {
        const result = safeCalculate(previousValue, operator, display);
        setDisplay(String(result));
        setPreviousValue(String(result));
      } catch {
        setDisplay('Hata');
        setPreviousValue('');
      }
    } else {
      setPreviousValue(display);
    }
    setOperator(op);
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
  };

  const handleEqual = () => {
    if (!operator || !previousValue) return;
    try {
      const result = safeCalculate(previousValue, operator, display);
      const historyString = `${previousValue} ${operator.replace('*', '×').replace('/', '÷')} ${display} = ${result}`;
      setHistory(prev => [historyString, ...prev].slice(0, 30));
      setDisplay(String(result));
      setEquation('');
      setPreviousValue('');
      setOperator('');
    } catch {
      setDisplay('Hata');
      setEquation('');
      setPreviousValue('');
      setOperator('');
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
    setPreviousValue('');
    setOperator('');
  };

  const handleDecimal = () => {
    if (!display.includes('.')) setDisplay(display + '.');
  };

  const handlePercentage = () => {
    const value = parseFloat(display);
    if (previousValue && operator) {
      const prevVal = parseFloat(previousValue);
      setDisplay(String((prevVal * value) / 100));
    } else {
      setDisplay(String(value / 100));
    }
  };

  const toggleSign = () => setDisplay(String(parseFloat(display) * -1));

  const copyToClipboard = () => {
    navigator.clipboard.writeText(display);
    alert('Sonuç kopyalandı!');
  };

  const handleVAT = (percent: number, add: boolean) => {
    const value = parseFloat(display);
    if (isNaN(value)) return;
    const result = add ? value * (1 + percent / 100) : value / (1 + percent / 100);
    setHistory(prev => [`${value} ${add ? '+ KDV' : '- KDV'} %${percent} = ${result.toFixed(2)}`, ...prev]);
    setDisplay(result.toFixed(2));
  };

  const handleConvert = () => {
    const val = parseFloat(convAmount);
    if (isNaN(val)) return;
    const result = (val * rates[convType]).toFixed(2);
    setDisplay(result);
    setHistory(prev => [`${val} ${convType} x ${rates[convType]} = ${result} TL`, ...prev]);
  };

  const copyRateToCalc = (rate: number) => setDisplay(String(rate));

  const buttons = [
    { label: 'C', action: handleClear, className: 'text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 font-bold' },
    { label: '⌫', action: handleBackspace, className: 'text-orange-600 bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 dark:text-orange-400 font-bold' },
    { label: '%', action: handlePercentage, className: 'text-indigo-600 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-400 font-bold' },
    { label: '÷', action: () => handleOperator('/'), className: 'text-indigo-600 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-400 font-bold text-2xl' },
    { label: '7', action: () => handleNumber('7') },
    { label: '8', action: () => handleNumber('8') },
    { label: '9', action: () => handleNumber('9') },
    { label: '×', action: () => handleOperator('*'), className: 'text-indigo-600 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-400 font-bold text-2xl' },
    { label: '4', action: () => handleNumber('4') },
    { label: '5', action: () => handleNumber('5') },
    { label: '6', action: () => handleNumber('6') },
    { label: '-', action: () => handleOperator('-'), className: 'text-indigo-600 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-400 font-bold text-2xl' },
    { label: '1', action: () => handleNumber('1') },
    { label: '2', action: () => handleNumber('2') },
    { label: '3', action: () => handleNumber('3') },
    { label: '+', action: () => handleOperator('+'), className: 'text-indigo-600 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-400 font-bold text-2xl' },
    { label: '0', action: () => handleNumber('0') },
    { label: '00', action: () => handleNumber('00') },
    { label: '000', action: () => handleNumber('000') },
    { label: '.', action: handleDecimal, className: 'font-bold text-2xl' },
    { label: '+/-', action: toggleSign, className: 'bg-slate-100 hover:bg-slate-200 text-slate-700' },
    { label: '=', action: handleEqual, className: 'col-span-3 bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600 text-white font-bold text-2xl shadow-lg shadow-indigo-500/30 dark:shadow-none border-0' },
  ];

  const quickVatButtons = [
    { label: '+%1', percent: 1, add: true, color: 'emerald' },
    { label: '+%10', percent: 10, add: true, color: 'emerald' },
    { label: '+%20', percent: 20, add: true, color: 'emerald' },
    { label: '-%1', percent: 1, add: false, color: 'rose' },
    { label: '-%10', percent: 10, add: false, color: 'rose' },
    { label: '-%20', percent: 20, add: false, color: 'rose' },
  ];

  return (
    <div className="w-full h-full flex flex-col xl:flex-row bg-slate-50 dark:bg-[#020617] p-2 lg:p-4 gap-4 overflow-hidden">
      {/* Sol Panel - Canlı Piyasalar */}
      <div className="flex flex-col w-full xl:w-64 shrink-0 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-[10px] font-black text-slate-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Canlı Piyasalar
            </h2>
            <button onClick={onRefreshRates} className={`p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all ${loadingRates ? 'animate-spin' : ''}`}>
              <Icon name="refresh" className="w-3 h-3 text-slate-400" />
            </button>
          </div>
          <div className="grid grid-cols-3 xl:grid-cols-1 gap-2">
            {[
              { id: 'USD' as const, label: 'DOLAR', val: rates.USD, prev: prevRates.USD, icon: 'finance', color: 'text-emerald-500' },
              { id: 'EUR' as const, label: 'EURO', val: rates.EUR, prev: prevRates.EUR, icon: 'finance', color: 'text-indigo-500' },
              { id: 'GA' as const, label: 'GR ALTIN', val: rates.GA, prev: prevRates.GA, icon: 'tag', color: 'text-amber-500' },
            ].map((m) => {
              const trend = m.val > m.prev ? 'up' : m.val < m.prev ? 'down' : 'stable';
              return (
                <div key={m.id} onClick={() => copyRateToCalc(m.val)} className="group p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl cursor-pointer hover:border-amber-500/50 transition-all active:scale-95">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{m.label}</span>
                    <div className="flex items-center gap-1">
                      {trend === 'up' && <span className="text-[10px] text-emerald-500">▲</span>}
                      {trend === 'down' && <span className="text-[10px] text-rose-500">▼</span>}
                      <Icon name={m.icon as any} className={`w-3 h-3 ${m.color}`} />
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="text-sm font-black text-slate-900 dark:text-white tabular-nums">₺{m.val.toFixed(2)}</div>
                    {trend !== 'stable' && (
                      <div className={`text-[8px] font-bold ${trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {trend === 'up' ? '+' : ''}{(m.val - m.prev).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-[9px] font-black text-slate-500 uppercase mb-3 tracking-widest">Hızlı Dönüştürücü</h3>
            <div className="flex flex-col gap-2">
              <div className="flex gap-1">
                {['USD', 'EUR', 'GA'].map((t) => (
                  <button key={t} onClick={() => setConvType(t as any)} className={`flex-1 py-1 rounded text-[9px] font-black transition-all ${convType === t ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}>{t}</button>
                ))}
              </div>
              <input type="number" value={convAmount} onChange={(e) => setConvAmount(e.target.value)} placeholder="Miktar girin..." className="w-full h-8 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 text-[10px] outline-none focus:border-amber-500" />
              <button onClick={handleConvert} className="w-full h-8 bg-slate-900 dark:bg-slate-800 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-sm">Hesapla & Aktar</button>
            </div>
          </div>
        </div>
      </div>
      {/* Orta Panel - Hesap Makinesi */}
      <div className="flex-1 flex flex-col max-w-[320px] mx-auto w-full gap-3">
        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col gap-3">
          <div className="bg-slate-900 dark:bg-slate-950 p-4 rounded-xl text-right min-h-[90px] flex flex-col justify-end shadow-inner relative group overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-blue-500 opacity-30"></div>
            <button onClick={copyToClipboard} className="absolute top-2 left-2 p-1.5 bg-white/5 hover:bg-white/10 rounded-md text-slate-400 hover:text-white transition-all opacity-0 group-hover:opacity-100"><Icon name="copy" className="w-3.5 h-3.5" /></button>
            <div className="text-[10px] text-slate-500 min-h-[14px] font-mono tracking-wider">{equation}</div>
            <div className="text-3xl font-black text-white truncate tracking-tight mt-1 tabular-nums">{display}</div>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {buttons.map((btn, index) => (
              <button key={index} onClick={btn.action} className={`flex items-center justify-center text-sm lg:text-base h-10 lg:h-12 rounded-xl transition-all duration-150 active:scale-95 border border-transparent ${btn.className || 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 dark:border-slate-700/50 font-bold'} ${btn.label === '=' ? 'col-span-3' : ''}`}>{btn.label}</button>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-3 px-1"><Icon name="finance" className="w-3.5 h-3.5 text-indigo-500" /><h3 className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Hızlı KDV İşlemleri</h3></div>
          <div className="grid grid-cols-3 gap-2">
            {quickVatButtons.map((btn, idx) => (
              <button key={idx} onClick={() => handleVAT(btn.percent, btn.add)} className={`h-9 rounded-lg text-[10px] font-black transition-all active:scale-95 border ${btn.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20'}`}>{btn.label}</button>
            ))}
          </div>
        </div>
      </div>
      {/* Sağ Panel - Geçmiş */}
      <div className="hidden lg:flex flex-1 flex-col max-w-sm w-full bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-tight"><Icon name="list-bullet" className="w-4 h-4 text-indigo-500" /> İŞLEM GEÇMİŞİ</h2>
          {history.length > 0 && <button onClick={() => setHistory([])} className="text-[9px] font-black text-rose-500 hover:text-rose-700 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded transition-colors uppercase">Temizle</button>}
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50"><Icon name="refresh" className="w-8 h-8 mb-2" /><p className="text-[10px] font-bold uppercase tracking-widest">Henüz işlem yok</p></div>
          ) : (
            history.map((item, idx) => (
              <div key={idx} className="text-right p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 font-mono text-sm shadow-sm hover:border-indigo-500/30 transition-all group">
                <div className="text-[8px] text-slate-400 mb-0.5 opacity-0 group-hover:opacity-100 transition-all uppercase font-bold">İşlem #{history.length - idx}</div>{item}
              </div>
            ))
          )}
        </div>
      </div>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; } .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; }`}</style>
    </div>
  );
};

export default CalculatorView;
