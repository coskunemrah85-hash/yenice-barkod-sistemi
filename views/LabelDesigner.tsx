import React, { useState, useEffect, useMemo } from 'react';
import Icon from '../components/Icon';
import { Product, Definitions } from '../types';

interface LabelDesignerProps {
  products: Product[];
  definitions: Definitions;
}

const LabelDesigner: React.FC<LabelDesignerProps> = ({ products, definitions }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [printQueue, setPrintQueue] = useState<{product: Product, count: number}[]>([]);
  
  // Persistence Settings
  const [engine, setEngine] = useState<'bartender' | 'argox'>((localStorage.getItem('label_engine') as any) || 'bartender');
  const [btwPath, setBtwPath] = useState(localStorage.getItem('label_template_path') || '');
  const [appPath, setAppPath] = useState(localStorage.getItem('label_app_path') || '');
  
  const [isPrinting, setIsPrinting] = useState(false);
  const [status, setStatus] = useState<{msg: string, type: 'success' | 'error' | 'info' | null}>({ msg: '', type: null });

  useEffect(() => {
    localStorage.setItem('label_engine', engine);
    localStorage.setItem('label_template_path', btwPath);
    localStorage.setItem('label_app_path', appPath);
  }, [engine, btwPath, appPath]);

  // IPC Bridge Listener
  useEffect(() => {
    const ipcRenderer = (window as any).require?.('electron')?.ipcRenderer;
    if (!ipcRenderer) return;

    const handleSuccess = (_: any, msg: string) => {
        setIsPrinting(false);
        setStatus({ msg, type: 'success' });
        setTimeout(() => setStatus({ msg: '', type: null }), 5000);
    };

    const handleError = (_: any, msg: string) => {
        setIsPrinting(false);
        setStatus({ msg, type: 'error' });
    };

    ipcRenderer.on('print-success', handleSuccess);
    ipcRenderer.on('print-error', handleError);

    return () => {
        ipcRenderer.removeListener('print-success', handleSuccess);
        ipcRenderer.removeListener('print-error', handleError);
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return products.filter(p => !p.isDeleted && (p.name.toLowerCase().includes(q) || p.barcode.includes(q))).slice(0, 50);
  }, [products, searchQuery]);

  const addToQueue = (product: Product) => {
    setPrintQueue(prev => {
        const existing = prev.find(q => q.product.barcode === product.barcode);
        if (existing) return prev.map(q => q.product.barcode === product.barcode ? {...q, count: q.count + 1} : q);
        return [...prev, { product, count: 1 }];
    });
  };

  const handlePrint = () => {
    if (printQueue.length === 0) return;
    if (!btwPath) { setStatus({ msg: `Lütfen bir ${engine === 'argox' ? 'Argox (.arp)' : 'BarTender (.btw)'} dosya yolu belirtin.`, type: 'error' }); return; }

    const ipcRenderer = (window as any).require?.('electron')?.ipcRenderer;
    if (!ipcRenderer) { setStatus({ msg: 'Electron ortamı bulunamadı.', type: 'error' }); return; }

    setIsPrinting(true);
    setStatus({ msg: `Baskı emri ${engine.toUpperCase()} motoruna iletiliyor...`, type: 'info' });

    // Prepare data
    const dataToSend = printQueue.flatMap(item => {
        return Array.from({ length: item.count }).map(() => ({
            Barkod: item.product.barcode,
            UrunAdi: item.product.name,
            Fiyat: item.product.price.toFixed(2),
            Marka: item.product.marka || '',
            Beden: item.product.beden || '',
            Renk: item.product.renk || '',
            StokKodu: item.product.stokKodu || ''
        }));
    });

    ipcRenderer.send('print-to-label-software', {
        engine: engine,
        templatePath: btwPath,
        data: dataToSend,
        appPath: appPath
    });
  };

  return (
    <div className="w-full h-full flex bg-[#020617] text-slate-300 font-sans overflow-hidden">
      
      {/* LEFT: Product Selection */}
      <aside className="w-[450px] flex-shrink-0 flex flex-col border-r border-white/5 bg-slate-950/40 backdrop-blur-3xl overflow-hidden">
        <div className="p-8 border-b border-white/5">
             <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20"><Icon name="barcode" className="w-6 h-6 text-white" /></div>
                <div><h2 className="text-xl font-black text-white tracking-tight uppercase">PRINT <span className="text-indigo-400">BRIDGE</span></h2><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Hibrit Baskı Merkezi</p></div>
            </div>

            <div className="flex bg-[#0f172a] p-1 rounded-2xl border border-white/5 mb-6">
                <button 
                  onClick={() => setEngine('bartender')} 
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${engine === 'bartender' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  BarTender
                </button>
                <button 
                  onClick={() => setEngine('argox')} 
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${engine === 'argox' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Argox (ARP)
                </button>
            </div>

            <div className="relative">
                <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Ürün Ara..." className="w-full bg-[#0f172a] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-white focus:border-indigo-500/50 outline-none transition-all" />
            </div>
        </div>

        <div className="flex-grow overflow-y-auto custom-scrollbar p-6 space-y-3">
            {filteredProducts.map(p => (
                <div key={p.barcode} onClick={() => addToQueue(p)} className="p-4 rounded-2xl bg-white/[0.02] hover:bg-indigo-600 border border-white/[0.03] cursor-pointer transition-all active:scale-[0.98] group">
                    <div className="flex justify-between items-start mb-1">
                        <span className="text-[11px] font-black text-slate-100 uppercase group-hover:text-white truncate">{p.name}</span>
                        <span className="text-[10px] font-black text-indigo-400 group-hover:text-white">{p.price}₺</span>
                    </div>
                    <div className="text-[9px] text-slate-600 font-bold group-hover:text-indigo-200">{p.barcode} • {p.marka}</div>
                </div>
            ))}
        </div>
      </aside>

      {/* RIGHT: Print Configuration & Queue */}
      <main className="flex-grow flex flex-col p-8 bg-[#020617] bg-[radial-gradient(#6366f110_1px,transparent_1px)] [background-size:32px_32px]">
        
        {status.type && (
            <div className={`mb-6 p-5 rounded-[2rem] flex items-center gap-4 border animate-fade-in ${
                status.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 
                status.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 
                'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
            }`}>
                <Icon name={status.type === 'success' ? 'check-circle' : 'exclamation-circle'} className="w-6 h-6" />
                <span className="text-[11px] font-black uppercase tracking-widest">{status.msg}</span>
            </div>
        )}

        <div className="grid grid-cols-12 gap-8 h-full">
            <div className="col-span-5 space-y-6">
                <div className="bg-[#0f172a] rounded-[2.5rem] p-8 border border-white/5 shadow-2xl">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-3"><Icon name="cog-6-tooth" className="w-5 h-5 text-indigo-500" /> {engine.toUpperCase()} AYARLARI</h3>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-3">Tasarım Dosyası ({engine === 'argox' ? '.arp' : '.btw'})</label>
                            <input type="text" value={btwPath} onChange={e => setBtwPath(e.target.value)} placeholder={`C:\\Dosyalar\\tasarim.${engine === 'argox' ? 'arp' : 'btw'}`} className="w-full bg-[#020617] border border-white/5 rounded-2xl p-4 text-xs font-bold text-indigo-400 outline-none" />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-3">Program Yolu (Exe)</label>
                            <input type="text" value={appPath} onChange={e => setAppPath(e.target.value)} placeholder={`${engine === 'argox' ? 'LabelDr.exe' : 'bartend.exe'} yolu...`} className="w-full bg-[#020617] border border-white/5 rounded-2xl p-4 text-xs font-bold text-slate-500 outline-none" />
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-indigo-600/5 border border-indigo-500/10 rounded-[2.5rem]">
                    <h4 className="text-[11px] font-black text-white uppercase mb-2 italic">Argox (ARP) İpucu:</h4>
                    <p className="text-[10px] leading-relaxed text-slate-500 font-bold">Argox Label Dr. yazılımında tasarımınızı yaptıktan sonra veri kaynağı eşleşmelerini Barkod, UrunAdi, Fiyat olarak kaydetmeyi unutmayın.</p>
                </div>
            </div>

            <div className="col-span-12 lg:col-span-7 flex flex-col bg-[#0f172a] rounded-[2.5rem] border border-white/5 shadow-2xl p-8 overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-3"><Icon name="queue-list" className="w-5 h-5 text-indigo-500" /> BASILACAKLAR</h3>
                    {printQueue.length > 0 && <button onClick={() => setPrintQueue([])} className="text-[10px] font-black text-rose-500 uppercase">Temizle</button>}
                </div>

                <div className="flex-grow overflow-y-auto custom-scrollbar space-y-3">
                    {printQueue.map((item, i) => (
                        <div key={item.product.barcode} className="flex items-center gap-4 bg-white/[0.02] p-4 rounded-3xl border border-white/[0.03]">
                            <div className="flex-grow min-w-0">
                                <h4 className="text-[11px] font-black text-white uppercase truncate">{item.product.name}</h4>
                                <span className="text-[9px] text-slate-600 font-bold uppercase">{item.product.barcode}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setPrintQueue(prev => prev.map(q => q.product.barcode === item.product.barcode ? {...q, count: Math.max(1, q.count - 1)} : q))} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center"><Icon name="minus" className="w-3 h-3" /></button>
                                <span className="w-8 text-center text-xs font-black text-indigo-500">{item.count}</span>
                                <button onClick={() => setPrintQueue(prev => prev.map(q => q.product.barcode === item.product.barcode ? {...q, count: q.count + 1} : q))} className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center"><Icon name="plus" className="w-3 h-3" /></button>
                            </div>
                            <button onClick={() => setPrintQueue(prev => prev.filter(q => q.product.barcode !== item.product.barcode))} className="p-3 text-slate-700 hover:text-rose-500 transition-all"><Icon name="trash" className="w-4 h-4" /></button>
                        </div>
                    ))}
                </div>

                <div className="pt-8 mt-4 border-t border-white/5">
                    <button 
                        onClick={handlePrint}
                        disabled={printQueue.length === 0 || isPrinting}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-20 text-white h-20 rounded-[2rem] flex items-center justify-center gap-6 text-[12px] font-black tracking-[0.4em] uppercase transition-all shadow-2xl shadow-indigo-600/30"
                    >
                        {isPrinting ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Icon name="printer" className="w-6 h-6" /> {engine.toUpperCase()} İLE BAS</>}
                    </button>
                </div>
            </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #020617; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6366f1; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default LabelDesigner;