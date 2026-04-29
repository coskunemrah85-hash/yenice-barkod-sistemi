import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: any[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function useFirestore<T extends { id?: string; barcode?: string }>(
  collectionName: string, 
  initialValue: T[]
): [T[], (value: T[] | ((val: T[]) => T[])) => void] {
  const [data, setData] = useState<T[]>(initialValue);
  const isInitialized = useRef(false);

  useEffect(() => {
    // 1. Önce yerel yedekten yükle (Çevrimdışı ve hızlı başlangıç için)
    const loadLocal = async () => {
      try {
        const ipc = (window as any).require?.('electron')?.ipcRenderer;
        if (ipc) {
          const localData = await ipc.invoke('get-data', { collection: collectionName });
          if (localData && Array.isArray(localData) && localData.length > 0) {
            console.log(`[useFirestore] ${collectionName} yerel yedekten yüklendi (${localData.length} öğe).`);
            setData(localData);
          }
        }
      } catch (err) {
        console.error(`[useFirestore] ${collectionName} yerel yükleme hatası:`, err);
      } finally {
        isInitialized.current = true; // Attempt completed, allow writes now
      }
    };
    loadLocal();

    // 2. Sadece oturum açılmışsa Firestore'u dinle
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log(`[useFirestore] ${collectionName} Firestore dinleyicisi başlatılıyor (Kullanıcı: ${user.email}).`);
        const q = query(collection(db, collectionName));
        const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const items: T[] = [];
          snapshot.forEach((doc) => {
            items.push({ ...doc.data(), id: doc.id } as T);
          });
          
          setData(prevData => {
            // KRİTİK KORUMA: 
            // Eğer Firestore'dan boş veri gelmişse VE bizim yerel verimiz zaten varsa,
            // yerel veriyi ezmeyelim. Bu durum genellikle oturum yeni açıldığında
            // veya senkronizasyon geciktiğinde yaşanır.
            if (items.length === 0 && prevData.length > 0) {
              console.warn(`[useFirestore] ${collectionName} Firestore boş döndü, yerel veri korunuyor (${prevData.length} öğe).`);
              return prevData;
            }
            
            // Eğer Firestore'da veri varsa veya yerel verimiz zaten boşsa güncelle
            if (JSON.stringify(prevData) !== JSON.stringify(items)) {
              console.log(`[useFirestore] ${collectionName} Firestore'dan güncellendi (${items.length} öğe).`);
              
              // Firestore'dan gelen veriyi yerel yedeğe de yaz (Yan etki olarak burada yapıyoruz)
              const ipc = (window as any).require?.('electron')?.ipcRenderer;
              if (ipc) ipc.invoke('save-data', { collection: collectionName, data: items });
              
              return items;
            }
            return prevData;
          });
          
          isInitialized.current = true;
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, collectionName);
        });

        return () => unsubscribeSnapshot();
      } else {
        console.log(`[useFirestore] ${collectionName} Firestore dinleyicisi durduruldu (Oturum kapalı).`);
      }
    });

    return () => unsubscribeAuth();
  }, [collectionName]);

  const setValue = useCallback(async (value: T[] | ((val: T[]) => T[])) => {
    // Guard: Prevent operations if not initialized or not logged in
    if (!isInitialized.current) {
      console.warn(`[useFirestore] ${collectionName} henüz hazır değil. Yazma işlemi yoksayıldı.`);
      return;
    }

    if (!auth.currentUser) {
      console.warn(`[useFirestore] ${collectionName} yazma hatası: Oturum açılmamış.`);
      return;
    }

    const newValue = value instanceof Function ? value(data) : value;
    const oldData = data;
    setData(newValue); // Optimistic update

    try {
      // Yerel Yedekleme (Anlık)
      const ipc = (window as any).require?.('electron')?.ipcRenderer;
      if (ipc) ipc.invoke('save-data', { collection: collectionName, data: newValue });

      const batch = writeBatch(db);
      let opsCount = 0;
      
      // 1. Identify items to delete
      const newIds = new Set(newValue.map(item => item.id || item.barcode));
      const oldItemsMap = new Map(oldData.map(item => [item.id || item.barcode, item]));

      oldData.forEach(item => {
        const id = item.id || item.barcode;
        if (id && !newIds.has(id)) {
          const docRef = doc(db, collectionName, id);
          batch.delete(docRef);
          opsCount++;
        }
      });

      // 2. Set/Update ONLY changed items
      newValue.forEach(item => {
        const id = item.id || item.barcode;
        if (id) {
          const oldItem = oldItemsMap.get(id);
          // Obje karşılaştırması için daha derin bir kontrol gerekebilir ama JSON.stringify basit vakalar için yeterli
          if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
            const docRef = doc(db, collectionName, id);
            batch.set(docRef, item);
            opsCount++;
          }
        }
      });

      if (opsCount > 0) {
        await batch.commit();
        console.log(`[useFirestore] ${collectionName} ${opsCount} işlem başarıyla Firestore'a yazıldı.`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, collectionName);
    }
  }, [collectionName, data]);

  return [data, setValue];
}

export function useFirestoreDoc<T>(
  collectionName: string,
  docId: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [data, setData] = useState<T>(initialValue);

  useEffect(() => {
    const loadLocal = async () => {
      try {
        const ipc = (window as any).require?.('electron')?.ipcRenderer;
        if (ipc) {
          const localData = await ipc.invoke('get-data', { collection: `${collectionName}_doc_${docId}` });
          if (localData) {
            console.log(`[useFirestoreDoc] ${collectionName}/${docId} yerel yedekten yüklendi.`);
            setData(localData);
          }
        }
      } catch (err) {
        console.error(`[useFirestoreDoc] ${collectionName}/${docId} yerel yükleme hatası:`, err);
      }
    };
    loadLocal();

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const docRef = doc(db, collectionName, docId);
        const unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const docData = docSnap.data() as T;
            
            setData(prevData => {
              if (JSON.stringify(prevData) !== JSON.stringify(docData)) {
                console.log(`[useFirestoreDoc] ${collectionName}/${docId} Firestore'dan güncellendi.`);
                
                const ipc = (window as any).require?.('electron')?.ipcRenderer;
                if (ipc) ipc.invoke('save-data', { collection: `${collectionName}_doc_${docId}`, data: docData });
                
                return docData;
              }
              return prevData;
            });
          } else {
             console.warn(`[useFirestoreDoc] ${collectionName}/${docId} Firestore'da bulunamadı, yerel veri korunuyor.`);
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `${collectionName}/${docId}`);
        });
        return () => unsubscribeSnapshot();
      }
    });

    return () => unsubscribeAuth();
  }, [collectionName, docId]);

  const setValue = useCallback(async (value: T | ((val: T) => T)) => {
    const newValue = value instanceof Function ? value(data) : value;
    setData(newValue);

    try {
      const ipc = (window as any).require?.('electron')?.ipcRenderer;
      if (ipc) ipc.invoke('save-data', { collection: `${collectionName}_doc_${docId}`, data: newValue });

      const docRef = doc(db, collectionName, docId);
      await setDoc(docRef, newValue as any);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${docId}`);
    }
  }, [collectionName, docId, data]);

  return [data, setValue];
}
