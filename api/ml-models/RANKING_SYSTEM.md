# Система ранжирования профилей

## Архитектура

Система ранжирования работает в несколько этапов:

### 1. Фильтрация (обязательные критерии)
- **Исключение уже просмотренных** - профили, которым пользователь уже поставил лайк/дизлайк
- **Фильтр по возрасту** - в зависимости от настроек:
  - `similarAge` - похожий возраст (±2 года для молодых, ±5 для остальных)
  - `ageRangeMin/Max` - пользовательский диапазон
- **Фильтр по городу** - если включен `sameCityOnly`
- **Блокировка** - исключаются заблокированные профили
- **NSFW контент** - фильтруется в зависимости от настройки `showNsfw`

### 2. ML ранжирование
ML модель (LightGBM) анализирует следующие факторы:
- Совпадение городов
- Разница в возрасте
- Количество общих целей
- Trust score пользователя
- Верификация профиля
- Количество полученных лайков (будущая фича)

### 3. Применение пользовательских настроек
После ML ранжирования применяются модификаторы:
- **localFirst** - увеличивает скор локальных анкет на 20%
- **Trust Score бонус** - дополнительно до 10% к скору за высокий trust score

### 4. Fallback сортировка
Если ML модель недоступна, используется простая сортировка по:
- Trust score (основной фактор)
- Приоритет локальным (если включен)
- Полнота профиля (описание > 50 символов)
- Количество фотографий (≥ 3)

## Приоритеты

1. **Жесткие фильтры** (возраст, город при sameCityOnly) - всегда применяются первыми
2. **ML модель** - основа ранжирования
3. **Пользовательские предпочтения** - модифицируют ML скоры
4. **Trust Score** - всегда влияет на финальный результат

## Настройка весов

Текущие веса модификаторов:
- `localFirst`: +20% к ML скору
- Trust Score: до +10% к ML скору (trustScore / 1000)

Эти значения можно изменить в файле `search.ts` в блоке применения модификаторов. 