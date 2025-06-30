import { config } from '../config/env';

// API Configuration Service
class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.API_URL;
  }

  // Получить полный URL для endpoint
  getUrl(endpoint: string): string {
    // Убираем начальный слеш если есть
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${this.baseUrl}/${cleanEndpoint}`;
  }

  // Универсальный метод для API запросов
  async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = this.getUrl(endpoint);
    
    // Добавляем заголовки по умолчанию
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Получаем токен из localStorage если есть
    const initDataUnsafe = localStorage.getItem('initDataUnsafe');
    if (initDataUnsafe) {
      defaultHeaders['Authorization'] = `Bearer ${initDataUnsafe}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    const response = await fetch(url, config);
    
    // Логируем запросы в режиме разработки
    if (import.meta.env.DEV) {
      console.log(`[API] ${options.method || 'GET'} ${url}`, {
        status: response.status,
        config,
      });
    }

    return response;
  }

  // Удобные методы для разных типов запросов
  async get(endpoint: string, options: RequestInit = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint: string, data?: any, options: RequestInit = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put(endpoint: string, data?: any, options: RequestInit = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch(endpoint: string, data?: any, options: RequestInit = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete(endpoint: string, options: RequestInit = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  // Получить текущий базовый URL (для отладки)
  getBaseUrl(): string {
    return this.baseUrl;
  }

  // Проверить доступность API
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/health');
      return response.ok;
    } catch (error) {
      console.warn('[API] Health check failed:', error);
      return false;
    }
  }
}

// Создаем единственный экземпляр
export const apiService = new ApiService();

// Экспортируем также класс для тестов
export default ApiService; 