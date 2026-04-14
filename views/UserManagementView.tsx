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
    <div className="w-full h-full flex flex-col gap-4">
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">Yeni Kullanıcı Ekle</h3>
        {error && <p className="text-red-600 bg-red-100 p-2 rounded-lg mb-4 text-xs">{error}</p>}
        <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">İsim Soyisim</label>
            <input
              type="text"
              value={newUser.name}
              onChange={e => setNewUser(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ahmet Yılmaz"
              className="input-style w-full"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-600 mb-1">E-posta (Giriş için)</label>
            <input
              type="email"
              value={newUser.email}
              onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))}
              placeholder="ahmet@gmail.com"
              className="input-style w-full"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-600 mb-1">Şifre</label>
            <input
              type="password"
              value={newUser.password}
              onChange={e => setNewUser(prev => ({ ...prev, password: e.target.value }))}
              placeholder="••••••••"
              className="input-style w-full"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-600 mb-1">Rol</label>
            <select
              value={newUser.role}
              onChange={e => setNewUser(prev => ({ ...prev, role: e.target.value as 'admin' | 'user' }))}
              className="input-style w-full"
            >
              <option value="user">Kullanıcı</option>
              <option value="admin">Yönetici</option>
            </select>
          </div>
          <div className="md:col-span-4">
            <button type="submit" className="btn-primary w-full">Kullanıcı Ekle</button>
          </div>
        </form>
      </div>
      <div className="flex-grow bg-white border border-slate-200/80 rounded-lg shadow-sm overflow-hidden flex flex-col">
          <header className="p-2 border-b">
            <h2 className="text-lg font-bold text-slate-800">Mevcut Kullanıcılar</h2>
          </header>
          <div className="flex-grow overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[10px] text-slate-600 uppercase bg-slate-100 sticky top-0">
                <tr>
                  <th className="p-2 font-semibold">İsim</th>
                  <th className="p-2 font-semibold">E-posta</th>
                  <th className="p-2 font-semibold">Rol</th>
                  <th className="p-2 font-semibold text-center">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b last:border-b-0 hover:bg-slate-50 transition">
                    <td className="p-2 font-medium text-slate-800">{user.name}</td>
                    <td className="p-2 text-slate-600">{user.email}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${user.role === 'admin' ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-200 text-slate-700'}`}>
                        {user.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => onDeleteUser(user.id)}
                        disabled={user.role === 'admin' && users.filter(u => u.role === 'admin').length === 1}
                        className="p-2 rounded-full text-slate-500 hover:bg-red-100 hover:text-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        title={user.role === 'admin' && users.filter(u => u.role === 'admin').length === 1 ? 'Son yönetici silinemez' : 'Kullanıcıyı Sil'}
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
       <style>{`
            .input-style {
                background-color: white; border: 1px solid #cbd5e1; border-radius: 0.5rem;
                padding: 0.5rem 0.75rem; font-size: 1rem; transition: all 0.2s; height: 42px;
            }
            .input-style:focus {
                outline: none; box-shadow: 0 0 0 2px #e0f2fe, 0 0 0 4px #0ea5e9; border-color: #0ea5e9;
            }
            .btn-primary {
                background-color: #0ea5e9; color: white; font-weight: bold; border-radius: 0.5rem;
                padding: 0 1.5rem; transition: background-color 0.2s; height: 42px;
            }
            .btn-primary:hover { background-color: #0284c7; }
        `}</style>
    </div>
  );
};

export default UserManagementView;
