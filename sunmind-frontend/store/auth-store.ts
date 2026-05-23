'use client';
import { create } from 'zustand';
import { API_CONFIG } from '@/lib/api/config';

interface UserRole {
  role_name: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  roles?: UserRole[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const getStoredToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: getStoredToken(),
  isAuthenticated: !!getStoredToken(),

  login: async (email: string, password: string) => {
    const res = await fetch(`${API_CONFIG.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('Неверный email или пароль');
    const data = await res.json();
    localStorage.setItem('auth_token', data.access_token);
    set({ token: data.access_token, isAuthenticated: true, user: data.user ?? null });
  },

  register: async (name: string, email: string, password: string) => {
    const res = await fetch(`${API_CONFIG.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) throw new Error('Ошибка при регистрации');
    const data = await res.json();
    localStorage.setItem('auth_token', data.access_token);
    set({ token: data.access_token, isAuthenticated: true, user: data.user ?? null });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
