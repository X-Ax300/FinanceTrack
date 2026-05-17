export const APP_VERSION = __APP_VERSION__;

export const APP_RELEASE_NOTES: Record<string, string[]> = {
  [APP_VERSION]: [
    'Historial de notificaciones dentro de la app.',
    'Avisos de cambios importantes guardados por usuario.',
    'Mejoras de cache para reflejar cambios externos en la DB.',
  ],
};

export function getUserScopedKey(baseKey: string, userId?: string | null) {
  return `${baseKey}_${userId || 'guest'}`;
}
