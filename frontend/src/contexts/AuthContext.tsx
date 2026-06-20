import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  pending2FA: { tempToken: string; username: string; password: string } | null;
  verifyLogin2FA: (totpCode?: string, backupCode?: string) => Promise<void>;
  cancel2FA: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [pending2FA, setPending2FA] = useState<{ tempToken: string; username: string; password: string } | null>(null);

  useEffect(() => {
    if (token) {
      authApi.me()
        .then(u => setUser(u))
        .catch(() => { localStorage.removeItem('token'); setToken(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await authApi.login(username, password);
    if (res.require2FA) {
      setPending2FA({ tempToken: res.tempToken!, username, password });
      throw new Error('2FA required');
    }
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
  }, []);

  const verifyLogin2FA = useCallback(async (totpCode?: string, backupCode?: string) => {
    if (!pending2FA) throw new Error('No pending 2FA login');
    const res = await authApi.login(pending2FA.username, pending2FA.password, totpCode, backupCode);
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    setPending2FA(null);
  }, [pending2FA]);

  const cancel2FA = useCallback(() => {
    setPending2FA(null);
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    const res = await authApi.register(username, email, password);
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAuthenticated: !!token, isAdmin: user?.isAdmin ?? false, pending2FA, verifyLogin2FA, cancel2FA }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
