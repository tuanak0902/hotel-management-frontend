import React, { createContext, useContext, useEffect, useState } from 'react';
import accountService, { setAccountServiceAuthToken } from './account.service';

type Role = 'customer' | 'staff' | 'manager';

export interface AuthUser {
  maTaiKhoan?: number | string;
  tenDangNhap?: string;
  role?: string;
  status?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  initializing: boolean;
  login: (payload: { tenDangNhap: string; matKhau: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function decodeJwt(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    // Decode base64 (handle URL-safe)
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

function mapBackendRoleToFrontend(backendRole?: string | null): Role {
  if (!backendRole) return 'customer';
  const roleMap: Record<string, Role> = {
    'Quản lý': 'manager',
    'Quản ly': 'manager',
    'Quan ly': 'manager',
    'Nhân viên': 'staff',
    'Nhân vien': 'staff',
    'Lễ tân': 'staff',
    'Lễ tan': 'staff',
    'Khách hàng': 'customer',
    'Khach hang': 'customer',
    'customer': 'customer',
    'staff': 'staff',
    'manager': 'manager',
  };
  return roleMap[backendRole] ?? 'customer';
}

function getStoredToken(): string | null {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
}

function getStoredProfile(): AuthUser | null {
  try {
    const raw = localStorage.getItem('auth_user');
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function storeProfile(profile?: AuthUser | null) {
  try {
    if (!profile) {
      localStorage.removeItem('auth_user');
    } else {
      localStorage.setItem('auth_user', JSON.stringify(profile));
    }
  } catch {
    // ignore
  }
}

function readCookie(name: string): string | null {
  try {
    const match = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  } catch {
    return null;
  }
}

function storeToken(token?: string | null) {
  try {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  } catch {
    // ignore
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    (async () => {
      // 0) try stored profile first (works when backend sets HttpOnly cookie and returns role on login)
      const storedProfile = getStoredProfile();
      if (storedProfile) {
        setUser(storedProfile);
        setIsAuthenticated(true);
        setInitializing(false);
        return;
      }

      // 1) try localStorage token
      const t = getStoredToken();
      if (t) {
        setAccountServiceAuthToken(t);
        const payload = decodeJwt(t);
        if (payload) {
          const mappedRole = mapBackendRoleToFrontend(payload.role ?? payload.vaiTro ?? String(payload.role));
          const profile: AuthUser = { maTaiKhoan: payload.sub, tenDangNhap: payload.unique_name ?? payload.name, role: mappedRole, status: payload.Status };
          setUser(profile);
          setIsAuthenticated(true);
          return;
        }
      }

      // 2) try cookie-based token (common name: AccessToken, accessToken)
      const cookieToken = readCookie('AccessToken') ?? readCookie('accessToken');
      if (cookieToken) {
        // set header too (useful if cookie also present)
        setAccountServiceAuthToken(cookieToken);
        const payload = decodeJwt(cookieToken);
        if (payload) {
          const mappedRole = mapBackendRoleToFrontend(payload.role ?? payload.vaiTro ?? String(payload.role));
          const profile: AuthUser = { maTaiKhoan: payload.sub, tenDangNhap: payload.unique_name ?? payload.name, role: mappedRole, status: payload.Status };
          setUser(profile);
          setIsAuthenticated(true);
          return;
        }
      }

      // 3) fallback: try backend /me to fetch user info (works for HttpOnly cookies)
      try {
        const profile = await accountService.me();
        if (profile) {
          const mappedRole = mapBackendRoleToFrontend(profile.vaiTro ?? profile.role ?? profile.roleName ?? profile.roleName);
          const p: AuthUser = { maTaiKhoan: profile.maTaiKhoan ?? profile.sub, tenDangNhap: profile.tenDangNhap ?? profile.unique_name ?? profile.name, role: mappedRole, status: profile.trangThai ?? profile.Status };
          setUser(p);
          setIsAuthenticated(true);
          storeProfile(p);
          return;
        }
      } catch (e) {
        // ignore and treat as not authenticated
      }

      // No token or profile found
      setUser(null);
      setIsAuthenticated(false);
      setInitializing(false);
    })();
  }, []);

  const login = async (payload: { tenDangNhap: string; matKhau: string }) => {
    const resp = await accountService.login(payload as any);
    // Backend might return token as `token` or `accessToken` or similar
    const token = resp?.token ?? resp?.accessToken ?? resp?.data?.token ?? resp?.accessToken;
    if (token) {
      storeToken(token);
      setAccountServiceAuthToken(token);
      const decoded = decodeJwt(token);
      const mappedRole = mapBackendRoleToFrontend(decoded?.role ?? decoded?.vaiTro ?? String(decoded?.role));
      const profile: AuthUser = { maTaiKhoan: decoded?.sub, tenDangNhap: decoded?.unique_name ?? decoded?.name, role: mappedRole, status: decoded?.Status };
      setUser(profile);
      storeProfile(profile);
      setIsAuthenticated(true);
      return;
    }

    // If no token returned, backend may use cookie-based auth and return role/user info
    const role = resp?.role ?? resp?.vaiTro;
    const tenDangNhap = resp?.tenDangNhap ?? resp?.unique_name;
    const maTaiKhoan = resp?.maTaiKhoan ?? resp?.sub;
    if (role || tenDangNhap) {
      const mappedRole = mapBackendRoleToFrontend(role);
      const profile: AuthUser = { maTaiKhoan, tenDangNhap, role: mappedRole };
      setUser(profile);
      storeProfile(profile);
      setIsAuthenticated(true);
      return;
    }

    throw new Error(resp?.message ?? 'Login failed: no token returned');
  };

  const logout = async () => {
    // Optionally call backend logout endpoint here if present
    storeToken(null);
    setAccountServiceAuthToken(null);
    storeProfile(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, initializing, login, logout }}>{children}</AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default {
  AuthProvider,
  useAuth,
};
