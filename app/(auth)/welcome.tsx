import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '@/lib/tokens';
import { SoftButton } from '@/components/SoftButton';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} bounces={false}>
        {/* Logo */}
        <View style={styles.logoRow}>
          <View style={styles.logoMark} />
          <Text style={styles.logoText}>Sprout</Text>
        </View>

        {/* Illustration placeholder */}
        <View style={styles.illustration}>
          <View style={styles.illustrationCircle} />
        </View>

        {/* Headline */}
        <Text style={styles.headline}>
          A calm place{'\n'}for your child's health.
        </Text>
        <Text style={styles.sub}>
          Track flare-ups, treatments, food and sleep — together with the people who love them.
        </Text>

        {/* CTAs */}
        <SoftButton
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => router.push('/(auth)/sign-up')}
        >
          Get started
        </SoftButton>

        <View style={styles.signInRow}>
          <Text style={styles.signInText}>Already have an account? </Text>
          <Text
            style={styles.signInLink}
            onPress={() => router.push('/(auth)/sign-in')}
          >
            Sign in
          </Text>
        </View>

        <View style={styles.joinRow}>
          <Text style={styles.joinText}>Have a family code? </Text>
          <Text
            style={styles.joinLink}
            onPress={() => router.push('/(auth)/join-family')}
          >
            Join family
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgCream },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing['3xl'],
    paddingBottom: spacing['4xl'],
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  logoMark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.sage,
  },
  logoText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  illustration: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
    marginVertical: spacing.xl,
  },
  illustrationCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.sageSoft,
  },
  headline: {
    fontSize: typography.sizes['5xl'],
    fontWeight: typography.weights.semibold,
    color: colors.ink,
    letterSpacing: -0.8,
    lineHeight: 38,
    marginBottom: spacing.lg,
  },
  sub: {
    fontSize: typography.sizes.lg,
    lineHeight: 24,
    color: colors.muted,
    marginBottom: spacing['3xl'],
  },
  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  signInText: { fontSize: typography.sizes.base, color: colors.muted },
  signInLink: {
    fontSize: typography.sizes.base,
    color: colors.sageDeep,
    fontWeight: typography.weights.semibold,
  },
  joinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  joinText: { fontSize: typography.sizes.base, color: colors.muted },
  joinLink: {
    fontSize: typography.sizes.base,
    color: colors.sageDeep,
    fontWeight: typography.weights.semibold,
  },
});
