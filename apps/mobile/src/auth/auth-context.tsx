import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, type MeResponse } from '@/api/client';

const TOKEN_KEY = 'cantixplora_access_token';

interface AuthContextValue {
  isLoading: boolean;
  token: string | null;
  user: MeResponse | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<MeResponse | null>(null);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      if (storedToken) {
        const me = await api.me(storedToken);
        setToken(storedToken);
        setUser(me);
      }
    } catch {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } finally {
      setIsLoading(false);
    }
  }

  async function applySession(accessToken: string) {
    const me = await api.me(accessToken);
    await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
    setToken(accessToken);
    setUser(me);
  }

  async function login(email: string, password: string) {
    const { accessToken } = await api.login(email, password);
    await applySession(accessToken);
  }

  async function register(name: string, email: string, password: string) {
    const { accessToken } = await api.register(name, email, password);
    await applySession(accessToken);
  }

  async function logout() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({ isLoading, token, user, login, register, logout }),
    [isLoading, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
