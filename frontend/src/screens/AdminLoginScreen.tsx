import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const AdminLoginScreen: React.FC = () => {
  const { setCurrentScreen, showToast } = useApp();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedPhone = phone.trim();
    if (!normalizedPhone || !password) {
      setValidationError('Vui lòng nhập đầy đủ số điện thoại và mật khẩu.');
      return;
    }

    setValidationError('');

    // FE currently runs with mock services. This keeps the admin login flow testable
    // without inventing backend authentication rules. Real authentication will use
    // POST /api/v1/auth/login when the backend auth contract is wired into the FE.
    showToast('Đăng nhập quản trị thành công trong chế độ giao diện thử nghiệm.');
    setCurrentScreen('admin');
  };

  return (
    <main className="min-h-screen w-full bg-[#071710] text-[#191C19] antialiased">
      <div className="min-h-screen w-full flex flex-col lg:flex-row">
        <section className="relative w-full lg:w-7/12 bg-[#0B2419] text-white flex flex-col justify-between p-8 sm:p-12 lg:p-16 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(232,199,91,0.16),transparent_28%),radial-gradient(circle_at_85%_80%,rgba(27,80,56,0.45),transparent_34%),linear-gradient(145deg,#071710_0%,#0B2419_48%,#123A29_100%)]" />
            <div className="absolute -top-24 -left-20 w-80 h-80 border border-[#E8C75B]/15 rounded-full" />
            <div className="absolute -top-8 left-20 w-72 h-72 border border-[#E8C75B]/10 rounded-full" />
            <div className="absolute bottom-12 right-8 grid grid-cols-5 gap-3 opacity-[0.08] rotate-[-8deg]">
              {Array.from({ length: 25 }).map((_, index) => (
                <span key={index} className="w-2 h-2 bg-[#E8C75B] rounded-full" />
              ))}
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentScreen('home')}
              className="flex items-center gap-3.5 text-left group"
            >
              <span className="h-11 w-11 bg-[#E8C75B] text-[#071710] font-serif text-2xl font-bold flex items-center justify-center rounded-lg shadow-lg group-hover:scale-105 transition-transform">
                F
              </span>
              <span className="flex flex-col">
                <span className="font-serif font-bold tracking-[0.2em] text-lg text-white leading-tight">FIDO</span>
                <span className="text-[9px] uppercase tracking-[0.24em] text-white/55 mt-1">Fashion Operations</span>
              </span>
            </button>

            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
              <span className="material-symbols-outlined text-[14px] text-[#E8C75B]">lock</span>
              Internal Portal
            </span>
          </div>

          <div className="relative z-10 max-w-2xl my-12 lg:my-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E8C75B]/10 border border-[#E8C75B]/25 text-[#E8C75B] rounded-full text-[11px] font-semibold uppercase tracking-[0.14em]">
              <span className="material-symbols-outlined text-[15px]">admin_panel_settings</span>
              <span>Cổng quản trị nội bộ</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-light text-white leading-[1.2] tracking-tight">
              Vận hành FIDO với quyền truy cập
              <span className="italic font-normal text-[#E8C75B]"> được kiểm soát.</span>
            </h1>

            <p className="text-sm sm:text-base text-white/65 leading-relaxed font-light max-w-xl">
              Khu vực dành cho ADMIN và SUPERADMIN để quản lý catalog, đơn hàng, tồn kho,
              tài khoản nội bộ, phân quyền, audit và báo cáo.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
              {[
                { icon: 'key', title: 'JWT', subtitle: 'Phiên xác thực' },
                { icon: 'shield_person', title: 'RBAC', subtitle: 'Phân quyền backend' },
                { icon: 'history', title: 'Audit', subtitle: 'Truy vết thao tác' },
              ].map((item) => (
                <div key={item.title} className="bg-black/20 border border-white/10 backdrop-blur-sm p-4 rounded-xl">
                  <div className="flex items-center gap-2 text-[#E8C75B] mb-2">
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    <span className="text-base font-bold tracking-tight">{item.title}</span>
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-white/45 font-semibold">
                    {item.subtitle}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 pt-4">
            <div className="flex items-start gap-3 p-3.5 bg-black/20 border border-white/10 rounded-xl backdrop-blur-md max-w-2xl">
              <span className="material-symbols-outlined text-[#E8C75B] text-[20px] shrink-0 mt-0.5">policy</span>
              <p className="text-xs text-white/60 leading-relaxed font-light">
                Quyền truy cập quản trị được kiểm tra ở phía hệ thống. Giao diện không thay thế
                kiểm soát RBAC của backend.
              </p>
            </div>
          </div>
        </section>

        <section className="w-full lg:w-5/12 bg-[#FBFBF9] flex flex-col p-6 sm:p-10 lg:p-14 border-l border-[#E2E5DE]/80 relative">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setCurrentScreen('home')}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#687069] hover:text-[#0B2419] transition-colors"
            >
              <span className="material-symbols-outlined text-[17px]">arrow_back</span>
              Quay lại cửa hàng
            </button>
          </div>

          <div className="w-full max-w-md mx-auto my-auto py-10 lg:py-0">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1B5038]">
                <span className="w-2 h-2 rounded-full bg-[#E8C75B]" />
                Xác thực nhân sự nội bộ
              </div>
              <h2 className="font-serif text-3xl text-[#0B2419] font-semibold tracking-tight">
                Đăng nhập quản trị
              </h2>
              <p className="text-sm text-[#424844] mt-2 leading-relaxed">
                Đăng nhập bằng số điện thoại nội bộ và mật khẩu. Phiên hiện tại không yêu cầu OTP.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold tracking-[0.1em] text-[#0B2419] uppercase" htmlFor="admin-phone">
                  Số điện thoại
                </label>
                <div className="relative flex items-center bg-white border border-[#D5D9D2] rounded-lg transition-all focus-within:border-[#0B2419] focus-within:ring-2 focus-within:ring-[#0B2419]/10 shadow-sm">
                  <span className="material-symbols-outlined text-[#727974] text-[20px] ml-3.5 pointer-events-none">phone_iphone</span>
                  <input
                    id="admin-phone"
                    type="tel"
                    autoComplete="username"
                    value={phone}
                    onChange={(event) => {
                      setPhone(event.target.value);
                      if (validationError) setValidationError('');
                    }}
                    placeholder="Nhập số điện thoại"
                    className="w-full bg-transparent px-3 py-3 text-sm text-[#191C19] placeholder:text-[#9AA099] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold tracking-[0.1em] text-[#0B2419] uppercase" htmlFor="admin-password">
                  Mật khẩu
                </label>
                <div className="relative flex items-center bg-white border border-[#D5D9D2] rounded-lg transition-all focus-within:border-[#0B2419] focus-within:ring-2 focus-within:ring-[#0B2419]/10 shadow-sm">
                  <span className="material-symbols-outlined text-[#727974] text-[20px] ml-3.5 pointer-events-none">lock</span>
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (validationError) setValidationError('');
                    }}
                    placeholder="Nhập mật khẩu"
                    className="w-full bg-transparent px-3 py-3 text-sm text-[#191C19] placeholder:text-[#9AA099] focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="mr-3 p-1 text-[#727974] hover:text-[#0B2419] transition-colors focus:outline-none"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {validationError && (
                <div className="flex items-start gap-2 rounded-lg border border-[#BA1A1A]/20 bg-[#FFdad6]/45 px-3.5 py-3 text-xs text-[#8c1d18]">
                  <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                  <span>{validationError}</span>
                </div>
              )}

              <div className="rounded-lg border border-[#E2E5DE] bg-[#F3F4EF] px-3.5 py-3 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[#1B5038] text-[18px] mt-0.5">info</span>
                <p className="text-[11px] leading-relaxed text-[#687069]">
                  Tài khoản quản trị sử dụng vai trò ADMIN; tài khoản quản trị cao nhất sử dụng SUPERADMIN.
                  Backend chịu trách nhiệm xác nhận quyền trên từng API quản trị.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-6 rounded-lg bg-[#0B2419] hover:bg-[#1B5038] text-white text-sm font-semibold tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group active:scale-[0.99]"
              >
                <span>Đăng nhập vào hệ thống</span>
                <span className="material-symbols-outlined text-[19px] transition-transform group-hover:translate-x-1">
                  arrow_forward
                </span>
              </button>
            </form>

            <div className="mt-8 pt-5 border-t border-[#E2E5DE] flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.12em] text-[#8A918C]">
              <span>FIDO Internal Console</span>
              <span className="inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">verified_user</span>
                Protected by backend RBAC
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};
