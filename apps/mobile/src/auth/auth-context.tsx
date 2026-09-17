import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, ApiError, setSessionRefreshHandlers, type MeResponse } from '@/api/client';

const TOKEN_KEY = 'cantixplora_access_token';
const REFRESH_TOKEN_KEY = 'cantixplora_refresh_token';

interface AuthContextValue {
  isLoading: boolean;
  token: string | null;
  user: MeResponse | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  applySession: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<MeResponse | null>(null);
  // Los handlers de refresh automático (client.ts) necesitan leer siempre el
  // refresh token más reciente sin esperar a un re-render, de ahí el ref.
  const refreshTokenRef = useRef<string | null>(null);

  useEffect(() => {
    setSessionRefreshHandlers({
      getRefreshToken: () => refreshTokenRef.current,
      onRefreshed: (accessToken, refreshToken) => {
        refreshTokenRef.current = refreshToken;
        setToken(accessToken);
        SecureStore.setItemAsync(TOKEN_KEY, accessToken).catch(() => {});
        SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken).catch(() => {});
      },
      onRefreshFailed: () => {
        // El servidor rechazó explícitamente el refresh token (caducado o
        // revocado): es el único caso en el que se fuerza el cierre de sesión.
        clearSession();
      },
    });
    return () => setSessionRefreshHandlers(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    restoreSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function clearSession() {
    refreshTokenRef.current = null;
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  async function persistSession(accessToken: string, refreshToken: string) {
    refreshTokenRef.current = refreshToken;
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
    ]);
  }

  async function restoreSession() {
    try {
      const [storedToken, storedRefreshToken] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
      ]);
      refreshTokenRef.current = storedRefreshToken;

      if (!storedToken) {
        return;
      }

      try {
        const me = await api.me(storedToken);
        setToken(storedToken);
        setUser(me);
        return;
      } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 401 || !storedRefreshToken) {
          // Fallo de red (no ApiError) al verificar el token: no se puede
          // confirmar nada, pero tampoco se borra la sesión guardada por eso.
          if (!(err instanceof ApiError)) {
            setToken(storedToken);
          } else {
            await clearSession();
          }
          return;
        }
      }

      // El access token caducó: intenta renovarlo antes de pedir login de nuevo.
      try {
        const refreshed = await api.refresh(storedRefreshToken);
        await persistSession(refreshed.accessToken, refreshed.refreshToken);
        const me = await api.me(refreshed.accessToken);
        setToken(refreshed.accessToken);
        setUser(me);
      } catch (refreshErr) {
        if (refreshErr instanceof ApiError) {
          // El propio refresh token fue rechazado por el servidor: aquí sí
          // hace falta volver a iniciar sesión, no hay nada más que renovar.
          await clearSession();
        } else {
          // Fallo de red al intentar renovar: se conserva la sesión guardada.
          setToken(storedToken);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function applySession(accessToken: string, refreshToken: string) {
    const me = await api.me(accessToken);
    await persistSession(accessToken, refreshToken);
    setToken(accessToken);
    setUser(me);
  }

  async function login(email: string, password: string) {
    const { accessToken, refreshToken } = await api.login(email, password);
    await applySession(accessToken, refreshToken);
  }

  async function register(name: string, email: string, password: string) {
    const { accessToken, refreshToken } = await api.register(name, email, password);
    await applySession(accessToken, refreshToken);
  }

  async function logout() {
    await clearSession();
  }

  const value = useMemo(
    () => ({ isLoading, token, user, login, register, applySession, logout }),
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
