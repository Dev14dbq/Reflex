import React from 'react';
import { FiMessageCircle, FiRefreshCw, FiChevronLeft } from 'react-icons/fi';
import { Chat } from './types';
import { handleDecryption } from '@encryption';

interface ChatListProps {
  chats: Chat[];
  loading: boolean;
  error: string | null;
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  onRefresh: () => void;
}

const ChatItem: React.FC<{
  chat: Chat;
  isSelected: boolean;
  onClick: () => void;
  index?: number;
}> = ({ chat, isSelected, onClick, index = 0 }) => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('ru-RU', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  };

  return (
    <div
      className={`p-4 border-b border-neu-border cursor-pointer transition-all duration-200 hover:bg-neu-surface-hover animate-[slideInLeft_0.4s_ease-out_forwards] opacity-0 ${
        isSelected ? 'bg-neu-accent-primary/10 border-l-4 border-l-neu-accent-primary' : ''
      }`}
      style={{ 
        animationDelay: `${index * 0.05}s`,
        animationFillMode: 'forwards'
      }}
      onClick={onClick}
    >
      <div className="flex items-start space-x-3">
        {/* Аватар */}
        <div className="w-12 h-12 rounded-neu-md bg-neu-surface-subtle flex items-center justify-center flex-shrink-0">
          {chat.otherUser?.avatar ? (
            <img
              src={chat.otherUser.avatar}
              alt={chat.otherUser.preferredName}
              className="w-full h-full rounded-neu-md object-cover"
            />
          ) : (
            <span className="text-lg font-semibold neu-text-primary">
              {chat.otherUser?.preferredName?.charAt(0).toUpperCase() || '?'}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold neu-text-primary truncate">
              {chat.otherUser?.preferredName || 'Пользователь'}
            </h3>
            <span className="text-xs neu-text-tertiary ml-2 flex-shrink-0">
              {formatTime(chat.updatedAt)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-sm neu-text-secondary truncate">
              {(() => {
                try {
                  return handleDecryption(chat.lastMessage, chat.id);
                } catch (error) {
                  return 'Не удалось загрузить сообщения...';
                }
              })()}
            </p>
            
            {chat.unreadCount && chat.unreadCount > 0 && (
              <div className="ml-2 bg-neu-accent-primary text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center flex-shrink-0">
                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  loading,
  error,
  selectedChatId,
  onSelectChat,
  onLoadMore,
  hasMore,
  onRefresh
}) => {
  if (error && chats.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-neu-border">
          <h1 className="text-xl font-bold neu-text-primary">Чаты</h1>
        </div>
        
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="p-4 rounded-neu-full bg-neu-danger/20 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <FiMessageCircle className="text-2xl text-neu-danger" />
            </div>
            <h3 className="text-lg font-semibold neu-text-primary mb-2">
              Ошибка загрузки
            </h3>
            <p className="neu-text-secondary mb-4 text-sm">
              {error}
            </p>
            <button
              onClick={onRefresh}
              className="neu-btn-primary px-4 py-2 rounded-neu-md flex items-center space-x-2 mx-auto"
            >
              <FiRefreshCw className="text-sm" />
              <span>Повторить</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Заголовок */}
      <div className="p-4 border-b border-neu-border">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold neu-text-primary">Чаты</h1>
          <button
            onClick={onRefresh}
            className="neu-btn p-2 rounded-neu-md hover:bg-neu-surface-hover"
            title="Обновить"
          >
            <FiRefreshCw className="text-lg neu-text-secondary" />
          </button>
        </div>
      </div>

      {/* Список чатов */}
      <div className="flex-1 overflow-y-auto">
        {loading && chats.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-neu-accent-primary border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="neu-text-secondary text-sm">Загрузка чатов...</p>
            </div>
          </div>
        ) : chats.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="text-4xl mb-4 neu-text-tertiary">💬</div>
              <h3 className="text-lg font-semibold neu-text-primary mb-2">
                Нет чатов
              </h3>
              <p className="neu-text-secondary text-sm">
                Начните общение, лайкнув профили в поиске
              </p>
            </div>
          </div>
        ) : (
          <>
            {chats.map((chat, index) => (
              <ChatItem
                key={chat.id}
                chat={chat}
                isSelected={selectedChatId === chat.id}
                onClick={() => onSelectChat(chat.id)}
                index={index}
              />
            ))}
            
            {/* Кнопка загрузки дополнительных чатов */}
            {hasMore && (
              <div className="p-4 border-t border-neu-border">
                <button
                  onClick={onLoadMore}
                  disabled={loading}
                  className="w-full neu-btn py-3 rounded-neu-md flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-neu-accent-primary border-t-transparent rounded-full"></div>
                      <span>Загрузка...</span>
                    </>
                  ) : (
                    <>
                      <FiChevronLeft className="text-sm rotate-180" />
                      <span>Загрузить ещё</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}; 