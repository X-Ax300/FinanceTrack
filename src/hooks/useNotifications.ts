import { useState, useCallback } from 'react';
import { useNotifications as useNotificationsLib } from '../lib/notifications';

/**
 * Hook de React para gestionar notificaciones
 * Expone el estado actual y solicita permisos desde una acción del usuario.
 */
export function useNotifications() {
  const notif = useNotificationsLib();
  const [isGranted, setIsGranted] = useState(notif.isGranted);
  const [permission, setPermission] = useState<NotificationPermission>(notif.permission);

  const requestPermission = useCallback(async () => {
    const result = await notif.requestPermission();
    setIsGranted(result);
    setPermission('Notification' in window ? Notification.permission : 'denied');
    return result;
  }, [notif]);

  return {
    ...notif,
    requestPermission,
    isGranted,
    permission,
  };
}
