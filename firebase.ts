import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, // EKLE: Yönlendirme yöntemi
  getRedirectResult,  // EKLE: Yönlendirme sonucunu al
  setPersistence, 
  browserLocalPersistence 
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "gen-lang-client-0621614496.firebaseapp.com",
  projectId: "gen-lang-client-0621614496",
  storageBucket: "gen-lang-client-0621614496.firebasestorage.app",
  messagingSenderId: "351683423682",
};

if (!firebaseConfig.apiKey) {
  console.error("FIREBASE API KEY EKSİK! Lütfen .env dosyasını veya Vite konfigürasyonunu kontrol edin.");
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Google ile Giriş Fonksiyonu
export const loginWithGoogle = async () => {
  try {
    await setPersistence(auth, browserLocalPersistence);
    googleProvider.setCustomParameters({ prompt: 'select_account' });

    // 1. Önce Popup Dene
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (popupError: any) {
      // 2. Eğer Popup engellenirse otomatik olarak Redirect (Yönlendirme) yöntemine geç
      if (popupError.code === 'auth/popup-blocked') {
        console.log("Popup engellendi, yönlendirme (Redirect) deneniyor...");
        await signInWithRedirect(auth, googleProvider);
        return null; 
      }
      throw popupError;
    }

  } catch (error: any) {
    console.error("Firebase Detaylı Hata:", error.code);
    alert("Giriş sırasında hata oluştu: " + error.message);
    throw error;
  }
};

// Uygulama açıldığında yönlendirme sonucunu kontrol etmek için (Opsiyonel)
getRedirectResult(auth).then((result) => {
  if (result) console.log("Yönlendirme ile giriş başarılı:", result.user);
}).catch((error) => console.error("Yönlendirme hatası:", error));

export default app;