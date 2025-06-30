import { useCallback, useEffect, useRef, useState } from 'react';
import { WSMessage, ChatEvent } from '../pages/Chat/types';
import { config } from '../config/env';

interface UseChatWebSocketProps {
  token: string | null;
  onEvent: (event: ChatEvent) => void;
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
  timeout: NodeJS.Timeout;
}

export const useChatWebSocket = ({ token, onEvent }: UseChatWebSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const pendingRequests = useRef<Map<number, PendingRequest>>(new Map());
  const requestIdRef = useRef(1);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const subscriptionsRef = useRef<Set<string>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const currentTokenRef = useRef<string | null>(null);

  // Очистка heartbeat
  const clearHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = undefined;
    }
  }, []);

  // Очистка reconnect timeout
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
  }, []);

  // Запуск heartbeat
  const startHeartbeat = useCallback(() => {
    clearHeartbeat();
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: 'ping' }));
      }
    }, 30000); // каждые 30 секунд
  }, [clearHeartbeat]);

  // Отправка RPC запроса
  const sendRPC = useCallback((action: string, params?: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket не подключен'));
        return;
      }

      const id = requestIdRef.current++;
      const message: WSMessage = { id, action, params };
      
      // Сохраняем запрос для получения ответа
      pendingRequests.current.set(id, {
        resolve,
        reject,
        timestamp: Date.now(),
        timeout: setTimeout(() => {
          const pending = pendingRequests.current.get(id);
          if (pending) {
            pendingRequests.current.delete(id);
            pending.reject(new Error('Таймаут запроса'));
          }
        }, 10000)
      });

      // Отправляем сообщение
      wsRef.current.send(JSON.stringify(message));
    });
  }, []);

  // Подключение к WebSocket
  const connect = useCallback(() => {
    if (!token) {
      console.log('[Chat WS] 🚫 Токен отсутствует, подключение отменено');
      setConnectionError('Нет токена авторизации');
      return;
    }

    // Дополнительная проверка валидности токена
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.exp || payload.exp * 1000 < Date.now()) {
        console.log('[Chat WS] ⏰ Токен истек');
        setConnectionError('Токен авторизации истек');
        return;
      }
    } catch (e) {
      console.log('[Chat WS] ❌ Невалидный токен');
      setConnectionError('Невалидный токен авторизации');
      return;
    }

    // Проверяем, изменился ли токен
    if (currentTokenRef.current === token && wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[Chat WS] ✅ Уже подключены с тем же токеном');
      return; // Уже подключены с тем же токеном
    }

    // Если токен изменился, закрываем старое соединение
    if (currentTokenRef.current !== token && wsRef.current) {
      console.log('[Chat WS] 🔄 Токен изменился, переподключаемся');
      wsRef.current.close(1000, 'Смена токена');
    }

    // Если уже подключаемся, не создаем новое соединение
    if (isConnecting) {
      console.log('[Chat WS] ⏳ Уже подключаемся, ждем...');
      return;
    }

    currentTokenRef.current = token;
    setIsConnecting(true);
    setConnectionError(null);
    clearReconnectTimeout();

    try {
      const ws = new WebSocket(`${config.WS_URL}/chat?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Chat WS] ✅ Подключение установлено');
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionError(null);
        startHeartbeat();
        console.log('[Chat WS] 🔐 Аутентификация успешна');
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          console.log('[Chat WS] 📩 Получено сообщение:', message);

          // Обработка события аутентификации
          if (message.event === 'authenticated') {
            if (message.payload?.success) {
              setIsConnected(true);
              setIsConnecting(false);
              setConnectionError(null);
              startHeartbeat();
              console.log('[Chat WS] 🔐 Аутентификация успешна');
            } else {
              setConnectionError('Ошибка аутентификации');
              setIsConnecting(false);
              ws.close();
            }
            return;
          }

          // Обработка pong
          if (message.event === 'pong') {
            console.log('[Chat WS] 💓 Pong получен');
            return;
          }

          // Обработка RPC ответов
          if (message.id && pendingRequests.current.has(message.id)) {
            const pending = pendingRequests.current.get(message.id)!;
            clearTimeout(pending.timeout);
            pendingRequests.current.delete(message.id);

            if (message.error) {
              console.log('[Chat WS] ❌ RPC ошибка:', message.error);
              pending.reject(new Error(message.error.message));
            } else {
              console.log('[Chat WS] ✅ RPC успех:', message.result);
              pending.resolve(message.result);
            }
            return;
          }

          // Обработка событий чата
          if (message.event && message.payload) {
            onEvent(message as ChatEvent);
          }

        } catch (error) {
          console.error('[Chat WS] ❌ Ошибка обработки сообщения:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[Chat WS] ❌ Ошибка соединения:', error);
        
        // Проверяем, не является ли это ошибкой из-за невалидного токена
        if (ws.readyState === WebSocket.CLOSED) {
          setConnectionError('Ошибка авторизации или соединения');
        } else {
          setConnectionError('Ошибка соединения');
        }
        setIsConnecting(false);
      };

      ws.onclose = (event) => {
        console.warn('[Chat WS] 🔒 Соединение закрыто:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        clearHeartbeat();
        
        // Отклоняем все pending запросы
        pendingRequests.current.forEach(pending => {
          clearTimeout(pending.timeout);
          pending.reject(new Error('Соединение закрыто'));
        });
        pendingRequests.current.clear();

        if (event.code === 1008) {
          setConnectionError('Ошибка авторизации');
        } else if (event.code !== 1000 && event.reason !== 'Смена токена') {
          setConnectionError('Соединение прервано');
          
          // Автоматическое переподключение через 3 секунды (только если не смена токена)
          if (token && currentTokenRef.current === token) {
            console.log('[Chat WS] 🔄 Переподключение через 3 секунды...');
            reconnectTimeoutRef.current = setTimeout(() => {
              if (currentTokenRef.current === token) {
                connect();
              }
            }, 3000);
          }
        }
      };

    } catch (error) {
      console.error('[Chat WS] ❌ Ошибка создания WebSocket:', error);
      setConnectionError('Не удалось создать соединение');
      setIsConnecting(false);
    }
  }, [token, startHeartbeat, onEvent, isConnecting, clearReconnectTimeout]);

  // Отключение
  const disconnect = useCallback(() => {
    console.log('[Chat WS] 🔌 Отключение...');
    clearHeartbeat();
    clearReconnectTimeout();
    subscriptionsRef.current.clear();
    currentTokenRef.current = null;
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Отключение клиента');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
  }, [clearHeartbeat, clearReconnectTimeout]);

  // API методы
  const getChats = useCallback((limit = 20, cursor?: string) => {
    return sendRPC('getChats', { limit, cursor });
  }, [sendRPC]);

  const openChat = useCallback((chatId: string) => {
    return sendRPC('openChat', { chatId });
  }, [sendRPC]);

  const getMessages = useCallback((chatId: string, limit = 30, cursor?: string) => {
    return sendRPC('getMessages', { chatId, limit, cursor });
  }, [sendRPC]);

  const sendMessage = useCallback((chatId: string, text: string) => {
    return sendRPC('sendMessage', { chatId, text, type: 'text' });
  }, [sendRPC]);

  const editMessage = useCallback((messageId: string, text: string) => {
    return sendRPC('editMessage', { messageId, text });
  }, [sendRPC]);

  const deleteMessage = useCallback((messageId: string, scope: 'self' | 'both' = 'self') => {
    return sendRPC('deleteMessage', { messageId, scope });
  }, [sendRPC]);

  const subscribe = useCallback((chatId: string) => {
    if (subscriptionsRef.current.has(chatId)) return;
    subscriptionsRef.current.add(chatId);
    return sendRPC('subscribe', { chatId });
  }, [sendRPC]);

  const unsubscribe = useCallback((chatId: string) => {
    subscriptionsRef.current.delete(chatId);
    return sendRPC('unsubscribe', { chatId });
  }, [sendRPC]);

  const markRead = useCallback((chatId: string, messageIds: string[]) => {
    return sendRPC('markRead', { chatId, messageIds });
  }, [sendRPC]);

  // Подключение только при изменении токена (и только если токен есть)
  useEffect(() => {
    if (token && currentTokenRef.current !== token) {
      console.log('[Chat WS] 🚀 Инициализация подключения с новым токеном');
      // Небольшая задержка для стабилизации токена
      const timeoutId = setTimeout(() => {
        connect();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    } else if (!token) {
      console.log('[Chat WS] 🚫 Токен отсутствует, отключаемся');
      disconnect();
    }
  }, [token, connect, disconnect]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      console.log('[Chat WS] 🧹 Очистка при размонтировании');
      clearHeartbeat();
      clearReconnectTimeout();
      if (wsRef.current) {
        wsRef.current.close(1000, 'Размонтирование компонента');
      }
    };
  }, [clearHeartbeat, clearReconnectTimeout]);

  return {
    isConnected,
    isConnecting,
    connectionError,
    connect,
    disconnect,
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