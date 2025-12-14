import axios, { AxiosInstance } from 'axios';

const BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:5054/api/loaiphongs';

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
    // If backend returns ProblemDetails or ModelState, try to extract readable message
    const data = e.response.data;
    if (typeof data === 'string') return data;
    if (typeof data === 'object') {
      if ('message' in data) return String(data.message);
      if ('errors' in data && typeof data.errors === 'object') {
        // Flatten model state errors
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
export interface LoaiPhongResponse {
  maLoaiPhong: number;
  tenLoaiPhong?: string | null;
  moTa?: string | null;
  trangThai?: string | null;
  giaTheoDem: number;
}

export interface CreateLoaiPhongRequest {
  tenLoaiPhong: string;
  moTa?: string | null;
  trangThai: string;
  giaTheoDem: number;
}

export interface UpdateLoaiPhongRequest {
  tenLoaiPhong: string;
  moTa?: string | null;
  trangThai?: string | null;
  giaTheoDem: number;
}

export interface FilterLoaiPhongRequest {
  GiaMin?: number | null;
  GiaMax?: number | null;
  TenLoaiPhong?: string | null;
  TrangThaiPhong?: string | null;
  SapXepTheo?: string | null;
  ThuTu?: string | null;
}

const roomTypeService = {
  getAll: async (): Promise<LoaiPhongResponse[]> => {
    try {
      const resp = await API.get<LoaiPhongResponse[]>('/');
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  getById: async (maLoaiPhong: number): Promise<LoaiPhongResponse> => {
    try {
      const resp = await API.get<LoaiPhongResponse>(`/${maLoaiPhong}`);
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  create: async (payload: CreateLoaiPhongRequest): Promise<LoaiPhongResponse> => {
    try {
      const resp = await API.post<LoaiPhongResponse>('/', payload);
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  update: async (maLoaiPhong: number, payload: UpdateLoaiPhongRequest): Promise<LoaiPhongResponse> => {
    try {
      const resp = await API.put<LoaiPhongResponse>(`/${maLoaiPhong}`, payload);
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  remove: async (maLoaiPhong: number): Promise<void> => {
    try {
      await API.delete(`/${maLoaiPhong}`);
    } catch (err) {
      throw err;
    }
  },

  filter: async (params: FilterLoaiPhongRequest): Promise<LoaiPhongResponse[]> => {
    try {
      // Map camelCase keys to the query names expected by backend if needed
      const query: any = {};
      if (params.GiaMin !== undefined) query.GiaMin = params.GiaMin;
      if (params.GiaMax !== undefined) query.GiaMax = params.GiaMax;
      if (params.TenLoaiPhong) query.TenLoaiPhong = params.TenLoaiPhong;
      if (params.TrangThaiPhong) query.TrangThaiPhong = params.TrangThaiPhong;
      if (params.SapXepTheo) query.SapXepTheo = params.SapXepTheo;
      if (params.ThuTu) query.ThuTu = params.ThuTu;

      const resp = await API.get<LoaiPhongResponse[]>('/filter', { params: query });
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },
};

export default roomTypeService;
