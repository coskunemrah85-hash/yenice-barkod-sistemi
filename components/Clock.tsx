import React, { useState, useEffect } from 'react';

const Clock: React.FC = () => {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => {
      setDate(new Date());
    }, 1000);

    return () => {
      clearInterval(timerId);
    };
  }, []);

  return (
    <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200/80 dark:border-blue-800 shadow-sm rounded-lg p-1.5 px-3 text-right">
      <p className="font-mono text-lg font-bold text-blue-800 dark:text-blue-300">
        {date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
      <p className="text-xs text-blue-600 dark:text-blue-400">
        {date.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
  );
};

export default Clock;