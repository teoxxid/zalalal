import { useEffect, useMemo } from 'react';
import { Routes, Route, Navigate, Link, useParams, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from './store';

import Login from './pages/Login';
import Register from './pages/Register';
import HomePage from './pages/HomePage';
import UserPage from './pages/UserPage';
import AdminPage from './pages/AdminPage';
import ServiceList from './pages/ServiceList';
import ServiceDetail from './pages/ServiceDetail';
import Cart from './pages/Cart';
import OrderList from './pages/OrderList';
import OrderDetail from './pages/OrderDetail';

import Navbar from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import NotificationToast from './components/NotificationToast';

import { logoutThunk } from './store/thunks/authThunks';
import { fetchCartIconThunk } from './store/thunks/orderThunks';
import { clearNotification } from './store/slices/uiSlice';
import { clearFilters } from './store/slices/filterSlice';
import { clearCart } from './store/slices/cartSlice';

const ServiceRedirect: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/service/${id}/`} replace />;
};

const OrderRedirect: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  return <Navigate to={`/order/${orderId}/`} replace />;
};

const NotFoundPage: React.FC = () => (
  <div className="not-found-page">
    <div className="not-found-card">
      <h1 className="not-found-code">404</h1>
      <p className="not-found-text">Страница не найдена</p>
      <Link to="/catalog/" className="btn btn-primary">
        Вернуться в каталог
      </Link>
    </div>
  </div>
);

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  
  const { user, isAuthenticated, isLoading: authLoading, isAuthChecked } = useSelector(
    (state: RootState) => state.auth
  );
  const { notification } = useSelector((state: RootState) => state.ui);
  const filters = useSelector((state: RootState) => state.filters);

  const currentPath = useMemo(() => location.pathname, [location.pathname]);

  useEffect(() => {
    if (isAuthenticated && user?.username) {
      dispatch(fetchCartIconThunk());
    }
  }, [dispatch, isAuthenticated, user?.username]);

  useEffect(() => {
    if (currentPath === '/' && (filters.search || filters.category)) {
    }
  }, [currentPath, filters, dispatch]);

  const handleLogout = async () => {
    await dispatch(logoutThunk());
    dispatch(clearCart());
    dispatch(clearNotification());
    dispatch(clearFilters());
  };

  if (!isAuthChecked) {
    return (
      <div className="auth-loader" role="status" aria-live="polite">
        <div className="loader-spinner" aria-hidden="true" />
        <p>Проверка авторизации...</p>
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      <Navbar user={user} onLogout={handleLogout} />
      
      {notification?.type && notification?.message && (
        <NotificationToast
          type={notification.type as "success" | "error" | "info"}
          message={notification.message}
          onClose={() => dispatch(clearNotification())}
        />
      )}
      
      <main className="main-content" id="main-content">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<HomePage user={user} />} />
          <Route path="/catalog/" element={<ServiceList />} />
          <Route path="/service/:serviceId/" element={<ServiceDetail />} />

          <Route
            path="/cart/"
            element={
              <ProtectedRoute 
                isAuthenticated={isAuthenticated} 
                isAuthChecked={isAuthChecked} 
                isLoading={authLoading}
              >
                <Cart />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/"
            element={
              <ProtectedRoute 
                isAuthenticated={isAuthenticated} 
                isAuthChecked={isAuthChecked} 
                isLoading={authLoading}
              >
                <OrderList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-page/"
            element={
              <ProtectedRoute 
                isAuthenticated={isAuthenticated} 
                isAuthChecked={isAuthChecked} 
                isLoading={authLoading}
              >
                <UserPage user={user} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-page/"
            element={
              <ProtectedRoute 
                isAuthenticated={isAuthenticated} 
                isAuthChecked={isAuthChecked} 
                isLoading={authLoading} 
                adminOnly
                user={user}
              >
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/order/:orderId/"
            element={
              <ProtectedRoute
                isAuthenticated={isAuthenticated}
                isAuthChecked={isAuthChecked}
                isLoading={authLoading}
              >
                <OrderDetail />
              </ProtectedRoute>
            }
          />

          <Route path="/pages/" element={<Navigate to="/" replace />} />
          <Route path="/pages/catalog/" element={<Navigate to="/catalog/" replace />} />
          <Route path="/pages/service/:id/" element={<ServiceRedirect />} />
          <Route path="/pages/cart/" element={<Navigate to="/cart/" replace />} />
          <Route path="/pages/orders/" element={<Navigate to="/orders/" replace />} />
          <Route path="/pages/order/:orderId/" element={<OrderRedirect />} />
          <Route path="/pages/user-page/" element={<Navigate to="/user-page/" replace />} />
          <Route path="/pages/admin-page/" element={<Navigate to="/admin-page/" replace />} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      
      <footer className="app-footer" role="contentinfo">
        <div className="container text-center">
          <div style={{ fontSize: '14px', color: '#666' }}>
            <strong>VoltMarket</strong> — маркетплейс электронной техники
          </div>
          <div style={{ marginTop: '8px', fontSize: '13px', color: '#999' }}>
            © 2026 VoltMarket. Все права защищены.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
