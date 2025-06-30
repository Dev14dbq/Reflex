import React from 'react';
import { FiLoader } from 'react-icons/fi';

interface LoadingCardProps {
  title?: string;
  description?: string;
  className?: string;
}

export const LoadingCard: React.FC<LoadingCardProps> = ({ 
  title = "Загрузка...", 
  description,
  className 
}) => {
  return (
    <div className={`neu-card text-center max-w-sm w-full ${className || ""}`}>
      <div className="neu-animate-pulse mb-4 w-16 h-16 rounded-full bg-gradient-to-br from-neu-accent-primary to-neu-accent-secondary flex items-center justify-center mx-auto">
        <FiLoader className="text-white text-2xl animate-spin" />
      </div>
      <h2 className="text-xl font-semibold mb-2 neu-text-primary">{title}</h2>
      {description && (
        <p className="neu-text-secondary">{description}</p>
      )}
    </div>
  );
}; 