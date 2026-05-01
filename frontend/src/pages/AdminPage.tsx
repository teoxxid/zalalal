import React from 'react';
import { useAuth } from '../context/AuthContext';

const AdminPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div style={{ maxWidth: 600, margin: '50px auto', padding: 20 }}>
      <h2>Admin Page</h2>
      <p><strong>Пользователь:</strong> {user?.username}</p>
      <p><strong>Роль:</strong> {user?.role}</p>
      <p>Эта страница доступна <strong>только администраторам (ADMIN)</strong>.</p>
      <button onClick={logout} style={{ padding: '10px 20px', marginTop: 20 }}>Выйти</button>
    </div>
  );
};

export default AdminPage;
