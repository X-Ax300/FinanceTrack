import { useState } from 'react';
import { User, Shield, Bell, Palette, LogOut, Save, Eye, EyeOff } from 'lucide-react';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { auth } from '../lib/firebase';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function Settings() {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [currency, setCurrency] = useState(localStorage.getItem('ft-currency') || 'USD');

  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

  async function handleSaveProfile() {
    if (!currentUser || !displayName.trim()) return;
    setSavingProfile(true);
    setProfileMsg('');
    try {
      await updateProfile(currentUser, { displayName });
      setProfileMsg('Profile updated successfully.');
    } catch {
      setProfileMsg('Failed to update profile.');
    }
    setSavingProfile(false);
  }

  async function handleChangePassword() {
    if (!currentUser?.email || !currentPassword || !newPassword) return;
    if (newPassword.length < 6) { setPasswordMsg('New password must be at least 6 characters.'); return; }
    setSavingPassword(true);
    setPasswordMsg('');
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      setPasswordMsg('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch {
      setPasswordMsg('Current password is incorrect.');
    }
    setSavingPassword(false);
  }

  function handleCurrencyChange(val: string) {
    setCurrency(val);
    localStorage.setItem('ft-currency', val);
  }

  const CURRENCIES = ['USD', 'EUR', 'GBP', 'MXN', 'CAD', 'ARS', 'COP', 'BRL', 'JPY'];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className={`text-2xl font-bold ${textPrimary}`}>Settings</h1>
        <p className={`text-sm mt-1 ${textSecondary}`}>Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <User className="w-4 h-4 text-cyan-400" />
          </div>
          <h2 className={`text-base font-semibold ${textPrimary}`}>Profile</h2>
        </div>

        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {displayName[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className={`font-semibold ${textPrimary}`}>{displayName || 'No name set'}</p>
            <p className={`text-sm ${textSecondary}`}>{currentUser?.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <Input
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
          />
          <Input label="Email" value={currentUser?.email || ''} disabled className="opacity-60 cursor-not-allowed" />
          {profileMsg && (
            <p className={`text-sm ${profileMsg.includes('success') ? 'text-emerald-400' : 'text-rose-400'}`}>{profileMsg}</p>
          )}
          <Button onClick={handleSaveProfile} loading={savingProfile} size="sm">
            <Save className="w-3.5 h-3.5" /> Save Profile
          </Button>
        </div>
      </Card>

      {/* Security */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Shield className="w-4 h-4 text-amber-400" />
          </div>
          <h2 className={`text-base font-semibold ${textPrimary}`}>Security</h2>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Current Password</label>
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
            <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
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
            <Shield className="w-3.5 h-3.5" /> Change Password
          </Button>
        </div>
      </Card>

      {/* Preferences */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Palette className="w-4 h-4 text-blue-400" />
          </div>
          <h2 className={`text-base font-semibold ${textPrimary}`}>Preferences</h2>
        </div>

        <div className="space-y-4">
          {/* Theme toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${textPrimary}`}>Theme</p>
              <p className={`text-xs ${textSecondary}`}>Choose your preferred appearance</p>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative w-12 h-6 rounded-full transition-colors ${theme === 'dark' ? 'bg-cyan-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Currency */}
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${textPrimary}`}>Currency</p>
              <p className={`text-xs ${textSecondary}`}>Display currency for amounts</p>
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

      {/* Danger */}
      <Card className="p-6 border-red-500/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
            <LogOut className="w-4 h-4 text-red-400" />
          </div>
          <h2 className={`text-base font-semibold ${textPrimary}`}>Account</h2>
        </div>
        <Button variant="danger" size="sm" onClick={logout}>
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </Button>
      </Card>
    </div>
  );
}
