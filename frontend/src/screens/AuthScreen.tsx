import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { authService } from '../features/auth/api/service';
import { isAdminProfile, useAuthSession } from '../features/auth/session/AuthSessionContext';
import { getApiErrorMessage } from '../services/http/apiError';

type AuthMode = 'login' | 'register';

interface AuthScreenProps {
  adminOnly?: boolean;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ adminOnly = false }) => {
  const { showToast, refreshCart } = useApp();
  const { login, logout } = useAuthSession();
  const navigate = useNavigate();
  const location = useLocation();
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
      if (!adminOnly && mode === 'register') {
        await authService.register(identifier, email.trim() || null, password);
        setMode('login');
        setPassword('');
        showToast('Đăng ký thành công. Vui lòng đăng nhập.');
        return;
      }

      const me = await login(identifier, password);
      const isInternalUser = isAdminProfile(me);

      if (adminOnly && !isInternalUser) {
        logout();
        showToast('Tài khoản này không có quyền truy cập khu vực quản trị.');
        return;
      }

      try {
        await refreshCart();
      } catch {
        // Cart has its own recoverable UI path.
      }

      showToast('Đăng nhập thành công.');
      const state = location.state;
      const requestedPath = state && typeof state === 'object' && 'from' in state && typeof state.from === 'string'
        ? state.from
        : null;
      const customerDestination = requestedPath && !requestedPath.startsWith('/admin')
        ? requestedPath
        : '/account';
      navigate(isInternalUser ? '/admin/dashboard' : customerDestination, { replace: true });
    } catch (requestError: unknown) {
      showToast(
        getApiErrorMessage(
          requestError,
          !adminOnly && mode === 'register'
            ? 'Đăng ký thất bại. Kiểm tra dữ liệu tài khoản.'
            : 'Đăng nhập thất bại. Kiểm tra số điện thoại hoặc mật khẩu.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`flex min-h-screen items-center justify-center px-4 py-12 text-[#0B2419] ${adminOnly ? 'bg-[#071A12]' : 'bg-[#FAF9F5]'}`}>
      <div className={`w-full max-w-md border px-6 py-8 shadow-xl sm:px-10 ${adminOnly ? 'border-white/10 bg-[#FFFDF5]' : 'border-[#0B2419]/10 bg-white'}`}>
        <div className="mb-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#0B2419]/60">
            {adminOnly ? 'FIDO Admin' : 'FIDO Fashion'}
          </p>
          <h1 className="mt-2 font-serif text-3xl font-bold">
            {adminOnly ? 'Đăng nhập quản trị' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </h1>
          {adminOnly && (
            <p className="mt-2 text-xs leading-5 text-[#687069]">
              Khu vực này chỉ dành cho tài khoản ADMIN hoặc SUPERADMIN.
            </p>
          )}
        </div>

        {!adminOnly && (
          <div className="mb-6 flex border-b border-[#0B2419]/10 text-xs font-semibold uppercase tracking-wider">
            <button type="button" onClick={() => setMode('login')} className={`flex-1 border-b-2 py-3 ${mode === 'login' ? 'border-[#0B2419]' : 'border-transparent text-[#0B2419]/40'}`}>Đăng nhập</button>
            <button type="button" onClick={() => setMode('register')} className={`flex-1 border-b-2 py-3 ${mode === 'register' ? 'border-[#0B2419]' : 'border-transparent text-[#0B2419]/40'}`}>Đăng ký</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block space-y-1">
            <span className="text-xs font-medium">Số điện thoại *</span>
            <input type="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" className="w-full border border-[#0B2419]/20 bg-[#FAF9F5] px-3.5 py-2.5 text-sm" />
          </label>
          {!adminOnly && mode === 'register' && (
            <label className="block space-y-1">
              <span className="text-xs font-medium">Email</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="w-full border border-[#0B2419]/20 bg-[#FAF9F5] px-3.5 py-2.5 text-sm" />
            </label>
          )}
          <label className="block space-y-1">
            <span className="text-xs font-medium">Mật khẩu *</span>
            <input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="w-full border border-[#0B2419]/20 bg-[#FAF9F5] px-3.5 py-2.5 text-sm" />
          </label>
          <button type="submit" disabled={submitting} className="w-full bg-[#0B2419] py-3 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-50">
            {submitting ? 'Đang xử lý...' : adminOnly ? 'Vào trang quản trị' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </button>
        </form>

        {adminOnly && (
          <button type="button" onClick={() => navigate('/')} className="mt-5 w-full text-xs font-semibold uppercase tracking-wider text-[#606863] underline underline-offset-4">
            Quay lại cửa hàng
          </button>
        )}
      </div>
    </div>
  );
};
