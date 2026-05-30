import React from 'react';
import { useParams, Link } from 'react-router-dom';

const DeletedOrder: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();

  return (
    <div className="deleted-order-container">
      <div className="deleted-order-card">
        <div className="deleted-order-icon">🗑️</div>
        <h1>Заявка #{orderId} удалена</h1>
        <p>Эта заявка была удалена и недоступна для просмотра</p>
        <Link to="/pages/orders/" className="deleted-order-btn btn btn-primary">
          Вернуться к списку заявок
        </Link>
      </div>
    </div>
  );
};

export default DeletedOrder;
