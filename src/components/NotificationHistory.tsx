import { useEffect, useState } from 'react';
import { Trash2, Bell, AlertCircle, Check, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { getNotifications, deleteNotification, markNotificationAsRead } from '../lib/firestore';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Card from './ui/Card';
import type { Notification } from '../types';

interface NotificationHistoryProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationHistory({ open, onClose }: NotificationHistoryProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const bgHover = theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50';

  async function loadNotifications() {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = await getNotifications(currentUser.uid, { forceRefresh: true });
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open, currentUser]);

  async function handleDelete(id: string) {
    if (!currentUser || !id) return;
    try {
      await deleteNotification(id, currentUser.uid);
      setNotifications(notifications.filter((n) => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }

  async function handleMarkAsRead(notification: Notification) {
    if (!currentUser || !notification.id) return;
    try {
      if (!notification.read) {
        await markNotificationAsRead(notification.id, currentUser.uid);
      }
      setNotifications(
        notifications.map((n) =>
          n.id === notification.id ? { ...n, read: true } : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'payment':
        return <AlertCircle className="w-4 h-4 text-orange-400" />;
      case 'achievement':
        return <Check className="w-4 h-4 text-emerald-400" />;
      case 'alert':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'friend':
        return <Bell className="w-4 h-4 text-cyan-400" />;
      case 'success':
        return <Check className="w-4 h-4 text-emerald-400" />;
      case 'info':
        return <Bell className="w-4 h-4 text-blue-400" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-amber-400" />;
      default:
        return <Bell className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('just now') || 'Just now';
    if (diffMins < 60) return `${diffMins}m ${t('ago') || 'ago'}`;
    if (diffHours < 24) return `${diffHours}h ${t('ago') || 'ago'}`;
    if (diffDays < 7) return `${diffDays}d ${t('ago') || 'ago'}`;
    return date.toLocaleDateString();
  };

  return (
    <Modal open={open} onClose={onClose} title={t('Notifications')}>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className={`text-center py-8 ${textSecondary}`}>
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('No notifications')}</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`p-4 cursor-pointer transition-all ${
                !notification.read
                  ? theme === 'dark'
                    ? 'bg-cyan-500/10 border-cyan-500/30'
                    : 'bg-cyan-50 border-cyan-200'
                  : ''
              } ${bgHover}`}
              onClick={() => handleMarkAsRead(notification)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm font-medium ${textPrimary}`}>
                        {notification.title}
                      </p>
                      <p className={`text-xs mt-1 ${textSecondary}`}>
                        {notification.message}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-cyan-500 flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className={`text-xs mt-2 ${textSecondary}`}>
                    {formatDate(notification.createdAt)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    notification.id && handleDelete(notification.id);
                  }}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>
    </Modal>
  );
}
