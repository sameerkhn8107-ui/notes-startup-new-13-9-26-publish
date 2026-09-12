// Local reminders. Uses expo-notifications when available (native), otherwise
// degrades gracefully to in-app reminders. Never crashes / needs no server.
import { Platform } from "react-native";

let Notifications: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications = require("expo-notifications");
} catch {
  Notifications = null;
}

let configured = false;
async function ensure(): Promise<boolean> {
  if (!Notifications || Platform.OS === "web") return false;
  try {
    if (!configured) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
      const perm = await Notifications.getPermissionsAsync();
      if (!perm.granted) {
        const req = await Notifications.requestPermissionsAsync();
        if (!req.granted) return false;
      }
      configured = true;
    }
    return true;
  } catch {
    return false;
  }
}

export async function scheduleReminder(
  title: string,
  body: string,
  when: Date,
): Promise<string | null> {
  try {
    const ok = await ensure();
    if (!ok) return null;
    if (when.getTime() <= Date.now()) return null;
    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: { type: "date", date: when },
    });
    return id;
  } catch {
    return null;
  }
}

export async function cancelReminder(id: string | null): Promise<void> {
  try {
    if (id && (await ensure())) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  } catch {
    // ignore
  }
}

export function reminderSupported(): boolean {
  return !!Notifications && Platform.OS !== "web";
}
