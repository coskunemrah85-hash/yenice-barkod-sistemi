import React, { useState } from 'react';
// Eğer ikon kütüphanesi kullanıyorsan (örn: lucide-react), şuraya bir ikon ekleyebilirsin:
// import { Calculator } from 'lucide-react';

const CalculatorView: React.FC = () => {
  const [display, setDisplay] = useState<string>('0');
  const [equation, setEquation] = useState<string>('');

  const handleNumber = (num: string) => {
    if (display === '0' || display === 'Hata') {
      setDisplay(num);
    } else {
      setDisplay(display + num);
    }
  };

  const handleOperator = (op: string) => {
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
  };

  const handleEqual = () => {
    try {
      // eval() kullanımı basit hesap makineleri için yeterlidir ancak karmaşık projelerde dikkatli olunmalıdır.
      // eslint-disable-next-line no-eval
      const result = eval(equation + display);
      setDisplay(String(result));
      setEquation('');
    } catch (error) {
      setDisplay('Hata');
      setEquation('');
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
  };

  const handleDecimal = () => {
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handlePercentage = () => {
    setDisplay(String(parseFloat(display) / 100));
  };

  const toggleSign = () => {
    setDisplay(String(parseFloat(display) * -1));
  };

  const buttons = [
    { label: 'C', action: handleClear, className: 'col-span-2 bg-red-100 hover:bg-red-200 text-red-700' },
    { label: '%', action: handlePercentage, className: 'bg-slate-100 hover:bg-slate-200 text-slate-700' },
    { label: '÷', action: () => handleOperator('/'), className: 'bg-sky-100 hover:bg-sky-200 text-sky-700 font-bold' },
    { label: '7', action: () => handleNumber('7') },
    { label: '8', action: () => handleNumber('8') },
    { label: '9', action: () => handleNumber('9') },
    { label: '×', action: () => handleOperator('*'), className: 'bg-sky-100 hover:bg-sky-200 text-sky-700 font-bold' },
    { label: '4', action: () => handleNumber('4') },
    { label: '5', action: () => handleNumber('5') },
    { label: '6', action: () => handleNumber('6') },
    { label: '-', action: () => handleOperator('-'), className: 'bg-sky-100 hover:bg-sky-200 text-sky-700 font-bold' },
    { label: '1', action: () => handleNumber('1') },
    { label: '2', action: () => handleNumber('2') },
    { label: '3', action: () => handleNumber('3') },
    { label: '+', action: () => handleOperator('+'), className: 'bg-sky-100 hover:bg-sky-200 text-sky-700 font-bold' },
    { label: '+/-', action: toggleSign, className: 'bg-slate-100 hover:bg-slate-200 text-slate-700' },
    { label: '0', action: () => handleNumber('0') },
    { label: '.', action: handleDecimal },
    { label: '=', action: handleEqual, className: 'bg-sky-600 hover:bg-sky-700 text-white font-bold' },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="flex items-center gap-3 mb-8">
        {/* <Calculator className="w-8 h-8 text-sky-600" /> */}
        <h1 className="text-3xl font-bold text-slate-900">Hesap Makinesi</h1>
        <span className="text-sm bg-sky-100 text-sky-700 px-3 py-1 rounded-full">Yeni Özellik</span>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 max-w-sm mx-auto">
        {/* Ekran */}
        <div className="bg-slate-950 p-6 rounded-xl text-right mb-6 min-h-[110px] flex flex-col justify-end">
          <div className="text-sm text-slate-400 min-h-[20px]">{equation}</div>
          <div className="text-5xl font-extrabold text-white truncate">{display}</div>
        </div>

        {/* Butonlar */}
        <div className="grid grid-cols-4 gap-3">
          {buttons.map((btn, index) => (
            <button
              key={index}
              onClick={btn.action}
              className={`flex items-center justify-center text-xl h-16 rounded-xl transition-all duration-150 active:scale-95 
                ${btn.className || 'bg-slate-100 hover:bg-slate-200 text-slate-900'}`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="text-center text-xs text-slate-400 mt-10">Yenice Barkod Sistemi v1.0.7</div>
    </div>
  );
};

export default CalculatorView;