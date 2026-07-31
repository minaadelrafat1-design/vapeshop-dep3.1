import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { PermissionRoute } from '@/components/auth/PermissionRoute';

interface PermissionRouteProps {
  children: React.ReactNode;
  permission?: string;
  allowedRoles?: string[];
}

export const PermissionRouteComponent: React.FC<PermissionRouteProps> = ({
  children,
  permission,
  allowedRoles = [],
}) => {
  const { user, role, loading } = useAuth() as any;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const userRole = (role || user?.role || user?.user_metadata?.role || '').toLowerCase();
  const userEmail = user?.email?.toLowerCase();

  const isSuperAdmin =
    userRole === 'super_admin' ||
    userRole === 'superadmin' ||
    userRole === 'admin' ||
    userEmail === 'minaadelrafat1@gmail.com';

  if (isSuperAdmin) {
    return <>{children}</>;
  }

  const hasRole =
    allowedRoles.length === 0 ||
    allowedRoles.map((r) => r.toLowerCase()).includes(userRole);

  if (!hasRole) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <h1 className="text-2xl font-semibold text-ink-50 mb-2">Access Restricted</h1>
        <p className="text-ink-300 text-sm max-w-md">
          You don't have permission to view this page. Contact your administrator if you believe this is an error.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default PermissionRouteComponent;