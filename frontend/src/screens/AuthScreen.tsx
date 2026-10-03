import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { authService } from '../features/auth/api/service';

type AuthMode = 'login' | 'register';

export const AuthScreen: React.FC = () => {
  const {
    setCurrentScreen,
    showToast,
    updateUserProfile,
    refreshCart,
  } = useApp();
  const [mode, setMode] = useState<AuthMode>('login');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const identifier = phone.trim();

    if (!identifier || !password) {
      showToast('Vui lòng nhập số điện thoại và mật khẩu.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'register') {
        await authService.register(
          identifier,
          email.trim() || null,
          password,
        );
        setMode('login');
        setPassword('');
        showToast('Đăng ký thành công. Vui lòng đăng nhập.');
        return;
      }

      const login = await authService.login(identifier, password);
      const me = await authService.getMe();
      updateUserProfile({
        phone: login.account.phone,
        email: login.account.email ?? '',
      });

      try {
        await refreshCart();
      } catch {
        // Authentication succeeded. Cart loading has its own recoverable UI path.
      }

      const isInternalUser = me.roles.some(
        (role) => role.code === 'ADMIN' || role.code === 'SUPERADMIN',
      );
      showToast('Đăng nhập thành công.');
      setCurrentScreen(isInternalUser ? 'admin' : 'profile');
    } catch {
      showToast(
        mode === 'login'
          ? 'Đăng nhập thất bại. Kiểm tra số điện thoại hoặc mật khẩu.'
          : 'Đăng ký thất bại. Kiểm tra dữ liệu tài khoản.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF9F5] px-4 py-12 text-[#0B2419]">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#0B2419]/60">
            FIDO Fashion
          </p>
          <h1 className="mt-2 font-['Playfair_Display',serif] text-3xl font-bold">
            {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </h1>
          <p className="mt-2 text-xs text-[#0B2419]/60">
            Đăng nhập dùng số điện thoại theo contract backend hiện tại.
          </p>
        </div>

        <div className="border border-[#0B2419]/10 bg-white px-6 py-8 shadow-sm sm:px-10">
          <div className="mb-6 flex border-b border-[#0B2419]/10 text-xs font-semibold uppercase tracking-wider">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 border-b-2 py-3 ${
                mode === 'login'
                  ? 'border-[#0B2419] text-[#0B2419]'
                  : 'border-transparent text-[#0B2419]/40'
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 border-b-2 py-3 ${
                mode === 'register'
                  ? 'border-[#0B2419] text-[#0B2419]'
                  : 'border-transparent text-[#0B2419]/40'
              }`}
            >
              Đăng ký
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block space-y-1">
              <span className="text-xs font-medium">Số điện thoại *</span>
              <input
                type="tel"
                required
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                autoComplete="tel"
                placeholder="0987654321"
                className="w-full border border-[#0B2419]/20 bg-[#FAF9F5] px-3.5 py-2.5 text-sm outline-none focus:border-[#0B2419]"
              />
            </label>

            {mode === 'register' && (
              <label className="block space-y-1">
                <span className="text-xs font-medium">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="user@example.com"
                  className="w-full border border-[#0B2419]/20 bg-[#FAF9F5] px-3.5 py-2.5 text-sm outline-none focus:border-[#0B2419]"
                />
              </label>
            )}

            <label className="block space-y-1">
              <span className="text-xs font-medium">Mật khẩu *</span>
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full border border-[#0B2419]/20 bg-[#FAF9F5] px-3.5 py-2.5 text-sm outline-none focus:border-[#0B2419]"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#0B2419] py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#123A29] disabled:opacity-50"
            >
              {submitting
                ? 'Đang xử lý...'
                : mode === 'login'
                  ? 'Đăng nhập'
                  : 'Tạo tài khoản'}
            </button>
          </form>

          <p className="mt-5 text-center text-[11px] leading-5 text-[#0B2419]/55">
            Access token chỉ được giữ trong bộ nhớ runtime của frontend. Reload trang sẽ yêu cầu đăng nhập lại;
            chưa có refresh-token API và chưa tự chọn cơ chế lưu token bền vững.
          </p>
        </div>
      </div>
    </div>
  );
};
