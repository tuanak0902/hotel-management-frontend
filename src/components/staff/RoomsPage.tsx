import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import roomService, {
  PhongResponse,
  CreatePhongRequest,
  UpdatePhongRequest,
  FilterPhongRequest,
} from '../../services/room.service';
import roomTypeService, { LoaiPhongResponse } from '../../services/room-type.service';

function formatStatus(s?: string | null) {
  return s ?? 'Trống';
}

export function StaffRooms(): React.JSX.Element {
  const [rooms, setRooms] = useState<PhongResponse[]>([]);
  const [roomTypes, setRoomTypes] = useState<LoaiPhongResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingRoom, setEditingRoom] = useState<PhongResponse | null>(null);

  const [form, setForm] = useState({
    soPhong: '',
    maLoaiPhong: '',
    trangThai: 'Trống',
    ghiChu: '',
    tenLoaiPhong: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [filter, setFilter] = useState<FilterPhongRequest>({ TrangThai: undefined, MaLoaiPhong: undefined });

  useEffect(() => {
    loadAll();
    loadRoomTypes();
  }, []);
  useEffect(() => {
  const fetchRooms = async () => {
    const data = await roomService.filter(filter);
    setRooms(data);
  };
  fetchRooms();
}, [filter]);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await roomService.getAll();
      setRooms(data);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const loadRoomTypes = async () => {
    try {
      const types = await roomTypeService.getAll();
      setRoomTypes(types);
    } catch {
      // non-blocking: if room types fail to load, user can still type MaLoaiPhong manually
      setRoomTypes([]);
    }
  };

  const openAdd = () => {
    setEditingRoom(null);
    setForm({ soPhong: '', maLoaiPhong: '', trangThai: 'Trống', ghiChu: '', tenLoaiPhong: '' });
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (r: PhongResponse) => {
    setEditingRoom(r);
    setForm({
      soPhong: r.soPhong ?? '',
      maLoaiPhong: '',
      trangThai: r.trangThai ?? 'Trống',
      ghiChu: r.ghiChu ?? '',
      tenLoaiPhong: r.tenLoaiPhong ?? '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const validateForm = (): string | null => {
    if (!form.soPhong.trim()) return 'Số phòng là bắt buộc.';
    if (!form.maLoaiPhong.toString().trim()) return 'Loại phòng là bắt buộc.';
    const ma = Number(form.maLoaiPhong);
    if (Number.isNaN(ma) || !Number.isInteger(ma) || ma <= 0) return 'Mã loại phòng phải là số nguyên dương.';
    if (form.trangThai && form.trangThai.length > 15) return 'Trạng thái không quá 15 ký tự.';
    return null;
  };

  const handleSubmit = async () => {
    setFormError(null);
    const v = validateForm();
    if (v) return setFormError(v);

    setSubmitting(true);
    try {
      const payloadCreate: CreatePhongRequest = {
        soPhong: form.soPhong,
        maLoaiPhong: Number(form.maLoaiPhong),
        trangThai: form.trangThai || undefined,
        ghiChu: form.ghiChu || undefined,
      };

      if (editingRoom) {
        const payloadUpdate: UpdatePhongRequest = {
          soPhong: form.soPhong,
          maLoaiPhong: Number(form.maLoaiPhong),
          trangThai: form.trangThai || undefined,
          ghiChu: form.ghiChu || undefined,
        };
        const updated = await roomService.update(editingRoom.maPhong, payloadUpdate);
        setRooms((prev) => prev.map((x) => (x.maPhong === updated.maPhong ? updated : x)));
      } else {
        const created = await roomService.create(payloadCreate);
        setRooms((prev) => [created, ...prev]);
      }

      setShowModal(false);
      setEditingRoom(null);
    } catch (e: any) {
        setFormError("Lưu phòng không thành công. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (maPhong: number) => {
    if (!confirm('Bạn có chắc muốn xóa phòng này?')) return;
    try {
      await roomService.remove(maPhong);
      setRooms((prev) => prev.filter((r) => r.maPhong !== maPhong));
    } catch (e: any) {
      alert('Xóa thất bại! Đang có đơn đặt hoặc khách đang ở trong phòng này.');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Quản lý Phòng</h1>

        <div className="flex items-center gap-3">
          {/* --- Filter by Loại phòng --- */}
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Loại phòng</label>
            <select
              value={filter.MaLoaiPhong ?? ''}
              onChange={(e) =>
                setFilter((f) => ({
                  ...f,
                  MaLoaiPhong: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              className="w-full px-3 py-2 border rounded">
              <option value="">-- Tất cả loại phòng --</option>
              {roomTypes.map((t) => (
                <option key={t.maLoaiPhong} value={String(t.maLoaiPhong)}>
                  {t.tenLoaiPhong} ({t.maLoaiPhong})
                </option>
              ))}
            </select>
          </div>

          {/* --- Filter by Trạng thái --- */}
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Trạng thái</label>
            <select
              value={filter.TrangThai ?? ''}
              onChange={(e) =>
                setFilter((f) => ({
                  ...f,
                  TrangThai: e.target.value || undefined,
                }))
              }
              className="w-full px-3 py-2 border rounded">
              <option value="">-- Tất cả trạng thái --</option>
              <option value="Trống">Trống</option>
              <option value="Đang dọn">Đang dọn</option>
              <option value="Đã đặt">Đã đặt</option>
              <option value="Đang ở">Đang ở</option>
              <option value="Bảo trì">Bảo trì</option>
            </select>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded">
            <Plus className="w-4 h-4" /> Thêm phòng
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-600">Đang tải...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : rooms.length === 0 ? (
        <div className="text-gray-600">Không có phòng.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((r) => (
            <div key={r.maPhong} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium">Phòng {r.soPhong}</h3>
                  <p className="inline-block py-1 rounded bg-purple-50 text-purple-600 text-sm">{r.tenLoaiPhong}</p>
                  <p className="text-sm text-gray-600">{r.ghiChu}</p>
                </div>
                <div className="text-right">
                  <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">{formatStatus(r.trangThai)}</div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(r)}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" /> Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(r.maPhong)}
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
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
            <h2 className="text-xl font-semibold mb-4">{editingRoom ? 'Sửa phòng' : 'Thêm phòng'}</h2>

            {formError && <div className="mb-3 text-red-600">{formError}</div>}

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Số phòng</label>
                <input
                  value={form.soPhong}
                  onChange={(e) => setForm((f) => ({ ...f, soPhong: e.target.value }))}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Mã loại phòng</label>
                  {editingRoom ? (
                  // Show read-only display when editing
                  <div className="w-full px-3 py-2 border rounded bg-gray-50 text-gray-700">
                    {editingRoom.tenLoaiPhong}
                  </div>
                ) : (
                  // Show combobox when not editing
                  <select
                    value={form.maLoaiPhong}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, maLoaiPhong: e.target.value }))
                    }
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">-- Chọn loại phòng --</option>
                    {roomTypes.map((t) => (
                      <option key={t.maLoaiPhong} value={String(t.maLoaiPhong)}>
                        {t.tenLoaiPhong} ({t.maLoaiPhong})
                      </option>
                    ))}
                  </select>
                )}
                  <div className="text-xs text-gray-500 mt-1">Nếu không thấy loại phòng, hãy tạo trước ở phần Loại phòng.</div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1">Trạng thái</label>
                  <select
                    value={form.trangThai}
                    onChange={(e) => setForm((f) => ({ ...f, trangThai: e.target.value }))}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="Trống">Trống</option>
                    <option value="Đang dọn">Đang dọn</option>
                    <option value="Đã đặt">Đã đặt</option>
                    <option value="Đang ở">Đang ở</option>
                    <option value="Bảo trì">Bảo trì</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  value={form.ghiChu}
                  onChange={(e) => setForm((f) => ({ ...f, ghiChu: e.target.value }))}
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingRoom(null);
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
                {submitting ? 'Đang lưu...' : editingRoom ? 'Cập nhật' : 'Thêm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
