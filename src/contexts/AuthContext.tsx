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
import { prefetchUserData } from '../lib/firestore';

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
        unsubscribeSyncRef.current = setupSyncListener(user.uid);
        if (navigator.onLine) {
          processSyncQueue(user.uid).catch((error) => console.error('Initial sync failed:', error));
          prefetchUserData(user.uid).catch((error) => console.error('Prefetch failed:', error));
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
