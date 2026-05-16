import { useEffect, useState } from 'react';
import { Plus, UserPlus, Trash2, Users, Mail, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getFriends, addFriend, deleteFriend } from '../lib/firestore';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import type { Friend } from '../types';

export default function Friends() {
  const { currentUser } = useAuth();
  const { theme } = useTheme();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [friendName, setFriendName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const textPrimary = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const textSecondary = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

  async function load() {
    if (!currentUser) return;
    const data = await getFriends(currentUser.uid);
    setFriends(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [currentUser]);

  async function handleInvite() {
    if (!currentUser || !email) return;
    setError('');
    if (email === currentUser.email) { setError("You can't add yourself."); return; }
    if (friends.some((f) => f.friendEmail === email)) { setError('This person is already in your list.'); return; }
    setSaving(true);
    await addFriend({
      userId: currentUser.uid,
      friendId: email,
      friendEmail: email,
      friendName: friendName || undefined,
      status: 'pending',
    });
    await load();
    setModalOpen(false);
    setEmail('');
    setFriendName('');
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    await deleteFriend(deleteId);
    setDeleteId(null);
    await load();
  }

  const accepted = friends.filter((f) => f.status === 'accepted');
  const pending = friends.filter((f) => f.status === 'pending');

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimary}`}>Friends</h1>
          <p className={`text-sm mt-1 ${textSecondary}`}>Share your financial overview with trusted people</p>
        </div>
        <Button onClick={() => { setModalOpen(true); setEmail(''); setFriendName(''); setError(''); }} size="sm">
          <UserPlus className="w-4 h-4" /> Invite Friend
        </Button>
      </div>

      {/* Info banner */}
      <Card className="p-5 border-blue-500/20 bg-blue-500/5">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className={`text-sm font-medium ${textPrimary}`}>Shared Financial View</p>
            <p className={`text-xs mt-1 ${textSecondary}`}>
              Friends you invite can view your balance, expenses, and statistics — but they cannot edit or modify any data.
              Invitations are sent by email.
            </p>
          </div>
        </div>
      </Card>

      {/* Active friends */}
      {accepted.length > 0 && (
        <div>
          <h2 className={`text-sm font-medium mb-3 ${textSecondary}`}>Active ({accepted.length})</h2>
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
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" title="Active" />
                    <button onClick={() => setDeleteId(f.id!)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className={`mt-3 pt-3 border-t text-xs ${theme === 'dark' ? 'border-gray-800 text-gray-500' : 'border-gray-100 text-gray-400'}`}>
                  <CheckCircle className="w-3 h-3 inline mr-1 text-emerald-400" />
                  View-only access granted
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div>
          <h2 className={`text-sm font-medium mb-3 ${textSecondary}`}>Pending Invitations ({pending.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pending.map((f) => (
              <Card key={f.id} className="p-4 opacity-70">
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
                  Invitation pending
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
          <p className="text-sm font-medium">No friends added yet</p>
          <p className="text-xs mt-1">Invite someone to share your finances</p>
        </div>
      )}

      {/* Invite modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Invite a Friend">
        <div className="space-y-4">
          {error && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="friend@example.com"
            required
          />
          <Input
            label="Display Name (optional)"
            value={friendName}
            onChange={(e) => setFriendName(e.target.value)}
            placeholder="John Doe"
          />
          <p className={`text-xs ${textSecondary}`}>
            Your friend will receive an invitation link. They can view your financial summary but cannot edit any data.
          </p>
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleInvite} loading={saving}>Send Invitation</Button>
          </div>
        </div>
      </Modal>

      {/* Delete */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Remove Friend">
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
          Are you sure you want to remove this person? They will no longer have access to your financial data.
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" onClick={handleDelete}>Remove</Button>
        </div>
      </Modal>
    </div>
  );
}
