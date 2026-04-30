/**
 * GERÇEK ZAMANLI BULUT SENKRONİZASYONU (BAAS)
 * Not: Kullanmak için terminalde 'npm install firebase' komutunu çalıştırmalısınız.
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, doc, setDoc } from 'firebase/firestore';

// Kendi Firebase proje bilgilerinizi buraya gireceksiniz
const firebaseConfig = {
    apiKey: "BULUT_API_ANAHTARINIZ",
    authDomain: "barkod-uygulamasi.firebaseapp.com",
    projectId: "barkod-uygulamasi",
    storageBucket: "barkod-uygulamasi.appspot.com",
};

export const cloudApp = initializeApp(firebaseConfig);
export const cloudDB = getFirestore(cloudApp);

// Örnek: Buluta anında ürün senkronize etme
export const syncProductToCloud = async (productData: any) => {
    try {
        await setDoc(doc(cloudDB, "products", productData.barcode), productData);
    } catch (e) {
        console.error("Bulut senkronizasyon hatası: ", e);
    }
};