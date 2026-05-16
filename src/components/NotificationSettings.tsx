import { Bell, BellOff, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import Card from './ui/Card';
import Button from './ui/Button';

export function NotificationSettings() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { canNotify, isGranted, requestPermission, notifySuccess } = useNotifications();
  const [requesting, setRequesting] = useState(false);

  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const bgSecondary = theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50';

  if (!canNotify) {
    return (
      <Card className="p-4 border-amber-500/20 bg-amber-500/5">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className={`text-sm font-medium ${textPrimary}`}>{t('Notifications unavailable')}</p>
            <p className={`text-xs mt-1 ${textSecondary}`}>
              {t('Your browser does not support web notifications. Use Chrome, Firefox, Safari 16+, or Edge.')}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const handleRequestPermission = async () => {
    setRequesting(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        notifySuccess(t('Notifications enabled'), t('You will receive notifications about your account.'));
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className={`p-4 ${bgSecondary}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
              {isGranted ? (
                <Bell className="w-5 h-5 text-cyan-400" />
              ) : (
                <BellOff className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div>
              <p className={`text-sm font-medium ${textPrimary}`}>{t('Web Notifications')}</p>
              <p className={`text-xs mt-1 ${textSecondary}`}>
                {isGranted
                  ? t('Notifications are enabled. You will receive alerts about account activity.')
                  : t('Enable notifications to receive alerts about important transactions.')}
              </p>
            </div>
          </div>
        </div>

        {!isGranted && (
          <Button
            onClick={handleRequestPermission}
            disabled={requesting}
            className="mt-4 w-full"
            size="sm"
          >
            <Bell className="w-4 h-4" />
            {requesting ? t('Requesting permissions...') : t('Enable Notifications')}
          </Button>
        )}

        {isGranted && (
          <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
            <p className={`text-xs ${textSecondary}`}>
              {t('You will receive notifications when:')}
            </p>
            <ul className={`text-xs mt-2 space-y-1 ${textSecondary}`}>
              <li>• {t('A new expense or income is added')}</li>
              <li>• {t('Data syncs in the background')}</li>
              <li>• {t('There are changes to your credit cards')}</li>
            </ul>
          </div>
        )}
      </Card>

      {!isGranted && (
        <Card className="p-4 border-blue-500/20 bg-blue-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className={`text-sm font-medium ${textPrimary}`}>{t('Why notifications?')}</p>
              <p className={`text-xs mt-1 ${textSecondary}`}>
                {t('Notifications help you stay aware of your finances. You will receive real-time alerts about important account changes.')}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
