import React, { useState, useEffect } from 'react';
import { FiMapPin, FiCheckCircle, FiAlertCircle, FiArrowRight } from 'react-icons/fi';
import { useCitySearch } from '@hooks/useCitySearch';

import api from '@api';

interface CityOption {
  value: string;
  data: {
    city: string;
    region: string;
    country: string;
  };
}

export const CityMigration: React.FC = () => {
  const [oldCity, setOldCity] = useState('');
  const [newCity, setNewCity] = useState('');
  const [suggestions, setSuggestions] = useState<CityOption[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isValidCity, setIsValidCity] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [step, setStep] = useState<'intro' | 'selection' | 'success'>('intro');
  const { searchCities: searchLocalCities, isLoading: loading } = useCitySearch();

  // Получаем текущий город пользователя
  useEffect(() => {
    const fetchCurrentCity = async () => {
      try {
        const response = await api.get('/profile/me', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setOldCity(data.profile?.city || 'Не указан');
        }
      } catch (error) {
        console.error('Ошибка получения профиля:', error);
      }
    };
    
    fetchCurrentCity();
  }, []);

  // Популярные города для fallback
  const popularCities = [
    { city: "Москва", region: "Москва", country: "Россия" },
    { city: "Санкт-Петербург", region: "Санкт-Петербург", country: "Россия" },
    { city: "Новосибирск", region: "Новосибирская область", country: "Россия" },
    { city: "Екатеринбург", region: "Свердловская область", country: "Россия" },
    { city: "Казань", region: "Республика Татарстан", country: "Россия" },
    { city: "Киев", region: "Киевская область", country: "Украина" },
    { city: "Харьков", region: "Харьковская область", country: "Украина" },
    { city: "Минск", region: "Минская область", country: "Беларусь" },
    { city: "Алматы", region: "Алматинская область", country: "Казахстан" },
    { city: "Ташкент", region: "Ташкентская область", country: "Узбекистан" }
  ];

  // Поиск в fallback списке
  const searchFallbackCities = (query: string): CityOption[] => {
    if (query.length < 2) return [];
    
    return popularCities
      .filter(city => 
        city.city.toLowerCase().includes(query.toLowerCase()) ||
        city.region.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 8)
      .map(city => ({
        value: `${city.city}, ${city.region}`,
        data: city
      }));
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
    setNewCity(value);
    setIsValidCity(false);
    searchCities(value);
  };

  const selectCity = (option: CityOption) => {
    const fullCityName = option.data.region 
      ? `${option.data.city}, ${option.data.region}`
      : option.data.city;
    setNewCity(fullCityName);
    setSuggestions([]);
    setShowSuggestions(false);
    setIsValidCity(true);
  };

  // Сохранение нового города
  const saveMigration = async () => {
    if (!isValidCity) return;
    
    setMigrating(true);
    try {
      const response = await api.post('/profile/update', {
        city: newCity.trim()
      },{
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setStep('success');
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        throw new Error('Ошибка при обновлении города');
      }
    } catch (error) {
      console.error('Ошибка миграции города:', error);
      alert('Не удалось обновить город. Попробуйте позже.');
    } finally {
      setMigrating(false);
    }
  };

  if (step === 'intro') {
    return (
      <div className="min-h-screen bg-neu-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="neu-surface rounded-neu-xl p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-neu-accent-primary to-neu-accent-secondary rounded-full flex items-center justify-center mx-auto mb-6">
              <FiMapPin className="text-2xl text-white" />
            </div>
            
            <h1 className="text-2xl font-bold neu-text-primary mb-4">
              Смена города
            </h1>
            
            <p className="neu-text-secondary mb-6">
              Переезжаете? Обновите свой город, чтобы находить людей рядом с вами.
            </p>
            
            <div className="bg-neu-bg-secondary rounded-neu-lg p-4 mb-6">
              <div className="flex items-center space-x-3">
                <FiMapPin className="text-neu-accent-primary" />
                <div className="text-left">
                  <div className="text-sm neu-text-muted">Текущий город</div>
                  <div className="font-medium neu-text-primary">{oldCity}</div>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setStep('selection')}
              className="w-full neu-btn-primary rounded-neu-lg py-3 px-6 font-medium flex items-center justify-center space-x-2"
            >
              <span>Изменить город</span>
              <FiArrowRight />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'selection') {
    return (
      <div className="min-h-screen bg-neu-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="neu-surface rounded-neu-xl p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-neu-accent-primary to-neu-accent-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <FiMapPin className="text-2xl text-white" />
              </div>
              
              <h1 className="text-2xl font-bold neu-text-primary mb-2">
                Выберите новый город
              </h1>
              
              <p className="neu-text-secondary">
                Начните вводить название города
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={newCity}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 pr-10 rounded-neu-lg bg-neu-surface border focus:outline-none focus:ring-2 neu-text-primary ${
                    isValidCity 
                      ? 'border-green-500 focus:ring-green-500' 
                      : 'border-neu-border focus:ring-neu-primary'
                  }`}
                  placeholder="Начните вводить название города..."
                  autoFocus
                />
                
                {loading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-neu-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}

                {newCity.length >= 2 && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {isValidCity ? (
                      <FiCheckCircle className="text-green-500 text-xl" />
                    ) : !loading && (
                      <FiAlertCircle className="text-red-500 text-xl" />
                    )}
                  </div>
                )}

                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-neu-surface border border-neu-border rounded-neu-lg shadow-lg max-h-60 overflow-y-auto">
                    {suggestions.map((option, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => selectCity(option)}
                        className="w-full px-4 py-3 text-left hover:bg-neu-bg-secondary transition-colors border-b border-neu-border/30 last:border-b-0"
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
              
              {!isValidCity && newCity.length >= 2 && (
                <div className="text-xs text-red-500 flex items-center space-x-1">
                  <FiAlertCircle />
                  <span>Выберите город из списка предложений</span>
                </div>
              )}
              
              {isValidCity && (
                <div className="text-xs text-green-600 flex items-center space-x-1">
                  <FiCheckCircle />
                  <span>Город выбран корректно</span>
                </div>
              )}
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setStep('intro')}
                className="flex-1 neu-btn border border-neu-border rounded-neu-lg py-3 px-6 font-medium"
              >
                Назад
              </button>
              
              <button
                onClick={saveMigration}
                disabled={!isValidCity || migrating}
                className={`flex-1 rounded-neu-lg py-3 px-6 font-medium flex items-center justify-center space-x-2 ${
                  isValidCity && !migrating
                    ? 'neu-btn-primary'
                    : 'neu-surface bg-neu-bg-secondary neu-text-muted cursor-not-allowed'
                }`}
              >
                {migrating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Сохраняем...</span>
                  </>
                ) : (
                  <>
                    <FiCheckCircle />
                    <span>Сохранить</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-neu-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="neu-surface rounded-neu-xl p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiCheckCircle className="text-2xl text-white" />
            </div>
            
            <h1 className="text-2xl font-bold neu-text-primary mb-4">
              Город обновлен!
            </h1>
            
            <p className="neu-text-secondary mb-6">
              Ваш новый город: <span className="font-medium neu-text-primary">{newCity}</span>
            </p>
            
            <div className="text-sm neu-text-muted">
              Перенаправляем на главную страницу...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}; 