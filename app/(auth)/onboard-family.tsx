import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { colors, typography, spacing } from '@/lib/tokens';
import { SoftButton } from '@/components/SoftButton';

export default function OnboardFamilyScreen() {
  const [familyName, setFamilyName] = useState('');
  const [loading, setLoading] = useState(false);
  const session = useAuthStore((s) => s.session);
  const setFamily = useAuthStore((s) => s.setFamily);
  const setProfile = useAuthStore((s) => s.setProfile);

  const handleCreate = async () => {
    if (!familyName.trim()) {
      Alert.alert('Family name required', 'Please enter a name for your family.');
      return;
    }
    if (!session?.user) return;

    setLoading(true);

    // Create family
    const { data: family, error: familyErr } = await supabase
      .from('families')
      .insert({ name: familyName.trim() })
      .select()
      .single();

    if (familyErr || !family) {
      setLoading(false);
      Alert.alert('Error', familyErr?.message ?? 'Could not create family.');
      return;
    }

    // Link profile to family
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .update({ family_id: family.id })
      .eq('id', session.user.id)
      .select()
      .single();

    setLoading(false);

    if (profileErr || !profile) {
      Alert.alert('Error', profileErr?.message ?? 'Could not update profile.');
      return;
    }

    setFamily(family);
    setProfile(profile);
    router.replace('/(auth)/onboard-child');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Progress bar */}
        <View style={styles.progressRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.progressBar, { backgroundColor: i <= 1 ? colors.sage : colors.hairline }]} />
          ))}
        </View>

        <Text style={styles.kicker}>Step 2 of 3</Text>
        <Text style={styles.heading}>Create your family</Text>
        <Text style={styles.sub}>
          Growing together is better. You can invite your co-parent once we're set up.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Family name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. The Ferguson family"
            placeholderTextColor={colors.faint}
            value={familyName}
            onChangeText={setFamilyName}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.spacer} />

        <SoftButton variant="primary" size="lg" fullWidth loading={loading} onPress={handleCreate}>
          Continue
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
  spacer: { flex: 1, minHeight: 40 },
});
