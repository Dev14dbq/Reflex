import axios from 'axios';
import dotenv from "dotenv"; dotenv.config();

// Замените на ваш реальный JWT токен
const JWT_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWNwenRqeHkwMDAwdWswY3RmZmR2NTk1IiwiaWF0IjoxNzUxOTY5NzYwLCJleHAiOjE3NTQ1NjE3NjB9.F1VmeCKaHf53aRWmOdwe8_B-oFZdezumhdJ4iwDnGkU';

// URL вашего API
const API_URL = process.env.API_URL || 'https://spectrmod.ru/api';

// Тестовое изображение (безопасное)
const TEST_IMAGE_URL = 'https://lf16-tiktok-common.tiktokcdn-us.com/obj/tiktok-web-common-tx/ttep/static/tiktok_effect_webapp/build/_assets/download-studio-display-2-0-2fe9dafdfc1d8c65a101.png';

async function testNsfwApi() {
  try {
    console.log('🔍 Тестируем NSFW API...\n');
    
    // Тест 1: Проверка изображения по URL
    console.log('📸 Тест 1: Проверка изображения по URL');
    const response = await axios.post(
      `${API_URL}/nsfw/check-url`,
      { imageUrl: TEST_IMAGE_URL },
      {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Результат:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    if (error.response) {
      console.error('❌ Ошибка API:', error.response.status, error.response.data);
    } else {
      console.error('❌ Ошибка:', error.message);
    }
  }
}

// Инструкция для получения JWT токена
console.log('ℹ️  Для тестирования вам нужен JWT токен.');
console.log('   Получить его можно из DevTools браузера:');
console.log('   1. Откройте приложение в браузере');
console.log('   2. Откройте DevTools (F12)');
console.log('   3. Перейдите во вкладку Network');
console.log('   4. Найдите любой запрос к API');
console.log('   5. Скопируйте значение заголовка Authorization (без "Bearer ")');
console.log('   6. Вставьте токен в переменную JWT_TOKEN в этом файле\n');

// Если токен указан, запускаем тест
if (JWT_TOKEN !== 'YOUR_JWT_TOKEN_HERE') {
  testNsfwApi();
} else {
  console.log('⚠️  Пожалуйста, укажите JWT токен в файле test-nsfw.js');
} 