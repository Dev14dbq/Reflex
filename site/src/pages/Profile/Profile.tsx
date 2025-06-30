import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiChevronLeft } from 'react-icons/fi';
import { useAdvertising } from '../../hooks/useAdvertising';

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

export const ProfileView: React.FC = () => {
  const { profileId } = useParams<{ profileId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  // Инициализируем рекламу
  const { incrementActionCount } = useAdvertising();

  useEffect(() => {
    if (!profileId) return;
    const controller = new AbortController();

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await fetch(`https://spectrmod.ru/api/profile/${profileId}`, { signal: controller.signal });
        if (!res.ok) throw new Error('Profile not found');
        const data = await res.json();
        setProfile(data.profile);
        
        // Увеличиваем счетчик действий при просмотре профиля
        incrementActionCount();
      } catch (e: any) {
        if (e.name !== 'AbortError') setError(e.message || 'Error');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    return () => controller.abort();
  }, [profileId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="animate-spin w-8 h-8 border-2 border-neu-accent-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="neu-text-secondary mb-4">{error || 'Профиль не найден'}</p>
        <button onClick={() => navigate(-1)} className="neu-btn-primary px-4 py-2 rounded-neu-md flex items-center space-x-2">
          <FiChevronLeft /> <span>Назад</span>
        </button>
      </div>
    );
  }

  const age = new Date().getFullYear() - parseInt(profile.birthYear, 10);
  const images = profile.images?.length ? profile.images : [
    `https://api.dicebear.com/7.x/thumbs/svg?seed=${Math.floor(Math.random() * 1000000)}`
  ];

  return (
    <div className="h-[calc(100vh-80px)] overflow-y-auto bg-neu-bg-primary p-4">
      <div className="max-w-md mx-auto space-y-4">
        <button onClick={() => navigate(-1)} className="neu-btn px-3 py-2 rounded-neu-md flex items-center space-x-2">
          <FiChevronLeft /> <span>Назад</span>
        </button>

        <div className="w-full aspect-[3/4] rounded-neu-lg overflow-hidden bg-neu-surface-subtle">
          <img src={images[0]} alt={profile.preferredName} className="w-full h-full object-cover" />
        </div>

        <h1 className="text-2xl font-bold neu-text-primary">
          {profile.preferredName}, {age}
        </h1>
        <p className="neu-text-secondary">{profile.city}</p>

        <div>
          <h2 className="font-semibold mb-1">Цели</h2>
          <div className="flex flex-wrap gap-2">
            {profile.goals.map(g => (
              <span key={g} className="px-3 py-1 rounded-neu-full bg-neu-surface-hover text-sm">
                {g}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-semibold mb-1">О себе</h2>
          <p className="whitespace-pre-wrap break-words neu-text-primary">
            {profile.description}
          </p>
        </div>
      </div>
    </div>
  );
}; 