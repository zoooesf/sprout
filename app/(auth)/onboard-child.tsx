import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { colors, typography, spacing } from '@/lib/tokens';
import { SoftButton } from '@/components/SoftButton';
import { CategoryIcon } from '@/components/icons/CategoryIcon';

const CONDITION_OPTIONS = ['Eczema', 'Allergies', 'Asthma', 'Reflux', 'Psoriasis', 'Other'];

export default function OnboardChildScreen() {
  const [childName, setChildName] = useState('');
  const [birthday, setBirthday] = useState('');
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const profile = useAuthStore((s) => s.profile);
  const setSubjects = useAuthStore((s) => s.setSubjects);
  const setActiveSubjectId = useAuthStore((s) => s.setActiveSubjectId);

  const toggleCondition = (c: string) => {
    setSelectedConditions((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const handleCreate = async () => {
    if (!childName.trim()) {
      Alert.alert('Name required', 'Please enter your child\'s name.');
      return;
    }

    setLoading(true);

    // Re-fetch the profile directly from Supabase so we always have the
    // latest family_id, even if the Zustand store hasn't caught up yet.
    const session = useAuthStore.getState().session;
    if (!session?.user) {
      setLoading(false);
      Alert.alert('Error', 'No active session. Please sign in again.');
      return;
    }

    const { data: freshProfile, error: profileErr } = await supabase
      .from('profiles')
      .select('family_id')
      .eq('id', session.user.id)
      .single();

    if (profileErr || !freshProfile?.family_id) {
      setLoading(false);
      Alert.alert('Error', 'Could not load your family. Please go back and try again.');
      return;
    }

    const { data: subject, error } = await supabase
      .from('subjects')
      .insert({
        family_id: freshProfile.family_id,
        name: childName.trim(),
        birthday: birthday || null,
        conditions: selectedConditions,
      })
      .select()
      .single();

    setLoading(false);

    if (error || !subject) {
      Alert.alert('Error', error?.message ?? 'Could not create child profile.');
      return;
    }

    setSubjects([subject]);
    setActiveSubjectId(subject.id);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Progress bar — all filled */}
        <View style={styles.progressRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.progressBar, { backgroundColor: colors.sage }]} />
          ))}
        </View>

        <Text style={styles.kicker}>Step 3 of 3</Text>
        <Text style={styles.heading}>Tell us about your child</Text>
        <Text style={styles.sub}>
          We use this to personalise check-ins and insights. Nothing leaves your family.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Child's name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Liam"
            placeholderTextColor={colors.faint}
            value={childName}
            onChangeText={setChildName}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Birthday (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.faint}
            value={birthday}
            onChangeText={setBirthday}
            keyboardType="numbers-and-punctuation"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>What are you tracking?</Text>
          <View style={styles.conditionGrid}>
            {CONDITION_OPTIONS.map((c) => {
              const on = selectedConditions.includes(c);
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => toggleCondition(c)}
                  style={[styles.conditionChip, { backgroundColor: on ? colors.sage : colors.card, borderColor: on ? colors.sage : colors.hairline }]}
                >
                  {on && <CategoryIcon name="check" size={14} color="#fff" />}
                  <Text style={[styles.conditionText, { color: on ? '#fff' : colors.ink }]}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <SoftButton variant="primary" size="lg" fullWidth loading={loading} onPress={handleCreate} style={{ marginTop: spacing.xl }}>
          Start logging
        </SoftButton>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgCream },
  container: { flexGrow: 1, paddingHorizontal: spacing['3xl'], paddingBottom: spacing['4xl'] },
  progressRow: { flexDirection: 'row', gap: 6, marginTop: spacing.lg, marginBottom: spacing['2xl'] },
  progressBar: { flex: 1, height: 4, borderRadius: 2 },
  kicker: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.sage, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 6 },
  heading: { fontSize: typography.sizes['4xl'], fontWeight: typography.weights.semibold, color: colors.ink, letterSpacing: -0.6, lineHeight: 34, marginBottom: spacing.sm },
  sub: { fontSize: typography.sizes.md, lineHeight: 22, color: colors.muted, marginBottom: spacing['2xl'] },
  field: { gap: spacing.sm, marginBottom: spacing.lg },
  label: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: colors.muted, letterSpacing: 0.2, textTransform: 'uppercase' },
  input: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: typography.sizes.xl,
    color: colors.ink,
  },
  conditionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  conditionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
  },
  conditionText: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
});
