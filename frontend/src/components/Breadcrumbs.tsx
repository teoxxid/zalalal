import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  return (
    <div style={{ padding: '10px 20px', background: '#f1f1f1' }}>
      <Link to="/" style={{ textDecoration: 'none', color: '#007bff' }}>
        Главная
      </Link>
      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        return (
          <span key={name}>
            {' / '}
            {isLast ? (
              <span>{name}</span>
            ) : (
              <Link to={routeTo} style={{ textDecoration: 'none', color: '#007bff' }}>
                {name}
              </Link>
            )}
          </span>
        );
      })}
    </div>
  );
};

export default Breadcrumbs;
