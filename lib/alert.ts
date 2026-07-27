import { Alert, Platform } from 'react-native';

interface AlertButton {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

// RN Web's Alert.alert() is a no-op (see react-native-web/src/exports/Alert),
// so error/confirm dialogs silently do nothing on web. This falls back to the
// browser's own alert/confirm there instead.
export function alert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons as any);
    return;
  }

  const list = buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }];
  const text = [title, message].filter(Boolean).join('\n\n');

  if (list.length === 1) {
    window.alert(text);
    list[0].onPress?.();
    return;
  }

  const cancelBtn = list.find((b) => b.style === 'cancel');
  const actionBtns = list.filter((b) => b !== cancelBtn);

  if (actionBtns.length === 1) {
    if (window.confirm(text)) actionBtns[0].onPress?.();
    else cancelBtn?.onPress?.();
    return;
  }

  const choice = window.prompt(
    `${text}\n\n${actionBtns.map((b, i) => `${i + 1}. ${b.text}`).join('\n')}\n\nEnter a number, or Cancel to dismiss:`
  );
  const index = choice ? parseInt(choice, 10) - 1 : -1;
  if (index >= 0 && index < actionBtns.length) actionBtns[index].onPress?.();
  else cancelBtn?.onPress?.();
}
