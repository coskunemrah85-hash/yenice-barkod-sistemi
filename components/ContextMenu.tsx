import React, { useEffect, useState, useRef } from 'react';
import Icon from './Icon';

interface ContextMenuOption {
  label?: string;
  icon?: string;
  onClick?: () => void;
  variant?: 'default' | 'danger' | 'success';
  isSeparator?: boolean;
}

interface ContextMenuProps {
  options: ContextMenuOption[];
  onClose: () => void;
  position: { x: number; y: number };
}

const ContextMenu: React.FC<ContextMenuProps> = ({ options, onClose, position }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState({ x: -999, y: -999 });

  useEffect(() => {
    const calculatePosition = () => {
      let x = position.x;
      let y = position.y;
      
      const menuWidth = 220; 
      // Approximate height: each item ~40px + separators ~10px
      const menuHeight = options.reduce((acc, opt) => acc + (opt.isSeparator ? 10 : 40), 10);
      
      // Horizontal adjustment
      if (x + menuWidth > window.innerWidth) {
        x = window.innerWidth - menuWidth - 10;
      }
      
      // Vertical adjustment
      if (y + menuHeight > window.innerHeight) {
        y = window.innerHeight - menuHeight - 10;
      }

      // Final safety check
      x = Math.max(10, x);
      y = Math.max(10, y);
      
      setAdjustedPosition({ x, y });
    };

    calculatePosition();
  }, [position, options]);

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
      className="fixed z-[9999] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden min-w-[170px] animate-in fade-in zoom-in duration-100"
      style={{ top: adjustedPosition.y, left: adjustedPosition.x }}
    >
      <div className="py-0.5">
        {options.map((option, index) => {
          if (option.isSeparator) {
            return <div key={`sep-${index}`} className="my-0.5 border-t border-slate-100 dark:border-slate-700" />;
          }
          
          return (
            <button
              key={index}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (option.onClick) option.onClick();
                onClose();
              }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold transition-colors text-left ${
                option.variant === 'danger' 
                  ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' 
                  : option.variant === 'success'
                  ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Icon name={(option.icon || 'circle') as any} className="w-3.5 h-3.5 opacity-70" />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ContextMenu;
