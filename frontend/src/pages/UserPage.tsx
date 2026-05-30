import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { showNotification } from '../store/slices/uiSlice';
import type { RootState } from '../store';
import { useSelector } from 'react-redux';

interface User {
  username: string;
  email?: string;
  role: string;
}

interface UserPageProps {
  user: User | null;
  onLogout: () => void;
}

const UserPage: React.FC<UserPageProps> = ({ user, onLogout }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ username: user?.username || '', email: user?.email || '' });
  
  const cartItems = useSelector((state: RootState) => state.cart.items || []);
  const orders = useSelector((state: RootState) => state.orders.list || []);
  
  const ordersCount = orders.length;
  const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalSpent = orders.filter(order => order.status === 'completed').reduce((sum, order) => sum + (order.total_amount || 0), 0);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleEditOpen = () => {
    setEditForm({ username: user?.username || '', email: user?.email || '' });
    setIsEditing(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.username.trim()) {
      dispatch(showNotification({ type: 'error', message: 'Имя не может быть пустым' }));
      return;
    }
    setIsEditing(false);
    dispatch(showNotification({ type: 'success', message: 'Профиль обновлен' }));
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      dispatch(showNotification({ type: 'error', message: 'Минимум 6 символов' }));
      return;
    }
    if (newPassword !== confirmPassword) {
      dispatch(showNotification({ type: 'error', message: 'Пароли не совпадают' }));
      return;
    }
    setIsChangingPassword(true);
    await new Promise(r => setTimeout(r, 800));
    dispatch(showNotification({ type: 'success', message: 'Пароль изменён' }));
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    setIsChangingPassword(false);
  };

  const handleLogoutClick = () => {
    if (window.confirm('Выйти?')) onLogout();
  };

  // 🔹 Кнопка перехода в админку — только если роль ADMIN
  const renderAdminLink = () => {
    if (user?.role === 'ADMIN') {
      return (
        <Link to="/admin-page/" className="btn btn-outline" style={{ borderColor: '#dc2626', color: '#dc2626' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
          Панель администратора
        </Link>
      );
    }
    return null;
  };

  return (
    <div className="user-page-container">
      <div className="user-page-header">
        <div>
          <h1 className="user-page-title">Личный кабинет</h1>
          <p className="user-page-subtitle">Управление профилем и настройками</p>
        </div>
        <button type="button" onClick={handleLogoutClick} className="logout-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Выйти
        </button>
      </div>

      {/* Вкладки — только профиль и безопасность */}
      <div className="user-tabs">
        <button type="button" className={`user-tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Профиль
        </button>
        <button type="button" className={`user-tab ${activeTab === 'password' ? 'active' : ''}`} onClick={() => setActiveTab('password')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          Безопасность
        </button>
      </div>

      <div className="user-content">
        {/* Профиль */}
        {activeTab === 'profile' && (
          <div className="user-section">
            <div className="section-header">
              <h2 className="section-title">Информация о пользователе</h2>
              {!isEditing && <button type="button" onClick={handleEditOpen} className="edit-btn">Редактировать</button>}
            </div>
            {isEditing ? (
              <form onSubmit={handleEditSave} className="password-form">
                <div className="form-group"><label className="form-label">Имя пользователя</label><input type="text" className="form-input" value={editForm.username} onChange={e => setEditForm(p => ({ ...p, username: e.target.value }))} required /></div>
                <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} /></div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>Отмена</button>
                  <button type="submit" className="btn btn-primary">Сохранить</button>
                </div>
              </form>
            ) : (
              <>
                <div className="info-grid">
                  <div className="info-item"><div className="info-label">Имя пользователя</div><div className="info-value">{user?.username || '—'}</div></div>
                  <div className="info-item"><div className="info-label">Email</div><div className="info-value">{user?.email || '—'}</div></div>
                  <div className="info-item"><div className="info-label">Роль</div><div className="info-value"><span className="role-badge" style={{ background: user?.role === 'ADMIN' ? '#fee2e2' : '#dbeafe', color: user?.role === 'ADMIN' ? '#dc2626' : '#3b82f6' }}>{user?.role === 'ADMIN' ? 'Администратор' : 'Пользователь'}</span></div></div>
                </div>
                <div className="stats-grid">
                  <div className="stat-card"><div className="stat-value">{ordersCount}</div><div className="stat-label">Заказов</div></div>
                  <div className="stat-card"><div className="stat-value">{cartCount}</div><div className="stat-label">В корзине</div></div>
                  <div className="stat-card"><div className="stat-value">{totalSpent.toLocaleString('ru-RU')} ₽</div><div className="stat-label">Потрачено</div></div>
                </div>
                {/* Кнопка перехода в админку для админов */}
                {renderAdminLink()}
              </>
            )}
          </div>
        )}

        {/* Смена пароля */}
        {activeTab === 'password' && (
          <div className="user-section">
            <h2 className="section-title">Смена пароля</h2>
            <form onSubmit={handlePasswordChange} className="password-form">
              <div className="form-group"><label className="form-label">Текущий пароль</label><input type="password" className="form-input" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required /></div>
              <div className="form-group"><label className="form-label">Новый пароль (мин. 6 символов)</label><input type="password" className="form-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6} required /></div>
              <div className="form-group"><label className="form-label">Подтвердите пароль</label><input type="password" className="form-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required /></div>
              <button type="submit" className="btn btn-primary" disabled={isChangingPassword}>{isChangingPassword ? 'Сохранение...' : 'Сохранить новый пароль'}</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserPage;
