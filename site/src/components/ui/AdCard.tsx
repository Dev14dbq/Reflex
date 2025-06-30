import React from 'react';
import { FiExternalLink } from 'react-icons/fi';

interface AdData {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  buttonText: string;
  buttonUrl: string;
}

interface AdCardProps {
  ad: AdData;
  onImpression: (adId: string) => void;
  onClick: (adId: string, url: string) => void;
}

export const AdCard: React.FC<AdCardProps> = ({ ad, onImpression, onClick }) => {
  React.useEffect(() => {
    // Трекаем показ рекламы
    onImpression(ad.id);
  }, [ad.id, onImpression]);

  const handleClick = () => {
    onClick(ad.id, ad.buttonUrl);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 mb-4">
      {/* Заголовок рекламы */}
      <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100">
        <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
          🎯 Реклама
        </span>
      </div>

      {/* Содержимое рекламы */}
      <div className="p-4">
        {ad.imageUrl && (
          <div className="mb-3 rounded-xl overflow-hidden">
            <img 
              src={ad.imageUrl} 
              alt={ad.title}
              className="w-full h-48 object-cover"
              onError={(e) => {
                // Скрываем изображение при ошибке загрузки
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        <div className="space-y-2">
          <h3 className="font-semibold text-gray-900 text-lg leading-tight">
            {ad.title}
          </h3>
          
          <p className="text-gray-600 text-sm leading-relaxed">
            {ad.description}
          </p>

          <button
            onClick={handleClick}
            className="w-full mt-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium py-3 px-4 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
          >
            <FiExternalLink size={16} />
            {ad.buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}; 