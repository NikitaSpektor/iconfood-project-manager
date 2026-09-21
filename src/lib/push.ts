import { TASKS_URL, getToken } from '@/lib/api';

export const VAPID_PUBLIC_KEY =
  'BMjyeTytSakSpQqT4Uk1k2LrLXPZMV7QgcjJT_oeN0N1Dn0M_iZz6jM31Wzf2U2yA9WeIH6CNqAEM8uQioHd-dY';

export type PushTopic = 'task' | 'deadline' | 'comment' | 'chat';

export type PushPrefs = Record<PushTopic, boolean> & { enabled: boolean };

export const DEFAULT_PREFS: PushPrefs = {
  enabled: false,
  task: true,
  deadline: true,
  comment: true,
  chat: false,
};

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(normalized);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function pushPermission(): NotificationPermission {
  return pushSupported() ? Notification.permission : 'denied';
}

async function post(payload: Record<string, unknown>) {
  const res = await fetch(TASKS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Auth-Token': getToken() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Не удалось сохранить настройки уведомлений');
  return res.json().catch(() => ({}));
}

export async function enablePush(prefs: Partial<Record<PushTopic, boolean>>) {
  if (!pushSupported()) throw new Error('Браузер не поддерживает уведомления');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Уведомления запрещены в настройках браузера');

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  await post({ action: 'push_subscribe', subscription: sub.toJSON(), prefs });
  return true;
}

export async function disablePush() {
  let endpoint = '';
  if (pushSupported()) {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      endpoint = sub.endpoint;
      await sub.unsubscribe().catch(() => undefined);
    }
  }
  await post({ action: 'push_unsubscribe', endpoint });
}

export async function savePushPrefs(prefs: Partial<Record<PushTopic, boolean>>) {
  await post({ action: 'push_prefs', prefs });
}

export async function sendTestPush() {
  await post({ action: 'push_test' });
}
