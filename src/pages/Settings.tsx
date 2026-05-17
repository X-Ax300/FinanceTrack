import { useEffect, useState } from 'react';
import { User, Shield, Palette, LogOut, Save, Eye, EyeOff, Languages, Bell, Camera } from 'lucide-react';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Language, useLanguage } from '../contexts/LanguageContext';
import { CURRENCIES, CURRENCY_STORAGE_KEY, getStoredCurrency } from '../lib/utils';
import { getUserProfile, updateUserProfile } from '../lib/firestore';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { NotificationSettings } from '../components/NotificationSettings';

export default function Settings() {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [photoURL, setPhotoURL] = useState(currentUser?.photoURL || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [currency, setCurrency] = useState(getStoredCurrency());

  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

  useEffect(() => {
    if (!currentUser) return;

    setDisplayName(currentUser.displayName || '');
    setPhotoURL(currentUser.photoURL || '');

    getUserProfile(currentUser.uid)
      .then((profile) => {
        if (!profile) return;
        setDisplayName(profile.displayName || currentUser.displayName || '');
        setPhotoURL(profile.photoURL || currentUser.photoURL || '');
        if (profile.currency) {
          setCurrency(profile.currency);
          localStorage.setItem(CURRENCY_STORAGE_KEY, profile.currency);
        }
        if (profile.language === 'en' || profile.language === 'es') {
          setLanguage(profile.language);
        }
      })
      .catch((error) => console.error('Failed to load user preferences:', error));
  }, [currentUser, setLanguage]);

  function isValidProfilePhotoUrl(value: string) {
    if (!value.trim()) return true;
    try {
      const url = new URL(value.trim());
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
      return false;
    }
  }

  async function handleSaveProfile() {
    if (!currentUser || !displayName.trim()) return;
    if (!isValidProfilePhotoUrl(photoURL)) {
      setProfileMsg(t('Enter a valid image URL.'));
      return;
    }

    setSavingProfile(true);
    setProfileMsg('');
    try {
      const cleanPhotoURL = photoURL.trim() || null;
      await updateProfile(currentUser, { displayName: displayName.trim(), photoURL: cleanPhotoURL });
      await updateUserProfile(currentUser.uid, {
        displayName: displayName.trim(),
        photoURL: cleanPhotoURL,
      });
      setProfileMsg(t('Profile updated successfully.'));
    } catch {
      setProfileMsg(t('Failed to update profile.'));
    }
    setSavingProfile(false);
  }

  async function handleChangePassword() {
    if (!currentUser?.email || !currentPassword || !newPassword) return;
    if (newPassword.length < 6) { setPasswordMsg(t('New password must be at least 6 characters.')); return; }
    setSavingPassword(true);
    setPasswordMsg('');
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      setPasswordMsg(t('Password changed successfully.'));
      setCurrentPassword('');
      setNewPassword('');
    } catch {
      setPasswordMsg(t('Current password is incorrect.'));
    }
    setSavingPassword(false);
  }

  async function handleCurrencyChange(val: string) {
    setCurrency(val);
    localStorage.setItem(CURRENCY_STORAGE_KEY, val);
    if (currentUser) {
      try {
        await updateUserProfile(currentUser.uid, { currency: val });
      } catch (error) {
        console.error('Failed to save currency:', error);
      }
    }
  }

  async function handleLanguageChange(val: Language) {
    setLanguage(val);
    if (currentUser) {
      try {
        await updateUserProfile(currentUser.uid, { language: val });
      } catch (error) {
        console.error('Failed to save language:', error);
      }
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className={`text-2xl font-bold ${textPrimary}`}>{t('Settings')}</h1>
        <p className={`text-sm mt-1 ${textSecondary}`}>{t('Manage your account and preferences')}</p>
      </div>

      {/* Profile */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <User className="w-4 h-4 text-cyan-400" />
          </div>
          <h2 className={`text-base font-semibold ${textPrimary}`}>{t('Profile')}</h2>
        </div>

        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg overflow-hidden">
            {photoURL ? (
              <img src={photoURL} alt={displayName || currentUser?.email || 'Profile'} className="h-full w-full object-cover" />
            ) : (
              displayName[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || 'U'
            )}
          </div>
          <div>
            <p className={`font-semibold ${textPrimary}`}>{displayName || t('No name set')}</p>
            <p className={`text-sm ${textSecondary}`}>{currentUser?.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <Input
            label={t('Display Name')}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t('Your name')}
          />
          <Input
            label={t('Profile Photo URL')}
            type="url"
            value={photoURL}
            onChange={(e) => setPhotoURL(e.target.value)}
            placeholder="https://example.com/photo.jpg"
          />
          <p className={`flex items-start gap-2 text-xs ${textSecondary}`}>
            <Camera className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            {t('Use an image URL. FinanceTrack will not upload or store image files.')}
          </p>
          <Input label={t('Email')} value={currentUser?.email || ''} disabled className="opacity-60 cursor-not-allowed" />
          {profileMsg && (
            <p className={`text-sm ${profileMsg.includes('success') ? 'text-emerald-400' : 'text-rose-400'}`}>{profileMsg}</p>
          )}
          <Button onClick={handleSaveProfile} loading={savingProfile} size="sm">
            <Save className="w-3.5 h-3.5" /> {t('Save Profile')}
          </Button>
        </div>
      </Card>

      {/* Security */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Shield className="w-4 h-4 text-amber-400" />
          </div>
          <h2 className={`text-base font-semibold ${textPrimary}`}>{t('Security')}</h2>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{t('Current Password')}</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-3.5 py-2.5 pr-10 rounded-xl text-sm border outline-none transition-all
                  ${theme === 'dark' ? 'bg-gray-800/60 border-gray-700 text-white placeholder-gray-500 focus:border-cyan-500/60' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{t('New Password')}</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('Min 6 characters')}
                className={`w-full px-3.5 py-2.5 pr-10 rounded-xl text-sm border outline-none transition-all
                  ${theme === 'dark' ? 'bg-gray-800/60 border-gray-700 text-white placeholder-gray-500 focus:border-cyan-500/60' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {passwordMsg && (
            <p className={`text-sm ${passwordMsg.includes('success') ? 'text-emerald-400' : 'text-rose-400'}`}>{passwordMsg}</p>
          )}
          <Button onClick={handleChangePassword} loading={savingPassword} size="sm" variant="secondary">
            <Shield className="w-3.5 h-3.5" /> {t('Change Password')}
          </Button>
        </div>
      </Card>

      {/* Preferences */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Palette className="w-4 h-4 text-blue-400" />
          </div>
          <h2 className={`text-base font-semibold ${textPrimary}`}>{t('Preferences')}</h2>
        </div>

        <div className="space-y-4">
          {/* Theme toggle */}
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className={`text-sm font-medium ${textPrimary}`}>{t('Theme')}</p>
              <p className={`text-xs ${textSecondary}`}>{t('Choose your preferred appearance')}</p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={t('Theme')}
              aria-pressed={theme === 'dark'}
              className={`relative h-6 w-12 flex-shrink-0 rounded-full transition-colors ${theme === 'dark' ? 'bg-cyan-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute left-0.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition-transform duration-300 ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Language */}
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${textPrimary}`}>{t('Language')}</p>
              <p className={`text-xs ${textSecondary}`}>{t('Choose your preferred language')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Languages className={`w-4 h-4 ${textSecondary}`} />
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as Language)}
                className={`px-3 py-1.5 rounded-xl text-sm border outline-none ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
              >
                <option value="en">{t('English')}</option>
                <option value="es">{t('Spanish')}</option>
              </select>
            </div>
          </div>

          {/* Currency */}
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${textPrimary}`}>{t('Currency')}</p>
              <p className={`text-xs ${textSecondary}`}>{t('Display currency for amounts')}</p>
            </div>
            <select
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className={`px-3 py-1.5 rounded-xl text-sm border outline-none ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
            >
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* Notifications */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <Bell className="w-4 h-4 text-purple-400" />
          </div>
          <h2 className={`text-base font-semibold ${textPrimary}`}>{t('Notifications')}</h2>
        </div>
        <NotificationSettings />
      </Card>

      {/* Danger */}
      <Card className="p-6 border-red-500/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
            <LogOut className="w-4 h-4 text-red-400" />
          </div>
          <h2 className={`text-base font-semibold ${textPrimary}`}>{t('Account')}</h2>
        </div>
        <Button variant="danger" size="sm" onClick={logout}>
          <LogOut className="w-3.5 h-3.5" /> {t('Sign Out')}
        </Button>
      </Card>
    </div>
  );
}
