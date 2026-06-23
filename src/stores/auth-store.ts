/**
 * Auth store — manages authentication state with Zustand.
 * Handles Google Sign-In and email/password auth flows.
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

// ── Types ────────────────────────────────────────────────────────────

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  googleConnected: boolean;
  emailVerified: boolean;
  autoBackupEnabled: boolean;
  backupFrequency: 'daily' | 'weekly' | 'manual';
  lastBackupAt: string | null;
  createdAt: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthState {
  // State
  user: UserProfile | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setAuth: (user: UserProfile, tokens: AuthTokens) => Promise<void>;
  clearAuth: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadStoredAuth: () => Promise<void>;
  updateTokens: (tokens: AuthTokens) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

// ── Constants ────────────────────────────────────────────────────────

const TOKEN_KEY = 'auth_tokens';
const USER_KEY = 'auth_user';

// ── Store ────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setAuth: async (user, tokens) => {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
      set({ user, tokens, isAuthenticated: true, error: null });
    } catch (e) {
      console.error('Failed to store auth data:', e);
    }
  },

  clearAuth: async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch (e) {
      console.error('Failed to clear auth data:', e);
    }
    set({
      user: null,
      tokens: null,
      isAuthenticated: false,
      error: null,
    });
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  loadStoredAuth: async () => {
    try {
      const tokensStr = await SecureStore.getItemAsync(TOKEN_KEY);
      const userStr = await SecureStore.getItemAsync(USER_KEY);

      if (tokensStr && userStr) {
        const tokens = JSON.parse(tokensStr) as AuthTokens;
        const user = JSON.parse(userStr) as UserProfile;
        set({ user, tokens, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (e) {
      console.error('Failed to load stored auth:', e);
      set({ isLoading: false });
    }
  },

  updateTokens: async (tokens) => {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(tokens));
      set({ tokens });
    } catch (e) {
      console.error('Failed to update tokens:', e);
    }
  },

  updateProfile: (updates) => {
    const { user } = get();
    if (user) {
      const updatedUser = { ...user, ...updates };
      set({ user: updatedUser });
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(updatedUser)).catch(
        console.error
      );
    }
  },
}));
