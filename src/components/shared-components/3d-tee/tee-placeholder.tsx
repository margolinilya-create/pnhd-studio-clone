// src/components/shared-components/3d-tee/tee-placeholder.tsx
//
// Статичный fallback пока 3D-сцена (three+drei+maath) асинхронно грузится.
// Visual ~3D Tee proportions чтобы не было layout shift.

import React from 'react';

const TeePlaceholder: React.FC = () => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        aspectRatio: '1 / 1',
        background:
          'linear-gradient(135deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.04) 100%)',
        backgroundSize: '200% 200%',
        animation: 'tee-placeholder-pulse 2s ease-in-out infinite',
        borderRadius: 8,
      }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 200 220" width="60%" height="60%" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth={2}>
        <path d="M50 30 L80 15 Q100 25 120 15 L150 30 L180 60 L155 75 L155 200 L45 200 L45 75 L20 60 Z" />
      </svg>
      <style jsx>{`
        @keyframes tee-placeholder-pulse {
          0%, 100% { background-position: 0% 0%; }
          50% { background-position: 100% 100%; }
        }
      `}</style>
    </div>
  );
};

export default TeePlaceholder;
