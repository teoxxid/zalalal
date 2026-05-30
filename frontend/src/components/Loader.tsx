import React from 'react';

interface LoaderProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  overlay?: boolean; // Для затемнения фона при полной загрузке страницы
}

const Loader: React.FC<LoaderProps> = ({ size = 'medium', text, overlay }) => {
  const sizeMap = { small: '24px', medium: '40px', large: '60px' };
  const fontSizeMap = { small: '14px', medium: '16px', large: '18px' };
  const borderWidthMap = { small: '2px', medium: '3px', large: '4px' };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: overlay ? '60px 20px' : '20px',
        ...(overlay && {
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(255,255,255,0.85)',
          zIndex: 9999,
        }),
      }}
    >
      <div
        style={{
          width: sizeMap[size],
          height: sizeMap[size],
          border: `${borderWidthMap[size]} solid #e2e8f0`,
          borderTop: `${borderWidthMap[size]} solid #2563eb`,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      {text && (
        <span style={{ fontSize: fontSizeMap[size], color: '#64748b', fontWeight: 500 }}>
          {text}
        </span>
      )}
      
      {/* Инлайн-анимация без внешних CSS файлов */}
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Loader;
