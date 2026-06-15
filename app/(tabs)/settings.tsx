/**
 * Settings screen — family info, invite code, notifications, library, sign out.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Share, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors, typography, spacing } from '@/lib/tokens';
import { useAuthStore } from '@/stores/auth';
import { Card } from '@/components/Card';
import { CategoryIcon } from '@/components/icons/CategoryIcon';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import {
  getEveningReminderEnabled,
  scheduleEveningReminder,
  cancelEveningReminder,
} from '@/lib/notifications';

export default function SettingsScreen() {
  const profile = useAuthStore((s) => s.profile);
  const family = useAuthStore((s) => s.family);
  const subjects = useAuthStore((s) => s.subjects);
  const activeSubject = useAuthStore((s) => s.activeSubject);
  const signOut = useAuthStore((s) => s.signOut);

  const { canInstall, isInstalled, isIOS, triggerInstall } = useInstallPrompt();

  const handleAddToHomeScreen = async () => {
    if (canInstall) {
      await triggerInstall();
      return;
    }
    // iOS Safari (and any browser that doesn't support beforeinstallprompt)
    Alert.alert(
      'Add to Home Screen',
      'Tap the Share button at the bottom of Safari, then choose "Add to Home Screen".',
      [{ text: 'Got it' }]
    );
  };

  const [eveningReminder, setEveningReminder] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(true);
  const [partnerNotify, setPartnerNotify] = useState(true);

  // Load actual scheduled state on mount
  useEffect(() => {
    getEveningReminderEnabled().then((enabled) => {
      setEveningReminder(enabled);
      setReminderLoading(false);
    });
  }, []);

  const handleReminderToggle = async (value: boolean) => {
    setReminderLoading(true);
    if (value) {
      const childName = activeSubject?.name ?? 'your child';
      const ok = await scheduleEveningReminder(childName);
      if (!ok) {
        Alert.alert(
          'Permission needed',
          'Please allow notifications in your device Settings to enable reminders.',
          [{ text: 'OK' }]
        );
        setReminderLoading(false);
        return;
      }
      setEveningReminder(true);
    } else {
      await cancelEveningReminder();
      setEveningReminder(false);
    }
    setReminderLoading(false);
  };

  const handleShareInvite = async () => {
    if (!family) return;
    const { data } = await supabase
      .from('families')
      .select('invite_code')
      .eq('id', family.id)
      .single();
    const code = (data as any)?.invite_code ?? '—';
    try {
      await Share.share({
        message: `Join our family on Sprout!\n\nFamily code: ${code}\n\nDownload Sprout and tap "Join family" on the welcome screen.`,
        title: 'Join our Sprout family',
      });
    } catch {
      Alert.alert('Invite code', code);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Settings</Text>

        {/* Family card */}
        <SettingsSection title="">
          <View style={styles.familyCard}>
            <View style={styles.familyIconWrap}>
              <CategoryIcon name="users" size={22} color={colors.sageDeep} />
            </View>
            <View style={styles.familyInfo}>
              <Text style={styles.familyName}>{family?.name ?? 'Your family'}</Text>
              <Text style={styles.familyMeta}>
                {subjects.map((s) => s.name).join(', ') || 'No children yet'}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.inviteBanner} onPress={handleShareInvite} activeOpacity={0.7}>
            <CategoryIcon name="link" size={18} color={colors.sageDeep} />
            <View style={styles.inviteText}>
              <Text style={styles.inviteTitle}>Invite your co-parent</Text>
              <Text style={styles.inviteSub}>Growing together is better</Text>
            </View>
            <CategoryIcon name="chevR" size={16} color={colors.sageDeep} />
          </TouchableOpacity>
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection title="Notifications">
          <SettingsRow
            icon="sun" iconBg={colors.amberSoft} iconColor={colors.warnInk}
            title="Evening check-in" sub="7:00 PM daily reminder"
            rightEl={
              <Switch
                value={eveningReminder}
                disabled={reminderLoading}
                onValueChange={handleReminderToggle}
                trackColor={{ true: colors.sage }}
                thumbColor="#fff"
              />
            }
          />
          <SettingsRow
            icon="users" iconBg={colors.sageSoft} iconColor={colors.sageDeep}
            title="Co-parent logs an entry" sub="Coming soon"
            rightEl={
              <Switch
                value={partnerNotify}
                onValueChange={setPartnerNotify}
                trackColor={{ true: colors.sage }}
                thumbColor="#fff"
                disabled
              />
            }
            last
          />
        </SettingsSection>

        {/* Add to Home Screen — web only */}
        {Platform.OS === 'web' && !isInstalled && (
          <SettingsSection title="App">
            <SettingsRow
              icon="leaf" iconBg={colors.sageSoft} iconColor={colors.sageDeep}
              title="Add to Home Screen" sub="Open Sprout like a native app"
              rightEl={<CategoryIcon name="chevR" size={16} color={colors.faint} />}
              onPress={handleAddToHomeScreen}
              last
            />
          </SettingsSection>
        )}

        {/* Library */}
        <SettingsSection title="Your library">
          <SettingsRow
            icon="drop" iconBg="#E5E9EE" iconColor="#3A4B5B"
            title="Creams & medications" sub="Manage saved items"
            rightEl={<CategoryIcon name="chevR" size={16} color={colors.faint} />}
            onPress={() => router.push('/library')}
          />
          <SettingsRow
            icon="leaf" iconBg="#E8EFD9" iconColor="#3B5530"
            title="Foods to watch" sub="Flag ingredients for tracking"
            rightEl={<CategoryIcon name="chevR" size={16} color={colors.faint} />}
            onPress={() => router.push('/foods-to-watch')}
            last
          />
        </SettingsSection>

        {/* Reports */}
        <SettingsSection title="Reports">
          <SettingsRow
            icon="chart" iconBg={colors.sageSoft} iconColor={colors.sageDeep}
            title="Export health report" sub="PDF summary for doctor visits"
            rightEl={<CategoryIcon name="chevR" size={16} color={colors.faint} />}
            onPress={() => router.push('/report')}
            last
          />
        </SettingsSection>

        {/* Account */}
        <SettingsSection title="Account">
          <SettingsRow
            icon="user" iconBg={colors.sageSoft} iconColor={colors.sageDeep}
            title={profile?.display_name || 'Your account'} sub={profile ? 'Profile' : ''}
            rightEl={<CategoryIcon name="chevR" size={16} color={colors.faint} />}
          />
          <SettingsRow
            icon="close" iconBg={colors.terracottaSoft} iconColor={colors.warnInk}
            title="Sign out" sub=""
            onPress={() => {
              Alert.alert('Sign out', 'Are you sure you want to sign out?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign out', style: 'destructive', onPress: signOut },
              ]);
            }}
            last
          />
        </SettingsSection>

        <Text style={styles.version}>Sprout v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <Card padded={false} style={{ overflow: 'hidden' }}>
        {children}
      </Card>
    </View>
  );
}

