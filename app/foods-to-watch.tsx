import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, typography, spacing } from '@/lib/tokens';
import { Card } from '@/components/Card';
import { SoftButton } from '@/components/SoftButton';
import { CategoryIcon } from '@/components/icons/CategoryIcon';
import {
  useLibraryItems,
  useCreateLibraryItem,
  useDeleteLibraryItem,
} from '@/hooks/useLogEntries';

export default function FoodsToWatchScreen() {
  const { data: items = [], isLoading } = useLibraryItems('food');
  const createItem = useCreateLibraryItem();
  const deleteItem = useDeleteLibraryItem();

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a food or ingredient name.');
      return;
    }
    try {
      await createItem.mutateAsync({
        name: name.trim(),
        type: 'food',
        default_dose: notes.trim() || undefined,
      });
      setName('');
      setNotes('');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not save item.');
    }
  };

  const handleDelete = (id: string, itemName: string) => {
    Alert.alert('Remove food', `Remove "${itemName}" from your watchlist?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await deleteItem.mutateAsync(id);
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'Could not remove item.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <CategoryIcon name="chevL" size={18} color={colors.ink} />
          </TouchableOpacity>
          <Text style={styles.title}>Foods to watch</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionLabel}>Watching</Text>
          <Card padded={false} style={{ overflow: 'hidden', marginBottom: spacing.xl }}>
            {isLoading ? (
              <Text style={styles.emptyText}>Loading…</Text>
            ) : items.length === 0 ? (
              <Text style={styles.emptyText}>
                Nothing flagged yet. Add foods or ingredients you want to track.
              </Text>
            ) : (
              items.map((item, idx) => {
                const isLast = idx === items.length - 1;
                return (
                  <View key={item.id} style={[styles.itemRow, !isLast && styles.itemBorder]}>
                    <View style={styles.itemMain}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      {item.default_dose ? (
                        <Text style={styles.itemNotes}>{item.default_dose}</Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDelete(item.id, item.name)}
                      style={styles.trashBtn}
                      activeOpacity={0.7}
                    >
                      <CategoryIcon name="trash" size={17} color={colors.faint} />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </Card>

          <Text style={styles.sectionLabel}>Add food</Text>
          <Card padded style={{ marginBottom: spacing.xl }}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Peanuts, Dairy, Gluten"
              placeholderTextColor={colors.faint}
              value={name}
              onChangeText={setName}
            />

            <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="e.g. Causes flares within 24h"
              placeholderTextColor={colors.faint}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />

            <SoftButton
              variant="primary"
              size="lg"
              fullWidth
              loading={createItem.isPending}
              onPress={handleAdd}
              style={{ marginTop: spacing.lg }}
            >
              Add to watchlist
            </SoftButton>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgCream },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: 12,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: typography.sizes['2xl'], fontWeight: '600', color: colors.ink, letterSpacing: -0.4 },

  content: { paddingHorizontal: spacing.xl, paddingBottom: 40 },

  sectionLabel: { fontSize: 12, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.4, paddingLeft: 4, marginBottom: 8 },

  emptyText: { fontSize: typography.sizes.base, color: colors.muted, padding: 16, lineHeight: 20 },

  itemRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: colors.hairline },
  itemMain: { flex: 1 },
  itemName: { fontSize: typography.sizes.md, fontWeight: '500', color: colors.ink },
  itemNotes: { fontSize: typography.sizes.sm, color: colors.muted, marginTop: 3 },
  trashBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },

  fieldLabel: { fontSize: typography.sizes.sm, fontWeight: '500', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 8 },
  input: {
    backgroundColor: colors.bgCream, borderRadius: 14, borderWidth: 1, borderColor: colors.hairline,
    paddingHorizontal: 16, paddingVertical: 13, fontSize: typography.sizes.md, color: colors.ink,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
});
