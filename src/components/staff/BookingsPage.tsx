import React, { useEffect, useState, useRef } from 'react';
import bookingService, {
  DatPhongListResponse,
  DatPhongResponse,
  CreateDatPhongRequest,
} from '../../services/booking.service';
import { FileText, RefreshCcw, X } from 'lucide-react';
import roomService, { PhongResponse } from '../../services/room.service';
import roomTypeService, { LoaiPhongResponse } from '../../services/room-type.service';
import invoiceService, { HoaDonDetailResponse, ChiTietHoaDonResponse, UpdateHoaDonRequest } from '../../services/invoice.service';
import invoiceDetailService, { CreateChiTietHoaDonRequest } from '../../services/invoice-detail.service';
import customerService, { KhachHangResponse } from '../../services/customer.service';
import serviceService, {DichVuResponse} from '../../services/service.service';
import { stripDiacritics, formatMoney, formatDate, formatTime } from '../../helpers/helpers';


export function StaffBookings(): React.JSX.Element {
  const [bookings, setBookings] = useState<DatPhongListResponse[]>([]);
  const [rooms, setRooms] = useState<PhongResponse[]>([]);
  const [roomTypes, setRoomTypes] = useState<LoaiPhongResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmPay, setShowConfirmPay] = useState(false);
  const [confirmBookingId, setConfirmBookingId] = useState<number | null>(null);

  // Add booking modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBooking, setNewBooking] = useState<Partial<CreateDatPhongRequest>>({
    maKhachHang: undefined,
    maPhong: undefined,
    ngayNhanPhong: '',
    ngayTraPhong: '',
    trangThai: 'Đã đặt',
    ghiChu: '',
  });

  // Invoice modal state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<HoaDonDetailResponse | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  // Add invoice detail form
  const [addingDetail, setAddingDetail] = useState(false);
  const [newDetail, setNewDetail] = useState<{ maDichVu?: number; soLuong?: number; donGia?: number; moTa?: string }>({
    maDichVu: undefined,
    soLuong: 1,
    donGia: 0,
    moTa: '',
  });

  // search query state
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // refs for request sequencing and caching
  const requestSeqRef = useRef(0);
  const mountedRef = useRef(true);
  const initialCacheRef = useRef<DatPhongListResponse[] | null>(null);
  const [customers, setCustomers] = useState<KhachHangResponse[]>([]);
  const [services, setServices] = useState<DichVuResponse[]>([]);

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const data = await customerService.getAll();
        setCustomers(data);
      } catch (err) {
        console.error('Lỗi khi tải danh sách khách hàng:', err);
      }
    };
    loadCustomers();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const loadServices = async () => {
      try {
        const data = await serviceService.getAll(controller.signal);
        setServices(data);
      } catch (err) {
        console.error("Lỗi khi tải dịch vụ:", err);
      }
    };
    loadServices();
    return () => controller.abort();
  }, []);
  // cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // debounce effect (simple example: 300ms delay)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

    useEffect(() => {
      loadAll();
    }, []);

  // debounce effect (simple example: 300ms delay)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);


  useEffect(() => {
    loadAll();
    loadRooms();
    loadRoomTypes();
  }, []);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const data = await bookingService.getAll();
      setBookings(data);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadRooms() {
    try {
      const data = await roomService.getAll();
      setRooms(data);
    } catch (err) {
      // ignore silently or set error
      console.error('loadRooms', err);
    }
  }

  async function loadRoomTypes() {
    try {
      const data = await roomTypeService.getAll();
      setRoomTypes(data);
    } catch (err) {
      console.error('loadRoomTypes', err);
    }
  }

  function findRoomName(maPhong?: number) {
    const r = rooms.find((x) => x.maPhong === maPhong);
    return r?.soPhong ?? '-';
  }

  /* ---------- search effect (debounced) ---------- */
  useEffect(() => {
    const q = (debouncedQuery ?? '').trim();

    // increment request token
    const seq = ++requestSeqRef.current;

    (async () => {
      // empty: return cached initial list or fetch once
      if (!q) {
        if (initialCacheRef.current) {
          setBookings(initialCacheRef.current);
          return;
        }
        setLoading(true);
        setError(null);
        try {
          const all = await bookingService.getAll();
          if (!mountedRef.current) return;
          initialCacheRef.current = all;
          if (seq !== requestSeqRef.current) return;
          setBookings(all);
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
        // fallback search client-side
        const all = initialCacheRef.current ?? (await bookingService.getAll());
        initialCacheRef.current = initialCacheRef.current ?? all;
        if (seq !== requestSeqRef.current) return;

        const qNorm = stripDiacritics(q.toLowerCase());

        const filtered = all.filter((b) => {
          const nameNorm = stripDiacritics((b.tenKhachHang ?? '').toLowerCase());
          const phone = (b.soDienThoai ?? '').toLowerCase();
          const room = (b.tenPhong ?? '').toLowerCase();
          const roomType = stripDiacritics((b.loaiPhong ?? '').toLowerCase());
          const status = stripDiacritics((b.trangThai ?? '').toLowerCase());

          return (
            nameNorm.includes(qNorm) ||
            phone.includes(qNorm) ||
            room.includes(qNorm) ||
            roomType.includes(qNorm) ||
            status.includes(qNorm)
          );
        });

        setBookings(filtered);
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

  // Add booking handlers
  function openAddModal() {
    setNewBooking({
      maKhachHang: undefined,
      maPhong: rooms.length ? rooms[0].maPhong : undefined,
      ngayNhanPhong: '',
      ngayTraPhong: '',
      trangThai: 'Đã đặt',
      ghiChu: '',
    });
    setShowAddModal(true);
  }
  const handleUpdateStatus = async (maDatPhong: number) => {
  try {
    await bookingService.updateStatus(maDatPhong, {
      trangThai: "Đang ở", // or "Đang ở", or whatever new status you want
    });

    // Update local state (if using bookings array)
    setBookings((prev) =>
      prev.map((b) =>
        b.maDatPhong === maDatPhong ? { ...b, trangThai: "Đang ở" } : b
      )
    );
  } catch (err:any) {
    alert(err?.message ?? String(err));
  }
};
  async function submitAddBooking() {
    if (!newBooking.maKhachHang || !newBooking.maPhong || !newBooking.ngayNhanPhong || !newBooking.ngayTraPhong) {
      alert('Vui lòng điền đầy đủ thông tin: mã khách hàng, phòng, ngày nhận và ngày trả.');
      return;
    }
    try {
      setLoading(true);
      const payload: CreateDatPhongRequest = {
        maKhachHang: Number(newBooking.maKhachHang),
        maPhong: Number(newBooking.maPhong),
        ngayNhanPhong: newBooking.ngayNhanPhong!,
        ngayTraPhong: newBooking.ngayTraPhong!,
        trangThai: newBooking.trangThai ?? 'Đã đặt',
        ghiChu: newBooking.ghiChu ?? null,
      };
      await bookingService.create(payload);
      setShowAddModal(false);
      await loadAll();
      alert('Tạo đặt phòng thành công.');
    } catch (err: any) {
      alert(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  // Invoice handlers
  async function openInvoiceForBooking(maDatPhong: number) {
    setInvoiceLoading(true);
    setShowInvoiceModal(true);
    setCurrentInvoice(null);
    try {
      // We need to get booking details to find maHoaDon
      const booking = await bookingService.getById(maDatPhong);
      const maHoaDon = booking.hoaDon?.maHoaDon;
      if (!maHoaDon) {
        alert('Đặt phòng này chưa có hóa đơn.');
        setShowInvoiceModal(false);
        return;
      }
      const inv = await invoiceService.getById(maHoaDon);

      const normalized = inv.chiTietHoaDons.map((raw: any) => {
        const id = raw.maChiTietHoaDon ?? raw.maChiTietHD ?? `ct-${Math.random()}`;
        const soLuong = Number(raw.soLuong ?? 0);
        const donGia = Number(raw.donGia ?? 0);
        const thanhTien = Number(raw.thanhTien ?? soLuong * donGia);
        return {
          ...raw,
          maChiTietHoaDon: id,
          soLuong,
          donGia,
          thanhTien,
        };
      });

      setCurrentInvoice({ ...inv, chiTietHoaDons: normalized });
    } catch (err: any) {
      alert('Lỗi khi tải hóa đơn: ' + (err?.message ?? String(err)));
      setShowInvoiceModal(false);
    } finally {
      setInvoiceLoading(false);
    }
  }

  async function submitAddInvoiceDetail() {
    if (!currentInvoice) return;
    if (!newDetail.maDichVu || !newDetail.soLuong || newDetail.donGia === undefined) {
      alert('Vui lòng điền mã dịch vụ, số lượng và đơn giá.');
      return;
    }
    const payload: CreateChiTietHoaDonRequest = {
      maHoaDon: currentInvoice.maHoaDon,
      maDichVu: Number(newDetail.maDichVu),
      soLuong: Number(newDetail.soLuong),
      donGia: Number(newDetail.donGia),
      moTa: newDetail.moTa ?? null,
    };
    try {
      setInvoiceLoading(true);
      await invoiceDetailService.create(payload);
      // refresh invoice
      const inv = await invoiceService.getById(currentInvoice.maHoaDon);
      setCurrentInvoice(inv);
      setAddingDetail(false);
      setNewDetail({ maDichVu: undefined, soLuong: 1, donGia: 0, moTa: '' });
      alert('Thêm chi tiết hóa đơn thành công.');
    } catch (err: any) {
      alert('Lỗi khi thêm chi tiết: ' + (err?.message ?? String(err)));
    } finally {
      setInvoiceLoading(false);
    }
  }

  return (
    <div>
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Quản lý đặt phòng</h1>
        <div className="flex items-center gap-3">
          <div className="relative w-80">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo khách hàng, phòng, trạng thái..."
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
            + Thêm đặt phòng
          </button>
          <button
            onClick={() => {
              setQuery('');  
              loadAll();      
            }}
            className="bg-gray-100 text-gray-800 px-3 py-2 rounded border"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {error && <div className="mb-4 text-red-600">Lỗi: {error}</div>}

      <div className="bg-white shadow rounded overflow-hidden">
  <table className="min-w-full divide-y table-fixed">
    <colgroup>
      <col /> {/* Khách hàng */}
      <col /> {/* Phòng */}
      <col /> {/* Trạng thái */}
      <col /> {/* Nhận phòng */}
      <col /> {/* Trả phòng */}
      <col className="w-40" /> {/* Hành động (fixed width) */}
    </colgroup>

    <thead className="bg-gray-50">
      <tr>
        <th className="px-4 py-4 text-left text-sm font-medium text-gray-600">Khách hàng</th>
        <th className="px-4 py-4 text-left text-sm font-medium text-gray-600">Phòng</th>
        <th className="px-4 py-4 text-left text-sm font-medium text-gray-600">Trạng thái</th>
        <th className="px-4 py-4 text-left text-sm font-medium text-gray-600">Nhận phòng</th>
        <th className="px-4 py-4 text-left text-sm font-medium text-gray-600">Trả phòng</th>
        <th className="px-4 py-4 justify-center text-sm font-medium text-gray-600">Xem</th>
      </tr>
    </thead>

    <tbody className="bg-white divide-y">
      {loading ? (
        <tr>
          <td colSpan={6} className="px-4 py-6 text-center text-gray-500">Đang tải...</td>
        </tr>
      ) : bookings.length === 0 ? (
        <tr>
          <td colSpan={6} className="px-4 py-6 text-center text-gray-500">Không có đặt phòng</td>
        </tr>
      ) : (
        bookings.map((b) => (
          <tr key={b.maDatPhong}>
            <td className="px-4 py-4 align-top">
              <div className="text-sm font-medium text-gray-900">{b.tenKhachHang ?? 'Khách lạ'}</div>
              <div className="text-xs text-gray-500">{b.soDienThoai ?? '-'}</div>
            </td>

            <td className="px-4 py-4 align-top">
              <div className="text-sm text-gray-900">{b.tenPhong ?? findRoomName(undefined)}</div>
              <div className="text-xs text-gray-500">{b.loaiPhong ?? '-'}</div>
            </td>

            <td className="px-4 py-4 align-top">
              <button
                onClick={() => {
                  if (b.trangThai !== 'Đang ở') {
                    setConfirmBookingId(b.maDatPhong);
                  }
                }}
                className={`inline-block px-2 py-1 text-xs rounded transition
                  ${
                    b.trangThai === 'Đang ở'
                      ? 'bg-green-100 text-green-800'
                      : b.trangThai === 'Đã hủy'
                      ? 'bg-red-100 text-red-800 hover:bg-red-200'
                      : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                  }`}
                >
                {b.trangThai ?? '-'}
              </button>

            </td>

            <td className="px-4 py-4 align-top">
              <div className="text-sm text-gray-900">{formatDate(b.ngayNhanPhong)}</div>
              <div className="text-xs text-gray-500">{formatTime(b.ngayNhanPhong)}</div>
            </td>

            <td className="px-4 py-4 align-top">
              <div className="text-sm text-gray-900">{formatDate(b.ngayTraPhong)}</div>
              <div className="text-xs text-gray-500">{formatTime(b.ngayTraPhong)}</div>
            </td>

            <td className="px-4 py-4 align-top text-right">
              <div className="inline-flex items-center justify-end gap-2 w-full">
                <button
                  onClick={() => openInvoiceForBooking(b.maDatPhong)}
                  className="flex items-center gap-2 text-sm bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 whitespace-nowrap w-full"
                >
                  <FileText className="w-4 h-4" />
                  Hóa đơn
                </button>
              </div>
            </td>
          </tr>
        ))
      )}
    </tbody>
  </table>
</div>

      {confirmBookingId && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded shadow-lg p-6 w-full max-w-sm">
          <p className="mb-4">Bạn có chắc muốn thay đổi trạng thái thành "Đang ở" này?</p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmBookingId(null)}
              className="px-3 py-1 border rounded"
            >
              Hủy
            </button>
            <button
              onClick = { () => {
                handleUpdateStatus(confirmBookingId);
                setConfirmBookingId(null);
              }}
              className="px-3 py-1 bg-blue-600 text-white rounded"
            >
              Xác nhận
            </button>
          </div>
        </div>
      </div>
    )}

      {/* Add Booking Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowAddModal(false)} />
          <div className="bg-white rounded shadow-lg z-50 w-full max-w-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Thêm đặt phòng</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div>
                  <label className="block text-sm text-gray-700">Khách hàng</label>
                  <select
                    value={newBooking.maKhachHang ?? ''}
                    onChange={(e) =>
                      setNewBooking({ ...newBooking, maKhachHang: Number(e.target.value) })
                    }
                    className="mt-1 block w-full border rounded px-3 py-2"
                  >
                    <option value="">-- Chọn khách hàng --</option>
                    {customers.map((c) => (
                      <option key={c.maKhachHang} value={c.maKhachHang}>
                        {c.hoTen ?? `Khách ${c.maKhachHang}`} ({c.soDienThoai ?? 'Không SĐT'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-700">Phòng</label>
                <select
                  value={newBooking.maPhong ?? ''}
                  onChange={(e) => setNewBooking({ ...newBooking, maPhong: Number(e.target.value) })}
                  className="mt-1 block w-full border rounded px-3 py-2"
                >
                  <option value="">-- Chọn phòng --</option>
                  {rooms.map((r) => (
                    <option key={r.maPhong} value={r.maPhong}>
                      {r.soPhong ?? `#${r.maPhong}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700">Ngày nhận phòng</label>
                <input
                  type="date"
                  value={newBooking.ngayNhanPhong ?? ''}
                  onChange={(e) => setNewBooking({ ...newBooking, ngayNhanPhong: e.target.value })}
                  className="mt-1 block w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700">Ngày trả phòng</label>
                <input
                  type="date"
                  value={newBooking.ngayTraPhong ?? ''}
                  onChange={(e) => setNewBooking({ ...newBooking, ngayTraPhong: e.target.value })}
                  className="mt-1 block w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700">Trạng thái</label>
                <select
                  value={newBooking.trangThai ?? 'Đã đặt'}
                  onChange={(e) => setNewBooking({ ...newBooking, trangThai: e.target.value })}
                  className="mt-1 block w-full border rounded px-3 py-2"
                >
                  <option>Đã đặt</option>
                  <option>Đang ở</option>
                  <option>Đã hủy</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-700">Ghi chú</label>
                <input
                  type="text"
                  value={newBooking.ghiChu ?? ''}
                  onChange={(e) => setNewBooking({ ...newBooking, ghiChu: e.target.value })}
                  className="mt-1 block w-full border rounded px-3 py-2"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded border"
              >
                Hủy
              </button>
              <button
                onClick={submitAddBooking}
                className="px-4 py-2 rounded bg-blue-600 text-white"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => setShowInvoiceModal(false)} />
          <div className="bg-white rounded shadow-lg z-50 w-full max-w-3xl p-6 overflow-auto max-h-[80vh]">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold">Hóa đơn</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-3 py-1 border rounded bg-gray-300 hover:bg-red-500 text-black hover:text-white"
                >
                  <X className="w-4 h-4"/>
                </button>
              </div>
            </div>

            {invoiceLoading ? (
              <div className="mt-6 text-gray-600">Đang tải hóa đơn...</div>
            ) : currentInvoice ? (
              <div className="mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Mã hóa đơn</div>
                    <div className="font-medium">{currentInvoice.maHoaDon}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Mã đặt phòng</div>
                    <div className="font-medium">{currentInvoice.maDatPhong}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Ngày lập</div>
                    <div className="font-medium">{formatDate(currentInvoice.ngayLap)} {formatTime(currentInvoice.ngayLap)}</div>
                  </div>
                  <div>
                    <div
                    className={`font-medium px-3 py-1 rounded inline-block ${
                      currentInvoice.trangThaiThanhToan === "Đã thanh toán"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {currentInvoice.trangThaiThanhToan === "Đã thanh toán"
                      ? "Đã thanh toán"
                      : currentInvoice.trangThaiThanhToan ?? "-"}
                  </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Khách hàng</div>
                    <div className="font-medium">{currentInvoice.tenKhachHang ?? '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Phòng</div>
                    <div className="font-medium">{currentInvoice.soPhong ?? '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Tổng tiền</div>
                    <div className="font-medium">{currentInvoice.tongTien?.toLocaleString() ?? '0'}</div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="font-semibold mb-2">Chi tiết hóa đơn</h3>
                  <div className="bg-gray-50 rounded border">
                    <table className="min-w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          {/* <th className="px-3 py-2 text-left text-xs text-gray-600">Mã CT</th> */}
                          <th className="px-3 py-2 text-left text-xs text-gray-600">Tên dịch vụ</th>
                          <th className="px-3 py-2 text-right text-xs text-gray-600">Số lượng</th>
                          <th className="px-3 py-2 text-right text-xs text-gray-600">Đơn giá</th>
                          <th className="px-3 py-2 text-right text-xs text-gray-600">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentInvoice.chiTietHoaDons?.length ? (
                          currentInvoice.chiTietHoaDons.map((ct) => {
                            const id = (ct as any).maChiTietHoaDon ?? (ct as any).maChiTietHD ?? 'unknown';
                            const soLuong = (ct as any).soLuong ?? 0;
                            const donGia = (ct as any).donGia ?? 0;
                            const thanhTien = (ct as any).thanhTien ?? (soLuong * donGia);

                            return (
                              <tr key={id}>
                                {/* <td className="px-3 py-2 text-sm">{id}</td> */}
                                <td className="px-3 py-2 text-sm">{(ct as any).tenDichVu ?? '-'}</td>
                                <td className="px-3 py-2 text-sm text-right">{soLuong}</td>
                                <td className="px-3 py-2 text-sm text-right">{formatMoney(donGia)}</td>
                                <td className="px-3 py-2 text-sm text-right">{formatMoney(thanhTien)}</td>
                              </tr>
                            );
                          })
                        ): (
                          <tr>
                            <td colSpan={5} className="px-3 py-4 text-center text-gray-500">Chưa có chi tiết</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Add invoice detail */}
                <div className="mt-6 flex flex-wrap gap-3 justify-end">
                  <div className="mt-6">
                    {!addingDetail ? (
                      <button
                        disabled={currentInvoice.trangThaiThanhToan === "Đã thanh toán"}
                        onClick={() => setAddingDetail(true)}
                        className={`px-3 py-2  text-white rounded
                        ${currentInvoice.trangThaiThanhToan === "Đã thanh toán"
                          ? "bg-gray-300 cursor-not-allowed"
                          : "bg-green-600 hover:bg-green-500"}`}>
                        + Thêm chi tiết
                      </button>
                    ) : (
                      <div className="mt-3 bg-gray-50 p-4 rounded border">
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <label className="text-xs text-gray-600">Dịch vụ</label>
                            <select
                              value={newDetail.maDichVu ?? ''}
                              onChange={(e) => {
                                const selectedId = Number(e.target.value);
                                const selectedService = services.find((s) => s.maDichVu === selectedId);
                                setNewDetail({
                                  ...newDetail,
                                  maDichVu: selectedId,
                                  donGia: selectedService ? selectedService.donGia : 0, // auto‑set Đơn giá
                                });
                              }}
                              className="mt-1 block w-full border rounded px-2 py-1"
                            >
                              <option value="">-- Chọn dịch vụ --</option>
                              {services.map((s) => (
                                <option key={s.maDichVu} value={s.maDichVu}>
                                  {s.tenDichVu ?? `Dịch vụ ${s.maDichVu}`} 
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Số lượng</label>
                            <input
                              type="number"
                              min={1}
                              value={newDetail.soLuong ?? 1}
                              onChange={(e) => setNewDetail({ ...newDetail, soLuong: Number(e.target.value) })}
                              className="mt-1 block w-full border rounded px-2 py-1"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Đơn giá</label>
                            <input
                              readOnly
                              type="number"
                              min={0}
                              value={formatMoney(newDetail.donGia ?? 0)}
                              onChange={(e) => setNewDetail({ ...newDetail, donGia: Number(e.target.value) })}
                              className="mt-1 block w-full border rounded px-2 py-1"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Mô tả</label>
                            <input
                              type="text"
                              value={newDetail.moTa ?? ''}
                              onChange={(e) => setNewDetail({ ...newDetail, moTa: e.target.value })}
                              className="mt-1 block w-full border rounded px-2 py-1"
                            />
                          </div>
                        </div>

                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setAddingDetail(false);
                              setNewDetail({ maDichVu: undefined, soLuong: 1, donGia: 0, moTa: '' });
                            }}
                            className="px-3 py-1 border rounded"
                          >
                            Hủy
                          </button>
                          <button
                            onClick={submitAddInvoiceDetail}
                            className="px-3 py-1 bg-blue-600 text-white rounded"
                          >
                            Lưu chi tiết
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                <div className="mt-6">
                {currentInvoice.trangThaiThanhToan !== "Đã thanh toán" && (
                  <button
                    onClick={() => setShowConfirmPay(true)}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded"
                  >
                    Thanh toán
                  </button>
                )}
                </div>
                </div>
                {showConfirmPay && (
                <div className="mt-4 bg-gray-50 p-4 rounded border">
                  <p className="mb-3">Bạn có muốn thanh toán hóa đơn này?</p>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={async() => {
                        try {
                          await invoiceService.updateStatus(currentInvoice.maHoaDon, {
                            trangThai: "Đã thanh toán",
                          } as UpdateHoaDonRequest);
                          setCurrentInvoice({
                          ...currentInvoice,
                          trangThaiThanhToan: "Đã thanh toán",
                        });
                          setShowConfirmPay(false);
                        } catch (err) {
                          console.error("Failed to update invoice", err);
                        }
                      }}
                      className="px-3 py-1 bg-blue-600 text-white rounded"
                    >
                      Có
                    </button>
                    <button
                      onClick={() => setShowConfirmPay(false)}
                      className="px-3 py-1 border rounded"
                    >
                      Không
                    </button>
                  </div>
                </div>
              )}
              </div>
            ) : (
              <div className="mt-6 text-gray-600">Không có dữ liệu hóa đơn để hiển thị.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
