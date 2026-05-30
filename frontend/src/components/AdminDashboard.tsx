import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { showNotification } from '../store/slices/uiSlice';

interface User {
  id: number;
  username: string;
  email?: string;
  role: 'USER' | 'ADMIN';
}

interface Order {
  id: number;
  user: { id: number; username: string };
  status: 'draft' | 'submitted' | 'completed' | 'rejected' | 'deleted';
  total_amount: number;
  total_items: number;
  created_at: string;
}

interface Service {
  id: number;
  name: string;
  price: number;
  category: string;
  status: 'active' | 'inactive';
}

interface OrderStats {
  total: number;
  pending: number;
  completed: number;
  rejected: number;
  revenue: number;
}

interface AdminDashboardProps {
  currentUser: User;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const dispatch = useDispatch();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'users' | 'services'>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [orderFilter, setOrderFilter] = useState<'all' | 'submitted' | 'completed' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderStats, setOrderStats] = useState<OrderStats>({
    total: 0, pending: 0, completed: 0, rejected: 0, revenue: 0,
  });

  useEffect(() => {
    fetchAdminData();
    const interval = activeTab === 'orders' ? setInterval(fetchAdminData, 30000) : undefined;
    return () => { if (interval) clearInterval(interval); };
  }, [activeTab]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [ordersRes, usersRes, servicesRes] = await Promise.allSettled([
        fetch('/api/orders/?exclude_draft=true', { credentials: 'include' }),
        fetch('/api/users/', { credentials: 'include' }),
        fetch('/api/services/', { credentials: 'include' }),
      ]);

      if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
        const data = await ordersRes.value.json();
        const ordersList: Order[] = data.data || data || [];
        setOrders(ordersList);
        setOrderStats({
          total: ordersList.filter(o => o.status !== 'draft').length,
          pending: ordersList.filter(o => o.status === 'submitted').length,
          completed: ordersList.filter(o => o.status === 'completed').length,
          rejected: ordersList.filter(o => o.status === 'rejected').length,
          revenue: ordersList.filter(o => o.status === 'completed').reduce((sum, o) => sum + (o.total_amount || 0), 0),
        });
      }
      if (usersRes.status === 'fulfilled' && usersRes.value.ok) {
        const data = await usersRes.value.json();
        setUsers(data.data || data || []);
      }
      if (servicesRes.status === 'fulfilled' && servicesRes.value.ok) {
        const data = await servicesRes.value.json();
        setServices(data.data || data || []);
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      dispatch(showNotification({ type: 'error', message: 'Ошибка загрузки данных' }));
    } finally {
      setLoading(false);
    }
  };

  const handleOrderStatusChange = async (orderId: number, newStatus: 'completed' | 'rejected') => {
    if (!window.confirm(`Подтвердить: ${newStatus === 'completed' ? 'Завершить' : 'Отклонить'} заявку #${orderId}?`)) return;
    setActionLoading(orderId);
    try {
      const endpoint = newStatus === 'completed' ? `/api/orders/${orderId}/complete/` : `/api/orders/${orderId}/reject/`;
      const response = await fetch(endpoint, {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        setOrderStats(prev => ({
          ...prev,
          [newStatus]: prev[newStatus] + 1,
          pending: prev.pending - 1,
          revenue: newStatus === 'completed' ? prev.revenue + (orders.find(o => o.id === orderId)?.total_amount || 0) : prev.revenue,
        }));
        dispatch(showNotification({ type: 'success', message: `Заявка #${orderId} ${newStatus === 'completed' ? 'завершена' : 'отклонена'}` }));
      } else {
        dispatch(showNotification({ type: 'error', message: 'Ошибка изменения статуса' }));
      }
    } catch {
      dispatch(showNotification({ type: 'error', message: 'Ошибка сети' }));
    } finally {
      setActionLoading(null);
    }
  };

  const handleUserRoleChange = async (userId: number, newRole: 'USER' | 'ADMIN') => {
    try {
      const res = await fetch(`/api/users/${userId}/`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        dispatch(showNotification({ type: 'success', message: `Роль изменена на ${newRole === 'ADMIN' ? 'Администратор' : 'Пользователь'}` }));
      } else {
        dispatch(showNotification({ type: 'error', message: 'Ошибка изменения роли' }));
      }
    } catch {
      dispatch(showNotification({ type: 'error', message: 'Ошибка сети' }));
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = { submitted: '#f59e0b', completed: '#10b981', rejected: '#ef4444', deleted: '#94a3b8' };
    return colors[status] || '#64748b';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = { submitted: 'На рассмотрении', completed: 'Завершена', rejected: 'Отклонена', deleted: 'Удалена' };
    return texts[status] || status;
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const filteredOrders = orders.filter(order => {
    const matchesStatus = orderFilter === 'all' || order.status === orderFilter;
    const matchesSearch = !searchQuery || order.id.toString().includes(searchQuery) || order.user.username.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="container" style={{ padding: '50px', textAlign: 'center' }}>
        <div className="loader-spinner" style={{ margin: '0 auto 20px' }}></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="admin-page-container">
      <div className="admin-header">
        <div>
          <h1 className="admin-page-title">Панель администратора</h1>
          <p className="admin-page-subtitle">Управление заявками, пользователями и товарами</p>
        </div>
      </div>

      <div className="admin-tabs">
        {[
          { id: 'overview', label: 'Обзор' },
          { id: 'orders', label: 'Заявки', count: orderStats.pending },
          { id: 'users', label: 'Пользователи', count: users.length },
          { id: 'services', label: 'Товары', count: services.filter(s => s.status === 'active').length },
        ].map(tab => (
          <button 
            key={tab.id} 
            type="button" 
            className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`} 
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && <span className="tab-badge">{tab.count}</span>}
          </button>
        ))}
      </div>

      <div className="admin-content">
        {activeTab === 'overview' && (
          <div className="admin-overview">
            <h2 className="admin-section-title">Статистика заявок</h2>
            <div className="stats-grid-admin">
              <div className="stat-card-admin">
                <div className="stat-icon-admin" style={{ background: '#dbeafe', color: '#3b82f6' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                  </svg>
                </div>
                <div className="stat-value-admin">{orderStats.total}</div>
                <div className="stat-label-admin">Всего заявок</div>
              </div>
              <div className="stat-card-admin">
                <div className="stat-icon-admin" style={{ background: '#fef3c7', color: '#f59e0b' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <div className="stat-value-admin">{orderStats.pending}</div>
                <div className="stat-label-admin">На рассмотрении</div>
              </div>
              <div className="stat-card-admin">
                <div className="stat-icon-admin" style={{ background: '#d1fae5', color: '#10b981' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div className="stat-value-admin">{orderStats.completed}</div>
                <div className="stat-label-admin">Завершённые</div>
              </div>
              <div className="stat-card-admin">
                <div className="stat-icon-admin" style={{ background: '#fee2e2', color: '#ef4444' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </div>
                <div className="stat-value-admin">{orderStats.rejected}</div>
                <div className="stat-label-admin">Отклонённые</div>
              </div>
              <div className="stat-card-admin">
                <div className="stat-icon-admin" style={{ background: '#f3e8ff', color: '#8b5cf6' }}>
                  <span style={{ fontSize: 22, fontWeight: 600 }}>₽</span>
                </div>
                <div className="stat-value-admin">{orderStats.revenue.toLocaleString('ru-RU')}</div>
                <div className="stat-label-admin">Выручка</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="admin-table-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <h2 className="admin-section-title">Управление заявками</h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input 
                  type="text" 
                  placeholder="Поиск..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="filter-input" 
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e0e0e0', minWidth: '200px' }} 
                />
                <select 
                  value={orderFilter} 
                  onChange={(e) => setOrderFilter(e.target.value as typeof orderFilter)} 
                  className="filter-select" 
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e0e0e0' }}
                >
                  <option value="all">Все статусы</option>
                  <option value="submitted">На рассмотрении</option>
                  <option value="completed">Завершённые</option>
                  <option value="rejected">Отклонённые</option>
                </select>
                <button type="button" className="btn btn-secondary" onClick={fetchAdminData}>Обновить</button>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Пользователь</th>
                    <th>Сумма</th>
                    <th>Товаров</th>
                    <th>Статус</th>
                    <th>Дата</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length > 0 ? filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td>#{order.id}</td>
                      <td>{order.user.username}</td>
                      <td>{order.total_amount?.toLocaleString('ru-RU')} ₽</td>
                      <td>{order.total_items}</td>
                      <td>
                        <span 
                          className="status-badge" 
                          style={{ 
                            background: getStatusColor(order.status) + '20', 
                            color: getStatusColor(order.status), 
                            padding: '4px 12px', 
                            borderRadius: '20px', 
                            fontSize: '12px' 
                          }}
                        >
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', color: '#666' }}>{formatDate(order.created_at)}</td>
                      <td>
                        {order.status === 'submitted' && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button 
                              type="button" 
                              className="btn-sm btn-success" 
                              onClick={() => handleOrderStatusChange(order.id, 'completed')} 
                              disabled={actionLoading === order.id}
                            >
                              {actionLoading === order.id ? '...' : '✓'}
                            </button>
                            <button 
                              type="button" 
                              className="btn-sm btn-danger" 
                              onClick={() => handleOrderStatusChange(order.id, 'rejected')} 
                              disabled={actionLoading === order.id}
                            >
                              {actionLoading === order.id ? '...' : '✕'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="empty-table" style={{ padding: '40px' }}>Заявок не найдено</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="admin-table-container">
            <h2 className="admin-section-title">Пользователи</h2>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Имя</th>
                  <th>Email</th>
                  <th>Роль</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map((userItem) => (
                  <tr key={userItem.id}>
                    <td>{userItem.id}</td>
                    <td>{userItem.username}</td>
                    <td>{userItem.email || '—'}</td>
                    <td>
                      <span 
                        className="role-badge" 
                        style={{ 
                          background: userItem.role === 'ADMIN' ? '#fee2e2' : '#dbeafe', 
                          color: userItem.role === 'ADMIN' ? '#dc2626' : '#3b82f6', 
                          padding: '4px 12px', 
                          borderRadius: '20px', 
                          fontSize: '12px' 
                        }}
                      >
                        {userItem.role === 'ADMIN' ? 'Администратор' : 'Пользователь'}
                      </span>
                    </td>
                    <td>
                      {userItem.role === 'ADMIN' ? (
                        <button type="button" className="btn-sm btn-secondary" onClick={() => handleUserRoleChange(userItem.id, 'USER')}>
                          Снять админа
                        </button>
                      ) : (
                        <button type="button" className="btn-sm btn-primary" onClick={() => handleUserRoleChange(userItem.id, 'ADMIN')}>
                          Сделать админом
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="admin-table-container">
            <h2 className="admin-section-title">Товары</h2>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Название</th>
                  <th>Категория</th>
                  <th>Цена</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id}>
                    <td>{service.id}</td>
                    <td>{service.name}</td>
                    <td>{service.category}</td>
                    <td>{service.price.toLocaleString('ru-RU')} ₽</td>
                    <td>
                      <span 
                        className="status-badge" 
                        style={{ 
                          background: getStatusColor(service.status) + '20', 
                          color: getStatusColor(service.status), 
                          padding: '4px 12px', 
                          borderRadius: '20px', 
                          fontSize: '12px' 
                        }}
                      >
                        {getStatusText(service.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
