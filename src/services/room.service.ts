// src/services/room.service.ts
import axios, { AxiosInstance } from 'axios';

const BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:5054/api/phongs';

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
export interface PhongResponse {
  maPhong: number;
  soPhong?: string | null;
  trangThai?: string | null;
  ghiChu?: string | null;
  tenLoaiPhong?: string | null;
}

export interface CreatePhongRequest {
  soPhong: string;
  maLoaiPhong: number;
  trangThai?: string | null;
  ghiChu?: string | null;
}

export interface UpdatePhongRequest {
  soPhong: string;
  maLoaiPhong: number;
  trangThai?: string | null;
  ghiChu?: string | null;
}

export interface FilterPhongRequest {
  TrangThai?: string | null;
  MaLoaiPhong?: number | null;
}

const roomService = {
  getAll: async (): Promise<PhongResponse[]> => {
    try {
      const resp = await API.get<PhongResponse[]>('/');
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  getById: async (maPhong: number): Promise<PhongResponse> => {
    try {
      const resp = await API.get<PhongResponse>(`/${maPhong}`);
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  create: async (payload: CreatePhongRequest): Promise<PhongResponse> => {
    try {
      const resp = await API.post<PhongResponse>('/', payload);
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  update: async (maPhong: number, payload: UpdatePhongRequest): Promise<PhongResponse> => {
    try {
      const resp = await API.put<PhongResponse>(`/${maPhong}`, payload);
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  remove: async (maPhong: number): Promise<void> => {
    try {
      await API.delete(`/${maPhong}`);
    } catch (err) {
      throw err;
    }
  },

  filter: async (params: FilterPhongRequest): Promise<PhongResponse[]> => {
    try {
      const query: any = {};
      if (params.TrangThai) query.TrangThai = params.TrangThai;
      if (params.MaLoaiPhong !== undefined && params.MaLoaiPhong !== null) query.MaLoaiPhong = params.MaLoaiPhong;
      const resp = await API.get<PhongResponse[]>('/filter', { params: query });
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },
};

export default roomService;
