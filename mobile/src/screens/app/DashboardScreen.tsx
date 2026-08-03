import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ScreenWrapper } from '@components/ScreenWrapper';
import { AppHeader } from '@components/AppHeader';
import { Card } from '@components/Card';
import { useThemeStore } from '@store/themeStore';
import { useAuthStore } from '@store/authStore';
import { usePermissions } from '@hooks/usePermissions';
import { useResponsive, getCardWidth } from '@hooks/useResponsive';
import { roleLabel } from '@constants';
import { ROLE_QUICK_ACTIONS } from '@constants';
import { getAccessibleNavItems } from '@config/navigation';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getIconName } from '@config/icons';

export default function DashboardScreen() {
  const { colors } = useThemeStore();
  const profile = useAuthStore((s) => s.profile);
  const { canEdit } = usePermissions();
  const router = useRouter();
  const layout = useResponsive();

  if (!profile) return null;

  const accessLevel = canEdit('dashboard.view') ? 'Full Access' : 'View Only';
  const quickActionKeys = ROLE_QUICK_ACTIONS[profile.role] ?? ['dashboard', 'notifications', 'help'];
  const accessibleItems = getAccessibleNavItems(profile.role);
  const quickActions = quickActionKeys
    .map((key) => accessibleItems.find((item) => item.key === key))
    .filter((item): item is NonNullable<typeof item> => item !== undefined);
  const cardWidth = getCardWidth(layout, layout.columns);

  return (
    <ScreenWrapper>
      <AppHeader title="Dashboard" subtitle="Business overview" showMenu />
      <View style={[styles.content, { paddingHorizontal: layout.padding, gap: layout.cardGap }]}>
        <Card>
          <Text style={[styles.welcome, { color: colors.textSecondary }]}>Welcome back,</Text>
          <Text style={[styles.email, { color: colors.textPrimary }]}>{profile.full_name || profile.email}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.roleBadge, { backgroundColor: colors.gold + '20' }]}>
              <Text style={[styles.roleText, { color: colors.gold }]}>{roleLabel(profile.role)}</Text>
            </View>
            <Text style={[styles.accessLevel, { color: colors.textMuted }]}>{accessLevel}</Text>
          </View>
        </Card>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Quick Actions</Text>
          <View style={styles.quickGrid}>
            {quickActions.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.quickCard, { backgroundColor: colors.surface, borderColor: colors.border, width: cardWidth }]}
                onPress={() => router.push(`/(app)/${item.key}` as never)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name={getIconName(item.icon)} size={28} color={colors.gold} />
                <Text style={[styles.quickLabel, { color: colors.textPrimary }]} numberOfLines={1}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Card>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>ERP Modules</Text>
          <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
            Your role ({roleLabel(profile.role)}) and permission grants determine which modules are visible. Use the drawer or More tab to navigate to all available modules.
          </Text>
        </Card>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  welcome: { fontSize: 14 },
  email: { fontSize: 18, fontWeight: '600', marginTop: 2 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  roleText: { fontSize: 12, fontWeight: '600' },
  accessLevel: { fontSize: 12 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickCard: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 8, alignItems: 'flex-start' },
  quickLabel: { fontSize: 13, fontWeight: '500' },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  cardBody: { fontSize: 14, lineHeight: 22 },
});
