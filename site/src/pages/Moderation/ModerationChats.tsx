import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { config } from '../../config/env';

import { FiArrowLeft, FiMessageSquare, FiUser, FiSend, FiClock, FiSearch, FiPlus, FiShield } from 'react-icons/fi';
import styles from './ModerationChats.module.scss';

interface ModeratorChat {
  id: string;
  userId: string;
  userName: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  user: {
    profile?: {
      preferredName?: string;
    };
    username?: string;
  };
}

interface ChatMessage {
  id: string;
  content: string;
  fromModerator: boolean;
  createdAt: string;
  moderatorName?: string;
  isSystemMessage?: boolean;
  systemSenderName?: string;
}

interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  trustScore: number;
  profile?: {
    preferredName?: string;
  };
}

export const ModerationChats: React.FC = () => {
  const [chats, setChats] = useState<ModeratorChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<ModeratorChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.userId);
    }
  }, [selectedChat]);

  const fetchChats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(config.API_URL + '/moderation/chats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setChats(data.chats || []);
    } catch (error) {
      console.error('Failed to fetch moderator chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(config.API_URL + `/moderation/chats/${userId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Failed to fetch chat messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!selectedChat || !newMessage.trim()) return;

    setSendingMessage(true);
    try {
      const token = localStorage.getItem('token');
      await fetch(config.API_URL + `/moderation/chats/${selectedChat.userId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: newMessage }),
      });
      
      setNewMessage('');
      fetchMessages(selectedChat.userId);
      fetchChats(); // Обновляем список чатов
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const searchUsers = async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(config.API_URL + `/moderation/users/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setSearchResults(data.users || []);
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setSearching(false);
    }
  };

  const startChatWithUser = async (user: User) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(config.API_URL + '/moderation/chats/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });
      
      const data = await response.json();
      if (data.success) {
        setShowUserSearch(false);
        setSearchQuery('');
        setSearchResults([]);
        
        // Обновляем список чатов и выбираем созданный чат
        await fetchChats();
        
        // Ищем чат в обновленном списке или создаем временный объект
        setTimeout(() => {
          const newChat = chats.find(chat => chat.userId === user.id) || {
            id: data.chatId || `chat_${user.id}`,
            userId: user.id,
            userName: getUserDisplayNameFromUser(user),
            unreadCount: 0,
            user: { profile: user.profile, username: user.username }
          };
          setSelectedChat(newChat);
        }, 100);
      }
    } catch (error) {
      console.error('Failed to start chat:', error);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchUsers(query);
  };

  const getUserDisplayNameFromUser = (user: User) => {
    return user.profile?.preferredName || user.firstName || user.username || `ID: ${user.id}`;
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 60) return '#10b981'; // Зеленый - хороший
    if (score >= 40) return '#6b7280'; // Серый - нейтральный 
    return '#ef4444'; // Красный - плохой
  };

  const getUserDisplayName = (chat: ModeratorChat) => {
    return chat.user.profile?.preferredName || chat.user.username || chat.userName || `ID: ${chat.userId}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    }
  };

  return (
    <div className={styles.moderationPage}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <button onClick={() => navigate('/moderation')} className={styles.backButton}>
            <FiArrowLeft size={20} />
          </button>
          <h1>Чаты модераторов</h1>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.chatsContainer}>
          {/* Список чатов */}
          <div className={styles.chatsList}>
            <div className={styles.chatsHeader}>
              <h2>Активные чаты</h2>
              <div className={styles.chatsActions}>
                <button 
                  className={styles.newChatButton}
                  onClick={() => setShowUserSearch(!showUserSearch)}
                  title="Написать пользователю"
                >
                  <FiPlus size={16} />
                </button>
                <span className={styles.chatsCount}>{chats.length}</span>
              </div>
            </div>
            
            {showUserSearch && (
              <div className={styles.userSearch}>
                <div className={styles.searchInput}>
                  <FiSearch size={16} />
                  <input
                    type="text"
                    placeholder="Поиск пользователей..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                  />
                </div>
                
                {searching && (
                  <div className={styles.searchLoading}>Поиск...</div>
                )}
                
                {searchResults.length > 0 && (
                  <div className={styles.searchResults}>
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className={styles.searchResult}
                        onClick={() => startChatWithUser(user)}
                      >
                        <div className={styles.userAvatar}>
                          <FiUser size={16} />
                        </div>
                        <div className={styles.userInfo}>
                          <div className={styles.userName}>
                            {getUserDisplayNameFromUser(user)}
                          </div>
                          <div 
                            className={styles.userTrust}
                            style={{ color: getTrustScoreColor(user.trustScore) }}
                          >
                            Доверие: {user.trustScore}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                  <div className={styles.noResults}>Пользователи не найдены</div>
                )}
              </div>
            )}
            
            {loading ? (
              <div className={styles.loading}>Загрузка чатов...</div>
            ) : chats.length === 0 ? (
              <div className={styles.empty}>
                <FiMessageSquare size={48} />
                <p>Нет активных чатов</p>
              </div>
            ) : (
              <div className={styles.chatItems}>
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`${styles.chatItem} ${selectedChat?.id === chat.id ? styles.selected : ''}`}
                    onClick={() => setSelectedChat(chat)}
                  >
                    <div className={styles.chatAvatar}>
                      <FiShield size={20} />
                    </div>
                    <div className={styles.chatInfo}>
                      <div className={styles.chatName}>
                        {getUserDisplayName(chat)}
                      </div>
                      {chat.lastMessage && (
                        <div className={styles.lastMessage}>
                          {chat.lastMessage.length > 50 
                            ? `${chat.lastMessage.substring(0, 50)}...` 
                            : chat.lastMessage
                          }
                        </div>
                      )}
                    </div>
                    <div className={styles.chatMeta}>
                      {chat.lastMessageAt && (
                        <div className={styles.time}>
                          {formatTime(chat.lastMessageAt)}
                        </div>
                      )}
                      {chat.unreadCount > 0 && (
                        <div className={styles.unreadBadge}>
                          {chat.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Область чата */}
          <div className={styles.chatArea}>
            {selectedChat ? (
              <>
                <div className={styles.chatHeader}>
                  <div className={styles.chatUserInfo}>
                    <div className={styles.chatAvatar}>
                      <FiUser size={24} />
                    </div>
                    <div>
                      <h3>{getUserDisplayName(selectedChat)}</h3>
                      <p>ID: {selectedChat.userId}</p>
                    </div>
                  </div>
                  <button 
                    className={styles.viewUserButton}
                    onClick={() => navigate(`/moderation/user/${selectedChat.userId}`)}
                  >
                    Просмотр профиля
                  </button>
                </div>

                <div className={styles.messagesContainer}>
                  {messages.length === 0 ? (
                    <div className={styles.noMessages}>
                      <FiClock size={32} />
                      <p>Сообщений пока нет</p>
                    </div>
                  ) : (
                    <div className={styles.messages}>
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`${styles.message} ${message.fromModerator ? styles.moderatorMessage : styles.userMessage}`}
                        >
                          <div className={styles.messageContent}>
                            {message.content}
                          </div>
                          <div className={styles.messageInfo}>
                            {message.fromModerator && (
                              <span className={styles.sender}>
                                {message.isSystemMessage && message.systemSenderName 
                                  ? message.systemSenderName 
                                  : message.moderatorName 
                                    ? `Модератор: ${message.moderatorName}` 
                                    : 'Модератор'
                                }
                              </span>
                            )}
                            <span className={styles.time}>
                              {formatTime(message.createdAt)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.messageInput}>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Введите сообщение от лица модератора..."
                    className={styles.messageTextarea}
                    rows={3}
                    disabled={sendingMessage}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                    className={styles.sendButton}
                  >
                    <FiSend size={20} />
                    {sendingMessage ? 'Отправка...' : 'Отправить'}
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.noChatSelected}>
                <FiMessageSquare size={64} />
                <h3>Выберите чат</h3>
                <p>Выберите чат из списка для начала общения</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 