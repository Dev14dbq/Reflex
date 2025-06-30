import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiEdit, FiTrash2, FiSend } from 'react-icons/fi';
import styles from './AdminPanel.module.scss';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface News {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  authorId: string;
  isPublished: boolean;
  publishedAt: string | null;
  sentCount: number;
}

export const AdminNews: React.FC = () => {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<News | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('https://spectrmod.ru/api/admin/news', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data && Array.isArray(data.news)) {
        setNews(data.news);
      } else {
        setNews([]);
        console.error('Expected "news" array in response, but got:', data);
        toast.error('Некорректный формат данных новостей');
      }
    } catch (error) {
      console.error('Failed to fetch news:', error);
      toast.error('Ошибка загрузки новостей');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error('Заголовок и содержание не могут быть пустыми!');
      return;
    }

    const url = isEditing
      ? `https://spectrmod.ru/api/admin/news/${isEditing.id}`
      : 'https://spectrmod.ru/api/admin/news';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const token = localStorage.getItem('token');
      await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: newTitle, content: newContent }),
      });
      fetchNews();
      setIsEditing(null);
      setNewTitle('');
      setNewContent('');
      toast.success(isEditing ? 'Новость успешно обновлена!' : 'Новость успешно создана!');
    } catch (error) {
      console.error('Failed to save news:', error);
      toast.error('Ошибка сохранения новости');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить эту новость?')) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`https://spectrmod.ru/api/admin/news/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchNews();
        toast.success('Новость удалена');
      } catch (error) {
        console.error('Failed to delete news:', error);
        toast.error('Ошибка удаления новости');
      }
    }
  };

  const handlePublish = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите разослать эту новость всем пользователям?')) {
      return;
    }
    
    setPublishing(id);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://spectrmod.ru/api/admin/news/${id}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка публикации');
      }
      
      const result = await response.json();
      
      toast.success(
        `Новость успешно разослана! Отправлено: ${result.stats.sentCount} из ${result.stats.eligibleUsers} пользователей`
      );
      
      fetchNews(); // Обновляем список новостей
    } catch (error) {
      console.error('Failed to publish news:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка публикации новости');
    } finally {
      setPublishing(null);
    }
  };

  const startEdit = (item: News) => {
    setIsEditing(item);
    setNewTitle(item.title);
    setNewContent(item.content);
    window.scrollTo(0, 0);
  };

  return (
    <div className={styles.adminPage}>
      <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar />
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <button onClick={() => navigate('/admin')} className={styles.backButton}>
            <FiArrowLeft size={20} />
          </button>
          <h1>Управление новостями</h1>
        </div>
      </div>
      <div className={styles.content}>
        <div className={styles.editForm}>
          <h3>{isEditing ? 'Редактировать новость' : 'Создать новость'}</h3>
          <input
            type="text"
            className={styles.input}
            placeholder="Заголовок"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <textarea
            className={styles.textarea}
            placeholder="Содержание"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
          />
          <div className={styles.formActions}>
            <button className={styles.saveButton} onClick={handleSave}>
              {isEditing ? 'Сохранить' : 'Создать'}
            </button>
            {isEditing && (
              <button className={styles.cancelButton} onClick={() => {
                setIsEditing(null);
                setNewTitle('');
                setNewContent('');
              }}>
                Отмена
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>Загрузка...</div>
        ) : (
          <div className={styles.newsList}>
            {news.map(item => (
              <div key={item.id} className={styles.newsCard}>
                <div className={styles.newsContent}>
                  <h3>
                    {item.title}
                    {item.isPublished && (
                      <span style={{ 
                        marginLeft: '10px', 
                        fontSize: '14px', 
                        color: '#4CAF50',
                        fontWeight: 'normal'
                      }}>
                        ✅ Опубликовано
                      </span>
                    )}
                  </h3>
                  <p>{item.content}</p>
                  <div className={styles.newsMeta}>
                    Создано: {new Date(item.createdAt).toLocaleString()}
                    {item.isPublished && item.publishedAt && (
                      <>
                        <br />
                        Опубликовано: {new Date(item.publishedAt).toLocaleString()}
                        <br />
                        Отправлено: {item.sentCount} пользователям
                      </>
                    )}
                  </div>
                </div>
                <div className={styles.newsActions}>
                  {!item.isPublished && (
                    <button 
                      className={styles.actionButton} 
                      onClick={() => handlePublish(item.id)}
                      disabled={publishing === item.id}
                      style={{ 
                        backgroundColor: '#4CAF50', 
                        color: 'white',
                        opacity: publishing === item.id ? 0.7 : 1
                      }}
                    >
                      <FiSend size={16} /> 
                      {publishing === item.id ? 'Отправка...' : 'Разослать всем'}
                    </button>
                  )}
                  <button className={styles.actionButton} onClick={() => startEdit(item)}>
                    <FiEdit size={16} /> Редактировать
                  </button>
                  <button className={styles.actionButton} onClick={() => handleDelete(item.id)}>
                    <FiTrash2 size={16} /> Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 