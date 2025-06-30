import React, { useState, useEffect } from 'react';
import { EditModal } from '../ui/EditModal';

interface EditNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  onSave: (name: string) => void;
}

export const EditNameModal: React.FC<EditNameModalProps> = ({
  isOpen,
  onClose,
  currentName,
  onSave
}) => {
  const [name, setName] = useState(currentName);

  useEffect(() => {
    setName(currentName);
  }, [currentName, isOpen]);

  const handleSave = () => {
    onSave(name.trim());
    onClose();
  };

  const isValid = name.trim().length >= 2 && name.trim().length <= 16;

  return (
    <EditModal
      isOpen={isOpen}
      onClose={onClose}
      title="Редактировать имя"
      onSave={handleSave}
      saveDisabled={!isValid}
      rules="От 2 до 16 символов"
    >
      <div className="space-y-2">
        <label className="block text-sm font-medium neu-text-primary">
          Имя
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-neu-md bg-neu-surface border border-neu-border focus:outline-none focus:ring-2 focus:ring-neu-primary neu-text-primary"
          placeholder="Введите ваше имя"
          maxLength={16}
          autoFocus
        />
        <div className="flex justify-between text-xs neu-text-secondary">
          <span className={name.trim().length < 2 ? 'text-red-500' : ''}>
            Минимум 2 символа
          </span>
          <span className={name.length > 16 ? 'text-red-500' : ''}>
            {name.length}/16
          </span>
        </div>
      </div>
    </EditModal>
  );
}; 