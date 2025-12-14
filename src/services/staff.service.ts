// src/services/staff.service.ts
import axios, { AxiosInstance } from 'axios';

const BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:5054/api/nhanviens';

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

export interface CreateNhanVienRequest {
  hoTen: string;
  chucVu: string;
  soDienThoai: string;
  cccd: string;
  email?: string | null;
  diaChi?: string | null;
  ngaySinh: string; // ISO string
  luong: number;
}

export interface UpdateNhanVienRequest {
  hoTen: string;
  soDienThoai: string;
  email?: string | null;
  diaChi?: string | null;
  ngaySinh: string; // ISO string
  chucVu: string;
  luong: number;
}

export interface FilterNhanVienRequest {
  tenNhanVien?: string | null;
  cccd?: string | null;
  soDienThoai?: string | null;
  chucVu?: string | null;
}

export interface NhanVienResponse {
  maNhanVien: number;
  hoTen?: string | null;
  cccd?: string | null;
  soDienThoai?: string | null;
  email?: string | null;
  diaChi?: string | null;
  ngaySinh?: string | null;
  chucVu?: string | null;
  luong?: number | null;
}

/* ---------- Service ---------- */

const staffService = {
  getAll: async (): Promise<NhanVienResponse[]> => {
    try {
      const resp = await API.get<NhanVienResponse[]>('/');
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  getById: async (maNhanVien: number): Promise<NhanVienResponse> => {
    try {
      const resp = await API.get<NhanVienResponse>(`/${maNhanVien}`);
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  create: async (payload: CreateNhanVienRequest): Promise<NhanVienResponse> => {
    try {
      const resp = await API.post<NhanVienResponse>('/', payload);
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  update: async (
    maNhanVien: number,
    payload: UpdateNhanVienRequest
  ): Promise<NhanVienResponse> => {
    try {
      const resp = await API.put<NhanVienResponse>(`/${maNhanVien}`, payload);
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  remove: async (maNhanVien: number): Promise<void> => {
    try {
      await API.delete(`/${maNhanVien}`);
    } catch (err) {
      throw err; // let caller inspect status (404, etc.)
    }
  },

  filter: async (params: FilterNhanVienRequest): Promise<NhanVienResponse[]> => {
    try {
      const query: any = {};
      if (params.tenNhanVien) query.TenNhanVien = params.tenNhanVien;
      if (params.cccd) query.CCCD = params.cccd;
      if (params.soDienThoai) query.SoDienThoai = params.soDienThoai;
      if (params.chucVu) query.ChucVu = params.chucVu;

      const resp = await API.get<NhanVienResponse[]>('/filter', { params: query });
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },
};

export default staffService;
