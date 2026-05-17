export const APP_VERSION = __APP_VERSION__;

export const APP_RELEASE_NOTES: Record<string, string[]> = {
  [APP_VERSION]: [
    'feat(perfil): mejorar gestión del usuario con foto y configuración de idioma',
  ],
};

export function getUserScopedKey(baseKey: string, userId?: string | null) {
  return `${baseKey}_${userId || 'guest'}`;
}