import React from 'react';
import { FiXCircle, FiAlertTriangle } from 'react-icons/fi';

interface BannedScreenProps {
  blockReason?: string;
  blockedAt?: string;
}

export const BannedScreen: React.FC<BannedScreenProps> = ({ blockReason, blockedAt }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-neu-bg-primary flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
        {/* Иконка бана */}
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <FiXCircle className="w-10 h-10 text-red-600" />
        </div>

        {/* Заголовок */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Вы заблокированы
        </h1>

        {/* Причина блокировки */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <FiAlertTriangle className="w-5 h-5 text-red-600" />
            <span className="font-semibold text-red-800">Причина блокировки:</span>
          </div>
          <p className="text-red-700 text-sm leading-relaxed">
            {blockReason || 'Не указана'}
          </p>
        </div>

        {/* Дата блокировки */}
        {blockedAt && (
          <div className="text-gray-600 text-sm mb-6">
            <span className="font-medium">Заблокирован:</span> {formatDate(blockedAt)}
          </div>
        )}

        {/* Информация о разблокировке */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <h3 className="font-semibold text-gray-800 mb-2">Как разблокироваться?</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Если вы считаете, что блокировка была ошибочной, обратитесь в поддержку через 
            <span className="font-medium text-blue-600"> @spectrmod</span>
          </p>
        </div>

        {/* Кнопка поддержки */}
        <a
          href="https://t.me/spectrmod"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-6 bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200"
        >
          Обратиться в поддержку
        </a>
      </div>
    </div>
  );
}; 