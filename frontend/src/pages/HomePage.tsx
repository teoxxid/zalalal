import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

interface Service {
  id: number;
  name: string;
  price: number;
  image_url?: string;
  category?: string;
}

interface HomePageProps {
  user: { username: string; role: 'USER' | 'ADMIN' } | null;
  services?: Service[];
}

const MOCK_SERVICES: Service[] = [
  { id: 1, name: 'iPhone 16 Pro', price: 120000, category: 'Смартфоны', image_url: '/placeholder.svg' },
  { id: 2, name: 'Samsung Galaxy S24 Ultra', price: 110000, category: 'Смартфоны', image_url: '/placeholder.svg' },
  { id: 3, name: 'MacBook Pro 16"', price: 250000, category: 'Ноутбуки', image_url: '/placeholder.svg' },
  { id: 4, name: 'Sony WH-1000XM5', price: 35000, category: 'Аудио', image_url: '/placeholder.svg' },
];

const HomePage: React.FC<HomePageProps> = ({ user, services: propServices }) => {
  const [popularServices, setPopularServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  
  const isMockMode = import.meta.env.MODE === 'mock';

  useEffect(() => {
    if (propServices && propServices.length > 0) {
      setPopularServices(propServices);
      setLoadingServices(false);
      return;
    }
    
    if (isMockMode) {
      setPopularServices(MOCK_SERVICES);
      setLoadingServices(false);
      return;
    }
    
    const fetchPopular = async () => {
      try {
        const { data: json } = await api.get('/services/', { params: { limit: 4 } });
        const data = json.results || json.data || json;
        const servicesList = Array.isArray(data) ? data : [];
        setPopularServices(servicesList.slice(0, 4));
      } catch (err) {
        console.error('Failed to fetch popular services:', err);
        setPopularServices(MOCK_SERVICES);
      } finally {
        setLoadingServices(false);
      }
    };
    
    fetchPopular();
  }, [propServices, isMockMode]);

  const services = propServices && propServices.length > 0 ? propServices : popularServices;
  const showVideo = !isMockMode && import.meta.env.DEV;

  return (
    <>
      {showVideo && (
        <section className="hero-section">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="hero-background-video"
          >
            <source src="http://localhost:9000/services/background.mp4" type="video/mp4" />
          </video>
          <div className="hero-overlay">
            <h1>Маркетплейс электронной техники</h1>
            <p>Лучшие товары от лучших производителей</p>
            <Link to="/catalog/" className="hero-btn">Перейти в каталог</Link>
          </div>
        </section>
      )}
      
      {!showVideo && (
        <section className="hero-section" style={{ background: 'linear-gradient(135deg, #005bff 0%, #0047cc 100%)' }}>
          <div className="hero-overlay" style={{ background: 'transparent' }}>
            <h1>Маркетплейс электронной техники</h1>
            <p>Лучшие товары от лучших производителей</p>
            <Link to="/catalog/" className="hero-btn">Перейти в каталог</Link>
          </div>
        </section>
      )}

      <section className="video-catalog">
        <h2>Популярные товары</h2>
        {loadingServices ? (
          <p style={{textAlign:'center',color:'#666',padding:'40px'}}>Загрузка товаров...</p>
        ) : services.length > 0 ? (
          <div className="video-grid">
            {services.slice(0, 4).map((service) => (
              <div key={service.id} className="video-card">
                <Link to={`/service/${service.id}/`} className="video-thumbnail-link">
                  <div className="video-thumbnail">
                    <img
                      src={service.image_url || '/placeholder.svg'}
                      alt={service.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                      loading="lazy"
                    />
                  </div>
                </Link>
                <div className="video-info">
                  <h3>{service.name}</h3>
                  <p className="price">{service.price.toLocaleString('ru-RU')} ₽</p>
                  {service.category && <p className="category">{service.category}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{textAlign:'center',color:'#666',padding:'40px'}}>Товары временно недоступны</p>
        )}
      </section>

      <section className="cta-section">
        <div className="cta-content">
          <h2>Готовы сделать заказ?</h2>
          <p>Перейдите в каталог и выберите нужные товары</p>
          <Link to="/catalog/" className="cta-btn">Перейти в каталог</Link>
        </div>
      </section>

      {!user && (
        <div className="guest-hint">
          <p>
            <Link to="/login/">Войдите</Link> или <Link to="/register/">зарегистрируйтесь</Link>,
            чтобы оформлять заявки и отслеживать их статус
          </p>
        </div>
      )}
    </>
  );
};

export default HomePage;
