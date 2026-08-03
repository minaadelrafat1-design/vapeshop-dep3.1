import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ScreenWrapper } from '@components/ScreenWrapper';
import { AppHeader } from '@components/AppHeader';
import { Card } from '@components/Card';
import { Button } from '@components/Button';
import { useThemeStore } from '@store/themeStore';
import { useAuthStore } from '@store/authStore';
import { roleLabel } from '@constants';
import { useResponsive } from '@hooks/useResponsive';

export default function ProfileScreen() {
  const { colors } = useThemeStore();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const layout = useResponsive();

  if (!profile) return null;

  const initials = (profile.full_name || profile.email || 'U').charAt(0).toUpperCase();

  return (
    <ScreenWrapper edges={['top', 'bottom']}>
      <AppHeader title="Profile" subtitle="Account information" showBack showMenu />
      <View style={[styles.content, { paddingHorizontal: layout.padding, gap: layout.cardGap, maxWidth: layout.contentMaxWidth, alignSelf: layout.isTablet ? 'center' : 'stretch' }]}>
        <View style={styles.avatarRow}>
          <View style={[styles.avatar, { backgroundColor: colors.gold }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.avatarInfo}>
            <Text style={[styles.name, { color: colors.textPrimary }]}>{profile.full_name || 'Staff Member'}</Text>
            <Text style={[styles.email, { color: colors.textSecondary }]}>{profile.email}</Text>
          </View>
        </View>

        <Card>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Role</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{roleLabel(profile.role)}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Status</Text>
            <Text style={[styles.infoValue, { color: profile.status === 'active' ? colors.success : colors.error }]}>{profile.status}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Phone</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{profile.phone ?? '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Last Login</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {profile.last_login_at ? new Date(profile.last_login_at).toLocaleString() : '—'}
            </Text>
          </View>
        </Card>

        <Button title="Sign Out" onPress={() => signOut()} variant="danger" style={styles.signOut} />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#0c0f13' },
  avatarInfo: { flex: 1 },
  name: { fontSize: 18, fontWeight: '600' },
  email: { fontSize: 14, marginTop: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '500' },
  signOut: { marginTop: 8 },
});
