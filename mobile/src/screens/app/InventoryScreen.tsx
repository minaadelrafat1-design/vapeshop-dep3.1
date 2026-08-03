import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@components/Card';
import { COLORS } from '@constants';

export default function InventoryScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Inventory</Text>
        <Text style={styles.subtitle}>Track stock across locations</Text>
      </View>
      <View style={styles.content}>
        <Card>
          <Text style={styles.placeholderTitle}>Inventory Module</Text>
          <Text style={styles.placeholderText}>
            Stock levels, transfers, adjustments, cycle counts, and barcode
            scanning will appear here in the next phase. This foundation is ready
            for module implementation.
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
