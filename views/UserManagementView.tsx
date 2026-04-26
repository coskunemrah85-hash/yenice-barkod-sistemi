import React, { useState } from 'react';
import { User } from '../types';
import Icon from '../components/Icon';

interface UserManagementViewProps {
  users: User[];
  onAddUser: (user: Omit<User, 'id'>) => void;
  onDeleteUser: (userId: string) => void;
}

const UserManagementView: React.FC<UserManagementViewProps> = ({ users, onAddUser, onDeleteUser }) => {
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' as 'admin' | 'user' });
  const [error, setError] = useState('');

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email || !newUser.password) {
      setError('İsim, E-posta ve Şifre alanları zorunludur.');
      return;
    }
    onAddUser(newUser);
    setNewUser({ name: '', email: '', password: '', role: 'user' });
    setError('');
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-[#4c1d95] via-[#1e40af] to-[#0f172a] p-8 overflow-y-auto custom-scrollbar">
      
      <div className="max-w-6xl mx-auto space-y-8">
          {/* 👑 HEADER */}
          <div className="flex items-center justify-between">
              <div>
                  <h1 className="text-3xl font-black text-white tracking-tight uppercase">Kullanıcı <span className="text-indigo-400">Yönetimi</span></h1>
                  <p className="text-[10px] text-white/50 font-bold uppercase tracking-[0.3em]">Sistem Yetkilendirme ve Güvenlik Merkezi</p>
              </div>
              <div className="bg-white/10 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-[1.5rem] flex items-center gap-4 shadow-xl">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">{users.length} Kayıtlı Kullanıcı</span>
              </div>
          </div>

          <div className="grid grid-cols-12 gap-8">
              {/* ➕ YENİ KULLANICI FORMU */}
              <div className="col-span-12 lg:col-span-4">
                  <div className="bg-white/20 backdrop-blur-2xl border border-white/30 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full -mr-16 -mt-16"></div>
                      
                      <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-3">
                          <Icon name="plus" className="w-5 h-5 text-indigo-400" /> Yeni Personel
                      </h3>

                      {error && (
                          <div className="bg-rose-500/20 border border-rose-500/50 p-4 rounded-2xl mb-6 flex items-center gap-3 animate-shake">
                              <Icon name="exclamation-circle" className="w-5 h-5 text-rose-400" />
                              <p className="text-[10px] font-bold text-rose-200 uppercase">{error}</p>
                          </div>
                      )}

                      <form onSubmit={handleAddUser} className="space-y-4">
                          <div>
                              <label className="block text-[10px] font-black text-white/50 uppercase tracking-widest mb-2 ml-2">Ad Soyad</label>
                              <input
                                  type="text"
                                  value={newUser.name}
                                  onChange={e => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                                  placeholder="Örn: Ahmet Yılmaz"
                                  className="w-full bg-white/10 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                              />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-white/50 uppercase tracking-widest mb-2 ml-2">E-Posta</label>
                              <input
                                  type="email"
                                  value={newUser.email}
                                  onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                                  placeholder="ahmet@sirket.com"
                                  className="w-full bg-white/10 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                              />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-white/50 uppercase tracking-widest mb-2 ml-2">Giriş Şifresi</label>
                              <input
                                  type="password"
                                  value={newUser.password}
                                  onChange={e => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                                  placeholder="••••••••"
                                  className="w-full bg-white/10 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                              />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-white/50 uppercase tracking-widest mb-2 ml-2">Yetki Seviyesi</label>
                              <select
                                  value={newUser.role}
                                  onChange={e => setNewUser(prev => ({ ...prev, role: e.target.value as 'admin' | 'user' }))}
                                  className="w-full bg-white/10 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium appearance-none"
                              >
                                  <option value="user" className="bg-slate-900">Standart Kullanıcı</option>
                                  <option value="admin" className="bg-slate-900">Sistem Yöneticisi</option>
                              </select>
                          </div>
                          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white h-14 rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/20 transition-all active:scale-95 mt-4">
                              Kullanıcıyı Kaydet
                          </button>
                      </form>
                  </div>
              </div>

              {/* 📋 KULLANICI LİSTESİ */}
              <div className="col-span-12 lg:col-span-8">
                  <div className="bg-white/10 backdrop-blur-2xl border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden">
                      <header className="p-8 border-b border-white/10 flex justify-between items-center">
                          <h3 className="text-xs font-black text-white/50 uppercase tracking-widest flex items-center gap-3">
                              <Icon name="users" className="w-5 h-5" /> Aktif Kullanıcı Listesi
                          </h3>
                      </header>
                      
                      <div className="overflow-x-auto">
                          <table className="w-full">
                              <thead>
                                  <tr className="bg-white/5">
                                      <th className="px-8 py-5 text-left text-[10px] font-black text-white/40 uppercase tracking-widest">Kullanıcı Bilgisi</th>
                                      <th className="px-8 py-5 text-left text-[10px] font-black text-white/40 uppercase tracking-widest">Rol</th>
                                      <th className="px-8 py-5 text-center text-[10px] font-black text-white/40 uppercase tracking-widest">İşlemler</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                  {users.map(user => (
                                      <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                          <td className="px-8 py-6">
                                              <div className="flex items-center gap-4">
                                                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg">
                                                      {user.name.charAt(0).toUpperCase()}
                                                  </div>
                                                  <div>
                                                      <h4 className="text-[14px] font-black text-white uppercase tracking-tight">{user.name}</h4>
                                                      <p className="text-[10px] text-white/40 font-bold">{user.email}</p>
                                                  </div>
                                              </div>
                                          </td>
                                          <td className="px-8 py-6">
                                              <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full ${
                                                  user.role === 'admin' 
                                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                                  : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                              }`}>
                                                  {user.role === 'admin' ? 'Yönetici' : 'Personel'}
                                              </span>
                                          </td>
                                          <td className="px-8 py-6 text-center">
                                              <button
                                                  onClick={() => onDeleteUser(user.id)}
                                                  disabled={user.role === 'admin' && users.filter(u => u.role === 'admin').length === 1}
                                                  className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed group-hover:scale-110 shadow-lg shadow-rose-500/0 hover:shadow-rose-500/20"
                                              >
                                                  <Icon name="trash" className="w-5 h-5" />
                                              </button>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 20px; }
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};

export default UserManagementView;
