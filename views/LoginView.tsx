import React from 'react';
import { loginWithGoogle } from '../firebase';
import Icon from '../components/Icon';

interface LoginViewProps {
  onLoginSuccess: (user: any) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const handleLogin = async () => {
    try {
      const user = await loginWithGoogle();
      onLoginSuccess(user);
    } catch (error) {
      alert("Giriş yapılamadı. Lütfen tekrar deneyin.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-slate-200 text-center">
        <div className="mb-8 flex justify-center">
          <div className="p-4 bg-cyan-100 text-cyan-600 rounded-2xl">
            <Icon name="ai" className="w-12 h-12" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Yenice İç Giyim</h1>
        <p className="text-slate-500 mb-10">Mağaza Yönetim Paneli - Uzaktan Erişim</p>
        
        <button 
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 py-4 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 hover:border-cyan-300 transition-all shadow-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" referrerPolicy="no-referrer" />
          Google ile Giriş Yap
        </button>
        
        <div className="mt-10 pt-10 border-t border-slate-100">
          <p className="text-xs text-slate-400 leading-relaxed">
            Bu uygulama bulut tabanlıdır. Verileriniz tüm cihazlarınızda gerçek zamanlı olarak senkronize edilir.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
