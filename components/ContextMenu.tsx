import React, { useEffect, useState, useRef } from 'react';
import Icon from './Icon';

interface ContextMenuOption {
  label: string;
  icon: string;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'success';
}

interface ContextMenuProps {
  options: ContextMenuOption[];
  onClose: () => void;
  position: { x: number; y: number };
}

const ContextMenu: React.FC<ContextMenuProps> = ({ options, onClose, position }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    // Calculate adjusted position to keep menu within viewport
    let x = position.x;
    let y = position.y;
    
    const menuWidth = 200; 
    const menuHeight = options.length * 40;
    
    if (x + menuWidth > window.innerWidth) x -= menuWidth;
    if (y + menuHeight > window.innerHeight) y -= menuHeight;
    
    setAdjustedPosition({ x, y });
  }, [position, options.length]);

  useEffect(() => {
    
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('scroll', onClose, true);

    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [options, onClose]);

  return (
    <div 
      ref={menuRef}
      className="fixed z-[9999] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden min-w-[200px] animate-in fade-in zoom-in duration-100"
      style={{ top: adjustedPosition.y, left: adjustedPosition.x }}
    >
      <div className="py-1">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => {
              option.onClick();
              onClose();
            }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors text-left ${
              option.variant === 'danger' 
                ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' 
                : option.variant === 'success'
                ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <Icon name={option.icon} className="w-4 h-4 opacity-70" />
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ContextMenu;
