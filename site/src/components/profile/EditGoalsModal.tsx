import React, { useState, useEffect } from 'react';
import { EditModal } from '../ui/EditModal';

interface EditGoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGoals: string[];
  onSave: (goals: string[]) => void;
}

const goalOptions = [
  { value: 'секс', label: 'Секс', icon: '🔥' },
  { value: 'обмен фото', label: 'Обмен фото', icon: '📸' },
  { value: 'отношения на расстоянии', label: 'Отношения на расстоянии', icon: '💕' },
  { value: 'отношения локально', label: 'Отношения локально', icon: '❤️' },
  { value: 'общение', label: 'Общение', icon: '💬' }
];

export const EditGoalsModal: React.FC<EditGoalsModalProps> = ({
  isOpen,
  onClose,
  currentGoals,
  onSave
}) => {
  const [goals, setGoals] = useState<string[]>(currentGoals);

  useEffect(() => {
    setGoals(currentGoals);
  }, [currentGoals, isOpen]);

  const handleSave = () => {
    onSave(goals);
    onClose();
  };

  const toggleGoal = (goal: string) => {
    setGoals(prev => 
      prev.includes(goal) 
        ? prev.filter(g => g !== goal)
        : prev.length < 3
        ? [...prev, goal]
        : prev
    );
  };

  return (
    <EditModal
      isOpen={isOpen}
      onClose={onClose}
      title="Редактировать цели"
      onSave={handleSave}
      saveDisabled={goals.length === 0}
      rules="Выберите до 3 вариантов"
    >
      <div className="space-y-3">
        <label className="block text-sm font-medium neu-text-primary">
          Цели знакомства
        </label>
        <div className="space-y-2">
          {goalOptions.map((option) => (
            <label
              key={option.value}
              className="flex items-center space-x-3 p-3 rounded-neu-md bg-neu-surface-subtle cursor-pointer hover:bg-neu-surface-hover transition-colors"
            >
              <input
                type="checkbox"
                checked={goals.includes(option.value)}
                onChange={() => toggleGoal(option.value)}
                className="w-4 h-4 text-neu-primary focus:ring-neu-primary rounded"
              />
              <span className="text-2xl">{option.icon}</span>
              <span className="neu-text-primary font-medium">{option.label}</span>
            </label>
          ))}
        </div>
        <p className="text-sm neu-text-muted">
          Выберите до 3 вариантов ({goals.length}/3)
        </p>
        {goals.length === 0 && (
          <p className="text-sm text-red-500">
            Выберите хотя бы одну цель
          </p>
        )}
      </div>
    </EditModal>
  );
}; 