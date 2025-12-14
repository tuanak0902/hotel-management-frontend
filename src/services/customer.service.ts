// src/services/customer.service.ts
import axios, { AxiosInstance } from 'axios';

const BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:5054/api/khachhangs';

const API: AxiosInstance = axios.create({
  baseURL: BASE,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

function getErrorMessage(err: unknown): string {
  if (!err || typeof err !== 'object') return 'Unknown error';
  const e = err as any;
  if (e.response?.data) {
    const data = e.response.data;
    if (typeof data === 'string') return data;
    if (typeof data === 'object') {
      if ('message' in data) return String(data.message);
      if ('detail' in data) return String(data.detail);
      if ('errors' in data && typeof data.errors === 'object') {
        const entries = Object.values(data.errors).flat();
        return entries.join('; ');
      }
      try {
        return JSON.stringify(data);
      } catch {
        return String(data);
      }
    }
  }
  if (e.message) return e.message;
  return String(e);
}

/* ---------- Types ---------- */
export interface KhachHangResponse {
  maKhachHang: number;
  hoTen?: string | null;
  trangThai?: string | null;
  cccd?: string | null;
  soDienThoai?: string | null;
  email?: string | null;
  diaChi?: string | null;
}

export interface CreateKhachHangRequest {
  hoTen: string;
  soDienThoai: string;
  trangThai: string;
  cccd: string;
  email?: string | null;
  diaChi?: string | null;
}

export interface UpdateKhachHangRequest {
  hoTen: string;
  soDienThoai: string;
  trangThai?: string | null;
  email?: string | null;
  diaChi?: string | null;
}

export interface FilterKhachHangRequest {
  TenKhachHang?: string | null;
  CCCD?: string | null;
  SoDienThoai?: string | null;
  TrangThai?: string | null;
}

const customerService = {
  getAll: async (): Promise<KhachHangResponse[]> => {
    try {
      const resp = await API.get<KhachHangResponse[]>('/');
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  getById: async (maKhachHang: number): Promise<KhachHangResponse> => {
    try {
      const resp = await API.get<KhachHangResponse>(`/${maKhachHang}`);
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  create: async (payload: CreateKhachHangRequest): Promise<KhachHangResponse> => {
    try {
      const resp = await API.post<KhachHangResponse>('/', payload);
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  update: async (maKhachHang: number, payload: UpdateKhachHangRequest): Promise<KhachHangResponse> => {
    try {
      const resp = await API.put<KhachHangResponse>(`/${maKhachHang}`, payload);
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  remove: async (maKhachHang: number): Promise<void> => {
    try {
      await API.delete(`/${maKhachHang}`);
    } catch (err) {
      // rethrow original axios error so caller can inspect response.status if needed
      throw err;
    }
  },

  filter: async (params: FilterKhachHangRequest): Promise<KhachHangResponse[]> => {
    try {
      const query: any = {};
      if (params.TenKhachHang) query.TenKhachHang = params.TenKhachHang;
      if (params.CCCD) query.CCCD = params.CCCD;
      if (params.SoDienThoai) query.SoDienThoai = params.SoDienThoai;
      if (params.TrangThai) query.TrangThai = params.TrangThai;

      const resp = await API.get<KhachHangResponse[]>('/filter', { params: query });
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },
};

export default customerService;
