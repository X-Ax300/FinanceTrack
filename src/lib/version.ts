export const APP_VERSION = __APP_VERSION__;

export function getUserScopedKey(baseKey: string, userId?: string | null) {
  return `${baseKey}_${userId || 'guest'}`;
}
