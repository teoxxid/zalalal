import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { addToCartThunk } from '../store/thunks/orderThunks';
import { showNotification } from '../store/slices/uiSlice';
import { setFilters, clearFilters } from '../store/slices/filterSlice';
import Loader from '../components/Loader';
import { api } from '../services/api';

export interface Service {
  id: number;
  name: string;
  price: number;
  description: string;
  category: string;
  brand: string;
  rating?: number;
  image_url?: string;
  video_url?: string;
  status: 'active' | 'inactive' | 'deleted';
  weight?: number;
}

const MOCK_SERVICES: Service[] = [
  {
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
  },
  {
    id: 2,
    name: 'Samsung Galaxy S24 Ultra',
    price: 110000,
    description: 'Мощный смартфон с продвинутой камерой',
    category: 'Смартфоны',
    brand: 'Samsung',
    rating: 4.8,
    image_url: '/placeholder.svg',
    status: 'active',
    weight: 0.23,
  },
  {
    id: 3,
    name: 'MacBook Pro 16"',
    price: 250000,
    description: 'Профессиональный ноутбук для сложных задач',
    category: 'Ноутбуки',
    brand: 'Apple',
    rating: 4.9,
    image_url: '/placeholder.svg',
    status: 'active',
    weight: 2.1,
  },
  {
    id: 4,
    name: 'Sony WH-1000XM5',
    price: 35000,
    description: 'Беспроводные наушники с шумоподавлением',
    category: 'Аудио',
    brand: 'Sony',
    rating: 4.7,
    image_url: '/placeholder.svg',
    status: 'active',
    weight: 0.25,
  },
  {
    id: 5,
    name: 'iPad Air',
    price: 65000,
    description: 'Универсальный планшет для работы и развлечений',
    category: 'Планшеты',
    brand: 'Apple',
    rating: 4.6,
    image_url: '/placeholder.svg',
    status: 'active',
    weight: 0.46,
  },
  {
    id: 6,
    name: 'Apple Watch Series 9',
    price: 45000,
    description: 'Умные часы с расширенными функциями здоровья',
    category: 'Носимые устройства',
    brand: 'Apple',
    rating: 4.8,
    image_url: '/placeholder.svg',
    status: 'active',
    weight: 0.04,
  },
  {
    id: 7,
    name: 'Dell XPS 15',
    price: 180000,
    description: 'Премиальный ноутбук с безрамочным дисплеем',
    category: 'Ноутбуки',
    brand: 'Dell',
    rating: 4.7,
    image_url: '/placeholder.svg',
    status: 'active',
    weight: 1.8,
  },
  {
    id: 8,
    name: 'AirPods Pro 2',
    price: 25000,
    description: 'Наушники с активным шумоподавлением',
    category: 'Аудио',
    brand: 'Apple',
    rating: 4.8,
    image_url: '/placeholder.svg',
    status: 'active',
    weight: 0.05,
  },
];

