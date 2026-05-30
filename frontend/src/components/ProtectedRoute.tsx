import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
  isAuthChecked: boolean;
  isLoading?: boolean;
  adminOnly?: boolean;
  user?: { role: string } | null;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  isAuthenticated, 
  isAuthChecked,
  isLoading = false,
  adminOnly,
  user 
}) => {
  const location = useLocation();

  if (!isAuthChecked || isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '60vh',
        color: '#64748b',
        fontSize: '16px'
      }}>
        <div className="loader-spinner" style={{ 
          width: '32px', 
          height: '32px', 
          marginRight: '12px',
          borderWidth: '3px',
          border: '3px solid #e2e8f0',
          borderTop: '3px solid #005bff',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        Проверка авторизации...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  
  if (adminOnly && user?.role !== 'ADMIN') {
    return <Navigate to="/user-page/" replace />;
  }
  
  return <>{children}</>;
};
