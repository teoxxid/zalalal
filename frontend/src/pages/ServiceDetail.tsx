import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { showNotification } from '../store/slices/uiSlice';
import { addToCartThunk, fetchCartIconThunk } from '../store/thunks/orderThunks';
import { fetchServiceById, fetchServices, MOCK_SERVICES, type Service } from '../services/serviceFetch';
import { cosineSimilarity, getEmbedding } from '../utils/similarity';

const ServiceDetail: React.FC = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [activeMedia, setActiveMedia] = useState<'image' | 'video'>('image');
  const [similarServices, setSimilarServices] = useState<Service[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  
  const user = useSelector((state: RootState) => state.auth.user);
  const isGlobalLoading = useSelector((state: RootState) => state.ui.loading);
  
  const isMockMode =
    import.meta.env.MODE === 'mock' ||
    import.meta.env.VITE_APP_MODE === 'mock' ||
    (import.meta.env.BASE_URL || '/') !== '/';

  useEffect(() => {
    if (!serviceId) return;
    
    const fetchService = async () => {
      try {
        const loadedService = await fetchServiceById(Number(serviceId));
        setService(loadedService);
        setActiveMedia(loadedService.video_url ? 'video' : 'image');
        setHasVideoError(false);
      } catch (err) {
        console.error('Failed to fetch service:', err);
        setService({ ...MOCK_SERVICES[0], id: Number(serviceId) });
        dispatch(showNotification({ type: 'error', message: 'Использован демо-режим' }));
      } finally {
        setLoading(false);
      }
    };
    
    fetchService();
  }, [serviceId, dispatch, isMockMode]);

  useEffect(() => {
    if (!service) return;

    const fallbackSimilar = (items: Service[]) => items
      .filter((item) => item.id !== service.id)
      .map((item) => ({
        item,
        score:
          (item.category === service.category ? 0.5 : 0) +
          (item.brand === service.brand ? 0.3 : 0) -
          Math.min(Math.abs(item.price - service.price) / 500000, 0.2),
      }))
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item)
      .slice(0, 4);

    const loadSimilar = async () => {
      setLoadingSimilar(true);
      let loadedServices: Service[] = [];
      try {
        loadedServices = await fetchServices();
        const candidates = loadedServices.filter((item) => item.id !== service.id);
        const currentEmbedding = await getEmbedding(service.description || service.name);
        const scored = await Promise.all(
          candidates.map(async (candidate) => ({
            service: candidate,
            score: cosineSimilarity(
              currentEmbedding,
              await getEmbedding(candidate.description || candidate.name),
            ),
          })),
        );
        setSimilarServices(
          scored
            .sort((a, b) => b.score - a.score)
            .slice(0, 4)
            .map(({ service: item }) => item),
        );
      } catch (err) {
        console.warn('Не удалось вычислить embeddings, использую похожесть по категории:', err);
        setSimilarServices(fallbackSimilar(loadedServices.length ? loadedServices : MOCK_SERVICES));
      } finally {
        setLoadingSimilar(false);
      }
    };

    loadSimilar();
  }, [service]);

  const handleAddToCart = async () => {
    if (!service) return;

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

  const hasValidVideo = service.video_url && !hasVideoError;

  return (
    <div className="container">
      <div className="product-detail-card">
        <div className="product-detail-image-section">
          <div className="product-image-container">
            {service.video_url && service.image_url && (
              <button
                type="button"
                className="media-arrow media-arrow-left"
                onClick={() => setActiveMedia((current) => current === 'video' ? 'image' : 'video')}
                aria-label="Предыдущее медиа"
              >
                ‹
              </button>
            )}
            {hasValidVideo && activeMedia === 'video' ? (
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
            {service.video_url && service.image_url && (
              <button
                type="button"
                className="media-arrow media-arrow-right"
                onClick={() => setActiveMedia((current) => current === 'video' ? 'image' : 'video')}
                aria-label="Следующее медиа"
              >
                ›
              </button>
            )}
          </div>
          {service.video_url && service.image_url && (
            <div className="media-dots" aria-label="Текущее медиа">
              <span className={activeMedia === 'video' ? 'active' : ''} />
              <span className={activeMedia === 'image' ? 'active' : ''} />
            </div>
          )}
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
              disabled={isGlobalLoading || addingToCart}
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

      <section className="similar-services-section">
        <div className="catalog-header">
          <h2 className="page-title">Похожие товары</h2>
        </div>

        {loadingSimilar ? (
          <div className="similar-loading">
            <div className="loader-spinner" />
            <p>Подбор похожих товаров...</p>
          </div>
        ) : similarServices.length > 0 ? (
          <div className="products-grid">
            {similarServices.map((item) => (
              <article
                key={item.id}
                className="product-card"
                onClick={() => navigate(`/service/${item.id}/`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/service/${item.id}/`);
                  }
                }}
              >
                <div className="product-image-wrapper">
                  <img
                    src={item.image_url || '/placeholder.svg'}
                    alt={item.name}
                    className="product-image"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
                  />
                </div>
                <div className="product-info">
                  <h3 className="product-title">{item.name}</h3>
                  <p className="product-category">{item.category}</p>
                  <p className="product-price">{item.price.toLocaleString('ru-RU')} ₽</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-cart">
            <p>Похожие товары пока не найдены</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default ServiceDetail;
