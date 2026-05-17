import { useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { Bell, CheckCircle, CreditCard, DollarSign, Sparkles, Users, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotifications } from '../hooks/useNotifications';
import { APP_RELEASE_NOTES, APP_VERSION, getUserScopedKey } from '../lib/version';
import Modal from './ui/Modal';
import Button from './ui/Button';

const LAST_SEEN_VERSION_KEY = 'ft-last-seen-version';
const ONBOARDING_KEY = 'ft-onboarding-seen';
const VERSION_NOTIFICATION_KEY = 'ft-version-notified';

export default function AppVersionStatus() {
  const { currentUser } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { notifyInfo } = useNotifications();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showUpdateNotice, setShowUpdateNotice] = useState(false);
  const [previousVersion, setPreviousVersion] = useState<string | null>(null);
  const notifiedVersionsRef = useRef(new Set<string>());

  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
  const userId = currentUser?.uid || null;
  const releaseNotes = useMemo(() => APP_RELEASE_NOTES[APP_VERSION] || [], []);

  useEffect(() => {
    if (!userId) return;

    const onboardingKey = getUserScopedKey(ONBOARDING_KEY, userId);
    const versionKey = getUserScopedKey(LAST_SEEN_VERSION_KEY, userId);
    const notifiedKey = getUserScopedKey(`${VERSION_NOTIFICATION_KEY}-${APP_VERSION}`, userId);
    const hasSeenOnboarding = localStorage.getItem(onboardingKey) === 'true';
    const storedVersion = localStorage.getItem(versionKey);

    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }

    if (storedVersion && storedVersion !== APP_VERSION) {
      setPreviousVersion(storedVersion);
      setShowUpdateNotice(true);

      const notificationKey = `${userId}_${APP_VERSION}`;
      if (!notifiedVersionsRef.current.has(notificationKey)) {
        notifiedVersionsRef.current.add(notificationKey);
        if (localStorage.getItem(notifiedKey) !== 'true') {
          localStorage.setItem(notifiedKey, 'true');
          notifyInfo(
            t('New version installed'),
            `${t('You moved from')} v${storedVersion} ${t('to')} v${APP_VERSION}.`,
            '/'
          );
        }
      }
    }

    if (!storedVersion) {
      localStorage.setItem(versionKey, APP_VERSION);
    }
  }, [notifyInfo, t, userId]);

  function closeOnboarding() {
    if (userId) {
      localStorage.setItem(getUserScopedKey(ONBOARDING_KEY, userId), 'true');
      localStorage.setItem(getUserScopedKey(LAST_SEEN_VERSION_KEY, userId), APP_VERSION);
    }
    setShowOnboarding(false);
  }

  function closeUpdateNotice() {
    if (userId) {
      localStorage.setItem(getUserScopedKey(LAST_SEEN_VERSION_KEY, userId), APP_VERSION);
    }
    setShowUpdateNotice(false);
  }

  return (
    <>
      <div
        className={`fixed bottom-2 right-2 z-40 rounded-lg border px-2 py-1 text-[10px] font-medium shadow-sm backdrop-blur sm:bottom-3 sm:right-3 sm:px-2.5 sm:text-[11px]
          ${theme === 'dark'
            ? 'border-gray-800 bg-gray-950/80 text-gray-400'
            : 'border-gray-200 bg-white/85 text-gray-500'}`}
        title={`FinanceTrack v${APP_VERSION}`}
      >
        v{APP_VERSION}
      </div>

      {showUpdateNotice && (
        <div className="fixed bottom-10 left-2 right-2 z-40 sm:bottom-12 sm:left-auto sm:right-3 sm:w-[calc(100vw-1.5rem)] sm:max-w-sm">
          <div
            className={`rounded-xl border p-4 shadow-xl backdrop-blur
              ${theme === 'dark'
                ? 'border-cyan-500/20 bg-gray-900/95 text-white'
                : 'border-cyan-100 bg-white/95 text-gray-900'}`}
          >
            <div className="flex items-start gap-2.5 sm:gap-3">
              <div className="mt-0.5 rounded-lg bg-cyan-500/15 p-1.5 sm:p-2">
                <Bell className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{t('New version installed')}</p>
                <p className={`mt-1 text-xs ${textSecondary}`}>
                  {t('You moved from')} v{previousVersion} {t('to')} v{APP_VERSION}. {t('You already have the latest improvements.')}
                </p>
                {releaseNotes.length > 0 && (
                  <ul className={`mt-3 space-y-1.5 text-xs ${textSecondary}`}>
                    {releaseNotes.map((note) => (
                      <li key={note} className="flex gap-2">
                        <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
                        <span>{t(note)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                onClick={closeUpdateNotice}
                className={`rounded-lg p-1 transition-colors ${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800 hover:text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                aria-label="Cerrar aviso de actualización"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal open={showOnboarding} onClose={closeOnboarding} title={t('Welcome to FinanceTrack')} maxWidth="max-w-xl">
        <div className="space-y-4 sm:space-y-5">
          <p className={`text-sm leading-6 ${textSecondary}`}>
            {t('Organize your finances from one place. This mini tour shows you the essentials to get started.')}
          </p>

          <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
            <IntroItem icon={DollarSign} title={t('Income and expenses')} text={t('Track income, spending, and payment methods to see your real balance.')} />
            <IntroItem icon={CreditCard} title={t('CardsIntro')} text={t('Manage limits, charges, and payments for your credit cards.')} />
            <IntroItem icon={CheckCircle} title={t('GoalsIntro')} text={t('Create saving goals and review your progress clearly.')} />
            <IntroItem icon={Users} title={t('FriendsIntro')} text={t('Invite trusted people to share a read-only view.')} />
          </div>

          <div className={`rounded-xl border p-3 sm:p-4 ${theme === 'dark' ? 'border-cyan-500/20 bg-cyan-500/10' : 'border-cyan-100 bg-cyan-50'}`}>
            <div className="flex items-start gap-2.5 sm:gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-400 sm:h-5 sm:w-5" />
              <p className={`text-sm leading-6 ${textPrimary}`}>
                {t('Enable web notifications to hear about important changes or new releases.')}
              </p>
            </div>
          </div>

          <Button className="w-full" onClick={closeOnboarding}>
            {t('Start')}
          </Button>
        </div>
      </Modal>
    </>
  );
}

function IntroItem({
  icon: Icon,
  title,
  text,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  const { theme } = useTheme();
  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${theme === 'dark' ? 'border-gray-800 bg-gray-800/50' : 'border-gray-100 bg-gray-50'}`}>
      <div className="flex items-start gap-3 sm:block">
        <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-cyan-400 sm:mb-3 sm:mt-0" />
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${textPrimary}`}>{title}</p>
          <p className={`mt-1 text-xs leading-5 ${textSecondary}`}>{text}</p>
        </div>
      </div>
    </div>
  );
}
