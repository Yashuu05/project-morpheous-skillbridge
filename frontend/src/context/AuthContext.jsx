import React, { createContext, useState, useContext, useCallback } from 'react';

/**
 * AuthContext — Simplified for landing page.
 *
 * Login and signup are intentionally NOT implemented yet.
 * The context provides stubs so the rest of the codebase can import and use
 * useAuth() without crashes. Actual auth will be wired to Firebase Auth +
 * Firestore in a future sprint.
 */

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ─── STUBS (reserved for future implementation) ───────────────────────────

  const signup = useCallback(async (_email, _password, _fullName) => {
    console.warn('[AuthContext] signup is not implemented yet.');
    return { success: false, error: 'Sign up is coming soon!' };
  }, []);

  const login = useCallback(async (_email, _password) => {
    console.warn('[AuthContext] login is not implemented yet.');
    return { success: false, error: 'Login is coming soon!' };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  }, []);

  const updateProfile = useCallback(async (_profileData) => {
    console.warn('[AuthContext] updateProfile is not implemented yet.');
    return { success: false, error: 'Not implemented yet' };
  }, []);

  const changePassword = useCallback(async (_currentPassword, _newPassword) => {
    console.warn('[AuthContext] changePassword is not implemented yet.');
    return { success: false, error: 'Not implemented yet' };
  }, []);

  const refreshAccessToken = useCallback(async () => {
    console.warn('[AuthContext] refreshAccessToken is not implemented yet.');
    throw new Error('Not implemented yet');
  }, []);

  // ─── Context value ─────────────────────────────────────────────────────────

  const value = {
    // State
    user,
    token: null,
    refreshToken: null,
    loading,
    error,
    isAuthenticated,

    // Methods
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

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
