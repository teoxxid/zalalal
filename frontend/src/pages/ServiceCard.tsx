import React from 'react';
import { Link } from 'react-router-dom';
import { placeholderAssetUrl } from '../services/mediaAssets';

export interface Service {
  id: number;
  name: string;
  price: number;
  image_url?: string;
  category?: string;
  brand?: string;
  rating?: number;
  description?: string;
}

export interface ServiceCardProps {
  service: Service;
  onClick?: (service: Service) => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, onClick }) => {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = placeholderAssetUrl;
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      e.preventDefault();
      onClick(service);
    }
  };

  return (
    <article className="service-card">
      <Link 
        to={`/pages/service/${service.id}/`}
        onClick={handleClick}
        className="service-card-link"
      >
        <div className="service-image-wrapper">
          <img 
            src={service.image_url || placeholderAssetUrl}
            alt={service.name}
            onError={handleImageError}
            loading="lazy"
            className="service-image"
            width={300}
            height={200}
          />
        </div>
      </Link>
      
      <div className="service-info">
        <h3 className="service-title">{service.name}</h3>
        
        {service.brand && (
          <p className="service-brand">{service.brand}</p>
        )}
        
        {service.category && (
          <p className="service-category">{service.category}</p>
        )}
        
        {service.rating !== undefined && service.rating > 0 && (
          <p className="service-rating" aria-label={`Рейтинг: ${service.rating} из 5`}>
            ★ {service.rating.toFixed(1)}
          </p>
        )}
        
        <p className="service-price">
          {service.price.toLocaleString('ru-RU')} ₽
        </p>
      </div>
    </article>
  );
};

export default ServiceCard;
