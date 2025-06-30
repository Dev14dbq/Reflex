import React, { useState, useEffect } from 'react';
import { EditModal } from '../ui/EditModal';

interface EditGenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGender: string;
  onSave: (gender: string) => void;
}

const genderOptions = [
  { value: 'пасс', label: 'Пассив' },
  { value: 'уни-пасс', label: 'Универсал-пассив' },
  { value: 'уни', label: 'Универсал' },
  { value: 'уни-акт', label: 'Универсал-актив' },
  { value: 'акт', label: 'Актив' }
];

export const EditGenderModal: React.FC<EditGenderModalProps> = ({
  isOpen,
  onClose,
  currentGender,
  onSave
}) => {
  const [gender, setGender] = useState(currentGender);

  useEffect(() => {
    setGender(currentGender);
  }, [currentGender, isOpen]);

  const handleSave = () => {
    onSave(gender);
    onClose();
  };

  return (
    <EditModal
      isOpen={isOpen}
      onClose={onClose}
      title="Редактировать роль"
      onSave={handleSave}
      saveDisabled={false}
      rules="Выберите вашу роль в отношениях"
    >
      <div className="space-y-3">
        <label className="block text-sm font-medium neu-text-primary">
          Роль в отношениях
        </label>
        <div className="space-y-2">
          {genderOptions.map((option) => (
            <label
              key={option.value}
              className="flex items-center space-x-3 p-3 rounded-neu-md bg-neu-surface-subtle cursor-pointer hover:bg-neu-surface-hover transition-colors"
            >
              <input
                type="radio"
                name="gender"
                value={option.value}
                checked={gender === option.value}
                onChange={(e) => setGender(e.target.value)}
                className="w-4 h-4 text-neu-primary focus:ring-neu-primary"
              />
              <span className="neu-text-primary font-medium">{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    </EditModal>
  );
}; 