import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REMINDER_ID_KEY = 'sprout_evening_reminder_id';
const REMINDER_HOUR = 19;
const REMINDER_MINUTE = 0;

// Configure how notifications appear when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return status === 'granted';
}

export async function scheduleEveningReminder(childName: string): Promise<boolean> {
  const granted = await requestNotificationPermission();
  if (!granted) return false;

  // Cancel any existing reminder first to avoid duplicates
  await cancelEveningReminder();

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Time for ${childName}'s check-in 🌿`,
      body: 'How is the skin looking today? A quick log goes a long way.',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: REMINDER_HOUR,
      minute: REMINDER_MINUTE,
    },
  });

  await AsyncStorage.setItem(REMINDER_ID_KEY, id);
  return true;
}

export async function cancelEveningReminder(): Promise<void> {
  const id = await AsyncStorage.getItem(REMINDER_ID_KEY);
  if (id) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // May already be gone
    }
    await AsyncStorage.removeItem(REMINDER_ID_KEY);
  }
}

export async function getEveningReminderEnabled(): Promise<boolean> {
  const id = await AsyncStorage.getItem(REMINDER_ID_KEY);
  if (!id) return false;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.some((n) => n.identifier === id);
}
