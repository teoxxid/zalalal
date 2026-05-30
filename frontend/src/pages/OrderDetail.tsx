import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import {
  completeOrderThunk,
  rejectOrderThunk,
  deleteOrderThunk,
} from '../store/thunks/orderThunks';
import { showNotification } from '../store/slices/uiSlice';
import type { Order } from '../store/slices/ordersSlice';
import Loader from '../components/Loader';

interface OrderItem {
  id: number;
  service_id: number;
  quantity: number;
  price_at_time: number;
  service?: {
    name: string;
    image_url?: string;
    category?: string;
  };
}

const OrderDetail: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    if (!orderId) return;
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setOrder(json.data);
        setOrderItems(json.data.items || []);
      } catch (err) {
        console.error('Failed to fetch order:', err);
        dispatch(showNotification({ type: 'error', message: 'Ошибка загрузки заявки' }));
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId, dispatch]);

  const handleComplete = async () => {
    if (!orderId) return;
    setActionLoading(true);
    const result = await dispatch(completeOrderThunk(parseInt(orderId)));
    if (completeOrderThunk.fulfilled.match(result)) {
      dispatch(showNotification({ type: 'success', message: 'Заявка завершена' }));
      setOrder((prev) => prev ? { ...prev, status: 'completed' } : null);
    } else {
      dispatch(showNotification({ type: 'error', message: 'Ошибка завершения' }));
    }
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!orderId) return;
    setActionLoading(true);
    const result = await dispatch(rejectOrderThunk(parseInt(orderId)));
    if (rejectOrderThunk.fulfilled.match(result)) {
      dispatch(showNotification({ type: 'success', message: 'Заявка отклонена' }));
      setOrder((prev) => prev ? { ...prev, status: 'rejected' } : null);
    } else {
      dispatch(showNotification({ type: 'error', message: 'Ошибка отклонения' }));
    }
    setActionLoading(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Удалить заявку? Это действие необратимо.')) return;
    if (!orderId) return;
    setActionLoading(true);
    const result = await dispatch(deleteOrderThunk(parseInt(orderId)));
    if (deleteOrderThunk.fulfilled.match(result)) {
      dispatch(showNotification({ type: 'success', message: 'Заявка удалена' }));
      navigate('/orders/');
    } else {
      dispatch(showNotification({ type: 'error', message: 'Ошибка удаления' }));
    }
    setActionLoading(false);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Черновик',
      submitted: 'Отправлена',
      completed: 'Завершена',
      rejected: 'Отклонена',
      deleted: 'Удалена',
    };
    return labels[status] || status;
  };

  if (loading) return <Loader size="large" text="Загрузка заявки..." />;
  if (!order) {
    return (
      <div className="container">
        <div className="not-found-card">
          <h1 className="not-found-code">404</h1>
          <p>Заявка не найдена</p>
          <Link to="/orders/" className="btn btn-primary">Вернуться к списку</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="order-detail">
      <div className="order-header">
        <Link to="/orders/" className="back-button">← Назад</Link>
        <h1>Заявка №{order.id}</h1>
      </div>

      <div className="order-info">
        <p><strong>Статус:</strong> <span className={`status-badge status-${order.status}`}>{getStatusLabel(order.status)}</span></p>
        <p><strong>Дата создания:</strong> {new Date(order.created_at).toLocaleString('ru-RU')}</p>
        {order.submitted_at && <p><strong>Дата оформления:</strong> {new Date(order.submitted_at).toLocaleString('ru-RU')}</p>}
        {order.completed_at && <p><strong>Дата завершения:</strong> {new Date(order.completed_at).toLocaleString('ru-RU')}</p>}
        <p><strong>Общая сумма:</strong> <strong className="order-total">{order.total_amount?.toLocaleString('ru-RU')} ₽</strong></p>
      </div>

      <div className="order-items">
        <h2>Товары в заявке</h2>
        {orderItems.length > 0 ? (
          orderItems.map((item) => (
            <div key={item.id} className="order-item">
              <Link to={`/service/${item.service_id}/`} className="order-item-link">
                <div className="order-item-image-wrapper">
                  <img
                    src={item.service?.image_url || '/placeholder.svg'}
                    alt={item.service?.name || 'Товар'}
                    className="order-item-image"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                  />
                </div>
                <div className="order-item-info">
                  <div className="item-details">
                    <h3>{item.service?.name || 'Товар'}</h3>
                    <p>{item.service?.category || ''}</p>
                  </div>
                  <div className="item-meta">
                    <p className="item-price">{item.price_at_time?.toLocaleString('ru-RU')} ₽</p>
                    <div className="item-quantity">
                      <span className="quantity-label">Кол-во:</span>
                      <span className="quantity-value">{item.quantity}</span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ))
        ) : (
          <div className="empty-cart">
            <p>В заявке нет товаров</p>
            <Link to="/catalog/" className="btn btn-primary">Перейти в каталог</Link>
          </div>
        )}
      </div>

      {order.status === 'draft' && orderItems.length > 0 && (
        <div className="order-actions">
          <button onClick={handleComplete} disabled={actionLoading} className="complete-order-btn btn btn-success">
            {actionLoading ? 'Завершение...' : 'Завершить заявку'}
          </button>
          <button onClick={handleReject} disabled={actionLoading} className="reject-order-btn btn btn-danger">
            {actionLoading ? 'Отклонение...' : 'Отклонить'}
          </button>
          <button onClick={handleDelete} disabled={actionLoading} className="delete-order-btn btn btn-secondary">
            {actionLoading ? 'Удаление...' : 'Удалить'}
          </button>
        </div>
      )}

      {order.status === 'submitted' && user?.role === 'ADMIN' && (
        <div className="order-actions">
          <button onClick={handleComplete} disabled={actionLoading} className="complete-order-btn btn btn-success">
            {actionLoading ? 'Завершение...' : 'Завершить'}
          </button>
          <button onClick={handleReject} disabled={actionLoading} className="reject-order-btn btn btn-danger">
            {actionLoading ? 'Отклонение...' : 'Отклонить'}
          </button>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;
