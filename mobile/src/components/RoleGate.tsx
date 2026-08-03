import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@constants';
import { useAuthStore } from '@store/authStore';
import { roleRank } from '@apptypes';
import type { UserRole } from '@apptypes';

interface RoleGateProps {
  children: React.ReactNode;
  /** Minimum role rank required to pass the gate. */
  minRank?: number;
  /** Specific roles allowed. */
  allowedRoles?: UserRole[];
  /** Fallback shown when access is denied. */
  fallback?: React.ReactNode;
}

export function RoleGate({ children, minRank, allowedRoles, fallback }: RoleGateProps) {
  const profile = useAuthStore((s) => s.profile);
  const role = profile?.role;

  const hasAccess = (() => {
    if (!role) return false;
    if (allowedRoles && allowedRoles.length > 0) {
      return allowedRoles.includes(role);
    }
    if (minRank !== undefined) {
      return roleRank(role) >= minRank;
    }
    return true;
  })();

  if (!hasAccess) {
    return (
      fallback ?? (
        <View style={styles.container}>
          <Text style={styles.title}>Access Restricted</Text>
          <Text style={styles.message}>
            You don't have permission to view this content. Contact your administrator if you believe this is an error.
          </Text>
        </View>
      )
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
});
