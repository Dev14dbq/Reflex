# Настройка контейнера

FROM node:18
WORKDIR /bot

# Установка зависимостей для npm
COPY package.json package-lock.json ./
RUN npm install

# Копируем исходный код
COPY . .

# Билд проекта
RUN npm run build

CMD ["npm", "run", "start"]