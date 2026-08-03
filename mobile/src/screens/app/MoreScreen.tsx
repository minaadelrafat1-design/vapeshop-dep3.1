import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '@components/Card';
import { COLORS, ROLE_LABELS } from '@constants';
import { useAuthStore } from '@store/authStore';
import { roleRank } from '@apptypes';

interface NavItem {
  label: string;
  route: string;
  minRank: number;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Orders', route: '/(app)/orders', minRank: 40, icon: '📦' },
  { label: 'Inventory', route: '/(app)/inventory', minRank: 40, icon: '📊' },
  { label: 'Profile', route: '/(app)/profile', minRank: 20, icon: '👤' },
];

export default function MoreScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);

  if (!profile) return null;

  const accessibleItems = NAV_ITEMS.filter((item) => roleRank(profile.role) >= item.minRank);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>More</Text>

        <View style={styles.navSection}>
          {accessibleItems.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={styles.navItem}
              onPress={() => router.push(item.route)}
            >
              <Text style={styles.navIcon}>{item.icon}</Text>
              <Text style={styles.navLabel}>{item.label}</Text>
              <Text style={styles.navArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Card>
          <Text style={styles.accountLabel}>Account</Text>
          <View style={styles.accountRow}>
            <Text style={styles.accountName}>{profile.full_name || profile.email}</Text>
            <Text style={styles.accountRole}>{ROLE_LABELS[profile.role] ?? 'Staff'}</Text>
          </View>
        </Card>

        <TouchableOpacity style={styles.signOutButton} onPress={() => signOut()}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, padding: 20 },
  title: { fontSize: 28, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 24 },
  navSection: { gap: 8, marginBottom: 24 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  navIcon: { fontSize: 22, marginRight: 14 },
  navLabel: { flex: 1, fontSize: 16, fontWeight: '500', color: COLORS.textPrimary },
  navArrow: { fontSize: 22, color: COLORS.textMuted },
  accountLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginBottom: 12, textTransform: 'uppercase' as const },
  accountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  accountName: { fontSize: 15, fontWeight: '500', color: COLORS.textPrimary },
  accountRole: { fontSize: 13, color: COLORS.gold[400] },
  signOutButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 16,
  },
  signOutText: { fontSize: 16, fontWeight: '600', color: COLORS.error[500] },
});
