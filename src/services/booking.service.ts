import axios, { AxiosInstance } from 'axios';

const BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:5054/api/datphongs';

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

// Create request
export interface CreateDatPhongRequest {
  maKhachHang: number;
  maPhong: number;
  ngayNhanPhong: string; // ISO string
  ngayTraPhong: string;  // ISO string
  trangThai: string;     // "Đã đặt" | "Đang ở" | "Đã hủy"
  ghiChu?: string | null;
}

// List response
export interface DatPhongListResponse {
  maDatPhong: number;
  tenKhachHang?: string | null;
  soDienThoai?: string | null;
  tenPhong?: string | null;
  loaiPhong?: string | null;
  ngayNhanPhong: string;
  ngayTraPhong: string;
  trangThai?: string | null;
}

// Invoice info
export interface HoaDonInfo {
  maHoaDon: number;
  trangThaiThanhToan?: string | null; // "Chưa thanh toán" | "Đã thanh toán"
  tongTien: number;
  ngayLap: string;
}

// Detailed booking response
export interface DatPhongResponse {
  maDatPhong: number;
  trangThai?: string | null; // "Đã đặt", "Đang ở", "Đã hủy"
  ngayNhanPhong: string;
  ngayTraPhong: string;
  khachHangHoTen?: string | null;
  khachHangSoDienThoai?: string | null;
  soPhong?: string | null;
  tenLoaiPhong?: string | null;
  giaTheoDem: number;
  hoaDon?: HoaDonInfo | null;
}

// Update request
export interface UpdateDatPhongRequest {
  trangThai: string;
}

/* ---------- Service ---------- */

const bookingService = {
  getAll: async (): Promise<DatPhongListResponse[]> => {
    try {
      const resp = await API.get<DatPhongListResponse[]>('/');
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  getById: async (maDatPhong: number): Promise<DatPhongResponse> => {
    try {
      const resp = await API.get<DatPhongResponse>(`/${maDatPhong}`);
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  create: async (payload: CreateDatPhongRequest): Promise<DatPhongResponse> => {
    try {
      const resp = await API.post<DatPhongResponse>('/', payload);
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  updateStatus: async (maDatPhong: number, payload: UpdateDatPhongRequest): Promise<DatPhongResponse> => {
    try {
      const resp = await API.put<DatPhongResponse>(`/${maDatPhong}`, payload);
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  filterByStatus: async (trangThai: string): Promise<DatPhongListResponse[]> => {
    try {
      const resp = await API.get<DatPhongListResponse[]>('/filter', { params: { trangThai } });
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },
};

export default bookingService;
