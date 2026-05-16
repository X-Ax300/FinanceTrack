import { Bell, BellOff, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { useTheme } from '../contexts/ThemeContext';
import Card from './ui/Card';
import Button from './ui/Button';

export function NotificationSettings() {
  const { theme } = useTheme();
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
            <p className={`text-sm font-medium ${textPrimary}`}>Notificaciones no disponibles</p>
            <p className={`text-xs mt-1 ${textSecondary}`}>
              Tu navegador no soporta notificaciones web. Usa Chrome, Firefox, Safari 16+, o Edge.
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
        notifySuccess('¡Notificaciones habilitadas!', 'Recibirás notificaciones sobre tu cuenta.');
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
              <p className={`text-sm font-medium ${textPrimary}`}>Notificaciones Web</p>
              <p className={`text-xs mt-1 ${textSecondary}`}>
                {isGranted
                  ? '✅ Notificaciones habilitadas. Recibirás alertas sobre movimientos en tu cuenta.'
                  : 'Activa las notificaciones para recibir alertas sobre transacciones importantes.'}
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
            {requesting ? 'Solicitando permisos...' : 'Habilitar Notificaciones'}
          </Button>
        )}

        {isGranted && (
          <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
            <p className={`text-xs ${textSecondary}`}>
              📢 Recibirás notificaciones cuando:
            </p>
            <ul className={`text-xs mt-2 space-y-1 ${textSecondary}`}>
              <li>• Se agregue un nuevo gasto o ingreso</li>
              <li>• Sincronicen datos en segundo plano</li>
              <li>• Haya cambios en tus tarjetas de crédito</li>
            </ul>
          </div>
        )}
      </Card>

      {!isGranted && (
        <Card className="p-4 border-blue-500/20 bg-blue-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className={`text-sm font-medium ${textPrimary}`}>¿Por qué notificaciones?</p>
              <p className={`text-xs mt-1 ${textSecondary}`}>
                Las notificaciones te ayudan a estar atento a tus finanzas. Recibirás alertas en tiempo real sobre cambios importantes en tu cuenta.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
