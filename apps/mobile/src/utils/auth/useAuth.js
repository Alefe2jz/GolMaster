import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore, authTokenKey, authUserKey } from './store';
import {
  login as loginService,
  register as registerService,
  loginWithGoogle as loginWithGoogleService,
} from '@/services/auth';


/**
 * This hook provides authentication functionality.
 * It may be easier to use the `useAuthModal` or `useRequireAuth` hooks
 * instead as those will also handle showing authentication to the user
 * directly.
 */
export const useAuth = () => {
 const { isReady, auth, setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);

  // Architecture: maps transport/service errors to stable UI messages.
  const getErrorMessage = useCallback((error, fallbackMessage) => {
    const apiMessage = error?.response?.data?.error;
    if (typeof apiMessage === 'string' && apiMessage.trim().length > 0) {
      return apiMessage;
    }

    if (error?.code === 'ECONNABORTED') {
      return 'Tempo de conexao esgotado. Tente novamente.';
    }

    if (error?.message === 'Network Error') {
      return 'Nao foi possivel conectar ao servidor. Verifique a API.';
    }

    return fallbackMessage;
  }, []);

  const initiate = useCallback(() => {
    const authBootstrap = Promise.all([
      SecureStore.getItemAsync(authTokenKey),
      SecureStore.getItemAsync(authUserKey),
    ]);
    const timeout = new Promise((resolve) =>
      setTimeout(() => resolve([null, null]), 8000),
    );

    Promise.race([authBootstrap, timeout])
      .then(([token, userRaw]) => {
        const user = userRaw ? JSON.parse(userRaw) : null;
        useAuthStore.setState({
          auth: token && user ? { token, user } : null,
          isReady: true,
        });
      })
      .catch(() => {
        useAuthStore.setState({ auth: null, isReady: true });
      });
  }, []);

  const signIn = useCallback(() => {
    router.push('/(auth)/login');
  }, []);

  const signUp = useCallback(() => {
    router.push('/(auth)/login');
  }, []);

  const signOut = useCallback(() => {
    setAuth(null);
  }, [setAuth]);

  const signInWithEmail = useCallback(
    async (email, password) => {
      try {
        setLoading(true);
        const { token, user } = await loginService(email, password);
        setAuth({ token, user });
        return { ok: true, error: null };
      } catch (error) {
        console.error('Login error:', error);
        return {
          ok: false,
          error: getErrorMessage(error, 'Email ou senha invalidos.'),
        };
      } finally {
        setLoading(false);
      }
    },
    [getErrorMessage, setAuth],
  );

  const registerWithEmail = useCallback(
    async (name, email, password) => {
      try {
        setLoading(true);
        const { token, user } = await registerService(name, email, password);
        setAuth({ token, user });
        return { ok: true, error: null };
      } catch (error) {
        console.error('Register error:', error);
        return {
          ok: false,
          error: getErrorMessage(error, 'Nao foi possivel criar a conta.'),
        };
      } finally {
        setLoading(false);
      }
    },
    [getErrorMessage, setAuth],
  );

  const signInWithGoogle = useCallback(
    async (idToken) => {
      try {
        setLoading(true);
        const { token, user } = await loginWithGoogleService(idToken);
        setAuth({ token, user });
        return { ok: true, error: null };
      } catch (error) {
        console.error('Google login error:', error);
        return {
          ok: false,
          error: getErrorMessage(error, 'Falha no login com Google.'),
        };
      } finally {
        setLoading(false);
      }
    },
    [getErrorMessage, setAuth],
  );

  return {
    isReady,
    isAuthenticated: isReady ? !!auth : null,
    signIn,
    signOut,
    signUp,
    auth,
    setAuth,
    initiate,
    signInWithEmail,
    registerWithEmail,
    signInWithGoogle,
    loading,
  };
};

/**
 * This hook will automatically open the authentication modal if the user is not authenticated.
 */
export const useRequireAuth = (options) => {
  const { isAuthenticated, isReady } = useAuth();

  useEffect(() => {
    if (!isAuthenticated && isReady) {
      router.push('/(auth)/login');
    }
  }, [isAuthenticated, options?.mode, isReady]);
};

export default useAuth;
