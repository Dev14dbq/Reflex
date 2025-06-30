import React, { useState, useEffect } from 'react';
import { EditModal } from '../ui/EditModal';

interface EditDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDescription: string;
  onSave: (description: string) => void;
}

export const EditDescriptionModal: React.FC<EditDescriptionModalProps> = ({
  isOpen,
  onClose,
  currentDescription,
  onSave
}) => {
  const [description, setDescription] = useState(currentDescription);

  useEffect(() => {
    setDescription(currentDescription);
  }, [currentDescription, isOpen]);

  const handleSave = () => {
    onSave(description.trim());
    onClose();
  };

  const isValid = description.trim().length >= 10 && description.trim().length <= 500;

  return (
    <EditModal
      isOpen={isOpen}
      onClose={onClose}
      title="Редактировать описание"
      onSave={handleSave}
      saveDisabled={!isValid}
      rules="От 10 до 500 символов"
    >
      <div className="space-y-2">
        <label className="block text-sm font-medium neu-text-primary">
          Описание
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 rounded-neu-md bg-neu-surface border border-neu-border focus:outline-none focus:ring-2 focus:ring-neu-primary neu-text-primary resize-none"
          placeholder="Расскажите о себе..."
          rows={6}
          maxLength={500}
          autoFocus
        />
        <div className="flex justify-between text-xs neu-text-secondary">
          <span className={description.trim().length < 10 ? 'text-red-500' : ''}>
            Минимум 10 символов
          </span>
          <span className={description.length > 500 ? 'text-red-500' : ''}>
            {description.length}/500
          </span>
        </div>
        {description.trim().length < 10 && (
          <p className="text-sm text-red-500">
            Добавьте больше информации о себе
          </p>
        )}
      </div>
    </EditModal>
  );
}; 