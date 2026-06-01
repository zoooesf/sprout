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

type ItemType = 'medication' | 'cream' | 'supplement';

const TYPE_LABELS: Record<ItemType, string> = {
  medication: 'Medication',
  cream: 'Cream',
  supplement: 'Supplement',
};

const TYPE_COLORS: Record<ItemType, { bg: string; ink: string }> = {
  medication: { bg: '#E5E9EE', ink: '#3A4B5B' },
  cream: { bg: colors.sageSoft, ink: colors.sageDeep },
  supplement: { bg: colors.amberSoft, ink: colors.warnInk },
};

export default function LibraryScreen() {
  const { data: items = [], isLoading } = useLibraryItems();
  const createItem = useCreateLibraryItem();
  const deleteItem = useDeleteLibraryItem();

  const [name, setName] = useState('');
  const [type, setType] = useState<ItemType>('medication');
  const [dose, setDose] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a name for this item.');
      return;
    }
    try {
      await createItem.mutateAsync({ name, type, default_dose: dose || undefined });
      setName('');
      setDose('');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not save item.');
    }
  };

  const handleDelete = (id: string, itemName: string) => {
    Alert.alert('Remove item', `Remove "${itemName}" from your library?`, [
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <CategoryIcon name="chevL" size={18} color={colors.ink} />
          </TouchableOpacity>
          <Text style={styles.title}>Your library</Text>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Item list */}
          <Text style={styles.sectionLabel}>Saved items</Text>
          <Card padded={false} style={{ overflow: 'hidden', marginBottom: spacing.xl }}>
            {isLoading ? (
              <Text style={styles.emptyText}>Loading…</Text>
            ) : items.length === 0 ? (
              <Text style={styles.emptyText}>No items yet. Add your first medication or cream below.</Text>
            ) : (
              items.map((item, idx) => {
                const chip = TYPE_COLORS[item.type as ItemType] ?? TYPE_COLORS.medication;
                const isLast = idx === items.length - 1;
                return (
                  <View key={item.id} style={[styles.itemRow, !isLast && styles.itemBorder]}>
                    <View style={styles.itemMain}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <View style={styles.itemMeta}>
                        <View style={[styles.typeChip, { backgroundColor: chip.bg }]}>
                          <Text style={[styles.typeChipText, { color: chip.ink }]}>
                            {TYPE_LABELS[item.type as ItemType] ?? item.type}
                          </Text>
                        </View>
                        {item.default_dose ? (
                          <Text style={styles.doseText}>{item.default_dose}</Text>
                        ) : null}
                      </View>
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

          {/* Add form */}
          <Text style={styles.sectionLabel}>Add item</Text>
          <Card padded style={{ marginBottom: spacing.xl }}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Hydrocortisone cream"
              placeholderTextColor={colors.faint}
              value={name}
              onChangeText={setName}
            />

            <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Type</Text>
            <View style={styles.typeRow}>
              {(['medication', 'cream', 'supplement'] as ItemType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setType(t)}
                  activeOpacity={0.7}
                  style={[styles.typePill, type === t && styles.typePillOn]}
                >
                  <Text style={[styles.typePillText, type === t && styles.typePillTextOn]}>
                    {TYPE_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Default dose (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 5mg, 1%"
              placeholderTextColor={colors.faint}
              value={dose}
              onChangeText={setDose}
            />

            <SoftButton
              variant="primary"
              size="lg"
              fullWidth
              loading={createItem.isPending}
              onPress={handleAdd}
              style={{ marginTop: spacing.lg }}
            >
              Add to library
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
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  typeChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  typeChipText: { fontSize: 11, fontWeight: '600' },
  doseText: { fontSize: typography.sizes.sm, color: colors.muted },
  trashBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },

  fieldLabel: { fontSize: typography.sizes.sm, fontWeight: '500', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 8 },
  input: {
    backgroundColor: colors.bgCream, borderRadius: 14, borderWidth: 1, borderColor: colors.hairline,
    paddingHorizontal: 16, paddingVertical: 13, fontSize: typography.sizes.md, color: colors.ink,
  },

  typeRow: { flexDirection: 'row', gap: 8 },
  typePill: {
    flex: 1, paddingVertical: 10, borderRadius: 999,
    backgroundColor: colors.bgCream, borderWidth: 1, borderColor: colors.hairline,
    alignItems: 'center',
  },
  typePillOn: { backgroundColor: colors.sageDeep, borderColor: colors.sageDeep },
  typePillText: { fontSize: 13, fontWeight: '500', color: colors.muted },
  typePillTextOn: { color: '#fff' },
});
