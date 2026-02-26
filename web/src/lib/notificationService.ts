/**
 * NotificationService — Push & Local Notification Manager for Shield Messenger PWA
 *
 * Handles:
 *  - Notification permission requests
 *  - Service Worker registration for push notifications
 *  - Local notification dispatch (new messages, calls, security alerts)
 *  - Badge count management
 *  - Notification click routing
 *
 * Privacy: All notification content is generated locally from decrypted data.
 * No message content ever reaches a push server. Push is used only as a
 * "wake-up" signal; the actual content is fetched and decrypted on-device.
 */

// ─────────────────── Types ───────────────────

export type NotificationType =
  | 'message'
  | 'call'
  | 'friend_request'
  | 'group_invite'
  | 'security_alert'
  | 'identity_key_change';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  /** Contact or group identifier for click routing */
  targetId?: string;
  /** Optional icon URL (defaults to app icon) */
  icon?: string;
  /** Optional image attachment (e.g., received photo thumbnail) */
  image?: string;
  /** Tag for notification grouping/replacement */
  tag?: string;
  /** Whether the notification requires immediate attention */
  urgent?: boolean;
  /** Custom data passed to the click handler */
  data?: Record<string, string>;
}

export interface NotificationPreferences {
  enabled: boolean;
  showMessageContent: boolean;
  showSenderName: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  securityAlertsEnabled: boolean;
}

// ─────────────────── Constants ───────────────────

const SW_PATH = '/sw.js';
const DEFAULT_ICON = '/icon-192.svg';
const PREFS_KEY = 'sl_notification_prefs';

const DEFAULT_PREFS: NotificationPreferences = {
  enabled: true,
  showMessageContent: true,
  showSenderName: true,
  soundEnabled: true,
  vibrationEnabled: true,
  securityAlertsEnabled: true,
};

// ─────────────────── State ───────────────────

let swRegistration: ServiceWorkerRegistration | null = null;
let preferences: NotificationPreferences = { ...DEFAULT_PREFS };

// ─────────────────── Initialization ───────────────────

/**
 * Initialize the notification system.
 * Registers the Service Worker and loads saved preferences.
 * Safe to call multiple times.
 */
export async function initNotifications(): Promise<boolean> {
  loadPreferences();

  if (!('Notification' in window)) {
    console.warn('[SL:Notify] Notifications API not supported');
    return false;
  }

  if (!('serviceWorker' in navigator)) {
    console.warn('[SL:Notify] Service Workers not supported');
    return false;
  }

  try {
    swRegistration = await navigator.serviceWorker.register(SW_PATH, {
      scope: '/',
      type: 'module',
    });
    console.log('[SL:Notify] Service Worker registered:', swRegistration.scope);

    // Listen for messages from the Service Worker (notification clicks)
    navigator.serviceWorker.addEventListener('message', handleSwMessage);

    return true;
  } catch (err) {
    console.error('[SL:Notify] Service Worker registration failed:', err);
    return false;
  }
}

// ─────────────────── Permission ───────────────────

/**
 * Request notification permission from the user.
 * Returns the resulting permission state.
 */
export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';

  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';

  const result = await Notification.requestPermission();
  console.log('[SL:Notify] Permission result:', result);
  return result;
}

/**
 * Get the current notification permission state.
 */
export function getPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

// ─────────────────── Preferences ───────────────────

/**
 * Get current notification preferences.
 */
export function getPreferences(): NotificationPreferences {
  return { ...preferences };
}

/**
 * Update notification preferences.
 */
export function updatePreferences(update: Partial<NotificationPreferences>): void {
  preferences = { ...preferences, ...update };
  savePreferences();
}

function loadPreferences(): void {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    if (stored) {
      preferences = { ...DEFAULT_PREFS, ...JSON.parse(stored) };
    }
  } catch {
    preferences = { ...DEFAULT_PREFS };
  }
}

function savePreferences(): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

// ─────────────────── Notification Dispatch ───────────────────

/**
 * Show a local notification.
 * Respects user preferences for content visibility and sound.
 */
