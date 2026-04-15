import React, { useState, useEffect } from 'react';
import Icon from '../components/Icon';

const CalculatorView: React.FC = () => {
  const [display, setDisplay] = useState<string>('0');
  const [equation, setEquation] = useState<string>('');
  const [previousValue, setPreviousValue] = useState<string>('');
  const [operator, setOperator] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);

  // Güvenli matematik hesaplayıcı (eval() alternatifi)
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
    if (display === '0' || display === 'Hata') {
      setDisplay(num);
    } else {
      setDisplay(display + num);
    }
  };

  const handleBackspace = () => {
    setDisplay(prev => {
      if (prev === 'Hata' || prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
  };

  const handleOperator = (op: string) => {
    if (operator && display !== '0' && display !== 'Hata') {
      // Eğer zaten bir operatör varsa, önce hesapla
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
      
      // Geçmişe ekle
      const historyString = `${previousValue} ${operator.replace('*', '×').replace('/', '÷')} ${display} = ${result}`;
      setHistory(prev => [historyString, ...prev].slice(0, 30)); // Son 30 işlemi tut
      
      setDisplay(String(result));
      setEquation('');
      setPreviousValue('');
      setOperator('');
    } catch (error) {
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
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handlePercentage = () => {
    const value = parseFloat(display);
    if (previousValue && operator) {
      // Calcular percentual relativo ao valor anterior
      const prevVal = parseFloat(previousValue);
      const result = (prevVal * value) / 100;
      setDisplay(String(result));
    } else {
      setDisplay(String(value / 100));
    }
  };

  const toggleSign = () => {
    setDisplay(String(parseFloat(display) * -1));
  };

  // Klavye Desteği
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      if (key >= '0' && key <= '9') handleNumber(key);
      else if (key === '.') handleDecimal();
      else if (key === 'Enter' || key === '=') {
        e.preventDefault(); // Butonlara yanlışlıkla basılmasını engeller
        handleEqual();
      }
      else if (key === 'Backspace') handleBackspace();
      else if (key === 'Escape') handleClear();
      else if (key === '+' || key === '-') handleOperator(key);
      else if (key === '*') handleOperator('*');
      else if (key === '/') handleOperator('/');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [display, equation, previousValue, operator]);

  const buttons = [
    { label: 'C', action: handleClear, className: 'text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 font-bold' },
    { label: '⌫', action: handleBackspace, className: 'text-orange-600 bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 dark:text-orange-400 font-bold' },
    { label: '%', action: handlePercentage, className: 'text-sky-600 bg-sky-100 hover:bg-sky-200 dark:bg-sky-900/30 dark:hover:bg-sky-900/50 dark:text-sky-400 font-bold' },
    { label: '÷', action: () => handleOperator('/'), className: 'text-sky-600 bg-sky-100 hover:bg-sky-200 dark:bg-sky-900/30 dark:hover:bg-sky-900/50 dark:text-sky-400 font-bold text-2xl' },
    { label: '7', action: () => handleNumber('7') },
    { label: '8', action: () => handleNumber('8') },
    { label: '9', action: () => handleNumber('9') },
    { label: '×', action: () => handleOperator('*'), className: 'text-sky-600 bg-sky-100 hover:bg-sky-200 dark:bg-sky-900/30 dark:hover:bg-sky-900/50 dark:text-sky-400 font-bold text-2xl' },
    { label: '4', action: () => handleNumber('4') },
    { label: '5', action: () => handleNumber('5') },
    { label: '6', action: () => handleNumber('6') },
    { label: '-', action: () => handleOperator('-'), className: 'text-sky-600 bg-sky-100 hover:bg-sky-200 dark:bg-sky-900/30 dark:hover:bg-sky-900/50 dark:text-sky-400 font-bold text-2xl' },
    { label: '1', action: () => handleNumber('1') },
    { label: '2', action: () => handleNumber('2') },
    { label: '3', action: () => handleNumber('3') },
    { label: '+', action: () => handleOperator('+'), className: 'text-sky-600 bg-sky-100 hover:bg-sky-200 dark:bg-sky-900/30 dark:hover:bg-sky-900/50 dark:text-sky-400 font-bold text-2xl' },
    { label: '+/-', action: toggleSign, className: 'bg-slate-100 hover:bg-slate-200 text-slate-700' },
    { label: '0', action: () => handleNumber('0') },
    { label: '.', action: handleDecimal, className: 'font-bold text-2xl' },
    { label: '=', action: handleEqual, className: 'bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-2xl shadow-lg shadow-cyan-500/30 dark:shadow-none border-0' },
  ];

  return (
    <div className="w-full h-full flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-900 p-4 lg:p-8 gap-6 overflow-hidden">
      
      {/* Sol Taraf - Hesap Makinesi */}
      <div className="flex-1 flex flex-col max-w-sm mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-xl">
            <Icon name="finance" className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Hesap Makinesi</h1>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 lg:p-6 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-4">
          {/* Ekran */}
          <div className="bg-slate-900 dark:bg-slate-950 p-5 rounded-2xl text-right min-h-[110px] flex flex-col justify-end shadow-inner relative overflow-hidden">
            {/* Arka plan süsü */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-50"></div>
            
            <div className="text-sm text-slate-400 min-h-[20px] font-mono tracking-wider">{equation}</div>
            <div className="text-5xl font-black text-white truncate tracking-tight mt-1">{display}</div>
          </div>

          {/* Butonlar */}
          <div className="grid grid-cols-4 gap-2 lg:gap-3">
            {buttons.map((btn, index) => (
              <button
                key={index}
                onClick={btn.action}
                className={`flex items-center justify-center text-xl h-14 lg:h-16 rounded-2xl transition-all duration-150 active:scale-90 border border-transparent
                  ${btn.className || 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 dark:border-slate-600/50'}`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sağ Taraf - Geçmiş (Geniş Ekranlarda Görünür) */}
      <div className="hidden lg:flex flex-1 flex-col max-w-sm w-full bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Icon name="list-bullet" className="w-5 h-5 text-cyan-500" /> 
            İşlem Geçmişi
          </h2>
          {history.length > 0 && (
            <button 
              onClick={() => setHistory([])} 
              className="text-xs font-semibold text-red-500 hover:text-red-700 dark:hover:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              Temizle
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 opacity-70">
              <Icon name="refresh" className="w-12 h-12 mb-3" />
              <p className="text-sm font-medium">Henüz bir işlem yapılmadı</p>
            </div>
          ) : (
            history.map((item, idx) => (
              <div 
                key={idx} 
                className="text-right p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 rounded-xl text-slate-700 dark:text-slate-300 font-mono text-base shadow-sm hover:border-cyan-200 dark:hover:border-cyan-800 transition-colors"
              >
                {item}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CalculatorView;