const ServiceList: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const [addingId, setAddingId] = useState<number | null>(null);

  const filters = useSelector((state: RootState) => state.filters);
  const user = useSelector((state: RootState) => state.auth.user);

  const [localSearch, setLocalSearch] = useState(filters.search);
  const [localCategory, setLocalCategory] = useState(filters.category);
  const [localPriceFrom, setLocalPriceFrom] = useState(filters.priceFrom?.toString() || '');
  const [localPriceTo, setLocalPriceTo] = useState(filters.priceTo?.toString() || '');

  const isMockMode = import.meta.env.MODE === 'mock';
  const [apiServices, setApiServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(!isMockMode);

  useEffect(() => {
    if (isMockMode) return;

    const fetchServices = async () => {
      try {
        const { data: json } = await api.get('/services/');
        const data = json.data || json.results || json;
        setApiServices(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch services:', err);
        setApiServices(MOCK_SERVICES);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [isMockMode]);

  const sourceServices = isMockMode ? MOCK_SERVICES : apiServices;

  const filteredServices = useMemo(() => {
    return sourceServices.filter((service) => {
      if (filters.search && !service.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.category && filters.category !== 'all' && service.category !== filters.category) {
        return false;
      }
      if (filters.priceFrom !== null && service.price < filters.priceFrom) {
        return false;
      }
      if (filters.priceTo !== null && service.price > filters.priceTo) {
        return false;
      }
      return true;
    });
  }, [sourceServices, filters]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlSearch = params.get('search') || '';
    const urlCategory = params.get('category') || '';
    const urlPriceFrom = params.get('price_from');
    const urlPriceTo = params.get('price_to');

    if (urlSearch !== filters.search || urlCategory !== filters.category) {
      dispatch(
        setFilters({
          search: urlSearch,
          category: urlCategory,
          priceFrom: urlPriceFrom ? Number(urlPriceFrom) : null,
          priceTo: urlPriceTo ? Number(urlPriceTo) : null,
        })
      );
    }

    setLocalSearch(urlSearch);
    setLocalCategory(urlCategory);
    setLocalPriceFrom(urlPriceFrom || '');
    setLocalPriceTo(urlPriceTo || '');
  }, [location.search, dispatch, filters]);

  const handleApplyFilters = () => {
    const fromValue = localPriceFrom ? Math.max(0, Number(localPriceFrom)) : null;
    const toValue = localPriceTo ? Math.max(0, Number(localPriceTo)) : null;

    const newFilters = {
      search: localSearch,
      category: localCategory,
      priceFrom: fromValue,
      priceTo: toValue,
    };

    dispatch(setFilters(newFilters));

    const params = new URLSearchParams();
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.category && newFilters.category !== 'all')
      params.set('category', newFilters.category);
    if (newFilters.priceFrom !== null) params.set('price_from', String(newFilters.priceFrom));
    if (newFilters.priceTo !== null) params.set('price_to', String(newFilters.priceTo));

    navigate(`/catalog/?${params}`, { replace: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApplyFilters();
    }
  };

  const handleResetFilters = () => {
    dispatch(clearFilters());
    setLocalSearch('');
    setLocalCategory('');
    setLocalPriceFrom('');
    setLocalPriceTo('');
    navigate('/catalog/', { replace: true });
  };

  const handleAddToCart = async (e: React.MouseEvent, service: Service) => {
    e.stopPropagation();

    if (isMockMode) {
      dispatch(
        showNotification({
          type: 'error',
          message: 'В демо-режиме добавление товаров в корзину недоступно',
        })
      );
      return;
    }

    if (!user) {
      navigate('/login/', { state: { from: '/catalog/' } });
      dispatch(
        showNotification({
          type: 'info',
          message: 'Войдите, чтобы добавить товар в заказ',
        })
      );
      return;
    }

    setAddingId(service.id);

    try {
      const result = await dispatch(addToCartThunk(service.id));
      if (addToCartThunk.fulfilled.match(result)) {
        dispatch(
          showNotification({
            type: 'success',
            message: `«${service.name}» добавлен в заказ`,
          })
        );
      } else {
        dispatch(
          showNotification({
            type: 'error',
            message: 'Ошибка добавления',
          })
        );
      }
    } catch {
      dispatch(
        showNotification({
          type: 'error',
          message: 'Ошибка сети',
        })
      );
    }

    setAddingId(null);
  };

  const categories = useMemo(() => {
    const unique = [...new Set(sourceServices.map((s) => s.category))];
    return ['all', ...unique];
  }, [sourceServices]);

  if (loading && !isMockMode) {
    return <Loader size="large" text="Загрузка каталога..." />;
  }

  return (
    <div className="container">
      <div className="catalog-header">
        <h2 className="page-title">Каталог товаров</h2>
      </div>

      <div className="filters-panel">
        <div className="filter-row">
          <div className="filter-group">
            <label>Поиск:</label>
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Название товара..."
              className="filter-input"
              aria-label="Поиск по названию"
            />
          </div>

          <div className="filter-group">
            <label>Категория:</label>
            <select
              value={localCategory}
              onChange={(e) => setLocalCategory(e.target.value)}
              onKeyDown={handleKeyDown}
              className="filter-select"
              aria-label="Фильтр по категории"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'Все категории' : cat}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Цена от:</label>
            <input
              type="number"
              min="0"
              value={localPriceFrom}
              onChange={(e) => setLocalPriceFrom(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="0"
              className="filter-input"
              aria-label="Минимальная цена"
            />
          </div>

          <div className="filter-group">
            <label>Цена до:</label>
            <input
              type="number"
              min="0"
              value={localPriceTo}
              onChange={(e) => setLocalPriceTo(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="999999"
              className="filter-input"
              aria-label="Максимальная цена"
            />
          </div>

          <div className="filter-buttons">
            <button onClick={handleApplyFilters} className="filter-btn filter-apply" type="button">
              Применить
            </button>
            <button onClick={handleResetFilters} className="filter-btn filter-reset" type="button">
              Сбросить
            </button>
          </div>
        </div>

        {(filters.search || filters.category || filters.priceFrom !== null || filters.priceTo !== null) && (
          <div className="active-filters">
            <span>Активные фильтры:</span>
            {filters.search && <span className="filter-tag">{filters.search}</span>}
            {filters.category && filters.category !== 'all' && (
              <span className="filter-tag">{filters.category}</span>
            )}
            {filters.priceFrom !== null && (
              <span className="filter-tag">от {filters.priceFrom} ₽</span>
            )}
            {filters.priceTo !== null && (
              <span className="filter-tag">до {filters.priceTo} ₽</span>
            )}
            <button
              onClick={handleResetFilters}
              className="filter-reset"
              style={{ marginLeft: 'auto', padding: '4px 12px' }}
              type="button"
            >
              Сбросить все
            </button>
          </div>
        )}
      </div>

      {filteredServices.length > 0 ? (
        <div className="products-grid">
          {filteredServices.map((service) => (
            <article
              key={service.id}
              className="product-card"
              onClick={() => navigate(`/service/${service.id}/`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/service/${service.id}/`);
                }
              }}
              aria-label={`Товар: ${service.name}, цена: ${service.price.toLocaleString('ru-RU')} ₽`}
            >
              <div className="product-image-wrapper">
                <img
                  src={service.image_url || '/placeholder.svg'}
                  alt={service.name}
                  className="product-image"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
              </div>

              <div className="product-info">
                <h3 className="product-title">{service.name}</h3>
                <p className="product-category">{service.category}</p>
                {service.rating && <p className="product-rating">★ {service.rating}</p>}
                <p className="product-price">
                  {service.price.toLocaleString('ru-RU')} ₽
                </p>
              </div>

              <button
                onClick={(e) => handleAddToCart(e, service)}
                disabled={addingId === service.id || isMockMode}
                className="add-to-cart-btn"
                type="button"
                aria-label={`Добавить ${service.name} в заказ`}
              >
                {addingId === service.id ? (
                  <>
                    <span className="spinner-small" />
                    <span>Добавление...</span>
                  </>
                ) : (
                  <>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <circle cx="9" cy="21" r="1" />
                      <circle cx="20" cy="21" r="1" />
                      <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
                      <path d="M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17" />
                    </svg>
                    <span>В заказ</span>
                  </>
                )}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-cart">
          <p>Товары не найдены по заданным фильтрам</p>
          <button onClick={handleResetFilters} className="btn btn-secondary" type="button">
            Сбросить фильтры
          </button>
        </div>
      )}
    </div>
  );
};

export default ServiceList;
