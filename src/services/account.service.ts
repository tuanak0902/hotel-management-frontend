import axios, { AxiosInstance } from 'axios';

/*
  Account service for .NET backend endpoints under /api/taikhoans
  Endpoints implemented:
  1. GET  /api/taikhoans
  2. POST /api/taikhoans
  3. GET  /api/taikhoans/{maTaiKhoan}
  4. DELETE /api/taikhoans/{maTaiKhoan}
  5. PUT /api/taikhoans/{maTaiKhoan}
  6. POST /api/taikhoans/login
  7. POST /api/taikhoans/reset-password

  Notes:
  - Base URL can be overridden with Vite env var `VITE_API_BASE_URL` (e.g. https://localhost:5001/api/taikhoans)
  - `withCredentials: true` is enabled to support cookie-based auth flows. Ensure your backend sets CORS and Access-Control-Allow-Credentials.
*/

const BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:5054/api/taikhoans';

const API: AxiosInstance = axios.create({
  baseURL: BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

/* ---------- Types (mirror backend DTOs) ---------- */

export interface CreateTaiKhoanRequest {
  tenDangNhap: string;
  matKhau: string;
  vaiTro: string;
  trangThai?: string | null;
  maNhanVien: number;
}

export interface LoginTaiKhoanRequest {
  tenDangNhap: string;
  matKhau: string;
}

export interface ResetPasswordRequest {
  tenDangNhap: string;
  newPassword: string;
}

export interface TaiKhoanResponse {
  maTaiKhoan: number;
  tenDangNhap?: string | null;
  vaiTro?: string | null;
  trangThai?: string | null;
}

export interface UpdateTrangThaiTaiKhoanRequest {
  trangThai?: string | null;
}

/* ---------- Helpers ---------- */
function getErrorMessage(err: unknown): string {
  if (!err || typeof err !== 'object') return 'Unknown error';
  const e = err as any;
  // Axios response error with structured body
  if (e.response?.data) {
    // If backend returns { message: '...' }
    if (typeof e.response.data === 'object' && 'message' in e.response.data) return e.response.data.message;
    // If backend returns a plain string (e.g. NotFound("text")), return it directly
    if (typeof e.response.data === 'string') return e.response.data;
    // If backend returns validation errors or other shape, stringify a sensible part
    try {
      return JSON.stringify(e.response.data);
    } catch {
      return String(e.response.data);
    }
  }
  if (e.message) return e.message;
  return String(e);
}

/* ---------- Service ---------- */

const accountService = {
  // 1. GET /api/taikhoans
  getAll: async (): Promise<TaiKhoanResponse[]> => {
    try {
      const resp = await API.get<TaiKhoanResponse[]>('/');
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  // 2. POST /api/taikhoans
  create: async (data: CreateTaiKhoanRequest): Promise<TaiKhoanResponse> => {
    try {
      const resp = await API.post<TaiKhoanResponse>('/', data);
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  // 3. GET /api/taikhoans/{maTaiKhoan}
  getById: async (maTaiKhoan: number): Promise<TaiKhoanResponse> => {
    try {
      const resp = await API.get<TaiKhoanResponse>(`/${maTaiKhoan}`);
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  // 4. DELETE /api/taikhoans/{maTaiKhoan}
  remove: async (maTaiKhoan: number): Promise<{ message?: string } | void> => {
    try {
      const resp = await API.delete(`/${maTaiKhoan}`);
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  // 5. PUT /api/taikhoans/{maTaiKhoan}
  // Updates account status. Accepts UpdateTrangThaiTaiKhoanRequest and returns success message.
  update: async (
    maTaiKhoan: number,
    data: UpdateTrangThaiTaiKhoanRequest
  ): Promise<{ message: string }> => {
    try {
      const resp = await API.put<{ message: string }>(`/${maTaiKhoan}`, data);
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  // 6. POST /api/taikhoans/login
  login: async (payload: LoginTaiKhoanRequest): Promise<{ message?: string; role?: string; [k: string]: any }> => {
    try {
      const resp = await API.post('/login', payload);
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  // 7. POST /api/taikhoans/reset-password
  resetPassword: async (payload: ResetPasswordRequest): Promise<{ message?: string } | void> => {
    try {
      const resp = await API.post('/reset-password', payload);
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  // Optional: check auth by calling a protected endpoint such as /me (adjust if backend exposes different path)
  isAuthenticated: async (): Promise<boolean> => {
    try {
      await API.get('/me');
      return true;
    } catch {
      return false;
    }
  },
  // Get current authenticated user's profile from backend (expects /me)
  me: async (): Promise<any> => {
    try {
      const resp = await API.get('/me');
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },
};

// Helper to set Authorization header on this service instance
export function setAccountServiceAuthToken(token?: string | null) {
  if (token) {
    API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete API.defaults.headers.common['Authorization'];
  }
}

export default accountService;
