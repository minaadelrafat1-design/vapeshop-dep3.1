import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@components/Card';
import { COLORS, ROLE_LABELS } from '@constants';
import { useAuthStore } from '@store/authStore';
import { usePermissions } from '@hooks/usePermissions';

export default function DashboardScreen() {
  const profile = useAuthStore((s) => s.profile);
  const { canEdit } = usePermissions();

  if (!profile) return null;

  const accessLevel = canEdit('dashboard.view') ? 'Full Access' : 'View Only';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.header}>Dashboard</Text>
        <Card>
          <Text style={styles.welcome}>Welcome back,</Text>
          <Text style={styles.email}>{profile.email}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{ROLE_LABELS[profile.role] ?? 'Staff'}</Text>
            </View>
            <Text style={styles.accessLevel}>{accessLevel}</Text>
          </View>
        </Card>
        <Card>
          <Text style={styles.cardTitle}>ERP Modules</Text>
          <Text style={styles.cardBody}>
            Dashboard modules will appear here. Your role ({ROLE_LABELS[profile.role] ?? 'Staff'}) and permission grants determine which modules are visible.
          </Text>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, padding: 20 },
  header: { fontSize: 28, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 20 },
  welcome: { fontSize: 14, color: COLORS.textSecondary },
  email: { fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, marginTop: 2 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  roleBadge: { backgroundColor: COLORS.gold[500] + '20', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  roleText: { fontSize: 12, fontWeight: '600', color: COLORS.gold[400] },
  accessLevel: { fontSize: 12, color: COLORS.textMuted },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 },
  cardBody: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
});
