import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, 
  FiSend, 
  FiMoreVertical, 
  FiTrash2, 
  FiEdit3, 
  FiCopy, 
  FiX, 
  FiCheckCircle, 
  FiFlag 
} from 'react-icons/fi';

import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

import { ReadIcon } from '@components/ui/ReadIcon';
import { Message } from './types';
import api from '@api';

// Удалили хвостики у bubble, поэтому дополнительные стили не требуются
const bubbleStyles = ``;

interface ChatDetailProps {
  chatId: string;
  messages: Message[];
  currentUserId: string | null;
  markRead: (chatId: string, ids: string[]) => Promise<void>;
  onSendMessage: (chatId: string, text: string) => Promise<void>;
  onEditMessage: (messageId: string, text: string) => Promise<void>;
  onDeleteMessage: (messageId: string, scope: 'self' | 'both') => Promise<void>;
  onLoadMore: () => void;
  hasMore: boolean;
  onBack: () => void;
  otherUser?: {
    id: string;
    preferredName: string;
    avatar?: string;
    profileId?: string;
  };
}

const MessageItem: React.FC<{
  message: Message;
  onEdit: (id: string, t: string) => void;
  onDelete: (id: string) => void;
  selected: Set<string>;
  toggleSelect: (id: string) => void;
}> = ({ message, onEdit, onDelete, selected, toggleSelect }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState<string>(message.text || '');
  const isSelected = selected.has(message.id);

  const handleEdit = () => {
    if (editText.trim() && editText !== message.text) {
      onEdit(message.id, editText.trim());
    }
    setIsEditing(false);
    setShowMenu(false);
  };

  const handleDelete = () => {
    onDelete(message.id);
    setShowMenu(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ type: 'tween', duration: 0.25 }}
      className={`flex mb-2 ${message.isOwn ? 'justify-end' : 'justify-start'}`}
      onContextMenu={(e)=>{e.preventDefault();toggleSelect(message.id);}}
    >
      <div className={`max-w-[70%] relative group ${message.isOwn ? 'order-2' : 'order-1'}`}>
        <div
          className={clsx(
            'relative px-4 py-2 rounded-2xl shadow-sm',
            message.isOwn
              ? 'bg-neu-accent-primary text-white ml-auto message-bubble-own'
              : 'bg-white neu-text-primary border border-gray-200 message-bubble-other',
            isSelected && 'ring-2 ring-neu-accent-primary',
            'transition-all'
          )}
        >
          {/* Галочка выбора */}
          {isSelected && (
            <span className="absolute -left-6 top-1 text-neu-accent-primary bg-white rounded-full">
              <FiCheckCircle className="w-5 h-5" />
            </span>
          )}
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-transparent border-none outline-none resize-none min-h-[60px]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleEdit();
                  } else if (e.key === 'Escape') {
                    setIsEditing(false);
                    setEditText(message.text || '');
                  }
                }}
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleEdit}
                  className="text-xs px-2 py-1 bg-white/20 rounded hover:bg-white/30"
                >
                  Сохранить
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditText(message.text || '');
                  }}
                  className="text-xs px-2 py-1 bg-white/20 rounded hover:bg-white/30"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <>
              <p
                className={clsx(
                  'whitespace-pre-wrap break-words leading-relaxed text-inherit',
                  message.isOwn ? 'pr-12' : 'pr-6'
                )}
              >
                {message.text}
              </p>
              <div className="flex items-center gap-1 absolute bottom-2 right-4 text-xs">
                <span className={message.isOwn ? 'text-white/80' : 'text-gray-500'}>{formatTime(message.createdAt)}{message.editedAt && ' (изм.)'}</span>
                {message.isOwn && <ReadIcon read={!!message.readAt} />}
              </div>
              {message.isOwn && selected.size===0 && (
                <div className="absolute top-2 right-2">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/20 rounded"
                  >
                    <FiMoreVertical className="w-3 h-3" />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 mt-1 bg-white rounded-neu-md shadow-lg border border-neu-border py-1 z-10 min-w-[120px]">
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setShowMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm neu-text-primary hover:bg-neu-surface-hover flex items-center space-x-2"
                      >
                        <FiEdit3 className="w-3 h-3" />
                        <span>Изменить</span>
                      </button>
                      <button
                        onClick={handleDelete}
                        className="w-full px-3 py-2 text-left text-sm text-neu-danger hover:bg-neu-surface-hover flex items-center space-x-2"
                      >
                        <FiTrash2 className="w-3 h-3" />
                        <span>Удалить</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const ChatDetail: React.FC<ChatDetailProps> = ({
  chatId,
  messages,

  markRead,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onLoadMore,
  hasMore,
  onBack,
  otherUser
}) => {
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [complaintReason, setComplaintReason] = useState('');
  const [complaintDetails, setComplaintDetails] = useState('');
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const navigate = useNavigate();

  // Скролл к последнему сообщению
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // Сохраняем предыдущий список сообщений для определения типа изменений
  const prevMessagesRef = useRef<Message[]>([]);
  const prevScrollHeightRef = useRef<number>(0);
  const prevScrollTopRef = useRef<number>(0);

  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const prevMessages = prevMessagesRef.current;

    // Если добавили новые сообщения внизу
    if (
      prevMessages.length > 0 &&
      messages.length > prevMessages.length &&
      messages[messages.length - 1]?.id !== prevMessages[prevMessages.length - 1]?.id
    ) {
      // Проверяем, находится ли пользователь близко к низу
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      if (isNearBottom || messages[messages.length - 1]?.isOwn) {
        scrollToBottom(false);
      }
    }

    // Если подгрузили старые сообщения (добавлены в начало)
    if (
      prevMessages.length > 0 &&
      messages.length > prevMessages.length &&
      messages[0]?.id !== prevMessages[0]?.id
    ) {
      const delta = container.scrollHeight - (prevScrollHeightRef.current || 0);
      // Восстанавливаем позицию так, чтобы пользователь видел тот же самый элемент
      container.scrollTop = (prevScrollTopRef.current || 0) + delta;
      // Сброс сохраняемых значений
      prevScrollHeightRef.current = 0;
      prevScrollTopRef.current = 0;
    }

    prevMessagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const unreadIds = messages.filter(m => !m.isOwn && !m.readAt).map(m=>m.id);
    if(unreadIds.length) {
      markRead(chatId, unreadIds).catch(()=>{});
    }
  }, [messages, markRead, chatId]);

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;

    const text = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      await onSendMessage(chatId, text);
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      // Возвращаем текст обратно в поле при ошибке
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  const handleEdit = async (messageId: string, text: string) => {
    try {
      await onEditMessage(messageId, text);
    } catch (error) {
      console.error('Ошибка редактирования:', error);
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      await onDeleteMessage(messageId, 'self');
    } catch (error) {
      console.error('Ошибка удаления:', error);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if(next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const clearSelection = ()=> setSelected(new Set());

  const copySelected = ()=>{
    const selectedMessages = messages.filter(m => selected.has(m.id)).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const textToCopy = selectedMessages.map(m => m.text).filter(Boolean).join('\n');
    if(textToCopy) navigator.clipboard.writeText(textToCopy);
    clearSelection();
  };

  const deleteSelected = ()=>{
    selected.forEach(id=>onDeleteMessage(id,'self'));
    clearSelection();
  };

  const editSelected = ()=>{
    const id=[...selected][0];
    const msg=messages.find(m=>m.id===id);
    if(!msg) return;
    // simple prompt edit
    const newText=prompt('Изменить сообщение',msg.text||'');
    if(newText!==null && newText.trim()) onEditMessage(id,newText.trim());
    clearSelection();
  };

  const handleSubmitComplaint = async () => {
    if (!complaintReason.trim() || !otherUser?.id) return;
    
    console.log('[CHAT] Submitting complaint:', { userId: otherUser.id, reason: complaintReason, details: complaintDetails, type: 'chat' });
    
    setSubmittingComplaint(true);
    try {
      const token = localStorage.getItem('token');
      const response = await api.post('/complaints', {
        userId: otherUser.id,
        reason: complaintReason,
        details: complaintDetails.trim() || undefined,
        type: 'chat'
      },{
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = response.json();
      
      console.log('[CHAT] Complaint response:', data);
      
      setShowComplaintModal(false);
      setComplaintReason('');
      setComplaintDetails('');
      alert('Жалоба отправлена. Модераторы рассмотрят её в ближайшее время.');
    } catch (error) {
      console.error('[CHAT] Error submitting complaint:', error);
      alert('Ошибка при отправке жалобы. Попробуйте ещё раз.');
    } finally {
      setSubmittingComplaint(false);
    }
  };

  // Автофокус поля ввода при любой попытке печати
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement !== inputRef.current && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = () => {
      if (showChatMenu) {
        setShowChatMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showChatMenu]);

  // Автоподгрузка сообщений при скролле вверх
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Считаем, что пользователь у верхней границы, если scrollTop < 50px
      if (container.scrollTop < 50 && hasMore && !loading) {
        // Сохраняем текущие размеры до того, как начнём загрузку
        prevScrollHeightRef.current = container.scrollHeight;
        prevScrollTopRef.current = container.scrollTop;

        setLoading(true);
        onLoadMore();
        // Сбрасываем индикатор загрузки через секунду – предполагаем, что onLoadMore
        // обновит hasMore при ответе сервера.
        setTimeout(() => setLoading(false), 1000);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, onLoadMore, loading]);

  // Скроллим в самый низ при первой загрузке сообщений
  useEffect(() => {
    scrollToBottom(false);
  }, []);

  return (
    <>
      {/* Временно оставляем возможность подмены стилей через bubbleStyles */}
      {bubbleStyles && <style dangerouslySetInnerHTML={{ __html: bubbleStyles }} />}
      
      <div className="flex flex-col h-full">
        {/* Закрепленный хедер */}
        <div className="sticky top-0 z-20 bg-neu-bg-primary border-b border-neu-border flex items-center px-4 py-3 shadow-sm">
          {selected.size === 0 ? (
            <>
              <button onClick={onBack} className="mr-3 p-1 rounded hover:bg-neu-surface-hover">
                <FiArrowLeft className="text-xl" />
              </button>
              <div className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer" onClick={() => {const pid = otherUser?.profileId; if(pid) navigate(`/profile/${pid}`)}}>
                <div className="w-10 h-10 rounded-full bg-neu-surface-subtle flex items-center justify-center overflow-hidden">
                  {otherUser?.avatar ? (
                    <img src={otherUser.avatar} alt={otherUser.preferredName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-semibold neu-text-primary">
                      {otherUser?.preferredName?.charAt(0).toUpperCase() || '?'}
                    </span>
                  )}
                </div>
                <span className="font-semibold neu-text-primary text-lg truncate max-w-[120px]" style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                  {otherUser?.preferredName || 'Пользователь'}
                </span>
              </div>
              <div className="relative ml-3">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowChatMenu(!showChatMenu);
                  }}
                  className="p-1 rounded hover:bg-neu-surface-hover"
                >
                  <FiMoreVertical className="text-xl" />
                </button>
                {showChatMenu && (
                  <div className="absolute right-0 mt-1 bg-white rounded-neu-md shadow-lg border border-neu-border py-1 z-10 min-w-[140px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowComplaintModal(true);
                        setShowChatMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm neu-text-primary hover:bg-neu-surface-hover flex items-center space-x-2"
                    >
                      <FiFlag className="w-4 h-4" />
                      <span>Пожаловаться</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button onClick={clearSelection} className="mr-3 p-1 rounded hover:bg-neu-surface-hover">
                <FiX className="text-xl" />
              </button>
              <span className="flex-1 font-semibold neu-text-primary">{selected.size} выбрано</span>
              <div className="flex items-center space-x-2">
                {selected.size === 1 && (
                  <button onClick={editSelected} className="p-2 rounded hover:bg-neu-surface-hover" title="Изменить">
                    <FiEdit3 className="text-lg" />
                  </button>
                )}
                <button onClick={copySelected} className="p-2 rounded hover:bg-neu-surface-hover" title="Копировать">
                  <FiCopy className="text-lg" />
                </button>
                <button onClick={deleteSelected} className="p-2 rounded hover:bg-neu-surface-hover text-neu-danger" title="Удалить">
                  <FiTrash2 className="text-lg" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Сообщения */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-1"
        >
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-4xl mb-4 neu-text-tertiary">💬</div>
                <h3 className="text-lg font-semibold neu-text-primary mb-2">
                  Начните разговор
                </h3>
                <p className="neu-text-secondary text-sm">
                  Отправьте первое сообщение, чтобы начать общение
                </p>
              </div>
            </div>
          ) : (
            <>
              <AnimatePresence initial={false}> 
                {messages.map((message) => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    selected={selected}
                    toggleSelect={toggleSelect}
                  />
                ))}
              </AnimatePresence>
            </>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Поле ввода - фиксированное внизу */}
        <div className="sticky bottom-0 p-4 border-t border-neu-border bg-neu-bg-primary">
          <div className="flex items-end space-x-2">
            <input
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Напишите сообщение..."
              className="w-full rounded-neu-lg px-4 py-3 shadow-sm bg-white neu-text-primary focus:outline-none focus:ring-2 focus:ring-neu-accent-primary transition min-h-[40px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || sending}
              className="neu-btn-primary p-3 rounded-neu-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-2"
              style={{height:'44px'}}
            >
              {sending ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <FiSend className="text-lg" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Модальное окно жалобы */}
      {showComplaintModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-neu-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-xl font-semibold neu-text-primary mb-4">
              Пожаловаться на пользователя
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium neu-text-primary mb-2">
                  Причина жалобы *
                </label>
                <select
                  value={complaintReason}
                  onChange={(e) => setComplaintReason(e.target.value)}
                  className="w-full rounded-neu-md border border-neu-border px-3 py-2 neu-text-primary focus:outline-none focus:ring-2 focus:ring-neu-accent-primary"
                >
                  <option value="">Выберите причину</option>
                  <option value="inappropriate_content">Неприемлемый контент</option>
                  <option value="harassment">Домогательства</option>
                  <option value="spam">Спам</option>
                  <option value="fake_profile">Поддельный профиль</option>
                  <option value="inappropriate_photos">Неприемлемые фото</option>
                  <option value="other">Другое</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium neu-text-primary mb-2">
                  Дополнительные детали
                </label>
                <textarea
                  value={complaintDetails}
                  onChange={(e) => setComplaintDetails(e.target.value)}
                  placeholder="Опишите подробнее ситуацию (необязательно)"
                  className="w-full rounded-neu-md border border-neu-border px-3 py-2 neu-text-primary focus:outline-none focus:ring-2 focus:ring-neu-accent-primary resize-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowComplaintModal(false);
                  setComplaintReason('');
                  setComplaintDetails('');
                }}
                className="flex-1 neu-btn-secondary"
                disabled={submittingComplaint}
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  console.log('[CHAT] Submit button clicked');
                  handleSubmitComplaint();
                }}
                disabled={!complaintReason.trim() || submittingComplaint}
                className="flex-1 neu-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingComplaint ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}; 