import React, { useState, useEffect } from 'react';
import { EditModal } from '@components/ui/EditModal';

interface EditAgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBirthYear: string;
  onSave: (birthYear: string) => void;
}

export const EditAgeModal: React.FC<EditAgeModalProps> = ({
  isOpen,
  onClose,
  currentBirthYear,
  onSave
}) => {
  const [birthYear, setBirthYear] = useState(currentBirthYear);

  useEffect(() => {
    setBirthYear(currentBirthYear);
  }, [currentBirthYear, isOpen]);

  const handleSave = () => {
    onSave(birthYear);
    onClose();
  };

  // Генерируем годы от 1995 до 2012
  const years = [];
  for (let year = 2012; year >= 1995; year--) {
    years.push(year);
  }

  const currentAge = new Date().getFullYear() - parseInt(birthYear);

  return (
    <EditModal
      isOpen={isOpen}
      onClose={onClose}
      title="Редактировать возраст"
      onSave={handleSave}
      saveDisabled={false}
      rules="Выберите год рождения (от 1995 до 2012)"
    >
      <div className="space-y-2">
        <label className="block text-sm font-medium neu-text-primary">
          Год рождения
        </label>
        <select
          value={birthYear}
          onChange={(e) => setBirthYear(e.target.value)}
          className="w-full px-3 py-2 rounded-neu-md bg-neu-surface border border-neu-border focus:outline-none focus:ring-2 focus:ring-neu-primary neu-text-primary"
          autoFocus
        >
          {years.map(year => (
            <option key={year} value={year.toString()}>
              {year} ({new Date().getFullYear() - year} лет)
            </option>
          ))}
        </select>
        <div className="text-sm neu-text-secondary">
          Ваш возраст: {currentAge} лет
        </div>
      </div>
    </EditModal>
  );
}; 