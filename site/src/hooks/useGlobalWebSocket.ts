import { useCallback, useEffect, useState } from 'react';
import { WSMessage, ChatEvent } from '../pages/Chat/types';
import { useUserStore } from '../stores/user';
import { config } from '../config/env';

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
  timeout: NodeJS.Timeout;
}

interface WebSocketStore {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  eventListeners: Set<(event: ChatEvent) => void>;
}

// Глобальное состояние WebSocket
let globalWebSocketState: WebSocketStore = {
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  eventListeners: new Set()
};

let wsRef: WebSocket | null = null;
let pendingRequests = new Map<number, PendingRequest>();
let requestIdRef = 1;
let heartbeatIntervalRef: NodeJS.Timeout | undefined;
let reconnectTimeoutRef: NodeJS.Timeout | undefined;
let currentTokenRef: string | null = null;

// Подписчики на изменения состояния
const stateSubscribers = new Set<(state: WebSocketStore) => void>();

// Функция для уведомления подписчиков
const notifyStateChange = () => {
  stateSubscribers.forEach(callback => callback({ ...globalWebSocketState }));
};

// Очистка heartbeat
const clearHeartbeat = () => {
  if (heartbeatIntervalRef) {
    clearInterval(heartbeatIntervalRef);
    heartbeatIntervalRef = undefined;
  }
};

// Очистка reconnect timeout
const clearReconnectTimeout = () => {
  if (reconnectTimeoutRef) {
    clearTimeout(reconnectTimeoutRef);
    reconnectTimeoutRef = undefined;
  }
};

// Запуск heartbeat
const startHeartbeat = () => {
  clearHeartbeat();
  heartbeatIntervalRef = setInterval(() => {
    if (wsRef?.readyState === WebSocket.OPEN) {
      wsRef.send(JSON.stringify({ action: 'ping' }));
    }
  }, 30000);
};

// Отправка RPC запроса
const sendRPC = (action: string, params?: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!wsRef || wsRef.readyState !== WebSocket.OPEN) {
      reject(new Error('WebSocket не подключен'));
      return;
    }

    const id = requestIdRef++;
    const message: WSMessage = { id, action, params };
    
    pendingRequests.set(id, {
      resolve,
      reject,
      timestamp: Date.now(),
      timeout: setTimeout(() => {
        const pending = pendingRequests.get(id);
        if (pending) {
          pendingRequests.delete(id);
          pending.reject(new Error('Таймаут запроса'));
        }
      }, 20000) // 20 Секунд
    });

    wsRef.send(JSON.stringify(message));
  });
};

// Подключение к WebSocket
const connectWebSocket = (token: string) => {
  if (!token) {
    console.log('[Global WS] 🚫 Токен отсутствует, подключение отменено');
    globalWebSocketState.connectionError = 'Нет токена авторизации';
    notifyStateChange();
    return;
  }

  // Дополнительная проверка валидности токена
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp || payload.exp * 1000 < Date.now()) {
      console.log('[Global WS] ⏰ Токен истек');
      globalWebSocketState.connectionError = 'Токен авторизации истек';
      notifyStateChange();
      return;
    }
  } catch (e) {
    console.log('[Global WS] ❌ Невалидный токен');
    globalWebSocketState.connectionError = 'Невалидный токен авторизации';
    notifyStateChange();
    return;
  }

  // Проверяем, изменился ли токен
  if (currentTokenRef === token && wsRef?.readyState === WebSocket.OPEN) {
    console.log('[Global WS] ✅ Уже подключены с тем же токеном');
    return;
  }

  // Если токен изменился, закрываем старое соединение
  if (currentTokenRef !== token && wsRef) {
    console.log('[Global WS] 🔄 Токен изменился, переподключаемся');
    wsRef.close(1000, 'Смена токена');
  }

  // Если уже подключаемся, не создаем новое соединение
  if (globalWebSocketState.isConnecting) {
    console.log('[Global WS] ⏳ Уже подключаемся, ждем...');
    return;
  }

  currentTokenRef = token;
  globalWebSocketState.isConnecting = true;
  globalWebSocketState.connectionError = null;
  clearReconnectTimeout();
  notifyStateChange();

  try {
    const ws = new WebSocket(`${config.WS_URL}/chat?token=${token}`);
    wsRef = ws;

    ws.onopen = () => {
      console.log('[Global WS] ✅ Подключение установлено');
      globalWebSocketState.isConnected = true;
      globalWebSocketState.isConnecting = false;
      globalWebSocketState.connectionError = null;
      startHeartbeat();
      notifyStateChange();
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        console.log('[Global WS] 📩 Получено сообщение:', message);

        // Обработка события аутентификации
        if (message.event === 'authenticated') {
          if (message.payload?.success) {
            globalWebSocketState.isConnected = true;
            globalWebSocketState.isConnecting = false;
            globalWebSocketState.connectionError = null;
            startHeartbeat();
            notifyStateChange();
          } else {
            globalWebSocketState.connectionError = 'Ошибка аутентификации';
            globalWebSocketState.isConnecting = false;
            notifyStateChange();
            ws.close();
          }
          return;
        }

        // Обработка pong
        if (message.event === 'pong') return;

        // Обработка RPC ответов
        if (message.id && pendingRequests.has(message.id)) {
          const pending = pendingRequests.get(message.id)!;
          clearTimeout(pending.timeout);
          pendingRequests.delete(message.id);

          if (message.error) {
            console.log('[Global WS] ❌ RPC ошибка:', message.error);
            pending.reject(new Error(message.error.message));
          } else {
            console.log('[Global WS] ✅ RPC успех:', message.result);
            pending.resolve(message.result);
          }
          return;
        }

        // Обработка событий чата - уведомляем всех слушателей
        if (message.event && message.payload) {
          globalWebSocketState.eventListeners.forEach(listener => {
            try {
              listener(message as ChatEvent);
            } catch (error) {
              console.error('[Global WS] Ошибка в обработчике события:', error);
            }
          });
        }

      } catch (error) {
        console.error('[Global WS] ❌ Ошибка обработки сообщения:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[Global WS] ❌ Ошибка соединения:', error);
      
      if (ws.readyState === WebSocket.CLOSED) {
        globalWebSocketState.connectionError = 'Ошибка авторизации или соединения';
      } else {
        globalWebSocketState.connectionError = 'Ошибка соединения';
      }
      globalWebSocketState.isConnecting = false;
      notifyStateChange();
    };

    ws.onclose = (event) => {
      console.warn('[Global WS] 🔒 Соединение закрыто:', event.code, event.reason);
      globalWebSocketState.isConnected = false;
      globalWebSocketState.isConnecting = false;
      clearHeartbeat();
      notifyStateChange();
      
      // Отклоняем все pending запросы
      pendingRequests.forEach(pending => {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Соединение закрыто'));
      });
      pendingRequests.clear();

      if (event.code === 1008) {
        globalWebSocketState.connectionError = 'Ошибка авторизации';
        notifyStateChange();
      } else if (event.code !== 1000 && event.reason !== 'Смена токена') {
        globalWebSocketState.connectionError = 'Соединение прервано';
        notifyStateChange();
        
        // Автоматическое переподключение через 3 секунды
        if (token && currentTokenRef === token) {
          console.log('[Global WS] 🔄 Переподключение через 3 секунды...');
          reconnectTimeoutRef = setTimeout(() => {
            if (currentTokenRef === token) {
              connectWebSocket(token);
            }
          }, 3000);
        }
      }
    };

  } catch (error) {
    console.error('[Global WS] ❌ Ошибка создания WebSocket:', error);
    globalWebSocketState.connectionError = 'Не удалось создать соединение';
    globalWebSocketState.isConnecting = false;
    notifyStateChange();
  }
};

