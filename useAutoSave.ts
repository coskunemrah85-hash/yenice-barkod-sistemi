import { useEffect, useRef } from 'react';
import { saveToLocalSystem } from './autoSaveService';

/**
 * Otomatik Arka Plan Kayıt Hook'u
 * Verilerde en ufak bir değişiklik olduğunda sistemi yormadan 
 * arka planda otomatik olarak veritabanına yazar.
 */
export const useAutoSave = (stateKey: string, stateData: any, delay: number = 1000) => {
    // İlk yüklemede boş yere kaydetmeyi önlemek için
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        if (stateData === undefined || stateData === null) return;

        // Siz veriyi değiştirdikten 'delay' milisaniye sonra kayıt yapar. Sistemi kasmaz.
        const timeoutId = setTimeout(() => {
            saveToLocalSystem(stateKey, stateData);
            console.log(`✅ [${stateKey}] değişiklikleri arka planda anında sisteme işlendi.`);
        }, delay);

        return () => clearTimeout(timeoutId); // Süre dolmadan yeni değişiklik gelirse eski kaydı iptal et ve süreyi sıfırla
    }, [stateData, stateKey, delay]);
};