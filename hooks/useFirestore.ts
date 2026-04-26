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
      const ipc = (window as any).require?.('electron')?.ipcRenderer;
      if (ipc) {
        const localData = await ipc.invoke('get-data', { collection: collectionName });
        if (localData && Array.isArray(localData) && localData.length > 0) {
          console.log(`[useFirestore] ${collectionName} yerel yedekten yüklendi.`);
          setData(localData);
          isInitialized.current = true;
        }
      }
    };
    loadLocal();

    // 2. Firestore'dan senkronize et
    const q = query(collection(db, collectionName));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: T[] = [];
      snapshot.forEach((doc) => {
        items.push({ ...doc.data(), id: doc.id } as T);
      });
      
      if (items.length > 0 || isInitialized.current) {
          setData(items);
          isInitialized.current = true;
          
          // Firestore'dan gelen veriyi yerel yedeğe de yaz
          const ipc = (window as any).require?.('electron')?.ipcRenderer;
          if (ipc) ipc.invoke('save-data', { collection: collectionName, data: items });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, collectionName);
    });

    return () => unsubscribe();
  }, [collectionName]);

  const setValue = useCallback(async (value: T[] | ((val: T[]) => T[])) => {
    // Guard: Prevent operations if not initialized to avoid accidental deletions/overwrites during startup
    if (!isInitialized.current) {
      console.warn(`[useFirestore] ${collectionName} yet not initialized. Write operation ignored.`);
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
          if (!oldItem || JSON.stringify(oldItem) !== JSON.stringify(item)) {
            const docRef = doc(db, collectionName, id);
            batch.set(docRef, item);
            opsCount++;
          }
        }
      });

      if (opsCount > 0) {
        await batch.commit();
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
      const ipc = (window as any).require?.('electron')?.ipcRenderer;
      if (ipc) {
        const localData = await ipc.invoke('get-data', { collection: `${collectionName}_doc_${docId}` });
        if (localData) {
          console.log(`[useFirestoreDoc] ${collectionName}/${docId} yerel yedekten yüklendi.`);
          setData(localData);
        }
      }
    };
    loadLocal();

    const docRef = doc(db, collectionName, docId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const docData = docSnap.data() as T;
        setData(docData);
        
        const ipc = (window as any).require?.('electron')?.ipcRenderer;
        if (ipc) ipc.invoke('save-data', { collection: `${collectionName}_doc_${docId}`, data: docData });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `${collectionName}/${docId}`);
    });

    return () => unsubscribe();
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
