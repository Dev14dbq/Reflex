import { config } from '../config/env';

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.API_URL;
  }

  /**
   * Формирует полный URL для API-запроса на основе базового адреса и переданного endpoint.
   *
   * @param endpoint - относительный путь до нужного ресурса (например, '/me')
   * @returns Строка с абсолютным URL для запроса к API
   */
  public getUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${this.baseUrl}/${cleanEndpoint}`;
  }

  /**
   * Универсальный метод для отправки HTTP-запросов к API.
   *
   * @param endpoint - Относительный путь до ресурса (например, '/me' или 'profile/update').
   * @param options - Опциональные параметры запроса (метод, заголовки, тело и т.д.), совместимые с fetch API.
   * @returns Promise<Response> объект ответа fetch, который можно обработать (например, .json()).
   */
  public async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = this.getUrl(endpoint);
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    /**
     * Получение токена из локального хранилища и использования при его наличии
     */
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
    
    /**
     * Логирование запросов (Если активен режим Разработки)
     */
    if (import.meta.env.DEV) {
      console.log(`[API] ${options.method || 'GET'} - ${url}`, {
        status: response.status,
        config,
      });
    }

    return response;
  }

  /**
   * Использование метода GET для запросов.
   *
   * @param endpoint - Относительный путь до ресурса (например, '/me' или 'profile/update').
   * @param options - Опциональные параметры запроса (заголовки и т.д.), совместимые с fetch API.
   * @returns Promise<Response> объект ответа fetch, который можно обработать (например, .json()).
   */
  public async get(endpoint: string, options: RequestInit = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  /**
   * Использование метода POST для запросов.
   *
   * @param endpoint - Относительный путь до ресурса (например, '/me' или 'profile/update').
   * @param data - Опциональный параметр запроса (тело).
   * @param options - Опциональные параметры запроса (заголовки и т.д.), совместимые с fetch API.
   * @returns Promise<Response> объект ответа fetch, который можно обработать (например, .json()).
   */
  public async post(endpoint: string, body?: any | null, options: RequestInit = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Использование метода PUT для запросов.
   *
   * @param endpoint - Относительный путь до ресурса (например, '/me' или 'profile/update').
   * @param data - Опциональный параметр запроса (тело).
   * @param options - Опциональные параметры запроса (заголовки и т.д.), совместимые с fetch API.
   * @returns Promise<Response> объект ответа fetch, который можно обработать (например, .json()).
   */
  public async put(endpoint: string, body?: any, options: RequestInit = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Использование метода PATCH для запросов.
   *
   * @param endpoint - Относительный путь до ресурса (например, '/me' или 'profile/update').
   * @param data - Опциональный параметр запроса (тело).
   * @param options - Опциональные параметры запроса (заголовки и т.д.), совместимые с fetch API.
   * @returns Promise<Response> объект ответа fetch, который можно обработать (например, .json()).
   */
  public async patch(endpoint: string, body?: any, options: RequestInit = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Использование метода DELETE для запросов.
   *
   * @param endpoint - Относительный путь до ресурса (например, '/me' или 'profile/update').
   * @param options - Опциональные параметры запроса (заголовки и т.д.), совместимые с fetch API.
   * @returns Promise<Response> объект ответа fetch, который можно обработать (например, .json()).
   */
  public async delete(endpoint: string, options: RequestInit = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * @returns Возращение базового API URL (Используется для отладки)
   */
  public getBaseUrl(): string {
    return this.baseUrl;
  }
}

/**
 * Создание единственного экземпляра класса ApiService
 */
export default new ApiService(); 