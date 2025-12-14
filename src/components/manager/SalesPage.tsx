import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { DollarSign, TrendingUp, Calendar, CreditCard } from 'lucide-react';
import revenueReportService, { RevenueReportResponse } from '../../services/revenue-report.service';
import { formatMoney } from '../../helpers/helpers';
import { format } from 'path';
interface ChartData {
  monthKey: string;      // e.g. "2025-01"
  monthLabel: string;    // e.g. "Jan"
  revenue: number;       // sum of DoanhThu for that month
  bookings: number;      // count of items for that month
}

const monthNames = [
  'T1', 'T2', 'T3', 'T4', 'T5', 'T6',
  'T7', 'T8', 'T9', 'T10', 'T11', 'T12',
];

// Utility: build YYYY-MM key
function toMonthKey(nam: number, thang: number): string {
  const m = String(thang).padStart(2, '0');
  return `${nam}-${m}`;
}

export function ManagerSales() {
  const [rawReports, setRawReports] = useState<RevenueReportResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      setError(null);
      try {
        const reports = await revenueReportService.getAllMonthly();
        setRawReports(reports);
      } catch (e: any) {
        setError(e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  // Aggregate by month-year: bookings = count of items, revenue = sum of DoanhThu
  const monthlySales: ChartData[] = useMemo(() => {
    if (!rawReports.length) return [];

    // Group map: monthKey -> { revenue, bookings, label }
    const filtered = rawReports.filter((r) => r.nam === currentYear);

    const map = new Map<string, { revenue: number; bookings: number; label: string }>();

    for (const r of filtered) {
      const key = toMonthKey(r.nam, r.thang);
      const label = monthNames[(r.thang - 1 + 12) % 12] ?? `M${r.thang}`;
      const existing = map.get(key);
      if (existing) {
        existing.revenue += r.doanhThu;
        existing.bookings += 1;
      } else {
        map.set(key, { revenue: r.doanhThu, bookings: 1, label });
      }
    }

    // Sort by chronological order (key is YYYY-MM)
    const sortedKeys = Array.from(map.keys()).sort();

    return sortedKeys.map((k) => {
      const { revenue, bookings, label } = map.get(k)!;
      return {
        monthKey: k,
        monthLabel: label,
        revenue,
        bookings,
      };
    });
  }, [rawReports]);

  if (loading) return <div className="p-6">Đang tải dữ liệu...</div>;
  if (error) return <div className="p-6 text-red-600">Đã xảy ra lỗi! Vui lòng thử lại...</div>;

  // Metrics
  const totalRevenue = monthlySales.reduce((sum, m) => sum + m.revenue, 0);

  // Growth vs previous month (chronologically last two)
  const currentMonth = monthlySales[monthlySales.length - 1];
  const previousMonth = monthlySales[monthlySales.length - 2];
  const revenueGrowth =
  currentMonth && previousMonth && previousMonth.revenue !== 0
    ? parseFloat(
        (
          ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue) *
          100
        ).toFixed(1)
      )
    : 0;
  // Current month bookings: count items whose Nam/Thang match now
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;

  const currentMonthRevenue = rawReports
    .filter((r) => r.nam === nowYear && r.thang === nowMonth)
    .reduce((sum, r) => sum + r.doanhThu, 0);
  return (
    <div>
      <h1 className="text-gray-800 mb-6 text-2xl font-semibold">Báo cáo & Phân tích Doanh thu</h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600">Tổng doanh thu</p>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-gray-900">{totalRevenue.toLocaleString()}₫</p>
          <p className="text-green-600 text-sm mt-2">Năm {nowYear}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600">Doanh thu tháng {nowMonth}</p>
            <TrendingUp className="w-8 h-8 text-orange-600" />
          </div>
          <p className="text-gray-900">{formatMoney(currentMonthRevenue)}₫</p>
          <p className="text-gray-600 text-sm mt-2"></p>
          <p className="text-green-600 text-sm mt-2">+{formatMoney(revenueGrowth)}% so với tháng trước</p>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-gray-800 mb-6">Doanh thu tháng của năm {nowYear}</h2>
        <div className="flex justify-center">
          <div className="h-80 w-full max-w-4xl">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySales.map((m) => ({ month: m.monthLabel, revenue: m.revenue }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis  tick={{ fontSize: 12 }} tickFormatter={(value) => formatMoney(value) + '₫' 
                } />
                <Tooltip
                  formatter={(value: number) => `${formatMoney(value)}₫`}
                  contentStyle={{ borderRadius: '8px' }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
