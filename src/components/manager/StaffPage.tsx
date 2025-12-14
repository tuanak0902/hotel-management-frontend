import React, { useEffect, useRef, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import staffService, {
  CreateNhanVienRequest,
  FilterNhanVienRequest,
  NhanVienResponse,
  UpdateNhanVienRequest,
} from '../../services/staff.service';
import {stripDiacritics} from '../../helpers/helpers';

function formatDate(iso?: string | null) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString();
  } catch {
    return iso;
  }
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
const DEBOUNCE_MS = 400;

export function ManagerStaff(): React.JSX.Element {
  const [staff, setStaff] = useState<NhanVienResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // Modal / form state
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<NhanVienResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

// refs for search
const [query, setQuery] = useState<string>('');
const requestSeqRef = useRef(0);
const initialCacheRef = useRef<NhanVienResponse[] | null>(null);
const debouncedQuery = useDebounce(query, DEBOUNCE_MS);

  const [form, setForm] = useState({
    hoTen: '',
    chucVu: '',
    soDienThoai: '',
    cccd: '',
    email: '',
    diaChi: '',
    ngaySinh: '',
    luong: '',
  });

  useEffect(() => {
    mountedRef.current = true;
    loadAll();
    return () => {
      mountedRef.current = false;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
        const data = await staffService.getAll();
        if (!mountedRef.current) return;
        // filter out managers immediately after fetching
        const filtered = data.filter((s) => s.chucVu?.toLowerCase() !== 'quản lý');
        setStaff(filtered);
        } catch (e: any) {
        if (!mountedRef.current) return;
        setError(e?.message ?? String(e));
        } finally {
        if (!mountedRef.current) return;
        setLoading(false);
    }
  };

  // debouncedQuery comes from your search input with debounce logic
useEffect(() => {
  const q = (debouncedQuery ?? '').trim();
  const seq = ++requestSeqRef.current;

  (async () => {
    if (!q) {
      if (initialCacheRef.current) {
        setStaff(initialCacheRef.current.filter((s) => s.chucVu?.toLowerCase() !== 'quản lý'));
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const all = await staffService.getAll();
        if (!mountedRef.current) return;
        initialCacheRef.current = all;
        if (seq !== requestSeqRef.current) return;
        setStaff(all.filter((s) => s.chucVu?.toLowerCase() !== 'quản lý'));
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
      // client-side fallback search
      if (q.includes('@') || q.length > 0) {
        const all = initialCacheRef.current ?? (await staffService.getAll());
        initialCacheRef.current = initialCacheRef.current ?? all;
        if (seq !== requestSeqRef.current) return;

        const qNorm = stripDiacritics(q.toLowerCase());

        const filtered = all.filter((s) => {
          const email = (s.email ?? '').toLowerCase();
          const nameNorm = stripDiacritics((s.hoTen ?? '').toLowerCase());
          const phone = (s.soDienThoai ?? '').toLowerCase();
          const cccd = (s.cccd ?? '').toLowerCase();
          const role = stripDiacritics((s.chucVu ?? '').toLowerCase());

          return (
            nameNorm.includes(qNorm) ||
            email.includes(qNorm) ||
            phone.includes(qNorm) ||
            cccd.includes(qNorm) ||
            role.includes(qNorm)
          );
        });
        setStaff(filtered.filter((s) => s.chucVu?.toLowerCase() !== 'quản lý'));
        return;
      }

      // numeric heuristics for CCCD / phone
      const digits = q.replace(/\D/g, '');
      const originalAllDigits = /^\d+$/.test(q);

      if (originalAllDigits) {
        if (digits.length >= 9 && digits.length <= 12) {
          const data = await staffService.filter({ cccd: digits } as FilterNhanVienRequest);
          if (!mountedRef.current) return;
          if (seq !== requestSeqRef.current) return;
          setStaff(data.filter((s) => s.chucVu?.toLowerCase() !== 'quản lý'));
          return;
        }
        if (digits.length >= 3) {
          const data = await staffService.filter({ soDienThoai: digits } as FilterNhanVienRequest);
          if (!mountedRef.current) return;
          if (seq !== requestSeqRef.current) return;
          setStaff(data.filter((s) => s.chucVu?.toLowerCase() !== 'quản lý'));
          return;
        }
      }

      // default: search by name
      const data = await staffService.filter({ tenNhanVien: q } as FilterNhanVienRequest);
      if (!mountedRef.current) return;
      if (seq !== requestSeqRef.current) return;
      setStaff(data.filter((s) => s.chucVu?.toLowerCase() !== 'quản lý'));
    } catch (e: any) {
      if (!mountedRef.current) return;
      if (seq !== requestSeqRef.current) return;
      setError(e?.message ?? String(e));
    } finally {
      if (!mountedRef.current) return;
      if (seq !== requestSeqRef.current) return;
      setLoading(false);
    }
  })();
}, [debouncedQuery]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      hoTen: '',
      chucVu: '',
      soDienThoai: '',
      cccd: '',
      email: '',
      diaChi: '',
      ngaySinh: '',
      luong: '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (item: NhanVienResponse) => {
    setEditing(item);
    setForm({
      hoTen: item.hoTen ?? '',
      chucVu: item.chucVu ?? '',
      soDienThoai: item.soDienThoai ?? '',
      cccd: item.cccd ?? '',
      email: item.email ?? '',
      diaChi: item.diaChi ?? '',
      ngaySinh: item.ngaySinh ? new Date(item.ngaySinh).toISOString().slice(0, 10) : '',
      luong: item.luong != null ? String(item.luong) : '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const validateForm = (): string | null => {
    if (!form.hoTen.trim()) return 'Họ tên là bắt buộc.';
    if (!form.soDienThoai.trim()) return 'Số điện thoại là bắt buộc.';
    if (!form.cccd.trim()) return 'CCCD là bắt buộc.';
    if (!form.chucVu.trim()) return 'Chức vụ là bắt buộc.';
    if (!form.ngaySinh.trim()) return 'Ngày sinh là bắt buộc.';
    if (!form.luong.trim()) return 'Lương là bắt buộc.';
    const luongNum = Number(form.luong);
    if (Number.isNaN(luongNum) || luongNum < 0) return 'Lương phải là số hợp lệ lớn hơn hoặc bằng 0.';
    return null;
  };

  const handleSubmit = async () => {
    setFormError(null);
    const v = validateForm();
    if (v) {
      setFormError(v);
      return;
    }

    setSubmitting(true);
    try {
      const payloadCreate: CreateNhanVienRequest = {
        hoTen: form.hoTen.trim(),
        chucVu: form.chucVu.trim(),
        soDienThoai: form.soDienThoai.trim(),
        cccd: form.cccd.trim(),
        email: form.email?.trim() || null,
        diaChi: form.diaChi?.trim() || null,
        ngaySinh: new Date(form.ngaySinh).toISOString(),
        luong: Number(form.luong),
      };

      if (editing) {
        const payloadUpdate: UpdateNhanVienRequest = {
          hoTen: payloadCreate.hoTen,
          soDienThoai: payloadCreate.soDienThoai,
          email: payloadCreate.email,
          diaChi: payloadCreate.diaChi,
          ngaySinh: payloadCreate.ngaySinh,
          chucVu: payloadCreate.chucVu,
          luong: payloadCreate.luong,
        };
        const updated = await staffService.update(editing.maNhanVien, payloadUpdate);
        setStaff((prev) => prev.map((s) => (s.maNhanVien === updated.maNhanVien ? updated : s)));
      } else {
        const created = await staffService.create(payloadCreate);
        setStaff((prev) => [created, ...prev]);
      }

      setShowModal(false);
      setEditing(null);
    } catch (e: any) {
      setFormError(e?.message ?? String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (maNhanVien: number) => {
    if (!confirm('Bạn có chắc muốn xóa nhân viên này?')) return;
    try {
      await staffService.remove(maNhanVien);
      setStaff((prev) => prev.filter((s) => s.maNhanVien !== maNhanVien));
    } catch (e: any) {
      alert(e?.message ?? 'Xóa thất bại');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Quản lý Nhân viên</h1>

        <div className="flex items-center gap-3">
          <div className="relative w-80">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tên, CCCD, SĐT hoặc chức vụ"
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
            <Plus className="w-4 h-4" /> Thêm nhân viên
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-600">Đang tải...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : staff.length === 0 ? (
        <div className="text-gray-600">Không có nhân viên.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staff
          .map((s) => (
            <div key={s.maNhanVien} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium">{s.hoTen}</h3>
                  <p className="text-sm text-gray-600">Chức vụ: <span className="font-semibold">{s.chucVu}</span></p>
                  <p className="text-sm text-gray-600">SĐT: {s.soDienThoai}</p>
                  <p className="text-sm text-gray-600">CCCD: {s.cccd}</p>
                  {s.email && <p className="text-sm text-gray-600">Email: {s.email}</p>}
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Lương</div>
                  <div className="text-sm font-semibold">{s.luong != null ? `${s.luong?.toLocaleString()}₫`: '—'}</div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">Ngày sinh: {formatDate(s.ngaySinh)}</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(s)}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" /> Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(s.maNhanVien)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <h2 className="text-xl font-semibold mb-4">{editing ? 'Sửa nhân viên' : 'Thêm nhân viên'}</h2>

            {formError && <div className="mb-3 text-red-600">{formError}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Họ tên</label>
                <input
                  value={form.hoTen}
                  onChange={(e) => setForm((f) => ({ ...f, hoTen: e.target.value }))}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Nguyễn Văn A"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Chức vụ</label>
                    <select
                        value={form.chucVu}
                        onChange={(e) => setForm((f) => ({ ...f, chucVu: e.target.value }))}
                        className="w-full px-3 py-2 border rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">-- Chọn chức vụ --</option>
                        <option value="Lễ tân">Lễ tân</option>
                        <option value="Nhân viên">Nhân viên</option>
                    </select>
                </div>

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
                  placeholder="01234566789"
                />
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
                <label className="block text-sm text-gray-700 mb-1">Ngày sinh</label>
                <input
                  type="date"
                  value={form.ngaySinh}
                  onChange={(e) => setForm((f) => ({ ...f, ngaySinh: e.target.value }))}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Lương</label>
                <input
                  type="number"
                  min={0}
                  value={form.luong}
                  onChange={(e) => setForm((f) => ({ ...f, luong: e.target.value }))}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="₫"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditing(null);
                  setFormError(null);
                }}
                className="px-4 py-2 bg-gray-200 rounded"
                disabled={submitting}
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded"
                disabled={submitting}
              >
                {submitting ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Thêm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
