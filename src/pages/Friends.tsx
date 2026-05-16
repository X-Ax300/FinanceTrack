import { useEffect, useState } from 'react';
import { UserPlus, Trash2, Users, Mail, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getFriends, addFriend, deleteFriend, acceptFriend, rejectFriend } from '../lib/firestore';
import { useNotifications } from '../hooks/useNotifications';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import type { Friend } from '../types';

export default function Friends() {
  const { currentUser } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { notifySuccess, notifyError } = useNotifications();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [friendName, setFriendName] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

  async function load() {
    if (!currentUser) {
      setFriends([]);
      setLoading(false);
      return;
    }

    try {
      const data = await getFriends(currentUser.uid, { forceRefresh: true });
      setFriends(data);
    } catch {
      notifyError('Error', 'No se pudo cargar la lista de amigos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [currentUser]);

  async function handleInvite() {
    if (!currentUser || !email.trim()) return;
    const cleanEmail = email.trim().toLowerCase();
    setError('');
    if (cleanEmail === currentUser.email?.toLowerCase()) { setError(t("You can't add yourself.")); return; }
    if (friends.some((f) => f.friendEmail.toLowerCase() === cleanEmail && f.status !== 'rejected')) {
      setError(t('This person is already in your list.'));
      return;
    }
    setSaving(true);
    try {
      await addFriend({
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: currentUser.displayName,
        friendId: cleanEmail,
        friendEmail: cleanEmail,
        friendName: friendName || undefined,
      });
      notifySuccess('Invitación enviada', `${cleanEmail} verá tu solicitud en Friends`);
      await load();
      setModalOpen(false);
      setEmail('');
      setFriendName('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo enviar la invitación';
      setError(message);
      notifyError('Error', message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId || !currentUser) return;
    try {
      await deleteFriend(deleteId, currentUser.uid);
      notifySuccess('Amigo eliminado', 'El contacto fue removido de tu lista');
      setDeleteId(null);
      await load();
    } catch (err) {
      notifyError('Error', 'No se pudo eliminar el amigo');
    }
  }

  async function handleAccept(friendId: string) {
    if (!currentUser) return;
    setActionId(friendId);
    try {
      await acceptFriend(friendId, currentUser.uid);
      notifySuccess('Invitación aceptada', 'Ahora esta persona puede ver tu resumen financiero');
      await load();
    } catch (err) {
      notifyError('Error', err instanceof Error ? err.message : 'No se pudo aceptar la invitación');
    } finally {
      setActionId(null);
    }
  }

  async function handleReject(friendId: string) {
    if (!currentUser) return;
    setActionId(friendId);
    try {
      await rejectFriend(friendId, currentUser.uid);
      notifySuccess('Invitación rechazada', 'La solicitud fue eliminada');
      await load();
    } catch {
      notifyError('Error', 'No se pudo rechazar la invitación');
    } finally {
      setActionId(null);
    }
  }

  const accepted = friends.filter((f) => f.status === 'accepted');
  const incoming = friends.filter((f) => f.status === 'pending' && f.direction === 'incoming');
  const outgoing = friends.filter((f) => f.status === 'pending' && f.direction !== 'incoming');

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>{t('Friends')}</h1>
          <p className={`text-sm mt-1 ${textSecondary}`}>{t('Share your financial overview with trusted people')}</p>
        </div>
        <Button onClick={() => { setModalOpen(true); setEmail(''); setFriendName(''); setError(''); }} size="sm">
          <UserPlus className="w-4 h-4" /> {t('Invite Friend')}
        </Button>
      </div>

      {/* Info banner */}
      <Card className="p-5 border-blue-500/20 bg-blue-500/5">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className={`text-sm font-medium ${textPrimary}`}>{t('Shared Financial View')}</p>
            <p className={`text-xs mt-1 ${textSecondary}`}>
              {t('Friends you invite can view your balance, expenses, and statistics, but they cannot edit or modify any data.')}
              {' '}{t('The invited person must already have a FinanceTrack account with that email.')}
            </p>
          </div>
        </div>
      </Card>

      {/* Active friends */}
      {accepted.length > 0 && (
        <div>
          <h2 className={`text-sm font-medium mb-3 ${textSecondary}`}>{t('Active')} ({accepted.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accepted.map((f) => (
              <Card key={f.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                      {(f.friendName || f.friendEmail)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${textPrimary}`}>{f.friendName || f.friendEmail.split('@')[0]}</p>
                      <p className={`text-xs ${textSecondary}`}>{f.friendEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" title={t('Active')} />
                    <button onClick={() => setDeleteId(f.id!)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className={`mt-3 pt-3 border-t text-xs ${theme === 'dark' ? 'border-gray-800 text-gray-500' : 'border-gray-100 text-gray-400'}`}>
                  <CheckCircle className="w-3 h-3 inline mr-1 text-emerald-400" />
                  {t('View-only access granted')}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Incoming */}
      {incoming.length > 0 && (
        <div>
          <h2 className={`text-sm font-medium mb-3 ${textSecondary}`}>{t('Invitaciones recibidas')} ({incoming.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {incoming.map((f) => (
              <Card key={f.id} className="p-4 border-cyan-500/20 bg-cyan-500/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                      <Mail className={`w-5 h-5 ${textSecondary}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${textPrimary}`}>{f.friendName || f.friendEmail.split('@')[0]}</p>
                      <p className={`text-xs ${textSecondary}`}>{f.friendEmail}</p>
                    </div>
                  </div>
                </div>
                <div className={`mt-3 pt-3 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
                  <p className={`text-xs mb-3 ${textSecondary}`}>{t('Quiere acceder a tu resumen financiero en modo lectura.')}</p>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => handleAccept(f.id!)} loading={actionId === f.id}>
                      <CheckCircle className="w-3.5 h-3.5" /> {t('Aceptar')}
                    </Button>
                    <Button size="sm" variant="danger" className="flex-1" onClick={() => handleReject(f.id!)} disabled={actionId === f.id}>
                      <XCircle className="w-3.5 h-3.5" /> {t('Rechazar')}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Outgoing */}
      {outgoing.length > 0 && (
        <div>
          <h2 className={`text-sm font-medium mb-3 ${textSecondary}`}>{t('Invitaciones enviadas')} ({outgoing.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {outgoing.map((f) => (
              <Card key={f.id} className="p-4 opacity-80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                      <Mail className={`w-5 h-5 ${textSecondary}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${textPrimary}`}>{f.friendName || f.friendEmail.split('@')[0]}</p>
                      <p className={`text-xs ${textSecondary}`}>{f.friendEmail}</p>
                    </div>
                  </div>
                  <button onClick={() => setDeleteId(f.id!)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className={`mt-3 pt-3 border-t text-xs ${theme === 'dark' ? 'border-gray-800 text-gray-500' : 'border-gray-100 text-gray-400'}`}>
                  <Clock className="w-3 h-3 inline mr-1 text-amber-400" />
                  {t('Esperando respuesta')}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {friends.length === 0 && (
        <div
          className={`flex flex-col items-center justify-center h-48 rounded-2xl border-2 border-dashed cursor-pointer transition-colors
            ${theme === 'dark' ? 'border-gray-800 hover:border-gray-700 text-gray-600' : 'border-gray-200 hover:border-gray-300 text-gray-400'}`}
          onClick={() => setModalOpen(true)}
        >
          <Users className="w-10 h-10 mb-3" />
          <p className="text-sm font-medium">{t('No friends added yet')}</p>
          <p className="text-xs mt-1">{t('Invite someone to share your finances')}</p>
        </div>
      )}

      {/* Invite modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t('Invite a Friend')}>
        <div className="space-y-4">
          {error && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
          <Input
            label={t('Email Address')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@example.com"
            required
          />
          <Input
            label={t('Display Name (optional)')}
            value={friendName}
            onChange={(e) => setFriendName(e.target.value)}
            placeholder="John Doe"
          />
          <p className={`text-xs ${textSecondary}`}>
            {t('Your friend will see the invitation inside their Friends page. They can view your financial summary but cannot edit any data.')}
          </p>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setModalOpen(false)}>{t('Cancel')}</Button>
            <Button className="flex-1" onClick={handleInvite} loading={saving}>{t('Send Invitation')}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title={t('Remove Friend')}>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
          {t('Are you sure you want to remove this person? They will no longer have access to your financial data.')}
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => setDeleteId(null)}>{t('Cancel')}</Button>
          <Button variant="danger" className="flex-1" onClick={handleDelete}>{t('Remove')}</Button>
        </div>
      </Modal>
    </div>
  );
}
