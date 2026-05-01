import React from 'react';
import { useAuth } from '../context/AuthContext';

const UserPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div style={{ maxWidth: 600, margin: '50px auto', padding: 20 }}>
      <h2>User Page</h2>
      <p><strong>Пользователь:</strong> {user?.username}</p>
      <p><strong>Роль:</strong> {user?.role}</p>
      <p>Эта страница доступна авторизованным пользователям (USER и ADMIN).</p>
      <button onClick={logout} style={{ padding: '10px 20px', marginTop: 20 }}>Выйти</button>
    </div>
  );
};

export default UserPage;
