import React, { useState, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';
import Icon from './Icon';

interface ImportedData {
  products: any[];
  suppliers: any[];
  groups: any[];
  colors: any[];
  models: any[];
}

interface AiDataImportModalProps {
  onClose: () => void;
  onSuccess: (importedCount: number) => void;
}

const AiDataImportModal: React.FC<AiDataImportModalProps> = ({ onClose, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseExcelFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e: any) => {
        try {
          const data = e.target.result;
          const XLSX = (window as any).XLSX;
          if (!XLSX) {
            reject(new Error('Excel kütüphanesi yüklenmedi'));
            return;
          }
          const workbook = XLSX.read(data, { type: 'binary' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Dosya okunamadı'));
      reader.readAsBinaryString(file);
    });
  };

  const processDataWithAI = async (excelData: any[]): Promise<ImportedData> => {
    setProgress({ current: 1, total: 5, message: 'AI ile veri analiz ediliyor...' });

    const apiKey = localStorage.getItem('GEMINI_API_KEY') || process.env.GEMINI_API_KEY || (window as any).process?.env?.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API anahtarı bulunamadı. Lütfen Ayarlar menüsünden API anahtarınızı kontrol edin.');
    }

    const client = new GoogleGenAI(apiKey);
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
    Aşağıdaki Excel verilerini analiz et ve JSON formatında organize et:
    
    ${JSON.stringify(excelData.slice(0, 10))}
    
    Bunu JSON formatında döndür (sadece JSON, başka birşey yapma):
    {
      "products": [
        {
          "barcode": "xxx",
          "name": "Ürün Adı",
          "description": "Açıklama",
          "buyPrice": 0,
          "price": 0,
          "stock": 0,
          "stokKodu": "xxx",
          "marka": "Marka",
          "model": "Model",
          "renk": "Renk",
          "beden": "Beden",
          "group": "Grup",
          "midGroup": "Ara Grup",
          "subGroup": "Alt Grup",
          "supplierId": "xxx"
        }
      ],
      "suppliers": [
        {"name": "Tedarikçi", "phone": "", "email": "", "address": ""}
      ],
      "groups": [
        {"name": "Grup", "parentId": null}
      ],
      "colors": [
        {"name": "Renk"}
      ],
      "models": [
        {"name": "Model", "brandId": ""}
      ]
    }
    
    Tüm verileri (${excelData.length} satır) analiz et.
    `;

    try {
      const response = await model.generateContent(prompt);
      const responseText = response.response.text();
      
      // JSON'ı çıkart
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI geçerli JSON döndürmedi');
      }

      const parsedData: ImportedData = JSON.parse(jsonMatch[0]);
      return parsedData;
    } catch (err) {
      throw new Error(`AI analiz hatası: ${err}`);
    }
  };

  const saveToFirestore = async (data: ImportedData): Promise<number> => {
    let totalImported = 0;

    // 1. Tedarikçileri kaydet
    if (data.suppliers && data.suppliers.length > 0) {
      setProgress({ current: 2, total: 5, message: `Tedarikçiler kaydediliyor (${data.suppliers.length})...` });
      for (const supplier of data.suppliers) {
        try {
          const q = query(collection(db, 'suppliers'), where('name', '==', supplier.name));
          const existing = await getDocs(q);
          if (existing.empty) {
            await addDoc(collection(db, 'suppliers'), {
              ...supplier,
              createdAt: new Date(),
            });
          }
        } catch (err) {
          console.error(`Tedarikçi kayıt hatası: ${supplier.name}`, err);
        }
      }
    }

    // 2. Renkler ve Modeller için Brand ID al
    let defaultBrandId = 'default-brand';
    try {
      const brandsSnap = await getDocs(collection(db, 'brands'));
      if (!brandsSnap.empty) {
        defaultBrandId = brandsSnap.docs[0].id;
      }
    } catch (err) {
      console.error('Brand sorgulama hatası:', err);
    }

    // 3. Renkler kaydet
    if (data.colors && data.colors.length > 0) {
      setProgress({ current: 3, total: 5, message: `Renkler kaydediliyor (${data.colors.length})...` });
      for (const color of data.colors) {
        try {
          const q = query(collection(db, 'colors'), where('name', '==', color.name));
          const existing = await getDocs(q);
          if (existing.empty) {
            await addDoc(collection(db, 'colors'), {
              name: color.name,
              createdAt: new Date(),
            });
          }
        } catch (err) {
          console.error(`Renk kayıt hatası: ${color.name}`, err);
        }
      }
    }

    // 4. Modeller kaydet
    if (data.models && data.models.length > 0) {
      setProgress({ current: 3, total: 5, message: `Modeller kaydediliyor (${data.models.length})...` });
      for (const model of data.models) {
        try {
          const q = query(collection(db, 'models'), where('name', '==', model.name));
          const existing = await getDocs(q);
          if (existing.empty) {
            await addDoc(collection(db, 'models'), {
              ...model,
              brandId: defaultBrandId,
              createdAt: new Date(),
            });
          }
        } catch (err) {
          console.error(`Model kayıt hatası: ${model.name}`, err);
        }
      }
    }

    // 5. Gruplar kaydet
    if (data.groups && data.groups.length > 0) {
      setProgress({ current: 4, total: 5, message: `Gruplar kaydediliyor (${data.groups.length})...` });
      for (const group of data.groups) {
        try {
          const q = query(collection(db, 'groups'), where('name', '==', group.name));
          const existing = await getDocs(q);
          if (existing.empty) {
            await addDoc(collection(db, 'groups'), {
              name: group.name,
              parentId: group.parentId || null,
              createdAt: new Date(),
            });
          }
        } catch (err) {
          console.error(`Grup kayıt hatası: ${group.name}`, err);
        }
      }
    }

    // 6. Ürünler kaydet
    if (data.products && data.products.length > 0) {
      setProgress({ current: 5, total: 5, message: `Ürünler kaydediliyor (${data.products.length})...` });
      for (const product of data.products) {
        try {
          const productRef = doc(collection(db, 'products'), product.barcode);
          await setDoc(productRef, {
            ...product,
            createdAt: new Date(),
            isActivated: true,
          });
          totalImported++;
        } catch (err) {
          console.error(`Ürün kayıt hatası: ${product.barcode}`, err);
        }
      }
    }

    return totalImported;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setProgress({ current: 0, total: 5, message: 'Excel dosyası okunuyor...' });

    try {
      // 1. Excel dosyasını parse et
      const excelData = await parseExcelFile(file);
      if (excelData.length === 0) {
        throw new Error('Excel dosyası boş veya geçersiz');
      }

      setProgress({ current: 1, total: 5, message: `${excelData.length} satır okundu` });

      // 2. AI ile işle
      const importedData = await processDataWithAI(excelData);

      // 3. Firestore'a kaydet
      const imported = await saveToFirestore(importedData);

      setProgress({ current: 5, total: 5, message: '✅ Veri aktarımı tamamlandı!' });
      
      setTimeout(() => {
        onSuccess(imported);
        onClose();
      }, 1500);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setError(errorMsg);
      setProgress({ current: 0, total: 0, message: '' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl">
              <Icon name="ai" className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-800">AI Asistanlı Veri Aktarım</h2>
              <p className="text-slate-500 text-sm">Excel'deki tüm verilerinizi otomatik olarak sisteme aktarın</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <Icon name="x-circle" className="w-6 h-6" />
          </button>
        </div>

        {!isLoading && !error && (
          <div
            className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition"
            onClick={() => fileInputRef.current?.click()}
          >
            <Icon name="upload" className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-xl font-bold text-slate-800 mb-2">
              Excel Dosyası Yükleyin
            </p>
            <p className="text-slate-500 text-sm mb-4">
              veya sürükleyip bırakın
            </p>
            <p className="text-xs text-slate-400">
              Desteklenen: .xlsx, .xls formatlı Excel dosyaları
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {isLoading && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-700 font-bold">{progress.message}</span>
                <span className="text-sm text-slate-500">{progress.current}/{progress.total}</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-700">
                💡 <strong>İşlemde:</strong> Gemini AI verilerinizi analiz ediyor ve otomatik olarak eşleştiriyor...
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-700">
                <strong>❌ Hata:</strong> {error}
              </p>
            </div>
            <button
              onClick={() => {
                setError(null);
                fileInputRef.current?.click();
              }}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 rounded-xl font-bold hover:shadow-lg transition"
            >
              Tekrar Deneyin
            </button>
          </div>
        )}

        <div className="mt-8 bg-slate-50 rounded-xl p-4 border border-slate-200">
          <h4 className="font-bold text-slate-800 mb-3">📋 Excel Formatı Gereksinimleri:</h4>
          <ul className="text-sm text-slate-600 space-y-2">
            <li>✓ <strong>Barkod</strong> - Ürün barkodu (benzersiz)</li>
            <li>✓ <strong>Ürün Adı</strong> - Ürünün adı</li>
            <li>✓ <strong>Alış Fiyatı</strong>, <strong>Satış Fiyatı</strong> - Fiyatlar</li>
            <li>✓ <strong>Marka, Model, Renk, Beden</strong> - Ürün özellikleri</li>
            <li>✓ <strong>Grup, Ara Grup, Alt Grup</strong> - Kategori bilgileri</li>
            <li>✓ <strong>Stok</strong> - Stok miktarı</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AiDataImportModal;
