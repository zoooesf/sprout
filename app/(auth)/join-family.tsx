import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { colors, typography, spacing } from '@/lib/tokens';
import { SoftButton } from '@/components/SoftButton';

export default function JoinFamilyScreen() {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const session = useAuthStore((s) => s.session);
  const loadUserData = useAuthStore((s) => s.loadUserData);

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Code required', 'Please enter the invite code from your co-parent.');
      return;
    }
    if (!session?.user) return;

    setLoading(true);
    // Find family by invite code
    const { data: family, error: findErr } = await supabase
      .from('families')
      .select('id')
      .eq('invite_code', inviteCode.trim().toLowerCase())
      .single();

    if (findErr || !family) {
      setLoading(false);
      Alert.alert('Invalid code', 'No family found with that invite code. Check with your co-parent.');
      return;
    }

    // Link profile
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ family_id: family.id })
      .eq('id', session.user.id);

    setLoading(false);
    if (updateErr) {
      Alert.alert('Error', updateErr.message);
      return;
    }

    await loadUserData();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.back} onPress={() => router.back()}>← Back</Text>

        <Text style={styles.heading}>Join your family</Text>
        <Text style={styles.sub}>
          Ask your co-parent for your 12-character family code from their Settings screen.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Family invite code</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. a1b2c3d4e5f6"
            placeholderTextColor={colors.faint}
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <SoftButton variant="primary" size="lg" fullWidth loading={loading} onPress={handleJoin}>
          Join family
        </SoftButton>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgCream },
  container: { flexGrow: 1, paddingHorizontal: spacing['3xl'], paddingBottom: spacing['4xl'] },
  back: { fontSize: typography.sizes.base, color: colors.sageDeep, marginTop: spacing.lg, marginBottom: spacing['2xl'] },
  heading: { fontSize: typography.sizes['4xl'], fontWeight: typography.weights.semibold, color: colors.ink, letterSpacing: -0.6, marginBottom: spacing.sm },
  sub: { fontSize: typography.sizes.md, lineHeight: 22, color: colors.muted, marginBottom: spacing['2xl'] },
  field: { gap: spacing.sm, marginBottom: spacing['2xl'] },
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
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
});
