import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import { api } from '@/api/client';
import { useAuth } from '@/auth/auth-context';

interface BadgeContextValue {
  // Solicitudes de amistad pendientes + notificaciones sin leer, igual
  // criterio que el badge del icono "Amigos" en el prototipo.
  amigosBadge: number;
  refreshBadges: () => Promise<void>;
}

const BadgeContext = createContext<BadgeContextValue | undefined>(undefined);

export function BadgeProvider({ children }: PropsWithChildren) {
  const { token } = useAuth();
  const [amigosBadge, setAmigosBadge] = useState(0);

  const refreshBadges = useCallback(async () => {
    if (!token) {
      setAmigosBadge(0);
      return;
    }
    try {
      const [requests, notifications] = await Promise.all([
        api.listFriendRequests(token),
        api.listNotifications(token),
      ]);
      setAmigosBadge(requests.length + notifications.filter((n) => !n.read).length);
    } catch {
      // Un fallo de red puntual no debe romper la navegación por un badge:
      // se mantiene el último valor conocido hasta el próximo refresco.
    }
  }, [token]);

  const value = useMemo(() => ({ amigosBadge, refreshBadges }), [amigosBadge, refreshBadges]);

  return <BadgeContext.Provider value={value}>{children}</BadgeContext.Provider>;
}

export function useBadges() {
  const context = useContext(BadgeContext);
  if (!context) {
    throw new Error('useBadges debe usarse dentro de BadgeProvider');
  }
  return context;
}
