import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@components/Card';
import { COLORS } from '@constants';

export default function OrdersScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
        <Text style={styles.subtitle}>Manage customer and POS orders</Text>
      </View>
      <View style={styles.content}>
        <Card>
          <Text style={styles.placeholderTitle}>Orders Module</Text>
          <Text style={styles.placeholderText}>
            Order list, filters, search, detail view, and POS checkout will appear
            here in the next phase. This foundation is ready for module implementation.
          </Text>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 24, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  content: { padding: 24, paddingTop: 8 },
  placeholderTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 },
  placeholderText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
});
