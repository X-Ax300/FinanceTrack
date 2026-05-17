export const APP_VERSION = __APP_VERSION__;

export const APP_RELEASE_NOTES: Record<string, string[]> = {
  [APP_VERSION]: [
    '¡Nuevo historial de notificaciones! No pierdas ninguna alerta.',
    'Se agregaron más tipos de avisos y se guardan automáticamente.',
    'Mejoras en la app: mensajes claros de éxito y error.',
    'Cargas más rápidas en objetivos de amigos, balances y gastos.',
    'La app recuerda mejor los cambios gracias a mejoras en cache.',
    'Notificaciones más completas con fechas de expiración y enlaces útiles.',
  ],
};

export function getUserScopedKey(baseKey: string, userId?: string | null) {
  return `${baseKey}_${userId || 'guest'}`;
}