// Отключение
const disconnectWebSocket = () => {
  console.log('[Global WS] 🔌 Отключение...');
  clearHeartbeat();
  clearReconnectTimeout();
  currentTokenRef = null;
  
  if (wsRef) {
    wsRef.close(1000, 'Отключение клиента');
    wsRef = null;
  }
  
  globalWebSocketState.isConnected = false;
  globalWebSocketState.isConnecting = false;
  globalWebSocketState.eventListeners.clear();
  notifyStateChange();
};

// Хук для использования глобального WebSocket
export const useGlobalWebSocket = () => {
  const [state, setState] = useState(globalWebSocketState);
  const { token, isInitialized } = useUserStore();
  const isTokenReady = isInitialized && !!token;

  // Подписка на изменения состояния
  useEffect(() => {
    const handleStateChange = (newState: WebSocketStore) => {
      setState(newState);
    };

    stateSubscribers.add(handleStateChange);
    return () => {
      stateSubscribers.delete(handleStateChange);
    };
  }, []);

  // Подключение при готовности токена
  useEffect(() => {
    if (isTokenReady && token && currentTokenRef !== token) {
      console.log('[Global WS] 🚀 Инициализация подключения с новым токеном');
      const timeoutId = setTimeout(() => {
        connectWebSocket(token);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    } else if (!token) {
      console.log('[Global WS] Токен для аутентификации отсутствуют. Выполняю отключение!');
      disconnectWebSocket();
    }
  }, [token, isTokenReady]);

  // Очистка при размонтировании (только если это последний подписчик)
  useEffect(() => {
    return () => {
      // Не отключаем WebSocket при размонтировании компонента
      // Соединение остается активным для других компонентов
    };
  }, []);

  // API методы
  const getChats = useCallback((limit = 20, cursor?: string) => {
    return sendRPC('getChats', { limit, cursor });
  }, []);

  const openChat = useCallback((chatId: string) => {
    return sendRPC('openChat', { chatId });
  }, []);

  const getMessages = useCallback((chatId: string, limit = 30, cursor?: string) => {
    return sendRPC('getMessages', { chatId, limit, cursor });
  }, []);

  const sendMessage = useCallback((chatId: string, text: string) => {
    return sendRPC('sendMessage', { chatId, text, type: 'text' });
  }, []);

  const editMessage = useCallback((messageId: string, text: string) => {
    return sendRPC('editMessage', { messageId, text });
  }, []);

  const deleteMessage = useCallback((messageId: string, scope: 'self' | 'both' = 'self') => {
    return sendRPC('deleteMessage', { messageId, scope });
  }, []);

  const subscribe = useCallback((chatId: string) => {
    return sendRPC('subscribe', { chatId });
  }, []);

  const unsubscribe = useCallback((chatId: string) => {
    return sendRPC('unsubscribe', { chatId });
  }, []);

  const markRead = useCallback((chatId: string, messageIds: string[]) => {
    return sendRPC('markRead', { chatId, messageIds });
  }, []);

  // Добавление/удаление слушателей событий
  const addEventListener = useCallback((listener: (event: ChatEvent) => void) => {
    globalWebSocketState.eventListeners.add(listener);
    return () => {
      globalWebSocketState.eventListeners.delete(listener);
    };
  }, []);

  const connect = useCallback(() => {
    if (token) {
      connectWebSocket(token);
    }
  }, [token]);

  const disconnect = useCallback(() => {
    disconnectWebSocket();
  }, []);

  return {
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    connectionError: state.connectionError,
    isTokenReady,
    connect,
    disconnect,
    addEventListener,
    // API methods
    getChats,
    openChat,
    getMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    subscribe,
    unsubscribe,
    markRead
  };
}; 