import React, { useState, useCallback, useReducer } from 'react';
import { ChatList } from './ChatList';
import { ChatDetail } from './ChatDetail';
import { useGlobalWebSocket } from '../../hooks/useGlobalWebSocket';
import { Message, ChatState } from './types';
import { FiWifiOff, FiRefreshCw, FiMessageCircle } from 'react-icons/fi';


import { useUserStore } from '../../stores/user';

// Reducer для управления состоянием чатов
const chatReducer = (state: ChatState, action: any): ChatState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_CHATS':
      return { 
        ...state, 
        chats: action.payload.items || [],
        nextCursor: action.payload.nextCursor,
        loading: false,
        error: null
      };
    
    case 'ADD_CHATS':
      return {
        ...state,
        chats: [...state.chats, ...(action.payload.items || [])],
        nextCursor: action.payload.nextCursor,
        loading: false
      };
    
    case 'SET_SELECTED_CHAT':
      return { ...state, selectedChatId: action.payload };
    
    case 'SET_MESSAGES':
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.chatId]: action.payload.messages
        },
        nextMessageCursors: {
          ...state.nextMessageCursors,
          [action.payload.chatId]: action.payload.nextCursor
        }
      };
    
    case 'ADD_MESSAGES':
      const existingMessages = state.messages[action.payload.chatId] || [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.chatId]: [
            ...(action.payload.messages || []),
            ...existingMessages
          ]
        },
        nextMessageCursors: {
          ...state.nextMessageCursors,
          [action.payload.chatId]: action.payload.nextCursor
        }
      };
    
    case 'ADD_MESSAGE':
      const chatMessages = state.messages[action.payload.chatId] || [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.chatId]: [...chatMessages, action.payload.message]
        }
      };
    
    case 'UPDATE_MESSAGE':
      const updatedMessages = Object.entries(state.messages).reduce((acc, [chatId, messages]) => {
        acc[chatId] = messages.map(msg => 
          msg.id === action.payload.id ? { ...msg, ...action.payload } : msg
        );
        return acc;
      }, {} as Record<string, Message[]>);
      
      return { ...state, messages: updatedMessages };
    
    case 'DELETE_MESSAGE':
      const filteredMessages = Object.entries(state.messages).reduce((acc, [chatId, messages]) => {
        acc[chatId] = messages.filter(msg => msg.id !== action.payload.messageId);
        return acc;
      }, {} as Record<string, Message[]>);
      
      return { ...state, messages: filteredMessages };
    
    case 'UPDATE_CHAT_LAST_MESSAGE':
      return {
        ...state,
        chats: state.chats.map(chat => 
          chat.id === action.payload.chatId 
            ? { ...chat, lastMessage: action.payload.message, updatedAt: new Date().toISOString() }
            : chat
        )
      };
    
    case 'MARK_MESSAGES_READ': {
      const ids: string[] = action.payload.messageIds;
      const updated = Object.entries(state.messages).reduce((acc, [chatId, msgs]) => {
        acc[chatId] = msgs.map(m => ids.includes(m.id) ? { ...m, readAt: m.readAt || new Date().toISOString() } : m);
        return acc;
      }, {} as Record<string, Message[]>);
      return { ...state, messages: updated };
    }
    
    default:
      return state;
  }
};

const initialState: ChatState = {
  chats: [],
  messages: {},
  selectedChatId: null,
  loading: false,
  error: null,
  nextCursor: null,
  nextMessageCursors: {}
};

