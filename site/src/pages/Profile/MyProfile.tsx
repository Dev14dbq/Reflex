import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiTrash2, FiArrowUp, FiArrowDown, FiPlus } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { config } from '../../config/env';

import api from '@api';

import { SlidePageTransition } from '@components/ui/PageTransition';
import { EditNameModal } from '@components/profile/EditNameModal';
import { EditAgeModal } from '@components/profile/EditAgeModal';
import { EditCityModal } from '@components/profile/EditCityModal';
import { EditGenderModal } from '@components/profile/EditGenderModal';
import { EditGoalsModal } from '@components/profile/EditGoalsModal';
import { EditDescriptionModal } from '@components/profile/EditDescriptionModal';

interface Profile {
  id: string;
  preferredName: string;
  gender: string;
  birthYear: string;
  city: string;
  goals: string[];
  description: string;
  images: string[];
  user?: { username?: string };
}

export const MyProfile: React.FC = () => {
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [idx, setIdx] = useState(0);
  
  // Состояния для модальных окон
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editAgeOpen, setEditAgeOpen] = useState(false);
  const [editCityOpen, setEditCityOpen] = useState(false);
  const [editGenderOpen, setEditGenderOpen] = useState(false);
  const [editGoalsOpen, setEditGoalsOpen] = useState(false);
  const [editDescriptionOpen, setEditDescriptionOpen] = useState(false);

  const fetchProfile = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get('/profile/me', {
        headers: {
          Authorization: `Bearer ${token}`
        },
      });

      const data = await res.json();
      setProfile(data.profile);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  const updateImages = async (images: string[]) => {
    if (!token) return;
    await api.post('/profile/update', {
      images
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    await fetchProfile();
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!token) return;
    try {
      await fetch(config.API_URL + '/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      await fetchProfile();
    } catch (error) {
      console.error('Ошибка обновления профиля:', error);
    }
  };

  const navigateImage = (dir: 'next' | 'prev', total: number) => {
    setIdx((prev) => {
      if (dir === 'next') return (prev + 1) % total;
      return (prev - 1 + total) % total;
    });
  };

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-neu-accent-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const age = new Date().getFullYear() - parseInt(profile.birthYear, 10);
  const images = profile.images.length
    ? profile.images
    : [`https://api.dicebear.com/7.x/thumbs/svg?seed=${Math.floor(Math.random() * 1000000)}`];

  return (
    <SlidePageTransition className="h-screen overflow-y-auto bg-neu-bg-primary p-4 space-y-4">
      <button onClick={() => navigate(-1)} className="neu-btn px-3 py-2 rounded-neu-md flex items-center space-x-2">
        <FiArrowLeft /> <span>Назад</span>
      </button>

      {/* Card */}
      <div className="neu-card max-w-md mx-auto w-full space-y-4 p-4">
        {/* Image slider */}
        <div className="relative w-full aspect-[3/4] rounded-neu-lg overflow-hidden bg-neu-surface-subtle mx-auto">
          {images.map((img, i) => (
            <motion.img
              key={i}
              src={img}
              alt="profile"
              className="absolute inset-0 w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: i === idx ? 1 : 0 }}
              transition={{ duration: 0.4 }}
              style={{ zIndex: i === idx ? 2 : 1 }}
              onError={(e)=>{(e.target as HTMLImageElement).style.display='none';}}
            />
          ))}
          {images.length > 1 && (
            <>
              <button
                onClick={() => navigateImage('prev', images.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 text-white p-2 rounded-full hover:bg-black/50"
              >
                <FiArrowLeft />
              </button>
              <button
                onClick={() => navigateImage('next', images.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 text-white p-2 rounded-full hover:bg-black/50"
              >
                <FiArrowLeft className="rotate-180" />
              </button>
            </>
          )}
        </div>

        {/* Image management */}
        <div className="flex gap-2 flex-wrap">
          {profile.images.map((img, idxImg) => (
            <div key={idxImg} className="relative group w-20 h-20 rounded-neu-lg overflow-hidden bg-neu-surface-subtle">
              <img src={img} alt="img" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition">
                <button
                  onClick={() => {
                    const arr = [...profile.images];
                    if (idxImg > 0) {
                      [arr[idxImg - 1], arr[idxImg]] = [arr[idxImg], arr[idxImg - 1]];
                      updateImages(arr);
                    }
                  }}
                  className="text-white"
                >
                  <FiArrowUp />
                </button>
                <button
                  onClick={() => {
                    const arr = [...profile.images];
                    if (idxImg < arr.length - 1) {
                      [arr[idxImg + 1], arr[idxImg]] = [arr[idxImg], arr[idxImg + 1]];
                      updateImages(arr);
                    }
                  }}
                  className="text-white"
                >
                  <FiArrowDown />
                </button>
                <button
                  onClick={() => {
                    const arr = profile.images.filter((_, i) => i !== idxImg);
                    updateImages(arr);
                  }}
                  className="text-red-400"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => {
              const tg = (window as any).Telegram?.WebApp;
              if (tg && tg.showAlert) {
                tg.showAlert('Загрузка фотографий доступна через Telegram-бота. Используйте кнопку «Загрузить фото».');
              } else {
                alert('Загрузка фотографий доступна через Telegram-бота.');
              }
            }}
            className="w-20 h-20 flex items-center justify-center rounded-neu-lg bg-neu-surface-hover"
          >
            <FiPlus className="text-xl" />
          </button>
        </div>

        {/* Подсказка */}
        <div className="mb-4 p-3 rounded-neu-md bg-neu-surface-subtle">
          <p className="text-sm neu-text-secondary text-center">
            💡 Нажмите на любое поле, чтобы его изменить
          </p>
        </div>

        {/* Info */}
        <div className="space-y-4">
          {/* Имя и возраст */}
          <div className="space-y-2">
            <h2 
              className="text-xl font-bold neu-text-primary cursor-pointer hover:bg-neu-surface-subtle p-2 rounded-neu-md transition-colors"
              onClick={() => setEditNameOpen(true)}
              title="Нажмите, чтобы изменить имя"
            >
              {profile.preferredName}, 
              <span 
                className="cursor-pointer hover:bg-neu-surface-hover p-1 rounded transition-colors ml-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditAgeOpen(true);
                }}
                title="Нажмите, чтобы изменить возраст"
              >
                {age}
              </span>
            </h2>
          </div>

          {/* Город */}
          <div>
            <p 
              className="neu-text-secondary cursor-pointer hover:bg-neu-surface-subtle p-2 rounded-neu-md transition-colors break-words"
              onClick={() => setEditCityOpen(true)}
              title="Нажмите, чтобы изменить город"
            >
              📍 {profile.city}
            </p>
          </div>

          {/* Роль */}
          <div>
            <p 
              className="neu-text-secondary cursor-pointer hover:bg-neu-surface-subtle p-2 rounded-neu-md transition-colors"
              onClick={() => setEditGenderOpen(true)}
              title="Нажмите, чтобы изменить роль"
            >
              👤 Роль: {profile.gender}
            </p>
          </div>

          {/* Описание */}
          <div>
            <p 
              className="neu-text-secondary whitespace-pre-wrap leading-relaxed cursor-pointer hover:bg-neu-surface-subtle p-3 rounded-neu-md transition-colors"
              onClick={() => setEditDescriptionOpen(true)}
              title="Нажмите, чтобы изменить описание"
            >
              {profile.description}
            </p>
          </div>

          {/* Цели */}
          <div className="space-y-2">
            <span className="text-sm font-medium neu-text-primary">Цели:</span>
            <div 
              className="flex flex-wrap gap-2 cursor-pointer hover:bg-neu-surface-subtle p-2 rounded-neu-md transition-colors"
              onClick={() => setEditGoalsOpen(true)}
              title="Нажмите, чтобы изменить цели"
            >
              {profile.goals.map((g) => (
                <span key={g} className="px-2 sm:px-3 py-1 neu-surface-subtle rounded-neu-sm text-xs sm:text-sm neu-text-secondary">
                  #{g}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Модальные окна */}
      <EditNameModal
        isOpen={editNameOpen}
        onClose={() => setEditNameOpen(false)}
        currentName={profile.preferredName}
        onSave={(name) => updateProfile({ preferredName: name })}
      />

      <EditAgeModal
        isOpen={editAgeOpen}
        onClose={() => setEditAgeOpen(false)}
        currentBirthYear={profile.birthYear}
        onSave={(birthYear) => updateProfile({ birthYear })}
      />

      <EditCityModal
        isOpen={editCityOpen}
        onClose={() => setEditCityOpen(false)}
        currentCity={profile.city}
        onSave={(city) => updateProfile({ city })}
      />

      <EditGenderModal
        isOpen={editGenderOpen}
        onClose={() => setEditGenderOpen(false)}
        currentGender={profile.gender}
        onSave={(gender) => updateProfile({ gender })}
      />

      <EditGoalsModal
        isOpen={editGoalsOpen}
        onClose={() => setEditGoalsOpen(false)}
        currentGoals={profile.goals}
        onSave={(goals) => updateProfile({ goals })}
      />

      <EditDescriptionModal
        isOpen={editDescriptionOpen}
        onClose={() => setEditDescriptionOpen(false)}
        currentDescription={profile.description}
        onSave={(description) => updateProfile({ description })}
      />
    </SlidePageTransition>
  );
}; 