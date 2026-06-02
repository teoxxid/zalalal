import React from 'react';
import { Card, Button } from 'react-bootstrap';
import { placeholderAssetUrl } from '../services/mediaAssets';

// 🔹 Интерфейс прямо здесь — никаких импортов не нужно!
interface Service {
  id: number;
  name: string;
  price: number;
  description: string;
  image_url: string;
  category: string;
  brand: string;
  rating: number;
  [key: string]: any;
}

interface ServiceCardProps {
  service: Service;
  onAddToCart: (id: number) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, onAddToCart }) => {
  // 🔹 ГЛАВНОЕ: ссылка с реальным ID, а не ":id"
  const serviceUrl = `/pages/service/${service.id}/`;

  const handleAddClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onAddToCart(service.id);
  };

  return (
    <Card
      className="h-100 service-card"
      style={{ transition: 'transform 0.2s, box-shadow 0.2s' }}
      onMouseOver={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
      }}
      onMouseOut={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'none';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {/* 🔹 Ссылка на страницу товара — ДИНАМИЧЕСКАЯ */}
      <a href={serviceUrl} style={{ textDecoration: 'none', color: 'inherit' }}>
        <Card.Img
          variant="top"
          src={service.image_url || placeholderAssetUrl}
          alt={service.name}
          style={{ height: 200, objectFit: 'cover' }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = placeholderAssetUrl;
          }}
        />
      </a>

      <Card.Body className="d-flex flex-column">
        <Card.Title className="fs-5">{service.name}</Card.Title>
        <Card.Subtitle className="text-muted mb-2">{service.brand}</Card.Subtitle>

        <Card.Text className="flex-grow-1">
          {service.description.length > 100
            ? service.description.substring(0, 100) + '...'
            : service.description}
        </Card.Text>

        <div className="d-flex justify-content-between align-items-center mt-3">
          <span className="fs-5 fw-bold text-primary">
            {service.price.toLocaleString('ru-RU')} ₽
          </span>
          <span className="text-warning">★ {service.rating}</span>
        </div>

        <Button variant="outline-primary" className="mt-3" onClick={handleAddClick}>
          В заявку
        </Button>
      </Card.Body>
    </Card>
  );
};
