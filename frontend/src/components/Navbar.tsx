import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

interface NavbarProps {
  user: { username: string; role: string } | null;
  onLogout: () => void;
  notification?: { type: 'success' | 'error' | 'info' | null; message: string | null };
}

interface NavItem {
  path: string;
  label: string;
  showBadge?: boolean;
  adminOnly?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { items: cartItems } = useSelector((state: RootState) => state.cart);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await onLogout();
    navigate('/login/', { replace: true });
  };

  const handleProfileClick = () => {
    if (user?.role === 'ADMIN') {
      navigate('/admin-page/');
    } else {
      navigate('/user-page/');
    }
  };

  const isActive = (path: string): boolean => location.pathname === path;

  const baseNavLinks: NavItem[] = [
    { path: '/', label: 'Главная' },
    { path: '/catalog/', label: 'Каталог' },
    { path: '/cart/', label: 'Корзина', showBadge: true },
  ];

  const userNavLinks: NavItem[] = user ? [{ path: '/orders/', label: 'Мои заказы' }] : [];

  const adminNavLinks: NavItem[] = user?.role === 'ADMIN' 
    ? [{ path: '/admin-page/', label: 'Админ-панель', adminOnly: true }] 
    : [];

  const allNavLinks = [...baseNavLinks, ...userNavLinks, ...adminNavLinks];

  const renderNavLink = (link: NavItem, isMobile = false) => {
    if (link.adminOnly && user?.role !== 'ADMIN') return null;

    const commonProps = {
      to: link.path,
      onClick: () => isMobile && setMobileMenuOpen(false),
      className: `nav-link ${isActive(link.path) ? 'active' : ''}`,
      style: {
        color: isActive(link.path) ? '#005bff' : (link.adminOnly ? '#dc2626' : '#333'),
        textDecoration: 'none' as const,
        fontSize: isMobile ? 20 : 15,
        fontWeight: isActive(link.path) ? 600 : 500,
        padding: isMobile ? '16px 0' : '8px 0',
        borderBottom: isActive(link.path) ? `2px solid ${link.adminOnly ? '#dc2626' : '#005bff'}` : '2px solid transparent',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        whiteSpace: 'nowrap' as const,
      },
    };

    return (
      <Link key={link.path} {...commonProps}>
        {link.label}
        {link.showBadge && cartItems.length > 0 && (
          <span style={{
            background: '#005bff',
            color: 'white',
            padding: isMobile ? '6px 16px' : '2px 8px',
            borderRadius: isMobile ? 20 : 12,
            fontSize: isMobile ? 14 : 11,
            fontWeight: 'bold',
            minWidth: 20,
            textAlign: 'center' as const,
            marginLeft: isMobile ? 12 : 4,
          }}>
            {cartItems.length}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      <style>{`
        @media (max-width: 900px) {
          .desktop-only { display: none !important; }
          .mobile-only { display: flex !important; }
        }
        @media (min-width: 901px) {
          .desktop-only { display: flex !important; }
          .mobile-only { display: none !important; }
        }
        
        .nav-link, .nav-btn {
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          transition: all 0.2s ease;
        }
        .nav-link:hover {
          color: #005bff !important;
        }
        .nav-link.admin-link:hover {
          color: #dc2626 !important;
        }
        
        .hamburger-line {
          transition: transform 0.3s ease, opacity 0.3s ease;
        }
        .hamburger-line.open-1 {
          transform: rotate(45deg) translate(5px, 5px);
        }
        .hamburger-line.open-2 {
          opacity: 0;
        }
        .hamburger-line.open-3 {
          transform: rotate(-45deg) translate(5px, -5px);
        }
        
        .mobile-menu-enter {
          opacity: 0;
          transform: translateX(-100%);
        }
        .mobile-menu-enter-active {
          opacity: 1;
          transform: translateX(0);
          transition: all 0.3s ease;
        }
      `}</style>

      <nav
        style={{
          background: 'white',
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          position: 'sticky' as const,
          top: 0,
          zIndex: 1000,
          borderBottom: '1px solid #f0f0f0',
        }}
        role="navigation"
        aria-label="Основная навигация"
      >
        <Link
          to="/"
          style={{
            color: '#005bff',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: 'clamp(16px, 4vw, 20px)',
            flexShrink: 0,
          }}
          onClick={() => setMobileMenuOpen(false)}
        >
          VoltMarket
        </Link>

        <div 
          className="desktop-only"
          style={{ 
            display: 'flex', 
            gap: 20,
            alignItems: 'center',
          }}
        >
          {allNavLinks.map(link => renderNavLink(link))}
        </div>

        <div 
          className="desktop-only"
          style={{ 
            display: 'flex', 
            gap: 12, 
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          {user ? (
            <>
              <button
                onClick={handleProfileClick}
                className="nav-btn"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#333',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  padding: '6px 12px',
                  borderRadius: 6,
                }}
                title={user.role === 'ADMIN' ? 'Админ-панель' : 'Личный кабинет'}
                aria-label="Профиль"
              >
                <span style={{ 
                  fontWeight: 500, 
                  maxWidth: 120, 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis' as const,
                  whiteSpace: 'nowrap' as const,
                }}>
                  {user.username}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    padding: '3px 10px',
                    background: user.role === 'ADMIN' ? '#fee2e2' : '#dbeafe',
                    color: user.role === 'ADMIN' ? '#dc2626' : '#3b82f6',
                    borderRadius: 6,
                    fontWeight: 600,
                    textTransform: 'uppercase' as const,
                  }}
                >
                  {user.role === 'ADMIN' ? 'Admin' : 'User'}
                </span>
              </button>
              <button
                onClick={handleLogout}
                className="nav-btn"
                style={{
                  padding: '8px 20px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                }}
                aria-label="Выйти"
              >
                Выйти
              </button>
            </>
          ) : (
            <Link
              to="/login/"
              className="nav-btn"
              style={{
                padding: '8px 24px',
                background: '#005bff',
                color: 'white',
                textDecoration: 'none',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Войти
            </Link>
          )}
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="mobile-only nav-btn"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            display: 'flex',
            flexDirection: 'column' as const,
            gap: 4,
            zIndex: 1001,
          }}
          aria-label={mobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
        >
          <span className={`hamburger-line ${mobileMenuOpen ? 'open-1' : ''}`} style={{
            width: 24,
            height: 2,
            background: '#333',
            borderRadius: 2,
          }}></span>
          <span className={`hamburger-line ${mobileMenuOpen ? 'open-2' : ''}`} style={{
            width: 24,
            height: 2,
            background: '#333',
            borderRadius: 2,
          }}></span>
          <span className={`hamburger-line ${mobileMenuOpen ? 'open-3' : ''}`} style={{
            width: 24,
            height: 2,
            background: '#333',
            borderRadius: 2,
          }}></span>
        </button>

        {mobileMenuOpen && (
          <div
            id="mobile-menu"
            className="mobile-only"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'white',
              zIndex: 999,
              flexDirection: 'column' as const,
              padding: '80px 24px 24px',
              gap: 8,
              overflowY: 'auto' as const,
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Мобильное меню"
          >
            {allNavLinks.map(link => renderNavLink(link, true))}

            <div style={{ 
              height: 1, 
              background: '#f0f0f0', 
              margin: '8px 0 16px' 
            }} />

            {user ? (
              <>
                <button
                  onClick={handleProfileClick}
                  className="nav-btn"
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '16px 0',
                    fontSize: 18,
                    color: '#333',
                    cursor: 'pointer',
                    textAlign: 'left' as const,
                    borderBottom: '1px solid #f0f0f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>Профиль: {user.username}</span>
                  <span style={{
                    fontSize: 12,
                    padding: '4px 12px',
                    background: user.role === 'ADMIN' ? '#fee2e2' : '#dbeafe',
                    color: user.role === 'ADMIN' ? '#dc2626' : '#3b82f6',
                    borderRadius: 20,
                    fontWeight: 600,
                  }}>
                    {user.role === 'ADMIN' ? 'Админ' : 'Пользователь'}
                  </span>
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="nav-btn"
                  style={{
                    padding: '16px',
                    background: '#fef2f2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 16,
                    fontWeight: 500,
                    marginTop: 'auto',
                    width: '100%',
                  }}
                >
                  Выйти из аккаунта
                </button>
              </>
            ) : (
              <Link
                to="/login/"
                onClick={() => setMobileMenuOpen(false)}
                className="nav-btn"
                style={{
                  padding: '16px',
                  background: '#005bff',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 500,
                  textAlign: 'center' as const,
                  marginTop: 'auto',
                  width: '100%',
                }}
              >
                Войти в аккаунт
              </Link>
            )}

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="nav-btn"
              style={{
                padding: '12px',
                background: '#f1f5f9',
                color: '#64748b',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                marginTop: 24,
                width: '100%',
              }}
            >
              Закрыть меню
            </button>
          </div>
        )}

        {mobileMenuOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 998,
            }}
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}
      </nav>
    </>
  );
};

export default Navbar;
