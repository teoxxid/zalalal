import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../store';
import { showNotification } from '../store/slices/uiSlice';
import { AdminDashboard } from '../components/AdminDashboard';

const AdminPage: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, isAuthChecked } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (!isAuthChecked) return;
    if (!isAuthenticated || !user || user.role !== 'ADMIN') {
      dispatch(showNotification({ type: 'error', message: 'Доступ запрещён' }));
      navigate('/', { replace: true });
      return;
    }
  }, [isAuthenticated, isAuthChecked, user, navigate, dispatch]);

  // Показываем лоадер, пока идёт проверка авторизации
  if (!isAuthChecked) {
    return (
      <div className="container" style={{ padding: '50px', textAlign: 'center' }}>
        <div className="loader-spinner" style={{ margin: '0 auto 20px' }}></div>
        <p>Проверка прав...</p>
      </div>
    );
  }

  // Если пользователь не аутентифицирован, не является админом, 
  // или у пользователя нет id — не рендерим компонент
  if (!isAuthenticated || !user || user.role !== 'ADMIN' || user.id === undefined) {
    return null;
  }

  return <AdminDashboard currentUser={{ ...user, id: user.id! }} />;
};

export default AdminPage;
