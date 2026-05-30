import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import {
  completeOrderThunk,
  rejectOrderThunk,
  deleteOrderThunk,
  fetchOrderThunk,
  removeFromCartThunk,
  updateCartItemThunk,
  submitOrderThunk,
} from '../store/thunks/orderThunks';
import { showNotification } from '../store/slices/uiSlice';
import type { Order } from '../store/slices/ordersSlice';
import Loader from '../components/Loader';

interface OrderItem {
  id: number;
  service_id: number;
  quantity: number;
  price_at_time: number | string;
  service?: {
    id?: number;
    name: string;
    image_url?: string;
    category?: string;
  };
  service_name?: string;
  service_price?: number | string;
}

const getServiceId = (item: OrderItem) => Number(item.service_id ?? item.service?.id);
const getItemName = (item: OrderItem) => item.service?.name || item.service_name || 'Товар';
const getItemPrice = (item: OrderItem) => Number(item.price_at_time || item.service_price || 0);

const OrderDetail: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const user = useSelector((state: RootState) => state.auth.user);

  const loadOrder = async () => {
    if (!orderId) return;
    setLoading(true);
    const result = await dispatch(fetchOrderThunk(Number(orderId)));
    if (fetchOrderThunk.fulfilled.match(result)) {
      setOrder(result.payload);
      setOrderItems((result.payload.items || []) as OrderItem[]);
    } else {
      dispatch(showNotification({ type: 'error', message: result.payload as string || 'Ошибка загрузки заявки' }));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const handleQuantityChange = async (item: OrderItem, nextQuantity: number) => {
    if (!orderId || nextQuantity < 1) return;
    const serviceId = getServiceId(item);
    const result = await dispatch(updateCartItemThunk({
      orderId: Number(orderId),
      serviceId,
      quantity: nextQuantity,
    }));
    if (updateCartItemThunk.fulfilled.match(result)) {
      setOrderItems((prev) => prev.map((current) => (
        current.id === item.id ? { ...current, quantity: nextQuantity } : current
      )));
    }
  };

  const handleRemove = async (item: OrderItem) => {
    if (!orderId || !window.confirm(`Удалить "${getItemName(item)}" из заявки?`)) return;
    const result = await dispatch(removeFromCartThunk({
      orderId: Number(orderId),
      serviceId: getServiceId(item),
    }));
    if (removeFromCartThunk.fulfilled.match(result)) {
      setOrderItems((prev) => prev.filter((current) => current.id !== item.id));
    }
  };

  const handleSubmitDraft = async () => {
    if (!orderId) return;
    setActionLoading(true);
    const result = await dispatch(submitOrderThunk(Number(orderId)));
    if (submitOrderThunk.fulfilled.match(result)) {
      setOrder(result.payload);
      dispatch(showNotification({ type: 'success', message: 'Заявка сформирована' }));
    }
    setActionLoading(false);
  };

  const handleComplete = async () => {
    if (!orderId) return;
    setActionLoading(true);
    const result = await dispatch(completeOrderThunk(Number(orderId)));
    if (completeOrderThunk.fulfilled.match(result)) {
      setOrder(result.payload);
    } else {
      dispatch(showNotification({ type: 'error', message: result.payload as string || 'Ошибка завершения' }));
    }
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!orderId) return;
    setActionLoading(true);
    const result = await dispatch(rejectOrderThunk(Number(orderId)));
    if (rejectOrderThunk.fulfilled.match(result)) {
      setOrder(result.payload);
    } else {
      dispatch(showNotification({ type: 'error', message: result.payload as string || 'Ошибка отклонения' }));
    }
    setActionLoading(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Удалить заявку? Это действие необратимо.')) return;
    if (!orderId) return;
    setActionLoading(true);
    const result = await dispatch(deleteOrderThunk(Number(orderId)));
    if (deleteOrderThunk.fulfilled.match(result)) {
      navigate('/orders/');
    }
    setActionLoading(false);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Черновик',
      submitted: 'Сформирована',
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

  const canEditDraft = order.status === 'draft' && user?.role !== 'ADMIN';
  const canModerate = order.status === 'submitted' && user?.role === 'ADMIN';

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
        <p><strong>Общая сумма:</strong> <strong className="order-total">{Number(order.total_amount || 0).toLocaleString('ru-RU')} ₽</strong></p>
      </div>

      <div className="order-items">
        <h2>Товары в заявке</h2>
        {orderItems.length > 0 ? (
          orderItems.map((item) => (
            <div key={item.id} className="order-item">
              <Link to={`/service/${getServiceId(item)}/`} className="order-item-link">
                <div className="order-item-image-wrapper">
                  <img
                    src={item.service?.image_url || '/placeholder.svg'}
                    alt={getItemName(item)}
                    className="order-item-image"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                  />
                </div>
                <div className="order-item-info">
                  <div className="item-details">
                    <h3>{getItemName(item)}</h3>
                    <p>{item.service?.category || ''}</p>
                  </div>
                  <div className="item-meta">
                    <p className="item-price">{getItemPrice(item).toLocaleString('ru-RU')} ₽</p>
                    {canEditDraft ? (
                      <div className="quantity-control-wrapper" onClick={(e) => e.preventDefault()}>
                        <button
                          type="button"
                          className="quantity-btn-small"
                          disabled={item.quantity <= 1}
                          onClick={() => handleQuantityChange(item, item.quantity - 1)}
                        >
                          −
                        </button>
                        <span className="quantity-value-small">{item.quantity}</span>
                        <button
                          type="button"
                          className="quantity-btn-small"
                          onClick={() => handleQuantityChange(item, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <div className="item-quantity">
                        <span className="quantity-label">Кол-во:</span>
                        <span className="quantity-value">{item.quantity}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
              {canEditDraft && (
                <button
                  type="button"
                  className="remove-item-btn"
                  onClick={() => handleRemove(item)}
                  title="Удалить товар"
                >
                  Удалить
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="empty-cart">
            <p>В заявке нет товаров</p>
            <Link to="/catalog/" className="btn btn-primary">Перейти в каталог</Link>
          </div>
        )}
      </div>

      {canEditDraft && orderItems.length > 0 && (
        <div className="order-actions">
          <button onClick={handleSubmitDraft} disabled={actionLoading} className="complete-order-btn btn btn-success">
            {actionLoading ? 'Формирование...' : 'Сформировать заявку'}
          </button>
          <button onClick={handleDelete} disabled={actionLoading} className="delete-order-btn btn btn-secondary">
            {actionLoading ? 'Удаление...' : 'Удалить черновик'}
          </button>
        </div>
      )}

      {canModerate && (
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
