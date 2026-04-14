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
  apiKey: "AIzaSyAwSbijlE1EtKYfEHjJDBLYWs_t_ikdYHs",
  authDomain: "ai-studio-369e4703-1f8d-49ee-91a7-f76a3e15d9ec.firebaseapp.com",
  projectId: "ai-studio-369e4703-1f8d-49ee-91a7-f76a3e15d9ec",
  storageBucket: "ai-studio-369e4703-1f8d-49ee-91a7-f76a3e15d9ec.firebasestorage.app",
  messagingSenderId: "351683423682",
  appId: "1:351683423682:web:7b42b3edb4e01ce8c6ba5b"
};

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