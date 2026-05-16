/**
 * 🔔 Servicio de Notificaciones Web
 * ==================================
 * 
 * Maneja solicitud de permisos y envío de notificaciones push
 * Requiere que el navegador soporte la Notifications API
 */

export type NotificationOptions = {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: NotificationAction[];
};

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

/**
 * Solicita permisos al usuario para enviar notificaciones
 * Devuelve 'granted', 'denied', o 'default'
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Este navegador no soporta notificaciones');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

/**
 * Verifica si el navegador soporta notificaciones
 */
export function supportsNotifications(): boolean {
  return 'Notification' in window;
}

/**
 * Verifica si tenemos permiso para enviar notificaciones
 */
export function hasNotificationPermission(): boolean {
  if (!supportsNotifications()) return false;
  return Notification.permission === 'granted';
}

export function getNotificationPermission(): NotificationPermission {
  if (!supportsNotifications()) return 'denied';
  return Notification.permission;
}

/**
 * Envía una notificación
 */
export function sendNotification(options: NotificationOptions): Notification | null {
  if (!hasNotificationPermission()) {
    console.warn('No hay permiso para enviar notificaciones');
    return null;
  }

  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/vite.svg',
      badge: options.badge || '/vite.svg',
      tag: options.tag || 'default',
      requireInteraction: options.requireInteraction || false,
    });

    // Auto cerrar después de 5 segundos si no se requiere interacción
    if (!options.requireInteraction) {
      setTimeout(() => notification.close(), 5000);
    }

    return notification;
  } catch (error) {
    console.error('Error al enviar notificación:', error);
    return null;
  }
}

/**
 * Envía notificación de éxito
 */
export function notifySuccess(message: string, details?: string) {
  sendNotification({
    title: message,
    body: details,
    icon: '✅',
    tag: 'success',
  });
}

/**
 * Envía notificación de error
 */
export function notifyError(message: string, details?: string) {
  sendNotification({
    title: '❌ ' + message,
    body: details,
    tag: 'error',
    requireInteraction: true,
  });
}

/**
 * Envía notificación de información
 */
export function notifyInfo(message: string, details?: string) {
  sendNotification({
    title: 'ℹ️ ' + message,
    body: details,
    tag: 'info',
  });
}

/**
 * Envía notificación de advertencia
 */
export function notifyWarning(message: string, details?: string) {
  sendNotification({
    title: '⚠️ ' + message,
    body: details,
    tag: 'warning',
  });
}

/**
 * Configura listener para notificaciones con acciones
 */
export function setupNotificationListener(callback: (action: string) => void) {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    // Esto se ejecuta cuando el usuario hace clic en una acción de la notificación
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
          callback(event.data.action);
        }
      });
    }
  }
}

/**
 * Contexto para React - Hook personalizado
 */
export function useNotifications() {
  const canNotify = supportsNotifications();
  const isGranted = hasNotificationPermission();

  const requestPermission = async () => {
    const result = await requestNotificationPermission();
    return result === 'granted';
  };

  return {
    canNotify,
    isGranted,
    requestPermission,
    sendNotification,
    notifySuccess,
    notifyError,
    notifyInfo,
    notifyWarning,
    permission: getNotificationPermission(),
  };
}
