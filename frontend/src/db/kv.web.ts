// Web key/value document store, backed by AsyncStorage (via shared storage util).
import { storage } from "@/src/utils/storage";

export async function kvGet<T>(key: string, fallback: T): Promise<T> {
  const v = await storage.getItem<any>(key, null);
  return (v ?? fallback) as T;
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  await storage.setItem(key, value as any);
}
