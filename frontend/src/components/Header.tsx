import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

interface HeaderProps {
  user: { username: string; role: string } | null;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const cartCount = useSelector((state: RootState) => state.cart.items.length);

  return (
    <header className="header">
      <Link to="/pages/" className="logo">
        <span className="logo-text">VoltMarket</span>
      </Link>
      
      <nav className="main-nav">
        <Link to="/pages/" className="nav-link">Главная</Link>
        <Link to="/pages/catalog/" className="nav-link">Каталог</Link>
        {user?.role === 'ADMIN' && (
          <Link to="/pages/admin-page/" className="nav-link">Админка</Link>
        )}
      </nav>
      
      <div className="header-right">
        <form className="search-form" onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const search = formData.get('search');
          navigate(`/pages/catalog/?search=${search}`);
        }}>
          <input type="text" name="search" className="search-input" placeholder="Поиск по названию..." />
          <button type="submit" className="search-button">🔍</button>
        </form>
        
        <Link to="/pages/cart/" className="cart-widget">
          <span className="cart-text">🛒 Заявки</span>
          {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
        </Link>
        
        {user ? (
          <>
            <span className="nav-link">👤 {user.username}</span>
            <button 
              onClick={onLogout} 
              className="nav-link" 
              style={{background:'none', border:'none', color:'#005bff', cursor:'pointer', padding:0}}
            >
              Выйти
            </button>
          </>
        ) : (
          <Link to="/login/" className="nav-link">Войти</Link>
        )}
      </div>
    </header>
  );
};

export default Header;
