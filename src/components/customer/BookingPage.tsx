import React, { useEffect, useState } from "react";
import roomService, { PhongResponse } from "../../services/room.service";
import { LayoutGrid } from "lucide-react";
export function CustomerBooking(): React.JSX.Element {
  const [rooms, setRooms] = useState<PhongResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRooms = async () => {
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
    loadRooms();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <LayoutGrid className="w-6 h-6 text-gray-700" />
        Danh sách phòng
        </h1>

      {loading && <p>Đang tải danh sách phòng...</p>}
      {error && <p className="text-red-600">Lỗi: {error}</p>}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <div
              key={room.maPhong}
              className="bg-white shadow rounded p-4 flex flex-col"
            >
              <h2 className="text-lg font-semibold mb-1">
                Phòng {room.soPhong}
              </h2>
              <p className="text-sm text-gray-600">
                Loại: {room.tenLoaiPhong ?? "Không rõ"}
              </p>
              <p className="text-sm text-gray-500">
                Trạng thái:{" "}
                <span
                  className={
                    room.trangThai === "Trống"
                      ? "text-green-600 font-medium"
                      : room.trangThai === "Đang ở"
                      ? "text-blue-600 font-medium"
                      : room.trangThai === "Bảo trì"
                      ? "text-yellow-600 font-medium"
                      : "text-gray-600"
                  }
                >
                  {room.trangThai ?? "Không rõ"}
                </span>
              </p>
              {room.ghiChu && (
                <p className="text-xs text-gray-400 mt-2">Ghi chú: {room.ghiChu}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
