import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export const authTokenKey = 'auth_token';
export const authUserKey = 'golmaster_user';

/**
 * This store manages the authentication state of the application.
 */
export const useAuthStore = create((set) => ({
  isReady: false,
  auth: null,
  setAuth: (auth) => {
    if (auth) {
      SecureStore.setItemAsync(authTokenKey, auth.token);
      SecureStore.setItemAsync(authUserKey, JSON.stringify(auth.user));
    } else {
      SecureStore.deleteItemAsync(authTokenKey);
      SecureStore.deleteItemAsync(authUserKey);
    }
    set({ auth });
  },
}));

/**
 * This store manages the state of the authentication modal.
 */
export const useAuthModal = create((set) => ({
  isOpen: false,
  mode: 'signup',
  open: (options) => set({ isOpen: true, mode: options?.mode || 'signup' }),
  close: () => set({ isOpen: false }),
}));
