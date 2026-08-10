import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, ensureCsrf } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await ensureCsrf();
        if (localStorage.getItem('ar_token')) {
          const data = await api('/api/auth/me');
          setUser(data.user);
        }
      } catch {
        localStorage.removeItem('ar_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(email, password) {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    if (data.mfaChallenge || data.mfaEnrollRequired) return data;
    localStorage.setItem('ar_token', data.token);
    setUser(data.user);
    return data;
  }

  async function completeMfaLogin(challengeToken, code) {
    const data = await api('/api/auth/mfa/verify-login', {
      method: 'POST',
      body: { challengeToken, code },
    });
    localStorage.setItem('ar_token', data.token);
    setUser(data.user);
    return data;
  }

  async function logout() {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    localStorage.removeItem('ar_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, completeMfaLogin, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
