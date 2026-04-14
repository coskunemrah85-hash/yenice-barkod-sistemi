import React, { useState, useEffect, useRef } from 'react';

const DB_NAME = 'YeniceGiyimDB';
const DB_VERSION = 2; // Incremented version to trigger upgrade

const storeNames = [
    'users', 'products', 'salesHistory', 'returnHistory', 'endOfDayHistory',
    'companyInfo', 'brands', 'models', 'colors', 'sizes', 'groups',
    'suppliers', 'customers', 'purchaseHistory', 'paymentHistory'
];

let dbPromise: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
    if (dbPromise) {
        return dbPromise;
    }
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            storeNames.forEach(name => {
                if (!db.objectStoreNames.contains(name)) {
                    // Corrected store creation: key is always 'data', so no auto-increment.
                    db.createObjectStore(name, { keyPath: 'id' });
                }
            });
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
            console.error("IndexedDB error:", (event.target as IDBOpenDBRequest).error);
            reject((event.target as IDBOpenDBRequest).error);
        };
    });
    return dbPromise;
};

const getFromDB = async <T>(storeName: string): Promise<T | undefined> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        // Using a single key 'data' for each store to hold the array/object
        const request = store.get('data');

        request.onsuccess = () => {
            resolve(request.result?.value);
        };
        request.onerror = () => {
            reject(request.error);
        };
    });
};

const setInDB = async <T>(storeName: string, value: T): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        // Storing the entire state array/object under a single key 'data'
        const request = store.put({ id: 'data', value });

        request.onsuccess = () => {
            resolve();
        };
        request.onerror = () => {
            reject(request.error);
        };
    });
};

export function useIndexedDB<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [storedValue, setStoredValue] = useState<T>(initialValue);
    const isInitialized = useRef(false);

    useEffect(() => {
        let isMounted = true;
        getFromDB<T>(key).then(valueFromDb => {
            if (isMounted) {
                if (valueFromDb !== undefined && valueFromDb !== null) {
                    setStoredValue(valueFromDb);
                } else {
                    // If nothing in DB, set the initial value
                    setInDB(key, initialValue);
                }
                isInitialized.current = true;
            }
        }).catch(error => {
            console.error(`Error reading from IndexedDB store "${key}":`, error);
            isInitialized.current = true; // Mark as initialized even on error to prevent loops
        });

        return () => {
            isMounted = false;
        };
    }, [key]);

    const setValue = (value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            if (isInitialized.current) {
                setInDB(key, valueToStore).catch(error => {
                    console.error(`Error writing to IndexedDB store "${key}":`, error);
                });
            }
        } catch (error) {
            console.log(error);
        }
    };

    return [storedValue, setValue];
}