function SettingsRow({
  icon, iconBg, iconColor, title, sub, rightEl, onPress, last = false,
}: {
  icon: string; iconBg: string; iconColor: string;
  title: string; sub: string;
  rightEl?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  const Row = onPress ? TouchableOpacity : View;
  return (
    <Row
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.row, !last && styles.rowBorder]}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <CategoryIcon name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {rightEl}
    </Row>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgCream },
  content: { paddingHorizontal: spacing.xl, paddingBottom: 120 },
  heading: { fontSize: typography.sizes['3xl'], fontWeight: '600', color: colors.ink, letterSpacing: -0.5, marginTop: spacing.md, marginBottom: spacing.lg },

  section: { marginBottom: spacing.lg },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.4, paddingLeft: 4, marginBottom: 8 },

  familyCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  familyIconWrap: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.sageSoft, alignItems: 'center', justifyContent: 'center' },
  familyInfo: { flex: 1 },
  familyName: { fontSize: 16, fontWeight: '600', color: colors.ink },
  familyMeta: { fontSize: 13, color: colors.muted, marginTop: 1 },

  inviteBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, margin: 12, marginTop: 0,
    borderRadius: 14, backgroundColor: colors.sageSoft,
  },
  inviteText: { flex: 1 },
  inviteTitle: { fontSize: 13, fontWeight: '500', color: colors.sageDeep },
  inviteSub: { fontSize: 12, color: colors.sageDeep, opacity: 0.8, marginTop: 1 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, paddingHorizontal: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.hairline },
  rowIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '500', color: colors.ink },
  rowSub: { fontSize: 12, color: colors.muted, marginTop: 1 },

  version: { fontSize: 12, color: colors.faint, textAlign: 'center', marginTop: spacing.sm },
});
