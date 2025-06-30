# Reflex - Telegram Mini App

Комплексное приложение состоящее из:
- 🤖 **Bot** - Telegram бот (Python)
- 🌐 **Site** - Web приложение (React + TypeScript)  
- 🔌 **API** - Backend сервис (Node.js + TypeScript + Prisma)

## Быстрый старт

### Требования
- Docker & Docker Compose
- Node.js 18+
- Python 3.11+
- Make

### Первоначальная настройка

```bash
# 1. Клонируем репозиторий
git clone <repository-url>
cd Reflex

# 2. Первоначальная настройка
make setup-dev

# 3. Настраиваем переменные окружения
cp env.example .env
# Отредактируйте .env файл со своими данными

# 4. Запускаем в режиме разработки
make dev
```

## Структура проекта

```
Reflex/
├── api/                 # Backend API (Node.js + TypeScript)
│   ├── src/            # Исходный код API
│   ├── prisma/         # Схема базы данных
│   └── Dockerfile
├── site/               # Frontend (React + TypeScript)
│   ├── src/           # Исходный код сайта
│   ├── public/        # Статические файлы
│   └── Dockerfile
├── bot/                # Telegram бот (Python)
│   ├── bot.py         # Основной файл бота
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml  # Настройки для разработки
├── Makefile           # Команды для разработки
└── README.md          # Этот файл
```

## Команды для разработки

```bash
make help              # Показать все доступные команды
make dev               # Запустить среду разработки
make stop              # Остановить все сервисы
make logs              # Показать логи всех сервисов
make clean             # Очистить данные и контейнеры
make test              # Запустить тесты
make lint              # Проверить код линтерами
make format            # Форматировать код
```

## Порты сервисов

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Git Flow для команды

### Основные ветки
- `main` - стабильная продакшн версия
- `develop` - интеграционная ветка для разработки
- `staging` - ветка для тестирования

### Рабочие ветки разработчиков
Каждый разработчик создает свои ветки от `develop`:

```bash
# Создание ветки для новой функции
git checkout develop
git pull origin develop
git checkout -b feature/имя-разработчика/описание-задачи

# Например:
git checkout -b feature/ivan/user-authentication
git checkout -b feature/maria/photo-upload
git checkout -b bugfix/alex/login-error
```

### Workflow разработки

1. **Создание задачи**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/ваше-имя/название-задачи
   ```

2. **Разработка**
   ```bash
   # Работаете в своей ветке
   git add .
   git commit -m "feat: добавил авторизацию пользователей"
   git push origin feature/ваше-имя/название-задачи
   ```

3. **Создание Pull Request**
   - Создайте PR в GitHub/GitLab
   - Назначьте ревьюера
   - Дождитесь review и approve

4. **Merge в develop**
   - После аппрува PR мержится в `develop`
   - Ветка удаляется

## Правила коммитов

Используем [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: добавлена новая функция
fix: исправлена ошибка
docs: обновлена документация
style: форматирование кода
refactor: рефакторинг без изменения функциональности
test: добавлены тесты
chore: обновление зависимостей, конфигурации
```

## Примеры коммитов

```bash
git commit -m "feat(auth): добавлена авторизация через Telegram"
git commit -m "fix(api): исправлена ошибка валидации пользователя"
git commit -m "docs: обновлен README с инструкциями по деплою"
```

## Среды разработки

### Development (локальная)
- Запуск через `make dev`
- Все сервисы в Docker контейнерах
- Hot reload для всех компонентов

### Staging
- Автоматический деплой из ветки `staging`
- Тестирование перед продакшном

### Production
- Автоматический деплой из ветки `main`
- SSL сертификаты
- Мониторинг и логирование

## Отслеживание работы разработчиков

### Ветки разработчиков
Каждый разработчик работает в своих ветках:
```bash
feature/ivan/*     # Ветки Ивана
feature/maria/*    # Ветки Марии
feature/alex/*     # Ветки Алекса
```

### Просмотр активности
```bash
# Посмотреть все ветки
git branch -a

# Посмотреть коммиты разработчика
git log --author="Иван" --oneline

# Посмотреть изменения в ветке
git diff develop..feature/ivan/some-feature
```

## Деплой

### Staging
```bash
git checkout staging
git merge develop
git push origin staging
# Автоматический деплой на staging сервер
```

### Production
```bash
git checkout main
git merge staging
git tag v1.0.0
git push origin main --tags
# Автоматический деплой на production сервер
```

## Мониторинг и логи

### Локальная разработка
```bash
make logs          # Все логи
make logs-api      # Только API
make logs-site     # Только сайт
make logs-bot      # Только бот
```

### Production
- Логи через PM2 для Node.js сервисов
- Systemd логи для Python бота
- PostgreSQL логи
- Nginx access/error логи

## Конфигурация IDE

### VS Code
Рекомендуемые расширения:
- TypeScript Hero
- Prettier
- ESLint
- Python
- Docker
- GitLens

### Настройки prettier (.prettierrc)
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

## Помощь и поддержка

- 📖 Документация API: http://localhost:3001/docs
- 🐛 Баг-репорты: создавайте Issues в GitHub
- 💬 Вопросы: обсуждаем в Telegram чате команды

## Лицензия

MIT License 