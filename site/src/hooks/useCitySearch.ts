import { useState, useEffect } from 'react';

interface CitySearchResult {
  name: string;
  fullName: string;
}

export const useCitySearch = () => {
  const [cities, setCities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загружаем города при первом использовании
  useEffect(() => {
    const loadCities = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/city.txt');
        const text = await response.text();
        const cityList = text.split(',').map(city => city.trim()).filter(city => city.length > 0);
        setCities(cityList);
      } catch (err) {
        console.error('Ошибка загрузки городов:', err);
        setError('Не удалось загрузить список городов');
        // Fallback к популярным городам СНГ
        setCities([
          'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань',
          'Нижний Новгород', 'Челябинск', 'Самара', 'Омск', 'Ростов-на-Дону',
          'Уфа', 'Красноярск', 'Воронеж', 'Пермь', 'Волгоград',
          'Киев', 'Харьков', 'Одесса', 'Днепр', 'Львов',
          'Минск', 'Гомель', 'Могилев', 'Витебск', 'Гродно',
          'Алматы', 'Шымкент', 'Нур-Султан', 'Актобе', 'Тараз',
          'Ташкент', 'Самарканд', 'Наманган', 'Андижан', 'Бухара',
          'Баку', 'Гянджа', 'Сумгайыт', 'Мингечевир', 'Нахчыван',
          'Ереван', 'Гюмри', 'Ванадзор', 'Абовян', 'Капан',
          'Тбилиси', 'Батуми', 'Кутаиси', 'Рустави', 'Гори',
          'Кишинев', 'Тирасполь', 'Бельцы', 'Бендеры', 'Рыбница'
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadCities();
  }, []);

  const searchCities = (query: string): CitySearchResult[] => {
    if (!query || query.length < 2) return [];
    
    const normalizedQuery = query.toLowerCase().trim();
    
    // Ищем города, которые начинаются с запроса или содержат его
    const matches = cities
      .filter(city => {
        const normalizedCity = city.toLowerCase();
        return normalizedCity.includes(normalizedQuery);
      })
      .slice(0, 10) // Ограничиваем до 10 результатов
      .map(city => ({
        name: city,
        fullName: city
      }));

    return matches;
  };

  return {
    searchCities,
    isLoading,
    error,
    citiesLoaded: cities.length > 0
  };
}; 