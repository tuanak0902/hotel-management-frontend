import axios, { AxiosInstance } from 'axios';

const BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:5054/api/hoadons';

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

// Chi tiết hóa đơn
export interface ChiTietHoaDonResponse {
  maChiTietHoaDon: number;
  tenDichVu?: string | null;
  soLuong: number;
  donGia: number;
  thanhTien: number;
}

// Hóa đơn chi tiết
export interface HoaDonDetailResponse {
  maHoaDon: number;
  maDatPhong: number;
  ngayLap: string; // ISO string
  trangThaiThanhToan?: string | null;
  tongTien: number;
  tenKhachHang?: string | null;
  soPhong?: string | null;
  chiTietHoaDons: ChiTietHoaDonResponse[];
}

// Hóa đơn gọn
export interface HoaDonResponse {
  maHoaDon: number;
  trangThaiThanhToan?: string | null; // "Chưa thanh toán" | "Đã thanh toán"
  tongTien: number;
  ngayLap: string;
}

// Update request
export interface UpdateHoaDonRequest {
  trangThai?: string | null;
}

/* ---------- Service ---------- */

const invoiceService = {
  getAll: async (): Promise<HoaDonResponse[]> => {
    try {
      const resp = await API.get<HoaDonResponse[]>('/');
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  getById: async (maHoaDon: number): Promise<HoaDonDetailResponse> => {
    try {
      const resp = await API.get<HoaDonDetailResponse>(`/${maHoaDon}`);
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  updateStatus: async (maHoaDon: number, payload: UpdateHoaDonRequest): Promise<HoaDonResponse> => {
    try {
      const resp = await API.put<HoaDonResponse>(`/${maHoaDon}`, payload);
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  filterByStatus: async (trangThai: string): Promise<HoaDonResponse[]> => {
    try {
      const resp = await API.get<HoaDonResponse[]>('/filter', { params: { trangThai } });
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },
};

export default invoiceService;
