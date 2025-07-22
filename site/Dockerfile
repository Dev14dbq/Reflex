FROM node:18-alpine

WORKDIR /app

# Копируем package files
COPY package.json .

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код
COPY . .

# Компилируем сайт
RUN npm run build

EXPOSE 4173

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"] 