export async function showNotification(payload: NotificationPayload): Promise<void> {
  if (!preferences.enabled) return;
  if (Notification.permission !== 'granted') return;

  // Security alerts always show regardless of content preferences
  const isSecurityAlert =
    payload.type === 'security_alert' || payload.type === 'identity_key_change';

  if (isSecurityAlert && !preferences.securityAlertsEnabled) return;

  // Apply privacy preferences
  let title = payload.title;
  let body = payload.body;

  if (!isSecurityAlert) {
    if (!preferences.showSenderName) {
      title = 'Shield Messenger';
    }
    if (!preferences.showMessageContent) {
      body = 'New message received';
    }
  }

  // Extended notification options interface to support Web Notification API
  // properties (vibrate, image, renotify) that are valid at runtime but
  // not yet in TypeScript's lib.dom NotificationOptions type.
  const options: NotificationOptions & Record<string, unknown> = {
    body,
    icon: payload.icon ?? DEFAULT_ICON,
    badge: DEFAULT_ICON,
    tag: payload.tag ?? `sl-${payload.type}-${Date.now()}`,
    silent: !preferences.soundEnabled,
    data: {
      type: payload.type,
      targetId: payload.targetId ?? '',
      ...payload.data,
    },
  };

  // These properties are part of the Notifications API spec but not in TS lib.dom
  if (payload.tag) {
    options.renotify = true;
  }
  if (payload.image) {
    options.image = payload.image;
  }
  if (preferences.vibrationEnabled && payload.urgent) {
    options.vibrate = [200, 100, 200];
  }

  // Use Service Worker notification if available (works in background)
  if (swRegistration) {
    await swRegistration.showNotification(title, options);
  } else {
    // Fallback to basic Notification API
    new Notification(title, options);
  }
}

// ─────────────────── Convenience Methods ───────────────────

/**
 * Show a new message notification.
 */
export async function notifyNewMessage(
  senderName: string,
  messagePreview: string,
  chatId: string,
): Promise<void> {
  await showNotification({
    type: 'message',
    title: senderName,
    body: messagePreview,
    targetId: chatId,
    tag: `sl-msg-${chatId}`,
  });
}

/**
 * Show an incoming call notification.
 */
export async function notifyIncomingCall(
  callerName: string,
  callId: string,
): Promise<void> {
  await showNotification({
    type: 'call',
    title: callerName,
    body: 'Incoming encrypted call',
    targetId: callId,
    tag: `sl-call-${callId}`,
    urgent: true,
  });
}

/**
 * Show a friend request notification.
 */
export async function notifyFriendRequest(
  senderName: string,
  requestId: string,
): Promise<void> {
  await showNotification({
    type: 'friend_request',
    title: 'New Contact Request',
    body: `${senderName} wants to connect`,
    targetId: requestId,
    tag: `sl-freq-${requestId}`,
  });
}

/**
 * Show a group invite notification.
 */
export async function notifyGroupInvite(
  groupName: string,
  inviterName: string,
  groupId: string,
): Promise<void> {
  await showNotification({
    type: 'group_invite',
    title: 'Group Invitation',
    body: `${inviterName} invited you to ${groupName}`,
    targetId: groupId,
    tag: `sl-ginv-${groupId}`,
  });
}

/**
 * Show a security alert when a contact's identity key changes.
 * This is critical for MITM detection.
 */
export async function notifyIdentityKeyChange(
  contactName: string,
  contactId: string,
): Promise<void> {
  await showNotification({
    type: 'identity_key_change',
    title: 'Security Alert',
    body: `${contactName}'s security key has changed. Verify their identity before continuing.`,
    targetId: contactId,
    tag: `sl-sec-${contactId}`,
    urgent: true,
  });
}

// ─────────────────── Badge Management ───────────────────

/**
 * Update the app badge count (PWA badge API).
 */
export async function setBadgeCount(count: number): Promise<void> {
  try {
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        await (navigator as any).setAppBadge(count);
      } else {
        await (navigator as any).clearAppBadge();
      }
    }
  } catch {
    // Badge API not supported — silently ignore
  }
}

// ─────────────────── Service Worker Message Handler ───────────────────

function handleSwMessage(event: MessageEvent): void {
  const { type, data } = event.data ?? {};

  if (type === 'NOTIFICATION_CLICK') {
    // Route to the appropriate page based on notification type
    const notifType = data?.type as NotificationType;
    const targetId = data?.targetId as string;

    switch (notifType) {
      case 'message':
        window.location.href = `/chat?id=${targetId}`;
        break;
      case 'call':
        window.location.href = `/calls?id=${targetId}`;
        break;
      case 'friend_request':
        window.location.href = '/contacts?tab=requests';
        break;
      case 'group_invite':
        window.location.href = '/contacts?tab=groups';
        break;
      case 'security_alert':
      case 'identity_key_change':
        window.location.href = `/contacts?verify=${targetId}`;
        break;
    }
  }
}

// ─────────────────── Cleanup ───────────────────

/**
 * Unregister the Service Worker and clean up.
 */
export async function cleanup(): Promise<void> {
  navigator.serviceWorker?.removeEventListener('message', handleSwMessage);
  if (swRegistration) {
    await swRegistration.unregister();
    swRegistration = null;
  }
}
