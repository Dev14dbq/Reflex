import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSave: () => void;
  saveDisabled?: boolean;
  rules?: string;
}

export const EditModal: React.FC<EditModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  onSave,
  saveDisabled = false,
  rules
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-neu-bg-primary"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div 
            className="neu-card w-full max-w-md p-6 space-y-4"
            style={{ 
              maxHeight: 'calc(100vh - 2rem)',
              overflowY: 'auto'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-center">
              <h3 className="text-lg font-semibold neu-text-primary">{title}</h3>
            </div>

            {/* Content */}
            <div className="space-y-4">
              {children}
              
              {rules && (
                <div className="p-3 rounded-neu-md bg-neu-surface-subtle">
                  <p className="text-sm neu-text-secondary">
                    <strong>Правила:</strong> {rules}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="neu-btn px-4 py-2 rounded-neu-md flex-1"
              >
                Отмена
              </button>
              <button
                onClick={onSave}
                disabled={saveDisabled}
                className={`px-4 py-2 rounded-neu-md flex-1 font-semibold ${
                  saveDisabled
                    ? 'bg-neu-surface text-neu-text-tertiary cursor-not-allowed'
                    : 'neu-btn-primary'
                }`}
              >
                Сохранить
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 