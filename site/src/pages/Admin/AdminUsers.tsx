import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiTrash2, FiSearch, FiChevronLeft, FiChevronRight, FiMoreVertical } from 'react-icons/fi';
import styles from './AdminPanel.module.scss';
import clsx from 'clsx';

interface User {
  id: string;
  telegramId: string;
  firstName: string;
  lastName?: string;
  username?: string;
  isAdmin: boolean;
  isModerator: boolean;
  isAdvertiser: boolean;
  blocked: boolean;
  createdAt: string;
  profile?: {
    preferredName?: string;
    isVerified: boolean;
  };
}

// Компонент для управления ролями
const RoleManager: React.FC<{ user: User, onRoleChange: () => void }> = ({ user, onRoleChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleRoleChange = async (role: 'admin' | 'moderator' | 'advertiser', grant: boolean) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`https://spectrmod.ru/api/admin/users/${user.id}/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role, grant })
      });
      onRoleChange();
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  return (
    <div className={styles.roleManager}>
      <button onClick={() => setIsOpen(!isOpen)} className={styles.actionButton}>
        <FiMoreVertical />
      </button>
      {isOpen && (
        <div className={styles.roleMenu}>
          <label>
            <input
              type="checkbox"
              checked={user.isAdmin}
              onChange={(e) => handleRoleChange('admin', e.target.checked)}
            />
            Администратор
          </label>
          <label>
            <input
              type="checkbox"
              checked={user.isModerator}
              onChange={(e) => handleRoleChange('moderator', e.target.checked)}
            />
            Модератор
          </label>
           <label>
            <input
              type="checkbox"
              checked={user.isAdvertiser}
              onChange={(e) => handleRoleChange('advertiser', e.target.checked)}
            />
            Рекламодатель
          </label>
        </div>
      )}
    </div>
  );
};


export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://spectrmod.ru/api/admin/users?page=${page}&search=${search}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setUsers(data.users);
      setTotalPages(data.pagination.pages);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    if (e.target.value === '') {
      // Сбрасываем поиск, если поле очищено
      fetchUsers();
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };
  
  const handleDelete = async (userId: string) => {
    if (window.confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`https://spectrmod.ru/api/admin/users/${userId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchUsers();
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };


  return (
    <div className={styles.adminPage}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <button onClick={() => navigate('/admin')} className={styles.backButton}>
            <FiArrowLeft size={20} />
          </button>
          <h1>Пользователи</h1>
        </div>
      </div>

      <div className={styles.content}>
        <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
          <div className={styles.searchInputWrapper}>
            <FiSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Поиск по имени, нику, ID..."
              value={search}
              onChange={handleSearchChange}
              className={styles.searchInput}
            />
          </div>
        </form>

        {loading ? (
          <div className={styles.loading}>Загрузка...</div>
        ) : (
          <div className={styles.userList}>
            {users.map(user => (
              <div key={user.id} className={clsx(styles.userCard, user.blocked && styles.blocked)}>
                <div className={styles.userInfo}>
                  <h3>{user.profile?.preferredName || `${user.firstName || ''} ${user.lastName || ''}`}</h3>
                  <p>@{user.username || 'N/A'}</p>
                  <div className={styles.userMeta}>
                    <span>ID: {user.telegramId}</span>
                    <div className={styles.userTags}>
                      {user.isAdmin && <span className={clsx(styles.tag, styles.adminTag)}>Admin</span>}
                      {user.isModerator && <span className={clsx(styles.tag, styles.moderatorTag)}>Mod</span>}
                      {user.isAdvertiser && <span className={clsx(styles.tag, styles.advertiserTag)}>Adv</span>}
                      {user.blocked && <span className={clsx(styles.tag, styles.blockedTag)}>Blocked</span>}
                    </div>
                  </div>
                </div>
                <div className={styles.userActions}>
                  <RoleManager user={user} onRoleChange={fetchUsers} />
                  <button className={styles.actionButton} onClick={() => handleDelete(user.id)}><FiTrash2/></button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className={styles.pagination}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><FiChevronLeft/></button>
          <span>Страница {page} из {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><FiChevronRight/></button>
        </div>
      </div>
    </div>
  );
}; 