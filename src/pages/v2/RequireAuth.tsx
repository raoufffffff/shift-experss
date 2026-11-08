/**
 * Garde de la v2 : sans session (ou avec un rôle qui n'a pas accès à l'espace
 * client), on renvoie vers la page de connexion existante `/:locale/login`.
 * La page demandée est passée dans `state.from` pour y revenir après la
 * connexion (LoginPage la relit). Même règle d'accès que l'espace actuel :
 * administrateur ou manager.
 */
import type { ReactNode } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export function V2RequireAuth({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const { locale = 'fr' } = useParams<{ locale: string }>();

  const allowed = !!user && (user.role === 'admin' || user.role === 'manager');
  if (!allowed) {
    return <Navigate to={`/${locale}/login`} replace state={{ from: location }} />;
  }
  return <>{children}</>;
}
