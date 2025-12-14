// src/services/invoice-detail.service.ts
import axios, { AxiosInstance } from 'axios';

const BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:5054/api/ChiTietHoaDons';

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

// Response DTO
export interface ChiTietHoaDonResponse {
  maChiTietHD: number;
  maDichVu: number;
  tenDichVu?: string | null;
  soLuong: number;
  donGia: number;
  moTa?: string | null;
}

// Create request DTO
export interface CreateChiTietHoaDonRequest {
  maHoaDon: number;
  maDichVu: number;
  soLuong: number;
  donGia: number;
  moTa?: string | null;
}

// Update request DTO
export interface UpdateChiTietHoaDonRequest {
  maHoaDon: number;
  maDichVu: number;
  soLuong: number;
  donGia: number;
  moTa?: string | null;
}

/* ---------- Service ---------- */

const invoiceDetailService = {
  // POST: add service to invoice detail
  create: async (payload: CreateChiTietHoaDonRequest): Promise<ChiTietHoaDonResponse> => {
    try {
      const resp = await API.post<ChiTietHoaDonResponse>('/', payload);
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  // PUT: update invoice detail by id
  update: async (maChiTietHD: number, payload: UpdateChiTietHoaDonRequest): Promise<ChiTietHoaDonResponse> => {
    try {
      const resp = await API.put<ChiTietHoaDonResponse>(`/${maChiTietHD}`, payload);
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  // DELETE: remove invoice detail by id
  remove: async (maChiTietHD: number): Promise<void> => {
    try {
      await API.delete(`/${maChiTietHD}`);
    } catch (err) {
      throw err; // let caller inspect status (404, etc.)
    }
  },
};

export default invoiceDetailService;
