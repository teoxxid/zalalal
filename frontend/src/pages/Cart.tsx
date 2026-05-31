import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import type { RootState, AppDispatch } from '../store';
import { clearCart } from '../store/slices/cartSlice';
import { showNotification } from '../store/slices/uiSlice';
import { submitOrderThunk, updateCartItemThunk, removeFromCartThunk } from '../store/thunks/orderThunks';
import { deleteMockOrder, isStaticMockMode } from '../services/mockBackend';

const Cart: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { orderId, items, totalAmount } = useSelector((state: RootState) => state.cart);

  const handleDecrement = (serviceId: number) => {
    const item = items.find(i => i.serviceId === serviceId);
    if (item && item.quantity > 1 && orderId) {
      dispatch(updateCartItemThunk({ orderId, serviceId, quantity: item.quantity - 1 }));
    }
  };

  const handleIncrement = (serviceId: number) => {
    const item = items.find(i => i.serviceId === serviceId);
    if (item && orderId) {
      dispatch(updateCartItemThunk({ orderId, serviceId, quantity: item.quantity + 1 }));
    }
  };

  const handleRemove = (serviceId: number) => {
    if (orderId) {
      dispatch(removeFromCartThunk({ orderId, serviceId }));
    }
  };

  const handleSubmit = async () => {
    if (!orderId) return;
    
    setIsSubmitting(true);
    try {
      await dispatch(submitOrderThunk(orderId)).unwrap();
      navigate('/orders/');
    } catch (error) {
      dispatch(showNotification({ type: 'error', message: 'Ошибка оформления заказа' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearCart = () => {
    if (window.confirm('Очистить всю корзину?')) {
      if (isStaticMockMode() && orderId) {
        deleteMockOrder(orderId);
      }
      dispatch(clearCart());
      dispatch(showNotification({ type: 'success', message: 'Корзина очищена' }));
    }
  };

  if (!orderId || items.length === 0) {
    return (
      <div className="empty-cart-wrapper">
        <div className="empty-cart-card">
          <div className="empty-cart-icon">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>
            </svg>
          </div>
          <h2 className="empty-cart-title">Корзина пуста</h2>
          <p className="empty-cart-subtitle">
            Вы ещё не добавили товары.<br />
            Перейдите в каталог, чтобы оформить заказ!
          </p>
          <Link to="/catalog/" className="empty-cart-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
            Перейти в каталог
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page-container">
      <div className="cart-header">
        <div>
          <h1 className="cart-page-title">Корзина</h1>
          <p className="cart-page-subtitle">
            Заказ #{orderId} <span className="status-draft-badge">Черновик</span>
          </p>
        </div>
        <button onClick={handleClearCart} className="clear-cart-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
          Очистить корзину
        </button>
      </div>

      <div className="cart-content">
        <div className="cart-items-section">
          <div className="cart-items-header">
            <h2 className="cart-section-title">Товары ({items.length})</h2>
          </div>

          <div className="cart-items-list">
            {items.map((item) => (
              <div 
                key={item.serviceId} 
                className="cart-item-card"
                onClick={() => navigate(`/service/${item.serviceId}/`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="cart-item-info">
                  {item.image_url && (
                    <div className="cart-item-image-wrapper">
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="cart-item-image"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                      />
                    </div>
                  )}
                  <div className="cart-item-details">
                    <h3 className="cart-item-name">{item.name}</h3>
                    <div className="cart-item-price">
                      {item.price.toLocaleString('ru-RU')} ₽
                    </div>
                  </div>
                </div>

                <div className="cart-item-actions" onClick={(e) => e.stopPropagation()}>
                  <div className="quantity-control-wrapper">
                    <button
                      onClick={() => handleDecrement(item.serviceId)}
                      disabled={item.quantity <= 1}
                      className="quantity-btn-small"
                      title="Уменьшить"
                    >
                      −
                    </button>
                    <span className="quantity-value-small">{item.quantity}</span>
                    <button
                      onClick={() => handleIncrement(item.serviceId)}
                      className="quantity-btn-small"
                      title="Увеличить"
                    >
                      +
                    </button>
                  </div>
                  
                  <div className="cart-item-total-price">
                    {(item.price * item.quantity).toLocaleString('ru-RU')} ₽
                  </div>
                  
                  <button
                    onClick={() => handleRemove(item.serviceId)}
                    className="remove-item-btn cart-remove-btn"
                    title="Удалить товар"
                    type="button"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="cart-summary-section">
          <div className="cart-summary-card">
            <h3 className="cart-summary-title">Итого</h3>
            
            <div className="cart-summary-row">
              <span>Товаров:</span>
              <span>{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
            
            <div className="cart-summary-row">
              <span>На сумму:</span>
              <span className="cart-summary-amount">{totalAmount.toLocaleString('ru-RU')} ₽</span>
            </div>
            
            <div className="cart-summary-divider"></div>
            
            <div className="cart-summary-total">
              <span>К оплате:</span>
              <span className="cart-total-value">{totalAmount.toLocaleString('ru-RU')} ₽</span>
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || items.length === 0}
              className="checkout-btn"
            >
              {isSubmitting ? (
                <>
                  <div className="spinner-small"></div>
                  Оформление...
                </>
              ) : (
                'Оформить заказ'
              )}
            </button>
            
            <button
              onClick={() => navigate('/catalog/')}
              className="continue-shopping-btn"
            >
              Продолжить покупки
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
