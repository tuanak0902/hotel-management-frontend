import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import roomTypeService, {
  LoaiPhongResponse,
  UpdateLoaiPhongRequest,
  CreateLoaiPhongRequest,
} from '../../services/room-type.service';
import { formatMoney } from'../../helpers/helpers.ts';

export function StaffRoomTypes() {
  const [roomTypes, setRoomTypes] = useState<LoaiPhongResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editing, setEditing] = useState<LoaiPhongResponse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // form state for add modal
  const [form, setForm] = useState({
    tenLoaiPhong: '',
    moTa: '',
    trangThai: 'Hoạt động',
    giaTheoDem: '',
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await roomTypeService.getAll();
        if (mounted) setRoomTypes(data);
      } catch (e: any) {
        if (mounted) setError(e?.message ?? String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const openAddModal = () => {
    setForm({ tenLoaiPhong: '', moTa: '', trangThai: 'Hoạt động', giaTheoDem: '' });
    setFormError(null);
    setShowAddModal(true);
  };
  const handleSubmit = async () => {
  setFormError(null);

  // basic client validation
  if (!form.tenLoaiPhong.trim()) return setFormError('Tên loại phòng là bắt buộc.');
  if (!form.trangThai.trim()) return setFormError('Trạng thái là bắt buộc.');
  if (form.giaTheoDem === '' || Number.isNaN(Number(form.giaTheoDem))) {
    return setFormError('Giá theo đêm hợp lệ là bắt buộc.');
  }

  // length & range checks to match server DTO validation
  if (form.tenLoaiPhong.length > 100) {
    return setFormError('Tên loại phòng không được quá 100 ký tự.');
  }
  if (Number(form.giaTheoDem) < 0) {
    return setFormError('Giá theo đêm không thể nhỏ hơn 0.');
  }

  setSubmitting(true);
  try {
    if (editing) {
      // update existing
      const payload: UpdateLoaiPhongRequest = {
        tenLoaiPhong: form.tenLoaiPhong,
        moTa: form.moTa || undefined,
        trangThai: form.trangThai,
        giaTheoDem: Number(form.giaTheoDem),
      };
      const updated = await roomTypeService.update(editing.maLoaiPhong, payload);
      setRoomTypes((prev) =>
        prev.map((x) => (x.maLoaiPhong === updated.maLoaiPhong ? updated : x))
      );
    } else {
      // create new
      const payload: CreateLoaiPhongRequest = {
        tenLoaiPhong: form.tenLoaiPhong,
        moTa: form.moTa || undefined,
        trangThai: form.trangThai,
        giaTheoDem: Number(form.giaTheoDem),
      };
      const created = await roomTypeService.create(payload);
      setRoomTypes((prev) => [created, ...prev]);
    }
    setShowAddModal(false);
    setEditing(null);
  } catch (e: any) {
    alert("Không thể thêm loại phòng này!");
  } finally {
    setSubmitting(false);
  }
};

  // open edit modal and populate form
  const openEditModal = (rt: LoaiPhongResponse) => {
    setEditing(rt);
    setForm({
      tenLoaiPhong: rt.tenLoaiPhong ?? '',
      moTa: rt.moTa ?? '',
      trangThai: rt.trangThai ?? 'Hoạt động',
      giaTheoDem: String(rt.giaTheoDem ?? 0),
    });
    setShowAddModal(true);
    setFormError(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa loại phòng này?')) return;
    try {
      await roomTypeService.remove(id);
      setRoomTypes((prev) => prev.filter((p) => p.maLoaiPhong !== id));
    } catch (e: any) {
      // Axios error shape: e.response?.status and e.response?.data
      const resp = e?.response;
      if (resp?.status === 404) {
        // Backend says Not Found or deletion blocked
        // Try to extract a readable message from ProblemDetails
        const data = resp.data;
        if (data?.title && data?.status) {
          // Example: ProblemDetails with title "Not Found" and maybe errors
          alert(data.detail ?? data.title ?? 'Không thể xóa loại phòng này.');
        } else if (typeof data === 'string') {
          alert(data);
        } else {
          alert('Không thể xóa loại phòng này. Có thể còn phòng thuộc loại này.');
        }
      } else if (resp?.status === 409) {
        // Conflict is a better semantic code for FK or business rule
        alert(resp.data?.detail ?? 'Không thể xóa do ràng buộc dữ liệu.');
      } else {
        alert(e?.message ?? 'Delete failed');
      }
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Quản lý Loại phòng</h1>
        <button
          onClick={openAddModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Thêm loại phòng
        </button>
      </div>

      {loading ? (
        <div className="text-gray-600">Đang tải loại phòng...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {roomTypes.map((roomType) => (
            <div key={roomType.maLoaiPhong} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-gray-800">{roomType.tenLoaiPhong}</h2>
                  <p className="text-gray-600">{roomType.moTa}</p>
                </div>
                <div className="text-blue-600">{formatMoney(roomType.giaTheoDem)} ₫</div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Trạng thái:</span>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">{roomType.trangThai ?? 'Hoạt động'}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => openEditModal(roomType)}
                  className="flex-1 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-200 transition flex items-center justify-center gap-2">
                  <Edit className="w-4 h-4" />
                  Sửa
                </button>
                <button
                  onClick={() => handleDelete(roomType.maLoaiPhong)}
                  className="flex-1 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Room Type Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-gray-800 mb-6">{editing ? 'Sửa loại phòng' : 'Thêm loại phòng'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2">Tên loại phòng</label>
                <input
                  value={form.tenLoaiPhong}
                  onChange={(e) => setForm((f) => ({ ...f, tenLoaiPhong: e.target.value }))}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Family Suite"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">Mô tả</label>
                <textarea
                  value={form.moTa}
                  onChange={(e) => setForm((f) => ({ ...f, moTa: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Mô tả loại phòng..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-gray-700 mb-2">Giá (VNĐ)</label>
                  <input
                    value={form.giaTheoDem}
                    onChange={(e) => setForm((f) => ({ ...f, giaTheoDem: e.target.value }))}
                    type="number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="199000"
                  />
                </div>
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
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                disabled={submitting}
              >
                {editing ? (submitting ? 'Đang lưu...' : 'Lưu thay đổi') : submitting ? 'Đang thêm...' : 'Thêm loại phòng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
