import { useState, useCallback } from 'react';
import {
  notifyError as sendErrorNotification,
  notifyInfo as sendInfoNotification,
  notifySuccess as sendSuccessNotification,
  notifyWarning as sendWarningNotification,
  useNotifications as useNotificationsLib,
} from '../lib/notifications';
import { useAuth } from '../contexts/AuthContext';
import { addNotification } from '../lib/firestore';
import type { Notification as AppNotification } from '../types';

type NotificationType = AppNotification['type'];

/**
 * Hook de React para gestionar notificaciones
 * Expone el estado actual y solicita permisos desde una acción del usuario.
 */
export function useNotifications() {
  const notif = useNotificationsLib();
  const { currentUser } = useAuth();
  const [isGranted, setIsGranted] = useState(notif.isGranted);
  const [permission, setPermission] = useState<NotificationPermission>(notif.permission);

  const saveNotification = useCallback(
    async (type: NotificationType, title: string, message?: string, actionUrl?: string) => {
      if (!currentUser) return;

      try {
        await addNotification({
          userId: currentUser.uid,
          type,
          title,
          message: message || '',
          read: false,
          createdAt: new Date().toISOString(),
          actionUrl,
        });
      } catch (error) {
        console.error('Error saving notification:', error);
      }
    },
    [currentUser]
  );

  const requestPermission = useCallback(async () => {
    const result = await notif.requestPermission();
    setIsGranted(result);
    setPermission('Notification' in window ? Notification.permission : 'denied');
    return result;
  }, [notif]);

  const notifySuccess = useCallback(
    (message: string, details?: string, actionUrl?: string) => {
      sendSuccessNotification(message, details);
      void saveNotification('success', message, details, actionUrl);
    },
    [saveNotification]
  );

  const notifyError = useCallback(
    (message: string, details?: string, actionUrl?: string) => {
      sendErrorNotification(message, details);
      void saveNotification('alert', message, details, actionUrl);
    },
    [saveNotification]
  );

  const notifyInfo = useCallback(
    (message: string, details?: string, actionUrl?: string) => {
      sendInfoNotification(message, details);
      void saveNotification('info', message, details, actionUrl);
    },
    [saveNotification]
  );

  const notifyWarning = useCallback(
    (message: string, details?: string, actionUrl?: string) => {
      sendWarningNotification(message, details);
      void saveNotification('warning', message, details, actionUrl);
    },
    [saveNotification]
  );

  const notifyFriend = useCallback(
    (message: string, details?: string, actionUrl?: string) => {
      sendInfoNotification(message, details);
      void saveNotification('friend', message, details, actionUrl);
    },
    [saveNotification]
  );

  return {
    ...notif,
    requestPermission,
    notifySuccess,
    notifyError,
    notifyInfo,
    notifyWarning,
    notifyFriend,
    saveNotification,
    isGranted,
    permission,
  };
}
