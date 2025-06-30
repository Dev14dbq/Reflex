import React from 'react';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

interface ErrorCardProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryText?: string;
  className?: string;
}

export const ErrorCard: React.FC<ErrorCardProps> = ({ 
  title = "Произошла ошибка", 
  description = "Что-то пошло не так",
  onRetry,
  retryText = "Попробовать снова",
  className 
}) => {
  return (
    <div className={`neu-card text-center max-w-sm w-full ${className || ""}`}>
      <div className="w-16 h-16 rounded-full bg-neu-danger/20 flex items-center justify-center mx-auto mb-4">
        <FiAlertTriangle className="text-neu-danger text-2xl" />
      </div>
      <h2 className="text-xl font-semibold mb-2 neu-text-primary">{title}</h2>
      <p className="neu-text-secondary mb-4">{description}</p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="neu-btn-primary px-6 py-2 rounded-neu-md flex items-center space-x-2 mx-auto"
        >
          <FiRefreshCw />
          <span>{retryText}</span>
        </button>
      )}
    </div>
  );
}; 