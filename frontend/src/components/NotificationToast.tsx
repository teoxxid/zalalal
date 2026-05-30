import React, { useEffect } from 'react';

interface NotificationToastProps {
  type: 'success' | 'error' | 'info' | null;
  message: string | null;
  onClose: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ 
  type, 
  message, 
  onClose 
}) => {
  // Автоматическое закрытие через 3 секунды
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  const getBackground = () => {
    switch (type) {
      case 'success': return '#dcfce7';
      case 'error': return '#fef2f2';
      case 'info': return '#dbeafe';
      default: return '#f0f9ff';
    }
  };

  const getColor = () => {
    switch (type) {
      case 'success': return '#166534';
      case 'error': return '#991b1b';
      case 'info': return '#1e40af';
      default: return '#0369a1';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '20px',
      padding: '12px 20px',
      borderRadius: '8px',
      background: getBackground(),
      color: getColor(),
      fontSize: '14px',
      fontWeight: 500,
      zIndex: 1001,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      animation: 'slideIn 0.3s ease-out',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    }}>
      {type === 'success' && <span></span>}
      {type === 'error' && <span></span>}
      <span>{message}</span>
    </div>
  );
};

export default NotificationToast;
