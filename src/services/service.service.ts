import axios, { AxiosInstance } from 'axios';

const BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:5054/api/dichvus';

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
    if (typeof e.response.data === 'object' && 'message' in e.response.data) return e.response.data.message;
    if (typeof e.response.data === 'string') return e.response.data;
    try {
      return JSON.stringify(e.response.data);
    } catch {
      return String(e.response.data);
    }
  }
  if (e.message) return e.message;
  return String(e);
}

/* ---------- Types ---------- */
export interface DichVuResponse {
  maDichVu: number;
  tenDichVu?: string | null;
  donGia: number;
  donVi?: string | null;
  trangThai?: string | null;
}

export interface CreateDichVuRequest {
  tenDichVu: string;
  donVi: string;
  trangThai: string;
  donGia: number;
}

export interface UpdateDichVuRequest {
  tenDichVu: string;
  donVi: string;
  trangThai?: string | null;
  donGia: number;
}

const serviceService = {
  getAll: async (signal?: AbortSignal): Promise<DichVuResponse[]> => {
    try {
      const resp = await API.get<DichVuResponse[]>('/', { signal });
      return resp.data;
    } catch (err) {
          // Preserve abort/cancel errors so callers can detect them
      const e: any = err;
      if (e && (e.name === 'CanceledError' || e.name === 'AbortError' || e.code === 'ERR_CANCELED')) {
        throw e;
      }
      throw new Error(getErrorMessage(err));
    }
  },

  getById: async (maDichVu: number): Promise<DichVuResponse> => {
    try {
      const resp = await API.get<DichVuResponse>(`/${maDichVu}`);
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  create: async (payload: CreateDichVuRequest): Promise<DichVuResponse> => {
    try {
      // Map camelCase frontend payload to PascalCase DTO expected by backend
      const body: any = {
        TenDichVu: payload.tenDichVu,
        DonVi: payload.donVi,
        TrangThai: payload.trangThai,
        DonGia: Math.trunc(Number(payload.donGia ?? 0)),
      };
      // Debug: log outgoing body for easier troubleshooting
      console.debug('[serviceService.create] POST body:', body);
      const resp = await API.post<DichVuResponse>('/', body);
      return resp.data;
    } catch (err) {
      // Debug: surface server response body if present
      try {
        const e: any = err;
        if (e?.response?.data) console.error('[serviceService.create] server response:', e.response.data);
      } catch {}
      throw new Error(getErrorMessage(err));
    }
  },

  update: async (maDichVu: number, payload: UpdateDichVuRequest): Promise<DichVuResponse> => {
    try {
      const body: any = {
        TenDichVu: payload.tenDichVu,
        DonVi: payload.donVi,
        TrangThai: payload.trangThai,
        DonGia: Math.trunc(Number(payload.donGia ?? 0)),
      };
      console.debug('[serviceService.update] PUT body:', { maDichVu, ...body });
      const resp = await API.put<DichVuResponse>(`/${maDichVu}`, body);
      return resp.data;
    } catch (err) {
      try {
        const e: any = err;
        if (e?.response?.data) console.error('[serviceService.update] server response:', e.response.data);
      } catch {}
      throw new Error(getErrorMessage(err));
    }
  },

  remove: async (maDichVu: number): Promise<void> => {
    try {
      await API.delete(`/${maDichVu}`);
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  // Accept camelCase params from frontend, map to PascalCase keys expected by backend
  filter: async (params: {
    tenDichVu?: string;
    donVi?: string;
    trangThai?: string;
    sapXepTheoGia?: 'asc' | 'desc';
    sapXepTheoTen?: 'asc' | 'desc';
    donGia?: number;
  }) => {
    try {
      const mapped: any = {};
      if (params.tenDichVu) mapped.TenDichVu = params.tenDichVu;
      if (params.donVi) mapped.DonVi = params.donVi;
      if (params.trangThai) mapped.TrangThai = params.trangThai;
      if (params.sapXepTheoGia) mapped.SapXepTheoGia = params.sapXepTheoGia;
      if (params.sapXepTheoTen) mapped.SapXepTheoTen = params.sapXepTheoTen;
      if (typeof params.donGia === 'number') mapped.DonGia = params.donGia;

      const resp = await API.get<DichVuResponse[]>('/filter', { params: mapped });
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },
};

export default serviceService;
