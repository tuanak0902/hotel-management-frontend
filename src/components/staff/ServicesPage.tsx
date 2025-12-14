import { useEffect, useState, useRef } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import serviceService, { DichVuResponse, CreateDichVuRequest, UpdateDichVuRequest } from '../../services/service.service';
import { formatMoney, stripDiacritics } from '../../helpers/helpers';

const DEBOUNCE_MS = 400;

/** lightweight debounce hook */
function useDebounce<T>(value: T, delay = DEBOUNCE_MS) {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function StaffServices() {
  const [services, setServices] = useState<DichVuResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState<DichVuResponse | null>(null);
  const [form, setForm] = useState<{
    tenDichVu: string;
    donVi: string;
    trangThai: string;
    donGia: number | '';
  }>({ tenDichVu: '', donVi: '', trangThai: 'Hoạt động', donGia: ''});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // search query state
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, DEBOUNCE_MS);

  // refs for request sequencing and caching
  const requestSeqRef = useRef(0);
  const initialCacheRef = useRef<DichVuResponse[] | null>(null);

  const mountedRef = useRef<boolean>(true);
    useEffect(() => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
      };
    }, []);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await serviceService.getAll(controller.signal);
        setServices(data);
      } catch (e: any) {
        // detect abort/cancel from different environments / axios
        if (
          e?.name === 'CanceledError' ||
          e?.name === 'AbortError' ||
          e?.code === 'ERR_CANCELED' ||
          e?.message === 'canceled'
        ) {
          return;
        }
        setError(e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
  const q = (debouncedQuery ?? '').trim();
  const seq = ++requestSeqRef.current;

  (async () => {
    if (!q) {
      if (initialCacheRef.current) {
        setServices(initialCacheRef.current);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const all = await serviceService.getAll();
        if (!mountedRef.current) return;
        initialCacheRef.current = all;
        if (seq !== requestSeqRef.current) return;
        setServices(all);
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
      const all = initialCacheRef.current ?? (await serviceService.getAll());
      initialCacheRef.current = initialCacheRef.current ?? all;
      if (seq !== requestSeqRef.current) return;

      const qNorm = stripDiacritics(q.toLowerCase());

      const filtered = all.filter((s) => {
        const nameNorm = stripDiacritics((s.tenDichVu ?? '').toLowerCase());
        const donVi = stripDiacritics((s.donVi ?? '').toLowerCase());
        const trangThai = stripDiacritics((s.trangThai ?? '').toLowerCase());
        const donGiaStr = String(s.donGia);

        return (
          nameNorm.includes(qNorm) ||
          donVi.includes(qNorm) ||
          trangThai.includes(qNorm) ||
          donGiaStr.includes(qNorm)
        );
      });

      setServices(filtered);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [debouncedQuery]);


  const handleDelete = async (maDichVu?: number) => {
    if (!maDichVu) return;
    if (!confirm('Bạn có chắc muốn xóa dịch vụ này không?')) return;
    try {
      await serviceService.remove(maDichVu);
      setServices((s) => s.filter((x) => x.maDichVu !== maDichVu));
    } catch (e: any) {
      alert(e?.message ?? 'Xóa thất bại');
    }
  };

  const openAddModal = () => {
    setEditingService(null);
    setForm({ tenDichVu: '', donVi: '', trangThai: 'Hoạt động', donGia: '' });
    setFormError(null);
    setShowAddModal(true);
  };

  const openEditModal = (svc: DichVuResponse) => {
    setEditingService(svc);
    setForm({
      tenDichVu: svc.tenDichVu ?? '',
      donVi: svc.donVi ?? '',
      trangThai: svc.trangThai ?? 'Hoạt động',
      donGia: svc.donGia ?? 0,
    });
    setFormError(null);
    setShowAddModal(true);
  };

  const handleSubmit = async () => {
    setFormError(null);
    // basic client validation
    if (!form.tenDichVu.trim()) return setFormError('Tên dịch vụ là bắt buộc.');
    if (!form.donVi.trim()) return setFormError('Đơn vị là bắt buộc.');
    if (!form.trangThai.trim()) return setFormError('Trạng thái là bắt buộc.');
    if (form.donGia === '' || Number.isNaN(Number(form.donGia))) return setFormError('Đơn giá hợp lệ là bắt buộc.');
    // length & range checks to match server DTO validation
    if (form.tenDichVu.length > 100) return setFormError('Tên dịch vụ không được quá 100 ký tự.');
    if (form.donVi.length > 50) return setFormError('Đơn vị không được quá 50 ký tự.');
    if (Number(form.donGia) < 0) return setFormError('Đơn giá không thể nhỏ hơn 0.');

    setSubmitting(true);
    try {
      if (editingService) {
        const payload: UpdateDichVuRequest = {
          tenDichVu: form.tenDichVu,
          donVi: form.donVi,
          trangThai: form.trangThai,
          donGia: Number(form.donGia),
        };
        const updated = await serviceService.update(editingService.maDichVu, payload);
        setServices((s) => s.map((x) => (x.maDichVu === updated.maDichVu ? updated : x)));
      } else {
        const payload: CreateDichVuRequest = {
          tenDichVu: form.tenDichVu,
          donVi: form.donVi,
          trangThai: form.trangThai,
          donGia: Number(form.donGia),
        };
        const created = await serviceService.create(payload);
        setServices((s) => [created, ...s]);
      }
      setShowAddModal(false);
    } catch (e: any) {
      // Try to surface useful server information
      const msg = e?.message ?? String(e);
      // If axios response body is available, prefer that (it may contain inner exception details)
      const respData = (e && e.response && e.response.data) ? e.response.data : null;
      if (respData) {
        try {
          if (typeof respData === 'string') setFormError(respData);
          else setFormError(JSON.stringify(respData));
        } catch {
          setFormError(msg);
        }
      } else {
        setFormError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Quản lý Dịch vụ</h1>
        <div className="flex items-center gap-3">
          <div className="relative w-80">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo dịch vụ, giá, trạng thái..."
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
          onClick={openAddModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Thêm dịch vụ
        </button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-600">Đang tải Dịch vụ...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <div key={service.maDichVu} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-gray-800">{service.tenDichVu}</h3>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Giá:</span>
                  <span className="text-gray-800">{formatMoney(service.donGia) ? `${formatMoney(service.donGia)} ₫/${service.donVi ?? ''}` : 'Free'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Trạng thái:</span>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">{service.trangThai ?? 'Hoạt động'}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => openEditModal(service)} className="flex-1 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition flex items-center justify-center gap-2">
                  <Edit className="w-4 h-4" />
                  Sửa
                </button>
                <button onClick={() => handleDelete(service.maDichVu)} className="flex-1 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition flex items-center justify-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Service Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">Thêm dịch vụ mới</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Tên dịch vụ</label>
                <input
                  value={form.tenDichVu}
                  onChange={(e) => setForm((f) => ({ ...f, tenDichVu: e.target.value }))}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ví dụ: Dịch vụ giặt ủi"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Đơn vị</label>
                <select
                  value={form.donVi}
                  onChange={(e) => setForm((f) => ({ ...f, donVi: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn đơn vị --</option>
                  <option value="Suất">Suất</option>
                  <option value="Kg">Kg</option>
                  <option value="Ngày">Ngày</option>
                  <option value="Giờ">Giờ</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Giá</label>
                <input
                  value={form.donGia}
                  onChange={(e) => setForm((f) => ({ ...f, donGia: e.target.value === '' ? '' : Number(e.target.value) }))}
                  type="number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Trạng thái</label>
                <select
                  value={form.trangThai}
                  onChange={(e) => setForm((f) => ({ ...f, trangThai: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Hoạt động">Hoạt động</option>
                  <option value="Ngưng hoạt động">Ngưng hoạt động</option>
                </select>
              </div>
              {formError && <div className="text-red-600">{formError}</div>}
            </div>
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {editingService ? (submitting ? 'Đang lưu...' : 'Lưu thay đổi') : submitting ? 'Đang thêm...' : 'Thêm dịch vụ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
