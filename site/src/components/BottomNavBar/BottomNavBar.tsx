import React from "react";
import clsx from "clsx";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FiHome,
  FiMessageCircle,
  FiEye,
  FiHeart,
  FiSettings,
} from "react-icons/fi";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        themeParams?: {
          bg_color?: string;
          text_color?: string;
          button_color?: string;
          hint_color?: string;
        };
      };
    };
  }
}

export const BottomNavBar: React.FC<{ className?: string }> = ({ className }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { 
      icon: FiHome, 
      path: "/", 
      label: "Главная",
      gradient: "from-blue-500 to-purple-600"
    },
    { 
      icon: FiMessageCircle, 
      path: "/chats", 
      label: "Чаты",
      gradient: "from-green-500 to-teal-600"
    },
    { 
      icon: FiEye, 
      path: "/search", 
      label: "Поиск",
      gradient: "from-purple-500 to-pink-600"
    },
    { 
      icon: FiHeart, 
      path: "/likes", 
      label: "Лайки",
      gradient: "from-red-500 to-pink-600"
    },
    { 
      icon: FiSettings, 
      path: "/settings", 
      label: "Настройки",
      gradient: "from-gray-500 to-gray-700"
    },
  ];

  return (
    <div className={clsx("fixed bottom-0 left-0 right-0 z-50", className)}>
      <div className="neu-glass backdrop-blur-neu !rounded-none">
        <div className="flex justify-around items-center py-2 px-2">
          {items.map(({ icon: Icon, path }, idx) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={idx}
                onClick={() => navigate(path)}
                className={clsx(
                  "flex flex-col items-center justify-center p-3 rounded-neu-lg transition-all duration-300 min-w-[60px] group",
                  isActive 
                    ? "neu-surface-pressed scale-95" 
                    : "neu-surface-hover active:neu-surface-pressed"
                )}
              >
                <div className={clsx(
                  "p-2 rounded-neu-sm transition-all duration-300",
                  isActive 
                    ? "neu-text-primary" 
                    : "neu-text-muted group-hover:neu-text-primary"
                )}>
                  <Icon className="text-lg" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
