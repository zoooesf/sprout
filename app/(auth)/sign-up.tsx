import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { colors, typography, spacing } from '@/lib/tokens';
import { SoftButton } from '@/components/SoftButton';
import { CategoryIcon } from '@/components/icons/CategoryIcon';

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing info', 'Please fill in all fields.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: name.trim() } },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Sign up failed', error.message);
      return;
    }
    router.replace('/(auth)/onboard-family');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.backRow}>
            <CategoryIcon name="chevL" size={22} color={colors.ink} />
            <Text style={styles.back} onPress={() => router.back()}>Back</Text>
          </View>

          <Text style={styles.heading}>Create account</Text>
          <Text style={styles.sub}>You'll set up your family after signing up.</Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Your name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Maya"
                placeholderTextColor={colors.faint}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.faint}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="At least 8 characters"
                placeholderTextColor={colors.faint}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          <SoftButton
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            onPress={handleSignUp}
          >
            Create account
          </SoftButton>

          <View style={styles.signInRow}>
            <Text style={styles.signInText}>Already have an account? </Text>
            <Text style={styles.signInLink} onPress={() => router.replace('/(auth)/sign-in')}>
              Sign in
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgCream },
  container: { flexGrow: 1, paddingHorizontal: spacing['3xl'], paddingBottom: spacing['4xl'] },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.md, marginBottom: spacing['2xl'] },
  back: { fontSize: typography.sizes.base, color: colors.ink },
  heading: { fontSize: typography.sizes['4xl'], fontWeight: typography.weights.semibold, color: colors.ink, letterSpacing: -0.6, marginBottom: spacing.sm },
  sub: { fontSize: typography.sizes.base, color: colors.muted, marginBottom: spacing['2xl'], lineHeight: 20 },
  form: { gap: spacing.lg, marginBottom: spacing['2xl'] },
  field: { gap: spacing.sm },
  label: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: colors.muted, letterSpacing: 0.2, textTransform: 'uppercase' },
  input: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: typography.sizes.lg,
    color: colors.ink,
  },
  signInRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  signInText: { fontSize: typography.sizes.base, color: colors.muted },
  signInLink: { fontSize: typography.sizes.base, color: colors.sageDeep, fontWeight: typography.weights.semibold },
});
