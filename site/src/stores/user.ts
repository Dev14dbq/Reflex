import { create } from "zustand";

interface User {
  firstName: string;
  lastName?: string;
  username: string;
  telegramId: string;
  language: string;
  blocked: boolean;
  blockReason?: string;
  blockedAt?: string;
  blockedBy?: string;
}

interface UserStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  hasProfile: boolean | null;
  setUser: (u: User) => void;
  setToken: (t: string | null) => void;
  setInitialized: (initialized: boolean) => void;
  setHasProfile: (hasProfile: boolean) => void;
  clearUser: () => void;
  logout: () => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isInitialized: false,
  hasProfile: null,
  setUser: (user) => set({ user, isAuthenticated: true }),
  setToken: (token) => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
    set({ token, isAuthenticated: !!token });
  },
  setInitialized: (isInitialized) => set({ isInitialized }),
  setHasProfile: (hasProfile) => set({ hasProfile }),
  clearUser: () => set({ user: null, isAuthenticated: false }),
  logout: () => {
    localStorage.removeItem("token");
    set({ user: null, token: null, isAuthenticated: false, isInitialized: false, hasProfile: null });
  },
}));
