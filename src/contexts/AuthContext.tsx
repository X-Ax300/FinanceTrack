import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useRef } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { processSyncQueue, setupSyncListener } from '../lib/cacheSync';
import { getUserProfile, prefetchUserData, upsertUserProfile } from '../lib/firestore';
import { CURRENCY_STORAGE_KEY } from '../lib/utils';
import { LANGUAGE_CHANGED_EVENT, LANGUAGE_STORAGE_KEY } from './LanguageContext';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  loading: boolean;
  signup: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const unsubscribeSyncRef = useRef<(() => void) | null>(null);

  async function signup(email: string, password: string, name: string) {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName: name });
  }

  function login(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password).then(() => {});
  }

  function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider).then(() => {});
  }

  function logout() {
    return signOut(auth);
  }

  function resetPassword(email: string) {
    return sendPasswordResetEmail(auth, email);
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      unsubscribeSyncRef.current?.();
      unsubscribeSyncRef.current = null;
      
      if (user) {
        upsertUserProfile({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        })
          .then(async () => {
            const profile = await getUserProfile(user.uid);
            if (profile?.language === 'en' || profile?.language === 'es') {
              localStorage.setItem(LANGUAGE_STORAGE_KEY, profile.language);
              window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGED_EVENT, { detail: profile.language }));
            }
            if (profile?.currency) {
              localStorage.setItem(CURRENCY_STORAGE_KEY, profile.currency);
            }
          })
          .catch((error) => console.error('Profile sync failed:', error));

        unsubscribeSyncRef.current = setupSyncListener(user.uid);
        
        // Non-blocking prefetch in background
        if (navigator.onLine) {
          // Don't wait for this - let UI load first
          prefetchUserData(user.uid).catch((error) => console.error('Prefetch failed:', error));
          processSyncQueue(user.uid).catch((error) => console.error('Initial sync failed:', error));
        }
      }
      
      setLoading(false);
    });
    
    return () => {
      unsub();
      unsubscribeSyncRef.current?.();
      unsubscribeSyncRef.current = null;
    };
  }, []);

  const value = useMemo(
    () => ({ currentUser, loading, signup, login, loginWithGoogle, logout, resetPassword }),
    [currentUser, loading]
  );

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
