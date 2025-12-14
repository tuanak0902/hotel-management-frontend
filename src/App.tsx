import { useState } from "react";
import { LoginPage } from "./components/LoginPage";
import { useAuth } from "./services/auth.service";
import { CustomerBooking } from "./components/customer/BookingPage";
import { StaffDashboard } from "./components/staff/DashboardPage";
import { StaffRooms } from "./components/staff/RoomsPage";
import { StaffBookings } from "./components/staff/BookingsPage";
import { StaffCustomers } from "./components/staff/CustomersPage";
import { StaffServices } from "./components/staff/ServicesPage";
import { StaffRoomTypes } from "./components/staff/RoomTypesPage";
import { ManagerStaff } from "./components/manager/StaffPage";
import { ManagerSales } from "./components/manager/SalesPage";
import { Hotel, LogOut, LogIn } from "lucide-react";

type Role = "customer" | "staff" | "manager";
type Page =
  | "booking"
  | "dashboard"
  | "rooms"
  | "bookings"
  | "customers"
  | "services"
  | "room-types"
  | "staff"
  | "sales";

interface NavItem {
  key: Page;
  label: string;
}

function makeNavItems(role: Role): NavItem[] {
  const base: NavItem[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "room-types", label: "Quản lý Loại phòng" },
    { key: "rooms", label: "Quản lý Phòng" },
    { key: "bookings", label: "Quản lý Đặt phòng" },
    { key: "customers", label: "Quản lý Khách hàng" },
    { key: "services", label: "Quản lý Dịch vụ" },
  ];
  if (role === "manager") {
    base.push(
      { key: "staff", label: "Quản lý Nhân viên" },
      { key: "sales", label: "Báo cáo Doanh số" }
    );
  }
  return base;
}

export default function App() {
  const { user, isAuthenticated, logout, initializing } = useAuth();
  const [showLoginPage, setShowLoginPage] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>("booking");

  const handleLogin = (userRole: Role) => {
    setShowLoginPage(false);
    setCurrentPage(userRole === "customer" ? "booking" : "dashboard");
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore server logout errors
    }
    setCurrentPage("booking");
    setShowLoginPage(false);
  };

  if (showLoginPage) {
    return (
      <LoginPage
        onLogin={handleLogin}
        onBack={() => setShowLoginPage(false)}
      />
    );
  }

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"
            role="status"
            aria-label="Loading"
          />
          <div className="text-gray-600">Đang tải...</div>
        </div>
      </div>
    );
  }

  const role: Role = (user?.role as Role) ?? "customer";
  const navItems: NavItem[] =
    isAuthenticated && (role === "staff" || role === "manager")
      ? makeNavItems(role)
      : [];

  const renderPage = () => {
    if (!isAuthenticated || role === "customer") return <CustomerBooking />;

    switch (currentPage) {
      case "dashboard":
        return <StaffDashboard />;
      case "rooms":
        return <StaffRooms />;
      case "bookings":
        return <StaffBookings />;
      case "customers":
        return <StaffCustomers />;
      case "services":
        return <StaffServices />;
      case "room-types":
        return <StaffRoomTypes />;
      case "staff":
        return role === "manager" ? <ManagerStaff /> : <StaffDashboard />;
      case "sales":
        return role === "manager" ? <ManagerSales /> : <StaffDashboard />;
      default:
        return <StaffDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800">
      {/* Header */}
      <header className="bg-blue-600 text-white px-6 py-4 shadow flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Hotel className="w-6 h-6 text-white" />
          <div>
            <h1 className="text-xl font-semibold">Quản lý Khách sạn</h1>
            {isAuthenticated && (
              <p className="text-blue-100 text-sm">
                Đăng nhập với tư cách:{" "}
                {role === "staff"
                  ? "Nhân viên"
                  : role === "manager"
                  ? "Quản lý"
                  : "Khách hàng"}
              </p>
            )}
          </div>
        </div>
        <div>
          {!isAuthenticated ? (
            <button
              onClick={() => setShowLoginPage(true)}
              className="px-6 py-2 rounded bg-white text-blue-600 hover:bg-blue-50 transition font-medium flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Đăng nhập
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded bg-blue-500 hover:bg-blue-400 transition font-medium flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </button>
          )}
        </div>
      </header>

      <div className="flex">
        {/* Sidebar for Staff/Manager */}
        {isAuthenticated && (role === "staff" || role === "manager") && (
          <aside className="w-64 bg-white shadow-lg min-h-[calc(100vh-64px)] border-r">
            <nav className="p-4">
              <ul className="space-y-1">
                {navItems.map((item) => (
                  <li key={item.key}>
                    <button
                      onClick={() => setCurrentPage(item.key)}
                      className={`w-full text-left px-4 py-2 rounded transition ${
                        currentPage === item.key
                          ? "bg-blue-100 text-blue-700 font-semibold"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="bg-white rounded shadow p-6">{renderPage()}</div>
        </main>
      </div>
    </div>
  );
}
