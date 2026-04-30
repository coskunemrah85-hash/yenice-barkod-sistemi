/**
 * GERÇEK ZAMANLI OTOMATİK KAYIT SERVİSİ
 * Verileri anında uygulamanın kalıcı belleğine (IndexedDB) yazar.
 */

const DB_NAME = 'YeniceBarkodDB';
const STORE_NAME = 'AppStateStore';

export const initLocalDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (event: any) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = (event: any) => resolve(event.target.result);
        request.onerror = (event: any) => reject(event.target.error);
    });
};

export const saveToLocalSystem = async (key: string, data: any) => {
    try {
        const db = await initLocalDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(data, key);
    } catch (error) {
        console.error(`[Oto-Kayıt] ${key} kaydedilirken hata oluştu:`, error);
    }
};