export const Chat: React.FC = () => {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { token } = useUserStore();
  
  const [currentUserId] = useState(() => {
    // Получаем ID текущего пользователя из токена
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId || payload.sub;
      } catch (e) {
        console.warn('Не удалось извлечь userId из токена');
      }
    }
    return null;
  });



  // Обработка событий чата
  const handleChatEvent = useCallback((event: any) => {
    console.log('[Chat] Получено событие:', event);
    
    switch (event.event) {
      case 'new_message':
        // Добавляем новое сообщение
        const message = {
          ...event.payload.message,
          isOwn: event.payload.message.senderId === currentUserId
        };
        
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            chatId: event.payload.chatId,
            message
          }
        });
        
        // Обновляем последнее сообщение в списке чатов
        dispatch({
          type: 'UPDATE_CHAT_LAST_MESSAGE',
          payload: {
            chatId: event.payload.chatId,
            message: event.payload.message.text
          }
        });
        break;
        
      case 'message_updated':
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: event.payload.message
        });
        break;
        
      case 'message_deleted':
        dispatch({
          type: 'DELETE_MESSAGE',
          payload: {
            messageId: event.payload.messageId
          }
        });
        break;
        
      case 'messages_read':
        // Обновляем readAt только если это чужой пользователь
        if (event.payload.by !== currentUserId) {
          dispatch({
            type: 'MARK_MESSAGES_READ',
            payload: { messageIds: event.payload.messageIds }
          });
        }
        break;
        
      case 'chat_archived':
      case 'chat_blocked':
      case 'chat_deleted':
        // Эти события можно обработать для обновления UI
        console.log(`[Chat] Событие ${event.event} для чата ${event.payload.chatId}`);
        break;
    }
  }, [currentUserId]);

  // Глобальный WebSocket хук
  const {
    isConnected,
    isConnecting,
    connectionError,
    isTokenReady,
    connect,
    addEventListener,
    getChats,
    openChat,
    getMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    subscribe,

    markRead
  } = useGlobalWebSocket();

  // Подписка на события WebSocket
  React.useEffect(() => {
    const removeListener = addEventListener(handleChatEvent);
    return removeListener;
  }, [addEventListener, handleChatEvent]);



  const loadChats = useCallback(async () => {
    if (state.loading) return;
      dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const result = await getChats(20, undefined);
      if (result.items) {
        dispatch({ type: 'SET_CHATS', payload: result });
      } else {
        dispatch({ type: 'SET_ERROR', payload: 'Не удалось загрузить чаты' });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Ошибка при загрузке чатов' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [getChats, state.loading]);

  const handleSelectChat = useCallback(async (chatId: string) => {
    try {
      const [, messagesResponse] = await Promise.all([
        openChat(chatId),
        getMessages(chatId, 30)
      ]);
      
      const processedMessages: Message[] = (messagesResponse.items || []).map((msg: Message) => ({
        ...msg,
        isOwn: msg.senderId === currentUserId,
      }));
      
      dispatch({ type: 'SET_SELECTED_CHAT', payload: chatId });
      dispatch({ type: 'SET_MESSAGES', payload: { chatId, messages: processedMessages, nextCursor: messagesResponse.nextCursor } });
      
      await subscribe(chatId);
    } catch (error) {
      console.error('[Chat] Ошибка при выборе чата:', error);
    }
  }, [openChat, getMessages, subscribe, currentUserId]);

  const handleSendMessage = useCallback(async (chatId: string, text: string) => {
    try {
      await sendMessage(chatId, text);
    } catch (error) {
      console.error('[Chat] Ошибка отправки сообщения:', error);
    }
  }, [sendMessage]);

  const loadMoreMessages = useCallback(async (chatId: string) => {
    try {
      const cursor = state.nextMessageCursors[chatId];
      if (!cursor) return;
      
      const response = await getMessages(chatId, 30, cursor);
      const processed: Message[] = (response.items || []).map((msg: Message) => ({
        ...msg,
        isOwn: msg.senderId === currentUserId,
      }));
      dispatch({ type: 'ADD_MESSAGES', payload: { chatId, messages: processed, nextCursor: response.nextCursor } });
    } catch (error) {
      console.error('[Chat] Ошибка загрузки сообщений:', error);
    }
  }, [getMessages, state.nextMessageCursors, currentUserId]);

  // Инициализация загрузки чатов при подключении
  // Загружаем список чатов один раз после успешного подключения.
  const hasLoadedChats = React.useRef(false);
  
  React.useEffect(() => {
    if (isConnected && !hasLoadedChats.current && !state.loading) {
      console.log('[Chat] 📋 Загружаем чаты после подключения');
      hasLoadedChats.current = true;
      loadChats();
    }
    
    // Сбрасываем флаг при отключении
    if (!isConnected) {
      hasLoadedChats.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  // Показываем загрузку если токен еще не готов или идет подключение
  if (!isTokenReady || isConnecting) {
    return (
      <div className="h-screen flex items-center justify-center bg-neu-bg-primary">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-neu-accent-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="neu-text-secondary">
            {!isTokenReady ? 'Инициализация...' : 'Подключение...'}
          </p>
        </div>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="neu-card max-w-sm w-full text-center">
          <div className="p-6">
            <div className="p-4 rounded-neu-full bg-neu-danger/20 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <FiWifiOff className="text-3xl text-neu-danger" />
            </div>
            <h3 className="text-xl font-bold neu-text-primary mb-2">
              Ошибка подключения
            </h3>
            <p className="neu-text-secondary mb-6 leading-relaxed">
              {connectionError}
            </p>
            <button
              onClick={connect}
              className="neu-btn-primary w-full py-3 rounded-neu-md font-semibold flex items-center justify-center space-x-2"
            >
              <FiRefreshCw className="text-lg" />
              <span>Переподключиться</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-neu-bg-primary">
      <div className={`${state.selectedChatId ? 'hidden lg:block' : 'block'} w-full lg:w-80 border-r border-neu-border`}>
        <ChatList
          chats={state.chats}
          loading={state.loading}
          error={state.error}
          selectedChatId={state.selectedChatId}
          onSelectChat={handleSelectChat}
          onLoadMore={() => loadChats()}
          hasMore={!!state.nextCursor}
          onRefresh={() => loadChats()}
        />
      </div>

      <div className={`${!state.selectedChatId ? 'hidden lg:flex' : 'flex'} flex-1 flex-col`}>
        {state.selectedChatId ? (() => {
          const selectedChat = state.chats.find(c => c.id === state.selectedChatId);
          const otherUser = selectedChat?.otherUser ? {
            id: selectedChat.otherUser.userId,
            preferredName: selectedChat.otherUser.preferredName,
            avatar: selectedChat.otherUser.avatar,
            profileId: selectedChat.otherUser.profileId ? selectedChat.otherUser.profileId : undefined
          } : undefined;
          
          return (
            <ChatDetail
              chatId={state.selectedChatId}
              messages={state.messages[state.selectedChatId] || []}
              currentUserId={currentUserId}
              markRead={markRead}
              onSendMessage={handleSendMessage}
              onEditMessage={async (messageId: string, text: string) => {
                await editMessage(messageId, text);
              }}
              onDeleteMessage={async (messageId: string, scope: 'self' | 'both' = 'self') => {
                await deleteMessage(messageId, scope);
              }}
              onLoadMore={() => loadMoreMessages(state.selectedChatId!)}
              hasMore={!!state.nextMessageCursors[state.selectedChatId]}
              onBack={() => dispatch({ type: 'SET_SELECTED_CHAT', payload: null })}
              otherUser={otherUser}
            />
          );
        })() : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center neu-text-tertiary">
              <FiMessageCircle className="text-6xl mx-auto mb-4" />
              <p className="text-lg">Выберите чат для начала общения</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 