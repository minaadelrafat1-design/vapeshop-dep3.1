import { type ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { isStaffRole } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

interface PermissionRouteProps {
  children: ReactNode;
  permission?: string;
  requireStaff?: boolean;
}

/**
 * Route guard that checks both staff status AND specific permissions.
 * - requireStaff: user must have a staff role
 * - permission: user must have the named permission via their role(s)
 * If the user lacks the permission, they see a "no access" screen instead of the page.
 */
export function PermissionRoute({ children, permission, requireStaff = true }: PermissionRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const [permissions, setPermissions] = useState<string[] | null>(null);
  const [permLoading, setPermLoading] = useState(true);

  useEffect(() => {
    if (!user || !isStaffRole(profile?.role)) {
      setPermLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc('get_employee_permissions');
      if (!cancelled) {
        setPermissions((data as string[]) ?? []);
        setPermLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, profile?.role]);

  if (loading || permLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-950">
        <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  if (requireStaff && !isStaffRole(profile?.role)) {
    return <Navigate to="/" replace />;
  }

  // If a specific permission is required and the user doesn't have it
  if (permission && permissions && !permissions.includes(permission)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="glass-card max-w-md w-full p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-error-500/10 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-7 h-7 text-error-400" />
          </div>
          <h1 className="text-xl font-display font-semibold text-ink-50 mb-2">Access Restricted</h1>
          <p className="text-ink-300 text-sm">
            You don't have permission to view this page. Contact your administrator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
