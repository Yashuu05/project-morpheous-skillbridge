import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

/**
 * AuthContext — wired to Firebase Auth + Firestore.
 *
 * - onAuthStateChanged keeps `user` and `isAuthenticated` in sync automatically.
 * - `user` is enriched with the Firestore profile (username, createdAt).
 * - signup lives in Signup.jsx (createUserWithEmailAndPassword + setDoc).
 * - login is reserved for a future sprint.
 */

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);          // enriched user object
  const [loading, setLoading] = useState(true);    // true while auth state resolves
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ─── Listen to Firebase Auth state ─────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch the Firestore profile to get username etc.
          const profileSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
          const profile = profileSnap.exists() ? profileSnap.data() : {};

          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            ...profile,            // username, usernameLower, createdAt
          });
          setIsAuthenticated(true);
        } catch (err) {
          console.error('[AuthContext] Failed to load user profile:', err);
          // Auth is valid even if Firestore read fails
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email });
          setIsAuthenticated(true);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setLoading(false);
    });

    return unsubscribe; // cleanup on unmount
  }, []);

  // ─── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setError(null);
    } catch (err) {
      console.error('[AuthContext] Logout failed:', err);
      setError('Logout failed. Please try again.');
    }
  }, []);

  // ─── Stubs reserved for future implementation ────────────────────────────────
  const login = useCallback(async (_email, _password) => {
    console.warn('[AuthContext] login is not implemented yet.');
    return { success: false, error: 'Login is coming soon!' };
  }, []);

  const signup = useCallback(async (_username, _password) => {
    // Real signup is handled directly in Signup.jsx via Firebase SDK.
    console.warn('[AuthContext] Use Signup.jsx for signup flow.');
    return { success: false, error: 'Use Signup.jsx for signup' };
  }, []);

  const updateProfile = useCallback(async (_data) => {
    console.warn('[AuthContext] updateProfile is not implemented yet.');
    return { success: false, error: 'Not implemented yet' };
  }, []);

  const changePassword = useCallback(async () => {
    console.warn('[AuthContext] changePassword is not implemented yet.');
    return { success: false, error: 'Not implemented yet' };
  }, []);

  const refreshAccessToken = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken(true);
    return token ?? null;
  }, []);

  // ─── Context value ──────────────────────────────────────────────────────────
  const value = {
    user,
    token: null,
    refreshToken: null,
    loading,
    error,
    isAuthenticated,
    signup,
    login,
    logout,
    refreshAccessToken,
    updateProfile,
    changePassword,
    clearError: () => setError(null),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export default AuthContext;
