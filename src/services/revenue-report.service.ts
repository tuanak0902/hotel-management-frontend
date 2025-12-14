// src/services/revenue-report.service.ts
import axios, { AxiosInstance } from 'axios';

const BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:5054/api/baocaodoanhthus';

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

export interface RevenueReportResponse {
  nam: number;
  thang: number;
  doanhThu: number;
}

/* ---------- Service ---------- */

const revenueReportService = {
  // GET: all monthly revenue reports
  getAllMonthly: async (): Promise<RevenueReportResponse[]> => {
    try {
      // Note: controller route is /api/baocaodoanhthus/monthly
      const resp = await API.get<RevenueReportResponse[]>('/monthly');
      return resp.data;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },
};

export default revenueReportService;
