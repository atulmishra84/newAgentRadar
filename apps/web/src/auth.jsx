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
    localStorage.setItem('ar_token', data.token);
    if (data.csrfToken) {
      /* cookie also set by server */
    }
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
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
