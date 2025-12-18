import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, connectedAccounts, loadingAccounts } = useAuth();
  const location = useLocation();
<<<<<<< HEAD
=======
  const devInsightsSecret = import.meta.env.VITE_DEV_INSIGHTS_SECRET as string | undefined;
  const isDevNoAuth = import.meta.env.DEV && !!devInsightsSecret;
>>>>>>> 6f17527 (Fix insights pagination/cache; add dev seeding and CORS)

  // Still loading auth state
  if (loading || loadingAccounts) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

<<<<<<< HEAD
=======
  // DEV only: allow access without Supabase auth when using the dev insights endpoint.
  if (isDevNoAuth) {
    return <>{children}</>;
  }

>>>>>>> 6f17527 (Fix insights pagination/cache; add dev seeding and CORS)
  // No user session - redirect to login
  if (!user) {
    // Store the intended destination in sessionStorage (more secure than localStorage)
    sessionStorage.setItem('auth_redirect_to', location.pathname);
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // User logged in but no connected account - redirect to /auth (will show connect step)
  if (connectedAccounts.length === 0) {
    sessionStorage.setItem('auth_redirect_to', location.pathname);
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
