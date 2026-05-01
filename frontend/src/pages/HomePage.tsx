import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const HomePage: React.FC = () => {
  const { user, isAdmin } = useAuth();

  return (
    <div style={{ maxWidth: 800, margin: '50px auto', padding: 20 }}>
      <h1>Добро пожаловать в VoltMarket</h1>
      {user ? (
        <div>
          <p>Вы вошли как <strong>{user.username}</strong> (роль: {user.role})</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <Link to="/user-page">
              <button>User Page</button>
            </Link>
            {isAdmin && (
              <Link to="/admin-page">
                <button>Admin Page</button>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div>
          <p>Вы не авторизованы</p>
          <Link to="/login">
            <button>Войти</button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default HomePage;
