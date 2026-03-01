import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  displayName: string | null;
  publicKey: string | null;

  login: (userId: string, displayName: string, publicKey: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      userId: null,
      displayName: null,
      publicKey: null,

      login: (userId, displayName, publicKey) =>
        set({
          isAuthenticated: true,
          userId,
          displayName,
          publicKey,
        }),

      logout: () =>
        set({
          isAuthenticated: false,
          userId: null,
          displayName: null,
          publicKey: null,
        }),
    }),
    {
      name: 'shield-messenger-auth',
    },
  ),
);
