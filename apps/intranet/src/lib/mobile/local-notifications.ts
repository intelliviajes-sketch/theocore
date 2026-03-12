import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const TEST_NOTIFICATION_ID = 9010;

export type LocalNotificationTestResult =
  | { ok: true; scheduledFor: Date }
  | {
      ok: false;
      reason: "not_native" | "permission_denied" | "schedule_failed";
      error?: unknown;
    };

export function isNativeRuntime() {
  return Capacitor.isNativePlatform();
}

async function ensureDisplayPermission() {
  const current = await LocalNotifications.checkPermissions();
  if (current.display === "granted") return true;
  const requested = await LocalNotifications.requestPermissions();
  return requested.display === "granted";
}

export async function scheduleTravelerTestNotification(): Promise<LocalNotificationTestResult> {
  if (!isNativeRuntime()) {
    return { ok: false, reason: "not_native" };
  }

  try {
    const hasPermission = await ensureDisplayPermission();
    if (!hasPermission) {
      return { ok: false, reason: "permission_denied" };
    }

    const scheduledFor = new Date(Date.now() + 5000);

    await LocalNotifications.cancel({
      notifications: [{ id: TEST_NOTIFICATION_ID }],
    });

    await LocalNotifications.schedule({
      notifications: [
        {
          id: TEST_NOTIFICATION_ID,
          title: "INTELLI VIAJES",
          body: "Notificacion local de prueba activa en traveler.",
          schedule: { at: scheduledFor, allowWhileIdle: true },
        },
      ],
    });

    return { ok: true, scheduledFor };
  } catch (error) {
    return { ok: false, reason: "schedule_failed", error };
  }
}
