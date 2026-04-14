import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Brand, Model, Color, Size, Group, Supplier, AITaskSupplier, Product, Customer } from '../types';
import Icon from '../components/Icon';
import SupplierEditModal from '../components/SupplierEditModal';
import AiSupplierModal from '../components/AiSupplierModal';
import AiSupplierReviewModal from '../components/AiSupplierReviewModal';
import { extractSuppliersFromContent } from '../services/geminiService';
import EditableListItem from '../components/EditableListItem';
import CustomerEditModal from '../components/CustomerEditModal';

type Tab = 'brands' | 'models' | 'colors' | 'sizes' | 'groups' | 'suppliers' | 'customers';

// @ts-ignore
const XLSX = window.XLSX;

interface Definitions {
    brands: Brand[];
    models: Model[];
    colors: Color[];
    sizes: Size[];
    groups: Group[];
}

interface DefinitionsViewProps {
  definitions: Definitions;
  suppliers: Supplier[];
  customers: Customer[];
  products: Product[];
  onUpdateBrands: (brands: Brand[]) => void;
  onUpdateModels: (models: Model[]) => void;
  onUpdateColors: (colors: Color[]) => void;
  onUpdateSizes: (sizes: Size[]) => void;
  onUpdateGroups: (groups: Group[]) => void;
  onUpdateSuppliers: (suppliers: Supplier[]) => void;
  onUpdateCustomers: (customers: Customer[]) => void;
}

const DefinitionSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">{title}</h3>
        {children}
    </div>
);

