import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { showNotification } from '../store/slices/uiSlice';
import { addToCartThunk, fetchCartIconThunk } from '../store/thunks/orderThunks';
import { api } from '../services/api';

interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  category?: string;
  brand?: string;
  rating?: number;
  weight?: number | string;
  image_url?: string;
  video_url?: string;
  status?: string;
}

const MOCK_SERVICE: Service = {
  id: 1,
  name: 'iPhone 16 Pro',
  price: 120000,
  description: 'Флагманский смартфон с передовыми технологиями',
  category: 'Смартфоны',
  brand: 'Apple',
  rating: 4.9,
  image_url: '/placeholder.svg',
  status: 'active',
  weight: 0.22,
};

const ServiceDetail: React.FC = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  
  const user = useSelector((state: RootState) => state.auth.user);
  const isGlobalLoading = useSelector((state: RootState) => state.ui.loading);
  
  const isMockMode = import.meta.env.MODE === 'mock';

  useEffect(() => {
    if (!serviceId) return;
    
    if (isMockMode) {
      setService({ ...MOCK_SERVICE, id: Number(serviceId) });
      setLoading(false);
      return;
    }
    
    const fetchService = async () => {
      try {
        const { data: json } = await api.get(`/services/${serviceId}/`);
        const serviceData = json.data || json;
        setService(serviceData);
      } catch (err) {
        console.error('Failed to fetch service:', err);
        setService({ ...MOCK_SERVICE, id: Number(serviceId) });
        dispatch(showNotification({ type: 'error', message: 'Использован демо-режим' }));
      } finally {
        setLoading(false);
      }
    };
    
    fetchService();
  }, [serviceId, dispatch, isMockMode]);

  const handleAddToCart = async () => {
    if (!service) return;

    // 🔹 БЛОКИРОВКА ДЛЯ РЕЖИМА MOCK
    if (isMockMode) {
      dispatch(showNotification({ 
        type: 'error', 
        message: 'В демо-режиме добавление товаров в корзину недоступно' 
      }));
      return;
    }
    
    if (!user) {
      dispatch(showNotification({ 
        type: 'info', 
        message: 'Войдите, чтобы добавить товар в заказ' 
      }));
      navigate('/login/', { state: { from: `/service/${serviceId}/` } });
      return;
    }
    
    setAddingToCart(true);
    
    const result = await dispatch(addToCartThunk(service.id));
    
    if (addToCartThunk.fulfilled.match(result)) {
      dispatch(showNotification({ 
        type: 'success', 
        message: `${service.name} добавлен в заказ` 
      }));
      dispatch(fetchCartIconThunk());
    } else {
      dispatch(showNotification({ 
        type: 'error', 
        message: (result.payload as string) || 'Ошибка добавления в заказ' 
      }));
    }
    setAddingToCart(false);
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: 50, textAlign: 'center' }}>
        <div className="loader-spinner" style={{ margin: '0 auto 20px' }}></div>
        <p>Загрузка товара...</p>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="container">
        <div className="not-found-card">
          <h1 className="not-found-code">404</h1>
          <p>Товар не найден</p>
          <Link to="/catalog/" className="btn btn-primary">Вернуться в каталог</Link>
        </div>
      </div>
    );
  }

  const hasValidVideo = service.video_url && !hasVideoError && !isMockMode;

  return (
    <div className="container">
      <div className="product-detail-card">
        <div className="product-detail-image-section">
          <div className="product-image-container">
            {hasValidVideo ? (
              <video 
                autoPlay 
                muted 
                loop 
                playsInline 
                controls 
                className="product-detail-media"
                poster={service.image_url || ''}
                onError={() => setHasVideoError(true)}
              >
                <source src={service.video_url} type="video/mp4" />
              </video>
            ) : (
              <img 
                src={service.image_url || '/placeholder.svg'} 
                alt={service.name} 
                className="product-detail-media"
                onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
              />
            )}
          </div>
        </div>

        <div className="product-detail-info">
          <Link to="/catalog/" className="back-link">
            ← Назад в каталог
          </Link>

          <h1 className="product-detail-title">{service.name}</h1>
          
          <div className="product-detail-price">
            {service.price.toLocaleString('ru-RU')} ₽
          </div>

          <div className="product-detail-specs">
            {service.category && (
              <div className="spec-row">
                <span className="spec-label">Категория</span>
                <span className="spec-value">{service.category}</span>
              </div>
            )}
            {service.brand && (
              <div className="spec-row">
                <span className="spec-label">Бренд</span>
                <span className="spec-value">{service.brand}</span>
              </div>
            )}
            {service.weight != null && (
              <div className="spec-row">
                <span className="spec-label">Вес</span>
                <span className="spec-value">{service.weight} кг</span>
              </div>
            )}
            {service.rating && (
              <div className="spec-row">
                <span className="spec-label">Рейтинг</span>
                <span className="spec-value">★ {service.rating}</span>
              </div>
            )}
          </div>
          
          {service.description && (
            <div className="product-detail-description">
              <h3>Описание</h3>
              <p>{service.description}</p>
            </div>
          )}
          
          {user ? (
            <button
              onClick={handleAddToCart}
              disabled={isGlobalLoading || addingToCart || isMockMode}
              className="add-to-order-btn"
            >
              {addingToCart ? 'Добавление...' : 'Добавить в заказ'}
            </button>
          ) : (
            <Link to="/login/" state={{ from: `/service/${serviceId}/` }} className="login-to-add-btn">
              Войдите, чтобы добавить в заказ
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceDetail;
