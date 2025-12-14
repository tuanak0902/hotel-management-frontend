import { useState, useEffect } from 'react';
import { useAuth } from '../services/auth.service';
import { Hotel, Lock, User, Eye, EyeOff } from 'lucide-react';

type Role = 'customer' | 'staff' | 'manager';

interface LoginPageProps {
  onLogin: (role: Role) => void;
  onBack?: () => void;
}

// Map backend roles to frontend Role types
function mapBackendRoleToFrontend(backendRole: string): Role {
  const roleMap: Record<string, Role> = {
    'Quản lý': 'manager',
    'Nhân viên': 'staff',
    'Lễ tân': 'staff',
    'Khách hàng': 'customer',
  };
  return roleMap[backendRole] || 'customer';
}

export function LoginPage({ onLogin, onBack }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasJustSubmitted, setHasJustSubmitted] = useState(false);

  const { login, user, isAuthenticated } = useAuth();

  // Try to render various backend error shapes into readable UI
  function renderError(errStr: string) {
    // If empty
    if (!errStr) return null;

    // If already looks like plain text (no JSON), show directly
    const trimmed = errStr.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return <div>{trimmed}</div>;
    }

    // Try to parse JSON; backend may return ProblemDetails or ModelState shape
    try {
      const obj = JSON.parse(trimmed);

      // ASP.NET ProblemDetails: { title, status, errors: { Field: ["msg"] } }
      if (obj?.errors && typeof obj.errors === 'object') {
        const entries = Object.entries(obj.errors) as [string, any][];
        return (
          <div>
            {obj.title && <div className="font-medium mb-2">{obj.title}</div>}
            <ul className="list-disc list-inside space-y-1">
              {entries.map(([field, msgs], idx) => (
                (Array.isArray(msgs) ? msgs : [msgs]).map((m: any, i: number) => (
                  <li key={`${idx}-${i}`} className="text-sm">{String(m)}</li>
                ))
              ))}
            </ul>
          </div>
        );
      }

      // Generic object with message
      if (obj?.message) {
        return <div>{String(obj.message)}</div>;
      }

      // If it's a simple array or string map, stringify nicely
      if (Array.isArray(obj)) {
        return (
          <ul className="list-disc list-inside space-y-1">
            {obj.map((it, i) => (
              <li key={i} className="text-sm">{String(it)}</li>
            ))}
          </ul>
        );
      }

      // Fallback: pretty-print object keys
      return (
        <div>
          {Object.entries(obj).map(([k, v]) => (
            <div key={k} className="text-sm">
              <strong>{k}:</strong> {typeof v === 'string' ? v : JSON.stringify(v)}
            </div>
          ))}
        </div>
      );

    } catch (e) {
      // Not JSON — show raw
      return <div>{trimmed}</div>;
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu');
      return;
    }

    setError('');
    setLoading(true);
    setHasJustSubmitted(true);
    try {
      await login({ tenDangNhap: username, matKhau: password });
    } catch (err: any) {
      // Determine a friendly message for authentication/validation failures
      const raw = err?.message ?? String(err ?? '');

      // If backend returned ProblemDetails or validation errors, or auth messages,
      // and both username/password were provided, show a generic credential error.
      let showGenericCredError = false;
      try {
        const parsed = JSON.parse(raw);
        const title = (parsed?.title ?? '').toString().toLowerCase();
        if (title.includes('validation') || parsed?.errors) showGenericCredError = true;
        // Some backends return localized messages in message field
        const messageField = (parsed?.message ?? '').toString();
        if (messageField.includes('Mật khẩu') || messageField.includes('Tài khoản') || messageField.includes('password') || messageField.includes('account')) {
          showGenericCredError = true;
        }
      } catch {
        // not JSON
        const lower = raw.toLowerCase();
        if (lower.includes('validation') || lower.includes('mật khẩu') || lower.includes('tài khoản') || lower.includes('unauthorized') || lower.includes('not found') || lower.includes('bad request')) {
          showGenericCredError = true;
        }
      }

      if (showGenericCredError) {
        setError('Tên đăng nhập hoặc mật khẩu không đúng');
      } else {
        setError(raw || 'Login failed');
      }
      setHasJustSubmitted(false);
    } finally {
      setLoading(false);
    }
  };

  // After successful login (only if user just submitted), extract backend role and notify parent
  useEffect(() => {
    if (hasJustSubmitted && isAuthenticated && user?.role) {
      const frontendRole = mapBackendRoleToFrontend(user.role);
      if (onLogin) onLogin(frontendRole);
    }
  }, [isAuthenticated, user, hasJustSubmitted]);

  return (
    <div className="absolute inset-0 z-0 bg-radial-blue-strong">
      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 rounded text-white
               hover:bg-white hover:bg-opacity-5 hover:text-blue-500 transition-colors duration-200 cursor-pointer z-10"
        >
          <span className="mr-1">←</span> Quay lại
        </button>
      )}

      {/* Centered Login Container */}
          <div className="flex items-center justify-center min-h-screen">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden grid md:grid-cols-2">
          {/* Left Side - Branding */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-400 text-white p-12 flex flex-col justify-center">
            <div className="mb-8">
              <Hotel className="w-16 h-16 mb-4" />
              <h1 className="text-white mb-2">Quản lý Khách sạn</h1>
              <p className="text-blue-100">Vận hành hệ thống khách sạn mượt mà</p>
            </div>
            <div className="space-y-4">
              {['Quản lý phòng', 'Quản lý booking', 'Báo cáo doanh số'].map((text) => (
                <div key={text} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    ✓
                  </div>
                  <div>
                    <p className="text-blue-50">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="p-12">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Chào mừng bạn</h2>
              <p className="text-gray-500 text-sm">Vui lòng đăng nhập</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">

              {/* Username */}
              <div>
                <label className="block text-gray-700 mb-2">Tên đăng nhập</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập tên đăng nhập"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-gray-700 mb-2">Mật khẩu</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {renderError(error)}
                </div>
              )}

              {/* Remember & Forgot
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" />
                  <span className="text-gray-600">Remember me</span>
                </label>
                <a href="#" className="text-blue-600 hover:text-blue-700">
                  Forgot password?
                </a>
              </div> */}

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full text-white py-3 rounded-lg bg-blue-500 hover:bg-blue-600 transition ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Đang tải...' : 'Đăng nhập'}
              </button>
            </form>

            {/* Sign Up Link
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Don&apos;t have an account?{' '}
                <a href="#" className="text-blue-600 hover:text-blue-700">
                  Sign up
                </a>
              </p>
            </div> */}
          </div>
        </div>
      </div>
      </div>
  );
}