const DefinitionsView: React.FC<DefinitionsViewProps> = (props) => {
    const { definitions, suppliers, customers, products, onUpdateBrands, onUpdateModels, onUpdateColors, onUpdateSizes, onUpdateGroups, onUpdateSuppliers, onUpdateCustomers } = props;
    const [activeTab, setActiveTab] = useState<Tab>('brands');
    
    const [brandName, setBrandName] = useState('');
    const [modelName, setModelName] = useState('');
    const [selectedBrandIdForModel, setSelectedBrandIdForModel] = useState('');
    const [colorName, setColorName] = useState('');
    const [sizeName, setSizeName] = useState('');

    // Group states
    const [groupName, setGroupName] = useState('');
    const [selectedBrandIdForGroup, setSelectedBrandIdForGroup] = useState<string>('__general__');


    // Supplier states
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

    // Customer states
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

    // AI & Excel states for Suppliers
    const [isAiSupplierModalOpen, setIsAiSupplierModalOpen] = useState(false);
    const [reviewingAiSupplierTask, setReviewingAiSupplierTask] = useState<AITaskSupplier | null>(null);
    const [isAiSupplierReviewModalOpen, setIsAiSupplierReviewModalOpen] = useState(false);
    const [isExcelMenuOpen, setIsExcelMenuOpen] = useState(false);
    const excelInputRef = useRef<HTMLInputElement>(null);
    const excelMenuRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (excelMenuRef.current && !excelMenuRef.current.contains(event.target as Node)) {
            setIsExcelMenuOpen(false);
          }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- ADD HANDLERS ---
    const handleAddBrand = (e: React.FormEvent) => {
        e.preventDefault();
        if (brandName.trim() && !definitions.brands.some(b => b.name.toLowerCase() === brandName.trim().toLowerCase())) {
            onUpdateBrands([...definitions.brands, { id: Date.now().toString(), name: brandName.trim() }]);
            setBrandName('');
        }
    };
    const handleAddModel = (e: React.FormEvent) => {
        e.preventDefault();
        if (modelName.trim() && selectedBrandIdForModel) {
            onUpdateModels([...definitions.models, { id: Date.now().toString(), name: modelName.trim(), brandId: selectedBrandIdForModel }]);
            setModelName('');
        }
    };
    const handleAddColor = (e: React.FormEvent) => {
        e.preventDefault();
        if (colorName.trim() && !definitions.colors.some(c => c.name.toLowerCase() === colorName.trim().toLowerCase())) {
            onUpdateColors([...definitions.colors, { id: Date.now().toString(), name: colorName.trim() }]);
            setColorName('');
        }
    };
    const handleAddSize = (e: React.FormEvent) => {
        e.preventDefault();
        if (sizeName.trim() && !definitions.sizes.some(s => s.name.toLowerCase() === sizeName.trim().toLowerCase())) {
            onUpdateSizes([...definitions.sizes, { id: Date.now().toString(), name: sizeName.trim() }]);
            setSizeName('');
        }
    };
    const handleAddGroup = (e: React.FormEvent, parentId: string | null) => {
        e.preventDefault();
        if (groupName.trim()) {
            const brandId = selectedBrandIdForGroup === '__general__' ? null : selectedBrandIdForGroup;
            onUpdateGroups([...definitions.groups, { id: Date.now().toString(), name: groupName.trim(), parentId, brandId }]);
            setGroupName('');
        }
    };

    const handleAddSubGroup = (parentId: string, name: string) => {
        const brandId = selectedBrandIdForGroup === '__general__' ? null : selectedBrandIdForGroup;
        onUpdateGroups([...definitions.groups, { id: Date.now().toString(), name: name.trim(), parentId, brandId }]);
    };

    // --- UPDATE HANDLERS ---
    const handleUpdateBrand = (id: string, newName: string) => {
        onUpdateBrands(definitions.brands.map(b => b.id === id ? { ...b, name: newName } : b));
    };
    const handleUpdateModel = (id: string, newName: string) => {
        onUpdateModels(definitions.models.map(m => m.id === id ? { ...m, name: newName } : m));
    };
    const handleUpdateColor = (id: string, newName: string) => {
        onUpdateColors(definitions.colors.map(c => c.id === id ? { ...c, name: newName } : c));
    };
    const handleUpdateSize = (id: string, newName: string) => {
        onUpdateSizes(definitions.sizes.map(s => s.id === id ? { ...s, name: newName } : s));
    };
    const handleUpdateGroup = (id: string, newName: string) => {
        onUpdateGroups(definitions.groups.map(g => g.id === id ? { ...g, name: newName } : g));
    };

    const handleUpdateSupplier = (supplier: Partial<Supplier>) => {
        if (!supplier.id) { // Adding new
            const newSupplier = { ...supplier, id: `sup-${Date.now()}` } as Supplier;
            onUpdateSuppliers([...suppliers, newSupplier]);
        } else { // Updating existing
            onUpdateSuppliers(suppliers.map(s => s.id === supplier.id ? { ...s, ...supplier } : s));
        }
        setEditingSupplier(null);
        setIsSupplierModalOpen(false);
    };

    const handleUpdateCustomer = (customer: Partial<Customer>) => {
        if (!customer.id) { // Adding new
            const newCustomer = { ...customer, id: `cust-${Date.now()}` } as Customer;
            onUpdateCustomers([...customers, newCustomer]);
        } else { // Updating existing
            onUpdateCustomers(customers.map(c => c.id === customer.id ? { ...c, ...customer } : c));
        }
        setEditingCustomer(null);
        setIsCustomerModalOpen(false);
    };


    // --- DELETE HANDLERS ---
    const handleDeleteBrand = (id: string) => {
        if (products.some(p => p.marka === definitions.brands.find(b => b.id === id)?.name)) {
            alert("Bu marka ürünlerde kullanıldığı için silinemez."); return;
        }
        onUpdateBrands(definitions.brands.filter(b => b.id !== id));
    };
    const handleDeleteModel = (id: string) => {
        if (products.some(p => p.model === definitions.models.find(m => m.id === id)?.name)) {
            alert("Bu model ürünlerde kullanıldığı için silinemez."); return;
        }
        onUpdateModels(definitions.models.filter(m => m.id !== id));
    };
    const handleDeleteColor = (id: string) => {
        if (products.some(p => p.renk === definitions.colors.find(c => c.id === id)?.name)) {
            alert("Bu renk ürünlerde kullanıldığı için silinemez."); return;
        }
        onUpdateColors(definitions.colors.filter(c => c.id !== id));
    };
    const handleDeleteSize = (id: string) => {
        if (products.some(p => p.beden === definitions.sizes.find(s => s.id === id)?.name)) {
            alert("Bu beden ürünlerde kullanıldığı için silinemez."); return;
        }
        onUpdateSizes(definitions.sizes.filter(s => s.id !== id));
    };
     const handleDeleteGroup = (id: string) => {
        onUpdateGroups(definitions.groups.filter(g => g.id !== id));
    };
    const handleDeleteSupplier = (id: string) => {
        if(products.some(p => p.supplierId === id)) {
            alert("Bu tedarikçi ürünlerde kullanıldığı için silinemez."); return;
        }
        onUpdateSuppliers(suppliers.filter(s => s.id !== id));
    };
     const handleDeleteCustomer = (id: string) => {
        // Here you might check sales history if customers are linked to sales
        onUpdateCustomers(customers.filter(c => c.id !== id));
    };

    // --- AI & Excel ---
    const handleStartAiSupplierTask = async (file: File, prompt: string) => {
        const taskId = `task-supplier-${Date.now()}`;
        const newTask: AITaskSupplier = { id: taskId, fileName: file.name, status: 'processing' };
        setReviewingAiSupplierTask(newTask);
        setIsAiSupplierReviewModalOpen(true);

        try {
            const results = await extractSuppliersFromContent(file, prompt);
            const completedTask = { ...newTask, status: 'completed' as const, results };
            setReviewingAiSupplierTask(completedTask);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu.';
            setReviewingAiSupplierTask({ ...newTask, status: 'error', error: errorMessage });
        }
    };
    
    const handleCommitAiSupplierResults = (taskId: string, suppliersToCommit: Partial<Supplier>[]) => {
        const newSuppliers = suppliersToCommit.map(s => ({...s, id: `sup-${Date.now()}-${Math.random()}` } as Supplier));
        onUpdateSuppliers([...suppliers, ...newSuppliers]);
        setIsAiSupplierReviewModalOpen(false);
        setReviewingAiSupplierTask(null);
    };

    const handleDismissAiSupplierTask = () => {
        setIsAiSupplierReviewModalOpen(false);
        setReviewingAiSupplierTask(null);
    };

     const handleExcelUploadClick = () => {
        excelInputRef.current?.click();
        setIsExcelMenuOpen(false);
    };

    const handleExcelFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = event.target?.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                if (json.length < 2) throw new Error("Dosya boş veya geçersiz.");
                
                const headers: string[] = json[0].map((h: any) => String(h).trim().toLowerCase());
                const nameIndex = headers.indexOf("tedarikçi ünvanı");
                
                if (nameIndex === -1) throw new Error("Dosyada 'Tedarikçi Ünvanı' sütunu bulunamadı.");

                const newSuppliers: Supplier[] = json.slice(1).map((row: any[]) => ({
                    id: `sup-excel-${Date.now()}-${Math.random()}`,
                    name: String(row[nameIndex] || ''),
                    code: String(row[headers.indexOf("cari kodu")] || ''),
                    firstName: String(row[headers.indexOf("adı")] || ''),
                    lastName: String(row[headers.indexOf("soyadı")] || ''),
                    district: String(row[headers.indexOf("ilçesi")] || ''),
                    city: String(row[headers.indexOf("ili")] || ''),
                    mobilePhone: String(row[headers.indexOf("cep telefonu")] || ''),
                    email: String(row[headers.indexOf("email")] || ''),
                    group: String(row[headers.indexOf("grubu")] || ''),
                    taxOffice: String(row[headers.indexOf("vergi dairesi")] || ''),
                    taxNumber: String(row[headers.indexOf("vergi no")] || ''),
                    nationalId: String(row[headers.indexOf("t.c no")] || ''),
                    whatsapp: String(row[headers.indexOf("whatsapp")] || ''),
                })).filter(s => s.name.trim() !== '');

                onUpdateSuppliers([...suppliers, ...newSuppliers]);
                alert(`${newSuppliers.length} tedarikçi başarıyla eklendi.`);

            } catch (err: any) {
                alert(`Excel dosyası işlenirken hata oluştu: ${err.message}`);
            }
        };
        reader.readAsArrayBuffer(file);
         if (e.target) e.target.value = '';
    };

    const handleDownloadTemplate = () => {
        const headers = ["Tedarikçi Ünvanı", "Cari Kodu", "Adı", "Soyadı", "İlçesi", "İli", "Cep Telefonu", "Email", "Grubu", "Vergi Dairesi", "Vergi No", "T.C. No", "WhatsApp"];
        const worksheet = XLSX.utils.aoa_to_sheet([headers]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Tedarikçiler");
        XLSX.writeFile(workbook, "tedarikci_sablonu.xlsx");
        setIsExcelMenuOpen(false);
    };


    const renderGroups = (parentId: string | null, level: number) => {
        const brandId = selectedBrandIdForGroup === '__general__' ? null : selectedBrandIdForGroup;
        return definitions.groups
            .filter(g => g.parentId === parentId && g.brandId === brandId)
            .map(group => (
                <EditableListItem key={group.id} item={group} onUpdate={handleUpdateGroup}
onDelete={() => handleDeleteGroup(group.id)} level={level} onAddChild={handleAddSubGroup}>
                    {renderGroups(group.id, level + 1)}
                </EditableListItem>
            ));
    };
    

    const menuItems: { id: Tab; label: string; icon: 'tag' }[] = [
        { id: 'brands', label: 'Markalar', icon: 'tag' },
        { id: 'models', label: 'Modeller', icon: 'tag' },
        { id: 'colors', label: 'Renkler', icon: 'tag' },
        { id: 'sizes', label: 'Bedenler', icon: 'tag' },
        { id: 'groups', label: 'Gruplar', icon: 'tag' },
        { id: 'suppliers', label: 'Tedarikçiler', icon: 'tag' },
        { id: 'customers', label: 'Müşteriler', icon: 'tag' },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'brands':
                return (
                    <DefinitionSection title="Marka Yönetimi">
                        <form onSubmit={handleAddBrand} className="flex gap-2 mb-4">
                            <input type="text" value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Yeni marka adı" className="input-style flex-grow" />
                            <button type="submit" className="btn-primary">Ekle</button>
                        </form>
                        <ul className="space-y-1 max-h-96 overflow-y-auto">
                            {definitions.brands.map(brand => <EditableListItem key={brand.id} item={brand} onUpdate={handleUpdateBrand} onDelete={handleDeleteBrand} />)}
                        </ul>
                    </DefinitionSection>
                );
            case 'models':
                return (
                    <DefinitionSection title="Model Yönetimi">
                        <form onSubmit={handleAddModel} className="grid grid-cols-3 gap-2 mb-4">
                            <select value={selectedBrandIdForModel} onChange={e => setSelectedBrandIdForModel(e.target.value)} className="input-style" required>
                                <option value="">Marka Seçin</option>
                                {definitions.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                            <input type="text" value={modelName} onChange={e => setModelName(e.target.value)} placeholder="Yeni model adı" className="input-style" />
                            <button type="submit" className="btn-primary">Ekle</button>
                        </form>
                        <ul className="space-y-1 max-h-96 overflow-y-auto">
                            {definitions.brands.map(brand => (
                                <li key={brand.id}>
                                    <h4 className="font-semibold text-slate-600 mt-2">{brand.name}</h4>
                                    <ul className="pl-4">
                                        {definitions.models.filter(m => m.brandId === brand.id).map(model => <EditableListItem key={model.id} item={model} onUpdate={handleUpdateModel} onDelete={handleDeleteModel} />)}
                                    </ul>
                                </li>
                            ))}
                        </ul>
                    </DefinitionSection>
                );
            case 'colors':
                 return (
                    <DefinitionSection title="Renk Yönetimi">
                        <form onSubmit={handleAddColor} className="flex gap-2 mb-4">
                            <input type="text" value={colorName} onChange={e => setColorName(e.target.value)} placeholder="Yeni renk adı" className="input-style flex-grow" />
                            <button type="submit" className="btn-primary">Ekle</button>
                        </form>
                        <ul className="space-y-1 max-h-96 overflow-y-auto">
                            {definitions.colors.map(color => <EditableListItem key={color.id} item={color} onUpdate={handleUpdateColor} onDelete={handleDeleteColor} />)}
                        </ul>
                    </DefinitionSection>
                );
            case 'sizes':
                 return (
                    <DefinitionSection title="Beden Yönetimi">
                        <form onSubmit={handleAddSize} className="flex gap-2 mb-4">
                            <input type="text" value={sizeName} onChange={e => setSizeName(e.target.value)} placeholder="Yeni beden adı" className="input-style flex-grow" />
                            <button type="submit" className="btn-primary">Ekle</button>
                        </form>
                        <ul className="space-y-1 max-h-96 overflow-y-auto">
                            {definitions.sizes.map(size => <EditableListItem key={size.id} item={size} onUpdate={handleUpdateSize} onDelete={handleDeleteSize} />)}
                        </ul>
                    </DefinitionSection>
                );
            case 'groups':
                return (
                    <DefinitionSection title="Grup Yönetimi">
                        <div className="flex items-center gap-4 mb-4">
                             <label className="font-semibold">Marka:</label>
                             <select value={selectedBrandIdForGroup} onChange={e => setSelectedBrandIdForGroup(e.target.value)} className="input-style">
                                <option value="__general__">Genel (Markasız)</option>
                                {definitions.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <form onSubmit={(e) => handleAddGroup(e, null)} className="flex gap-2 mb-4">
                            <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Yeni ana grup adı" className="input-style flex-grow" />
                            <button type="submit" className="btn-primary">Ana Grup Ekle</button>
                        </form>
                        <ul className="space-y-1 max-h-80 overflow-y-auto">
                            {renderGroups(null, 0)}
                        </ul>
                    </DefinitionSection>
                );
            case 'suppliers':
                return (
                     <DefinitionSection title="Tedarikçi Yönetimi">
                        <div className="flex items-center gap-2 mb-4">
                           <button onClick={() => { setEditingSupplier(null); setIsSupplierModalOpen(true); }} className="btn-primary"><Icon name="plus" className="w-5 h-5"/> Yeni Ekle</button>
                           <button onClick={() => setIsAiSupplierModalOpen(true)} className="btn-secondary bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100"><Icon name="ai" className="w-5 h-5"/> AI ile Aktar</button>
                             <div className="relative" ref={excelMenuRef}>
                                <button onClick={() => setIsExcelMenuOpen(prev => !prev)} className="btn-secondary bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
                                    <Icon name="excel" className="w-5 h-5"/> Excel İşlemleri
                                </button>
                                {isExcelMenuOpen && (
                                <div className="absolute top-full left-0 mt-2 w-56 bg-white border rounded-lg shadow-xl z-20">
                                    <button onClick={handleDownloadTemplate} className="w-full text-left px-4 py-3 hover:bg-slate-100 flex items-center gap-3"><Icon name="download" className="w-5 h-5 text-slate-500" /> <span className="font-medium text-slate-700">Şablon İndir</span></button>
                                    <button onClick={handleExcelUploadClick} className="w-full text-left px-4 py-3 hover:bg-slate-100 flex items-center gap-3 border-t"><Icon name="upload" className="w-5 h-5 text-slate-500" /> <span className="font-medium text-slate-700">Şablon Yükle</span></button>
                                </div>
                                )}
                            </div>
                        </div>
                        <div className="max-h-96 overflow-y-auto border rounded-lg">
                           <table className="w-full text-sm">
                                <thead className="bg-slate-100"><tr className="text-left"><th className="p-2">Ünvan</th><th className="p-2">Telefon</th><th className="p-2">İl/İlçe</th><th className="p-2"></th></tr></thead>
                                <tbody>
                                    {suppliers.map(s => (
                                        <tr key={s.id} className="border-b">
                                            <td className="p-2 font-semibold">{s.name}</td><td className="p-2">{s.mobilePhone}</td><td className="p-2">{s.city}{s.district && `/${s.district}`}</td>
                                            <td className="p-2 text-right">
                                                <button onClick={() => { setEditingSupplier(s); setIsSupplierModalOpen(true); }} className="p-1 text-slate-500 hover:text-cyan-600"><Icon name="edit" className="w-5 h-5"/></button>
                                                <button onClick={() => handleDeleteSupplier(s.id)} className="p-1 text-slate-500 hover:text-red-600"><Icon name="trash" className="w-5 h-5"/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                           </table>
                        </div>
                     </DefinitionSection>
                );
             case 'customers':
                return (
                     <DefinitionSection title="Müşteri Yönetimi">
                        <div className="flex items-center gap-2 mb-4">
                           <button onClick={() => { setEditingCustomer(null); setIsCustomerModalOpen(true); }} className="btn-primary"><Icon name="plus" className="w-5 h-5"/> Yeni Müşteri Ekle</button>
                        </div>
                        <div className="max-h-96 overflow-y-auto border rounded-lg">
                           <table className="w-full text-sm">
                                <thead className="bg-slate-100"><tr className="text-left"><th className="p-2">İsim</th><th className="p-2">Telefon</th><th className="p-2">E-posta</th><th className="p-2"></th></tr></thead>
                                <tbody>
                                    {customers.map(c => (
                                        <tr key={c.id} className="border-b">
                                            <td className="p-2 font-semibold">{c.name}</td><td className="p-2">{c.phone}</td><td className="p-2">{c.email}</td>
                                            <td className="p-2 text-right">
                                                <button onClick={() => { setEditingCustomer(c); setIsCustomerModalOpen(true); }} className="p-1 text-slate-500 hover:text-cyan-600"><Icon name="edit" className="w-5 h-5"/></button>
                                                <button onClick={() => handleDeleteCustomer(c.id)} className="p-1 text-slate-500 hover:text-red-600"><Icon name="trash" className="w-5 h-5"/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                           </table>
                        </div>
                     </DefinitionSection>
                );
        }
    };
    
    return (
        <div className="w-full h-full flex gap-4">
            <input type="file" ref={excelInputRef} style={{ display: 'none' }} accept=".xlsx,.xls" onChange={handleExcelFileSelected} />
            {isSupplierModalOpen && <SupplierEditModal isOpen={isSupplierModalOpen} onClose={() => setIsSupplierModalOpen(false)} onSave={handleUpdateSupplier} supplierToEdit={editingSupplier} />}
            {isCustomerModalOpen && <CustomerEditModal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} onSave={handleUpdateCustomer} customerToEdit={editingCustomer} />}
            {isAiSupplierModalOpen && <AiSupplierModal onClose={() => setIsAiSupplierModalOpen(false)} onStartTask={handleStartAiSupplierTask}/>}
            {isAiSupplierReviewModalOpen && <AiSupplierReviewModal task={reviewingAiSupplierTask} onClose={handleDismissAiSupplierTask} onCommit={handleCommitAiSupplierResults} onDismiss={handleDismissAiSupplierTask} />}

            <aside className="w-48 flex-shrink-0">
                <h2 className="text-lg font-bold text-slate-800 mb-4 px-2">Tanımlar</h2>
                <nav className="space-y-1">
                    {menuItems.map(item => (
                        <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left font-semibold transition-all text-xs ${
                            activeTab === item.id 
                            ? 'bg-cyan-100 text-cyan-800' 
                            : 'text-slate-600 hover:bg-slate-200/70'
                        }`}
                        >
                        <Icon name={item.icon} className="w-4 h-4" />
                        <span>{item.label}</span>
                        </button>
                    ))}
                </nav>
            </aside>

            <main className="flex-1 min-w-0">
                {renderContent()}
            </main>

            <style>{`
                .input-style { background-color: white; border: 1px solid #cbd5e1; border-radius: 0.5rem; padding: 0.25rem 0.5rem; transition: all 0.2s; height: 32px; font-size: 0.75rem; }
                .input-style:focus { outline: none; box-shadow: 0 0 0 2px #e0f2fe, 0 0 0 4px #0ea5e9; border-color: #0ea5e9; }
                .btn-primary { display: flex; align-items: center; justify-content: center; gap: 0.5rem; background-color: #0ea5e9; color: white; font-weight: 600; padding: 0 1rem; border-radius: 0.5rem; transition: all 0.2s; height: 32px; font-size: 0.75rem; }
                .btn-primary:hover { background-color: #0284c7; }
                .btn-secondary { display: flex; align-items: center; justify-content: center; gap: 0.5rem; background-color: white; border: 1px solid #cbd5e1; color: #334155; font-weight: 600; padding: 0 0.75rem; border-radius: 0.5rem; transition: all 0.2s; height: 32px; font-size: 0.75rem; }
                .btn-secondary:hover { background-color: #f1f5f9; }
            `}</style>
        </div>
    );
};

export default DefinitionsView;