import React, { useEffect, useState } from "react";
import bookingService, { DatPhongListResponse } from "../../services/booking.service";
import customerService, { KhachHangResponse } from "../../services/customer.service";
import roomService, { PhongResponse } from "../../services/room.service";
import { formatDate, formatMoney, formatTime } from "../../helpers/helpers";
import { LogIn, LogOut, BedDouble, DoorOpen, Wrench, LayoutGrid } from "lucide-react";


export function StaffDashboard(): React.JSX.Element {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bookings, setBookings] = useState<DatPhongListResponse[]>([]);
  const [customers, setCustomers] = useState<KhachHangResponse[]>([]);
  const [rooms, setRooms] = useState<PhongResponse[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [bookingData, customerData, roomData] = await Promise.all([
          bookingService.getAll(),
          customerService.getAll(),
          roomService.getAll(),
        ]);
        setBookings(bookingData);
        setCustomers(customerData);
        setRooms(roomData);
      } catch (e: any) {
        setError(e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // --- Metrics ---
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.trangThai === "Đang ở").length;
  const availableRooms = rooms.filter((r) => r.trangThai === "Trống").length;
  const maintenanceRooms = rooms.filter((r) => r.trangThai === "Bảo trì").length;

  const upcomingCheckIns = bookings.filter((b) => b.trangThai === "Đã đặt").slice(0, 5);
  const upcomingCheckOuts = bookings.filter((b) => b.trangThai === "Đang ở").slice(0, 5);

  const activeCustomers = customers.filter((c) => c.trangThai === "Hoạt động").length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {loading && <p>Đang tải dữ liệu...</p>}
      {error && <p className="text-red-600">Lỗi: {error}</p>}

      {!loading && !error && (
        <div className="space-y-6">
          {/* --- Room Overview --- */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white shadow rounded p-4">
              <h2 className="text-sm text-gray-500">
                <LayoutGrid className="w-5 h-5" />
                Tổng số phòng
              </h2>
              <p className="text-xl font-bold">{totalRooms}</p>
            </div>
            <div className="bg-white shadow rounded p-4">
              <h2 className="text-sm text-gray-500">
                <BedDouble className="w-5 h-5 text-blue-600" />
                Phòng đang ở
              </h2>
              <p className="text-xl font-bold text-blue-600">{occupiedRooms}</p>
            </div>
            <div className="bg-white shadow rounded p-4">
              <h2 className="text-sm text-gray-500">
                <DoorOpen className="w-5 h-5 text-green-600" />
                Phòng trống
              </h2>
              <p className="text-xl font-bold text-green-600">{availableRooms}</p>
            </div>
            <div className="bg-white shadow rounded p-4">
              <h2 className="text-sm text-gray-500">
                <Wrench className="w-5 h-5 text-yellow-600" /> 
                Phòng bảo trì
              </h2>
              <p className="text-xl font-bold text-yellow-600">{maintenanceRooms}</p>
            </div>
          </div>

          {/* --- Upcoming Bookings --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white shadow rounded p-4">
              <h2 className="text-lg font-semibold mb-2">
                <LogIn className="w-5 h-5 text-green-600" />
                 Check-in sắp tới
                </h2>
              <ul className="space-y-1">
                {upcomingCheckIns.map((b) => (
                  <li key={b.maDatPhong} className="text-sm">
                    {b.tenKhachHang} – Phòng {b.tenPhong} ({b.ngayNhanPhong})
                  </li>
                ))}
                {upcomingCheckIns.length === 0 && <li className="text-gray-500">Không có</li>}
              </ul>
            </div>

            <div className="bg-white shadow rounded p-4">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <LogOut className="w-5 h-5 text-red-600" />
                Check-out sắp tới
              </h2>
              {upcomingCheckOuts.length === 0 ? (
                <p className="text-gray-500 text-sm">Không có</p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {upcomingCheckOuts.map((b) => (
                    <li
                      key={b.maDatPhong}
                      className="py-2 flex items-center justify-between text-sm"
                    >
                      <div>
                        <p className="font-medium text-gray-800">{b.tenKhachHang}</p>
                        <p className="text-gray-500">
                          Phòng {b.tenPhong}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-700">{formatDate(b.ngayTraPhong)}</p>
                        <p className="text-xs text-gray-400">{formatTime(b.ngayTraPhong)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
