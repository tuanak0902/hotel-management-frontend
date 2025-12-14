// StaffCustomers.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import customerService, {
  KhachHangResponse,
  CreateKhachHangRequest,
  UpdateKhachHangRequest,
  FilterKhachHangRequest,
} from '../../services/customer.service';
import {stripDiacritics} from '../../helpers/helpers';

const DEBOUNCE_MS = 400;

/* ------------------ small helpers & hook ------------------ */

function normalizeDigits(s: string) {
  return s.replace(/\D/g, '');
}

function isAllDigits(s: string) {
  return /^\d+$/.test(s);
}

function formatStatus(s?: string | null) {
  return s ?? 'Hoạt động';
}

/** lightweight debounce hook */
function useDebounce<T>(value: T, delay = DEBOUNCE_MS) {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ------------------ component ------------------ */

export function StaffCustomers(): React.JSX.Element {
  const [customers, setCustomers] = useState<KhachHangResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<KhachHangResponse | null>(null);

  const [form, setForm] = useState({
    hoTen: '',
    soDienThoai: '',
    cccd: '',
    email: '',
    diaChi: '',
    trangThai: 'Hoạt động',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [query, setQuery] = useState<string>('');
  const debouncedQuery = useDebounce(query, DEBOUNCE_MS);

  // cache to avoid repeated getAll() calls (useful for email client-side filter)
  const initialCacheRef = useRef<KhachHangResponse[] | null>(null);

  // request sequence token to avoid race conditions
  const requestSeqRef = useRef<number>(0);

  // mounted flag to be safe
  const mountedRef = useRef<boolean>(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* ---------- initial load ---------- */
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const all = await customerService.getAll();
        if (!mountedRef.current) return;
        initialCacheRef.current = all;
        setCustomers(all);
      } catch (e: any) {
        if (!mountedRef.current) return;
        setError(e?.message ?? String(e));
      } finally {
        if (!mountedRef.current) return;
        setLoading(false);
      }
    })();
  }, []);

  /* ---------- search effect (debounced) ---------- */
  useEffect(() => {
    const q = (debouncedQuery ?? '').trim();

    // increment request token
    const seq = ++requestSeqRef.current;

    (async () => {
      // empty: return cached initial list or fetch once
      if (!q) {
        if (initialCacheRef.current) {
          setCustomers(initialCacheRef.current);
          return;
        }
        setLoading(true);
        setError(null);
        try {
          const all = await customerService.getAll();
          if (!mountedRef.current) return;
          initialCacheRef.current = all;
          // ignore if stale
          if (seq !== requestSeqRef.current) return;
          setCustomers(all);
        } catch (e: any) {
          if (!mountedRef.current) return;
          if (seq !== requestSeqRef.current) return;
          setError(e?.message ?? String(e));
        } finally {
          if (!mountedRef.current) return;
          if (seq !== requestSeqRef.current) return;
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      setError(null);

      try {
        // EMAIL or NAME fallback search (client side)
          if (q.includes('@') || q.length > 0) {
            const all = initialCacheRef.current ?? (await customerService.getAll());
            initialCacheRef.current = initialCacheRef.current ?? all;
            if (seq !== requestSeqRef.current) return;

            const qNorm = stripDiacritics(q.toLowerCase());

            const filtered = all.filter((c) => {
              const email = (c.email ?? '').toLowerCase();
              const nameNorm = stripDiacritics((c.hoTen ?? '').toLowerCase());
              const phone = (c.soDienThoai ?? '').toLowerCase();
              const cccd = (c.cccd ?? '').toLowerCase();

              return (
                nameNorm.includes(qNorm) ||         
                email.includes(qNorm) ||
                phone.includes(qNorm) ||
                cccd.includes(qNorm)
              );
            });
            setCustomers(filtered);
            return;
          }

        // Normalize and detect numeric patterns for CCCD / phone
        const digits = normalizeDigits(q);
        const originalAllDigits = isAllDigits(q);

        // If user typed only digits (no punctuation) consider length heuristics
        if (originalAllDigits) {
          // CCCD heuristic: typical length 9..12
          if (digits.length >= 9 && digits.length <= 12) {
            const data = await customerService.filter({ CCCD: digits } as FilterKhachHangRequest);
            if (!mountedRef.current) return;
            if (seq !== requestSeqRef.current) return;
            setCustomers(data);
            return;
          }

          // Phone heuristic: length >= 3 (allow short phone searches)
          if (digits.length >= 3) {
            const data = await customerService.filter({ SoDienThoai: digits } as FilterKhachHangRequest);
            if (!mountedRef.current) return;
            if (seq !== requestSeqRef.current) return;
            setCustomers(data);
            return;
          }
        } else {
          // Even if not strictly all digits, we may want to support typed phone with +84, spaces, etc.
          // If after normalization we have digits and length >=3, treat as phone
          if (digits.length >= 3 && digits.length === q.replace(/\s+/g, '').length) {
            const data = await customerService.filter({ SoDienThoai: digits } as FilterKhachHangRequest);
            if (!mountedRef.current) return;
            if (seq !== requestSeqRef.current) return;
            setCustomers(data);
            return;
          }
        }

        // Default: search by name
        const data = await customerService.filter({ TenKhachHang: q } as FilterKhachHangRequest);
        if (!mountedRef.current) return;
        if (seq !== requestSeqRef.current) return;
        setCustomers(data);
      } catch (e: any) {
        if (!mountedRef.current) return;
        // ignore stale responses
        if (seq !== requestSeqRef.current) return;
        setError(e?.message ?? String(e));
      } finally {
        if (!mountedRef.current) return;
        if (seq !== requestSeqRef.current) return;
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  /* ---------- modal helpers and CRUD ---------- */
  const openAdd = () => {
    setEditingCustomer(null);
    setForm({
      hoTen: '',
      soDienThoai: '',
      cccd: '',
      email: '',
      diaChi: '',
      trangThai: 'Hoạt động',
    });
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (c: KhachHangResponse) => {
    setEditingCustomer(c);
    setForm({
      hoTen: c.hoTen ?? '',
      soDienThoai: c.soDienThoai ?? '',
      cccd: c.cccd ?? '',
      email: c.email ?? '',
      diaChi: c.diaChi ?? '',
      trangThai: c.trangThai ?? 'Hoạt động',
    });
    setFormError(null);
    setShowModal(true);
  };

  const validateForm = (): string | null => {
    if (!form.hoTen.trim()) return 'Họ tên là bắt buộc.';
    if (form.hoTen.length > 100) return 'Họ tên không được vượt quá 100 ký tự.';
    if (!form.soDienThoai.trim()) return 'Số điện thoại là bắt buộc.';
    if (form.soDienThoai.length > 15) return 'Số điện thoại không được vượt quá 15 ký tự.';
    if (!editingCustomer) {
      if (!form.cccd.trim()) return 'CCCD là bắt buộc.';
      if (form.cccd.length > 12) return 'CCCD không được vượt quá 12 ký tự.';
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Email không hợp lệ.';
    if (!form.trangThai?.trim()) return 'Trạng thái là bắt buộc.';
    return null;
  };

  const handleSubmit = async () => {
    setFormError(null);
    const v = validateForm();
    if (v) return setFormError(v);

    setSubmitting(true);
    try {
      if (editingCustomer) {
        const payload: UpdateKhachHangRequest = {
          hoTen: form.hoTen,
          soDienThoai: form.soDienThoai,
          trangThai: form.trangThai,
          email: form.email || undefined,
          diaChi: form.diaChi || undefined,
        };
        const updated = await customerService.update(editingCustomer.maKhachHang, payload);
        setCustomers((prev) => prev.map((x) => (x.maKhachHang === updated.maKhachHang ? updated : x)));
      } else {
        const payload: CreateKhachHangRequest = {
          hoTen: form.hoTen,
          soDienThoai: form.soDienThoai,
          trangThai: form.trangThai,
          cccd: form.cccd,
          email: form.email || undefined,
          diaChi: form.diaChi || undefined,
        };
        const created = await customerService.create(payload);
        setCustomers((prev) => [created, ...prev]);
        // update cache too
        initialCacheRef.current = initialCacheRef.current ? [created, ...initialCacheRef.current] : [created];
      }
      setShowModal(false);
      setEditingCustomer(null);
    } catch (e: any) {
      const respData = e?.response?.data ?? null;
      if (respData) {
        try {
          if (typeof respData === 'string') setFormError(respData);
          else if (respData?.detail) setFormError(String(respData.detail));
          else if (respData?.errors) setFormError(JSON.stringify(respData.errors));
          else setFormError(JSON.stringify(respData));
        } catch {
          setFormError(e?.message ?? String(e));
        }
      } else {
        setFormError(e?.message ?? String(e));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (maKhachHang: number) => {
    if (!confirm('Bạn có chắc muốn xóa khách hàng này?')) return;
    try {
      await customerService.remove(maKhachHang);
      setCustomers((prev) => prev.filter((c) => c.maKhachHang !== maKhachHang));
      if (initialCacheRef.current) {
        initialCacheRef.current = initialCacheRef.current.filter((c) => c.maKhachHang !== maKhachHang);
      }
    } catch (e: any) {
      const resp = e?.response;
      if (resp?.status === 404) {
        const data = resp.data;
        alert(data?.detail ?? data?.title ?? 'Không tìm thấy khách hàng hoặc không thể xóa.');
      } else {
        alert(e?.message ?? 'Xóa thất bại');
      }
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Quản lý Khách hàng</h1>
        {/* Search bar */}
        <div className="flex items-center gap-3">
            <div className="relative w-80">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm theo tên, CCCD, SĐT, email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              {query && (
                <button
                type="button"
                  onClick={() => {
                    setQuery('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  aria-label="Clear search"
                >
                  <span className="text-lg font-bold">&times;</span>
                </button>
              )}
            
            </div>
        <button
          onClick={openAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Thêm khách hàng
        </button>
      </div>
      </div>

      {/* results region (aria-live for screen readers) */}
      <div aria-live="polite">
        {loading ? (
          <div className="text-gray-600">Đang tải...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : customers.length === 0 ? (
          <div className="text-gray-600">Không có khách hàng.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {customers.map((c) => (
              <div key={c.maKhachHang} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium">{c.hoTen}</h3>
                    <p className="text-sm text-gray-600">CCCD: {c.cccd}</p>
                    <p className="text-sm text-gray-600">SĐT: {c.soDienThoai}</p>
                  </div>

                  <div className="text-right">
                    <div className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                      {formatStatus(c.trangThai)}
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        onClick={() => openEdit(c)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" /> Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(c.maKhachHang)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" /> Xóa
                      </button>
                    </div>
                  </div>
                </div>
              <div className="mt-4 text-sm text-gray-600">{c.email}</div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
            <h2 className="text-xl font-semibold mb-4">{editingCustomer ? 'Sửa khách hàng' : 'Thêm khách hàng'}</h2>

            {formError && <div className="mb-3 text-red-600">{formError}</div>}

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Họ tên</label>
                <input
                  value={form.hoTen}
                  onChange={(e) => setForm((f) => ({ ...f, hoTen: e.target.value }))}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Nguyễn Văn A"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Số điện thoại</label>
                  <input
                    value={form.soDienThoai}
                    onChange={(e) => setForm((f) => ({ ...f, soDienThoai: e.target.value }))}
                    className="w-full px-3 py-2 border rounded"
                    placeholder="01234566789"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">CCCD</label>
                  <input
                    value={form.cccd}
                    onChange={(e) => setForm((f) => ({ ...f, cccd: e.target.value }))}
                    className="w-full px-3 py-2 border rounded"
                    disabled={!!editingCustomer}
                    placeholder="01234566789"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Email</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="nguyena@gmail.com"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Địa chỉ</label>
                <input
                  value={form.diaChi}
                  onChange={(e) => setForm((f) => ({ ...f, diaChi: e.target.value }))}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Trạng thái</label>
                <select
                  value={form.trangThai}
                  onChange={(e) => setForm((f) => ({ ...f, trangThai: e.target.value }))}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="Hoạt động">Hoạt động</option>
                  <option value="Ngưng hoạt động">Ngưng hoạt động</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingCustomer(null);
                  setFormError(null);
                }}
                className="px-4 py-2 bg-gray-200 rounded"
                disabled={submitting}
              >
                Hủy
              </button>
              <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded" disabled={submitting}>
                {submitting ? 'Đang lưu...' : editingCustomer ? 'Cập nhật' : 'Thêm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffCustomers;
