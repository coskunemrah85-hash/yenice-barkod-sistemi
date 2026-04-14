import React, { useState, useRef, useEffect } from 'react';
import Icon from './Icon';

interface Item {
    id: string;
    name: string;
}

interface EditableListItemProps {
    item: Item;
    onUpdate: (id: string, newName: string) => void;
    onDelete: (id: string) => void;
    children?: React.ReactNode;
    level?: number;
    onAddChild?: (parentId: string, name: string) => void;
    maxLevel?: number;
}

const EditableListItem: React.FC<EditableListItemProps> = ({ item, onUpdate, onDelete, children, level = 0, onAddChild, maxLevel=2 }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(item.name);
    const inputRef = useRef<HTMLInputElement>(null);
    const [showAddChild, setShowAddChild] = useState(false);
    const [newChildName, setNewChildName] = useState('');

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing]);
    
    useEffect(() => {
        setName(item.name);
    }, [item.name]);

    const handleBlur = () => {
        if (name.trim() && name.trim() !== item.name) {
            onUpdate(item.id, name.trim());
        } else {
            setName(item.name);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBlur();
        } else if (e.key === 'Escape') {
            setName(item.name);
            setIsEditing(false);
        }
    };
    
    const handleAddChildSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newChildName.trim() && onAddChild) {
            onAddChild(item.id, newChildName.trim());
            setNewChildName('');
            setShowAddChild(false);
        }
    };

    return (
        <li 
            className="flex flex-col"
            style={{ marginLeft: `${level * 20}px`}}
        >
            <div 
                className="group flex items-center justify-between p-2 rounded-md hover:bg-slate-100 transition-colors"
                onDoubleClick={() => setIsEditing(true)}
            >
                {isEditing ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        className="flex-grow bg-white border border-cyan-500 rounded-md px-2 py-1 -m-1"
                    />
                ) : (
                    <span className="flex-grow cursor-pointer select-none">{item.name}</span>
                )}
                <div className="flex items-center">
                     {onAddChild && level < maxLevel && (
                        <button
                            onClick={() => setShowAddChild(prev => !prev)}
                            className="p-2 text-slate-400 hover:text-green-600 rounded-full"
                            title="Alt grup ekle"
                        >
                            <Icon name="plus" className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={() => onDelete(item.id)}
                        className="p-2 text-slate-400 hover:text-red-600 rounded-full"
                        title="Sil"
                    >
                        <Icon name="trash" className="w-4 h-4" />
                    </button>
                </div>
            </div>
             {showAddChild && (
                <form onSubmit={handleAddChildSubmit} className="pl-6 py-2 flex gap-2 items-center">
                    <input 
                        value={newChildName} 
                        onChange={e => setNewChildName(e.target.value)} 
                        placeholder={`${item.name} için alt grup`}
                        className="input-style flex-grow"
                        autoFocus
                    />
                    <button type="submit" className="btn-primary-sm">Ekle</button>
                    <button type="button" onClick={() => setShowAddChild(false)} className="btn-secondary-sm">İptal</button>
                </form>
            )}
             {children && <ul className="pl-4">{children}</ul>}
             <style>{`
                .input-style { border: 1px solid #cbd5e1; border-radius: 0.5rem; padding: 0.4rem 0.75rem; transition: all 0.2s; height: 36px; }
                .input-style:focus { outline: none; box-shadow: 0 0 0 2px #e0f2fe, 0 0 0 4px #0ea5e9; border-color: #0ea5e9; }
                .btn-primary-sm { background-color: #0ea5e9; color: white; font-weight: 600; border-radius: 0.5rem; padding: 0 1rem; transition: all 0.2s; height: 36px; }
                .btn-primary-sm:hover { background-color: #0284c7; }
                .btn-secondary-sm { background-color: #f1f5f9; border: 1px solid #cbd5e1; color: #334155; font-weight: 600; border-radius: 0.5rem; padding: 0 1rem; transition: all 0.2s; height: 36px; }
                .btn-secondary-sm:hover { background-color: #e2e8f0; }
             `}</style>
        </li>
    );
};

export default EditableListItem;