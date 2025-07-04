import React, { useState, useEffect } from 'react';
import { EditModal } from '@components/ui/EditModal';
import { useCitySearch } from '@hooks/useCitySearch';

interface CityOption {
  value: string;
  data: {
    city: string;
    region: string;
    country: string;
  };
}

interface EditCityModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCity: string;
  onSave: (city: string) => void;
}

export const EditCityModal: React.FC<EditCityModalProps> = ({
  isOpen,
  onClose,
  currentCity,
  onSave
}) => {
  const [city, setCity] = useState(currentCity);
  const [suggestions, setSuggestions] = useState<CityOption[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isValidCity, setIsValidCity] = useState(true);
  const [cityTouched, setCityTouched] = useState(false);
  const { searchCities: searchLocalCities, isLoading: loading } = useCitySearch();

  useEffect(() => {
    setCity(currentCity);
    setIsValidCity(true);
    setCityTouched(false);
  }, [currentCity, isOpen]);

  // Fallback список популярных городов
  const popularCities = [
    { city: "Москва", region: "Москва", country: "Россия" },
    { city: "Санкт-Петербург", region: "Санкт-Петербург", country: "Россия" },
    { city: "Новосибирск", region: "Новосибирская область", country: "Россия" },
    { city: "Екатеринбург", region: "Свердловская область", country: "Россия" },
    { city: "Казань", region: "Республика Татарстан", country: "Россия" },
    { city: "Нижний Новгород", region: "Нижегородская область", country: "Россия" },
    { city: "Челябинск", region: "Челябинская область", country: "Россия" },
    { city: "Самара", region: "Самарская область", country: "Россия" },
    { city: "Омск", region: "Омская область", country: "Россия" },
    { city: "Ростов-на-Дону", region: "Ростовская область", country: "Россия" },
    { city: "Уфа", region: "Республика Башкортостан", country: "Россия" },
    { city: "Красноярск", region: "Красноярский край", country: "Россия" },
    { city: "Воронеж", region: "Воронежская область", country: "Россия" },
    { city: "Пермь", region: "Пермский край", country: "Россия" },
    { city: "Волгоград", region: "Волгоградская область", country: "Россия" },
    { city: "Краснодар", region: "Краснодарский край", country: "Россия" },
    { city: "Саратов", region: "Саратовская область", country: "Россия" },
    { city: "Тюмень", region: "Тюменская область", country: "Россия" },
    { city: "Тольятти", region: "Самарская область", country: "Россия" },
    { city: "Ижевск", region: "Удмуртская Республика", country: "Россия" }
  ];

  // Поиск в fallback списке
  const searchFallbackCities = (query: string): CityOption[] => {
    if (query.length < 2) return [];
    
    const filtered = popularCities
      .filter(city => 
        city.city.toLowerCase().includes(query.toLowerCase()) ||
        city.region.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 8)
      .map(city => ({
        value: `${city.city}, ${city.region}`,
        data: city
      }));
    
    return filtered;
  };



  // Поиск городов в локальной базе
  const searchCities = (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Используем локальный поиск
    const localResults = searchLocalCities(query);
    
    // Конвертируем результаты в нужный формат
    const suggestions = localResults.map(city => ({
      value: city.name,
      data: {
        city: city.name,
        region: '',
        country: ''
      }
    }));

    // Если локальный поиск не дал результатов, используем fallback
    if (suggestions.length === 0) {
      const fallbackResults = searchFallbackCities(query);
      setSuggestions(fallbackResults);
      setShowSuggestions(fallbackResults.length > 0);
    } else {
      setSuggestions(suggestions);
      setShowSuggestions(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCity(value);
    setCityTouched(true);
    
    setIsValidCity(false);
    
    searchCities(value);
  };

  const selectCity = (option: CityOption) => {
    const fullCityName = option.data.region 
      ? `${option.data.city}, ${option.data.region}`
      : option.data.city;
    setCity(fullCityName);
    setSuggestions([]);
    setShowSuggestions(false);
    
    setIsValidCity(true);
    setCityTouched(true);
  };

  const handleSave = () => {
    if (isValidCity) {
      onSave(city.trim());
      onClose();
    }
  };

  const isValid = city.trim().length >= 2 && city.trim().length <= 60 && isValidCity;

  return (
    <EditModal
      isOpen={isOpen}
      onClose={onClose}
      title="Редактировать город"
      onSave={handleSave}
      saveDisabled={!isValid}
      rules="Выберите город из предложенных вариантов"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium neu-text-primary">
            Город
          </label>
          <div className="relative">
            <input
              type="text"
              value={city}
              onChange={handleInputChange}
              onFocus={() => city.length >= 2 && setShowSuggestions(true)}
              className={`w-full px-3 py-2 pr-10 rounded-neu-md bg-neu-surface border focus:outline-none focus:ring-2 neu-text-primary ${
                cityTouched && !isValidCity 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-neu-border focus:ring-neu-primary'
              }`}
              placeholder="Начните вводить название города..."
              maxLength={60}
              autoFocus
            />
            
            {loading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-neu-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {cityTouched && city.length >= 2 && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {isValidCity ? (
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : !loading && (
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            )}

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-neu-surface border border-neu-border rounded-neu-md shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((option, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => selectCity(option)}
                    className="w-full px-3 py-2 text-left hover:bg-neu-bg-secondary transition-colors border-b border-neu-border/30 last:border-b-0"
                  >
                    <div className="neu-text-primary font-medium">
                      {option.data.city}
                    </div>
                    {option.data.region && (
                      <div className="text-xs neu-text-secondary">
                        {option.data.region}, {option.data.country}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="space-y-1">
            {cityTouched && !isValidCity && city.length >= 2 && (
              <div className="text-xs text-red-500 flex items-center space-x-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span>Выберите город из списка предложений</span>
              </div>
            )}
            
            {cityTouched && isValidCity && (
              <div className="text-xs text-green-600 flex items-center space-x-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Город выбран корректно</span>
              </div>
            )}
            
            <div className="flex justify-between text-xs neu-text-secondary">
              <span className={city.trim().length < 2 ? 'text-red-500' : ''}>
                Минимум 2 символа
              </span>
              <span className={city.length > 60 ? 'text-red-500' : ''}>
                {city.length}/60
              </span>
            </div>
          </div>
        </div>
      </div>
    </EditModal>
  );
}; 