import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Input } from '@components/Input';
import { Button } from '@components/Button';
import { COLORS } from '@constants';
import { useAuthStore } from '@store/authStore';
import { authService } from '@services/authService';
import { isStaffRole, type UserRole } from '@apptypes';

export default function LoginScreen() {
  const router = useRouter();
  const initialize = useAuthStore((s) => s.initialize);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    const locked = await authService.checkServerLockout(email.trim());
    if (locked) {
      setError('Account temporarily locked after too many failed attempts. Try again in 15 minutes or reset your password.');
      return;
    }

    setBusy(true);
    try {
      const { supabase } = await import('@lib/supabase');
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        await authService.recordLoginAttempt(email.trim(), false, undefined, signInError.message);
        setError(signInError.message);
        return;
      }

      await authService.recordLoginAttempt(email.trim(), true, data.user?.id);
      await initialize();

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user!.id)
        .maybeSingle();

      if (!profile || !isStaffRole((profile as { role: UserRole }).role)) {
        setError('This account does not have staff access. Use the customer app instead.');
        await supabase.auth.signOut();
        await initialize();
        return;
      }

      router.replace('/(app)/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.brand}>LUXE</Text>
        <Text style={styles.subtitle}>ERP Staff Portal</Text>

        <View style={styles.form}>
          <Input
            label="Staff Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@luxe.co"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="Enter password"
          />
          <TouchableOpacity onPress={() => setShowPassword((s) => !s)} style={styles.toggleRow}>
            <Text style={styles.toggleText}>{showPassword ? 'Hide' : 'Show'} password</Text>
          </TouchableOpacity>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Button title={busy ? 'Signing in…' : 'Sign In'} onPress={submit} disabled={busy} />
        </View>

        <Text style={styles.footer}>Employee accounts are created by authorized administrators.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  brand: { fontSize: 36, fontWeight: '800', color: COLORS.gold[400], textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 40 },
  form: { gap: 16 },
  toggleRow: { alignSelf: 'flex-end', marginTop: 4 },
  toggleText: { fontSize: 13, color: COLORS.gold[400] },
  errorText: { fontSize: 13, color: COLORS.error[500], marginTop: 8 },
  footer: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 32 },
});
