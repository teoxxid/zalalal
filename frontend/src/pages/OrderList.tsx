import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { fetchOrdersThunk } from '../store/thunks/orderThunks';
import type { Order } from '../store/slices/ordersSlice';
import Loader from '../components/Loader';

const OrderList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { list: orders, isLoading } = useSelector((state: RootState) => state.orders);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orderIdSearch, setOrderIdSearch] = useState('');

  useEffect(() => {
    dispatch(fetchOrdersThunk({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }));
    
    const interval = setInterval(() => {
      dispatch(fetchOrdersThunk({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }));
    }, 5000);
    
    return () => clearInterval(interval);
  }, [dispatch, statusFilter, dateFrom, dateTo]);

  const handleApplyFilters = () => {
    dispatch(fetchOrdersThunk({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApplyFilters();
    }
  };

  const handleResetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setStatusFilter('all');
    setOrderIdSearch('');
    dispatch(fetchOrdersThunk());
  };

  const filteredOrders = orders.filter((order: Order) => {
    if (!orderIdSearch) return true;
    return order.id.toString().includes(orderIdSearch);
  });

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Черновик',
      submitted: 'Сформирован',
      completed: 'Завершен',
      rejected: 'Отклонен',
      deleted: 'Удален',
    };
    return labels[status] || status;
  };

  if (isLoading && orders.length === 0) {
    return <Loader size="large" text="Загрузка заказов..." />;
  }

  return (
    <div className="orders-container">
      <h1 className="orders-title">Список заказов</h1>

      <div className="orders-filter">
        <div className="filter-row">
          <div className="filter-group">
            <label>Поиск по № заказа:</label>
            <input
              type="text"
              value={orderIdSearch}
              onChange={(e) => setOrderIdSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Введите номер заказа..."
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <label>Дата с:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              onKeyDown={handleKeyDown}
              className="filter-input filter-date"
            />
          </div>
          <div className="filter-group">
            <label>Дата по:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              onKeyDown={handleKeyDown}
              className="filter-input filter-date"
            />
          </div>
          <div className="filter-group">
            <label>Статус:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">Все статусы</option>
              <option value="draft">Черновик</option>
              <option value="submitted">Сформирован</option>
              <option value="completed">Завершен</option>
              <option value="rejected">Отклонен</option>
              <option value="deleted">Удален</option>
            </select>
          </div>
          <div className="filter-buttons">
            <button onClick={handleApplyFilters} className="filter-btn">Применить</button>
            <button onClick={handleResetFilters} className="filter-reset">Сбросить</button>
          </div>
        </div>
      </div>

      <div className="orders-table-wrapper">
        <table className="orders-table">
          <thead>
            <tr>
              <th>№ заказа</th>
              <th>Статус</th>
              <th>Дата создания</th>
              <th>Сумма</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order: Order) => (
              <tr key={order.id} className={order.status === 'deleted' ? 'deleted-row' : ''}>
                <td className="order-id">{order.id}</td>
                <td>
                  <span className={`status-badge status-${order.status}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </td>
                <td>{new Date(order.created_at).toLocaleDateString('ru-RU')}</td>
                <td className="order-amount">{Number(order.total_amount || 0).toLocaleString('ru-RU')} ₽</td>
                <td>
                  <Link to={`/order/${order.id}/`} className="table-btn view-btn">
                    Просмотр
                  </Link>
                </td>
              </tr>
            ))}
            {filteredOrders.length === 0 && !isLoading && (
              <tr>
                <td colSpan={5} className="empty-table">Заказов не найдено</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="orders-actions">
        <Link to="/catalog/" className="create-order-btn">
          Создать новый заказ
        </Link>
      </div>
    </div>
  );
};

export default OrderList;
