import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toMediaUrl } from '../services/api';
import { fetchServices, MOCK_SERVICES, type Service } from '../services/serviceFetch';

interface HomePageProps {
  user: { username: string; role: 'USER' | 'ADMIN' } | null;
  services?: Service[];
}

const HomePage: React.FC<HomePageProps> = ({ user, services: propServices }) => {
  const [popularServices, setPopularServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  
  const isMockMode =
    import.meta.env.MODE === 'mock' ||
    import.meta.env.VITE_APP_MODE === 'mock' ||
    (import.meta.env.BASE_URL || '/') !== '/';

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
        setPopularServices(await fetchServices({ limit: 4 }));
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
  const showVideo = !isMockMode;

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
            <source src={toMediaUrl('http://localhost:9000/services/background.mp4')} type="video/mp4" />
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
