import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const AuthScreen: React.FC = () => {
  const { setCurrentScreen, showToast, userProfile, updateUserProfile } = useApp();
  const [mode, setMode] = useState<'login' | 'register' | 'otp'>('login');
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');
  const [identifier, setIdentifier] = useState('0987654321');
  const [password, setPassword] = useState('••••••••');
  const [fullName, setFullName] = useState('Trần Hoàng Long');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // auto-focus next
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      showToast('Đăng nhập thành công! Chào mừng quý khách trở lại.');
      setCurrentScreen('profile');
    } else if (mode === 'register') {
      setMode('otp');
      showToast('Mã OTP 6 số đã được gửi qua SMS/Email của quý khách.');
    } else if (mode === 'otp') {
      updateUserProfile({
        name: fullName || userProfile.name,
        phone: authMethod === 'phone' ? identifier : userProfile.phone,
        email: authMethod === 'email' ? identifier : userProfile.email,
      });
      showToast('Xác thực tài khoản thành công! Hồ sơ thành viên đã được kích hoạt.');
      setCurrentScreen('profile');
    }
  };

  return (
    <div className="bg-[#FAF9F5] min-h-screen text-[#0B2419] font-['Plus_Jakarta_Sans',sans-serif] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E8C75B]"></span>
            <span className="text-[11px] uppercase tracking-[0.25em] text-[#0B2419]/70 font-semibold">
              ATELIER VERT • PRIVILEGE CLUB
            </span>
          </div>
          <h2 className="text-3xl font-['Playfair_Display',serif] font-bold text-[#0B2419] tracking-tight">
            FIDO FASHION
          </h2>
          <p className="mt-2 text-xs text-[#0B2419]/70">
            Trải nghiệm đặc quyền may đo cao cấp và lưu trữ số đo chuẩn hóa
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 border border-[#0B2419]/10 shadow-sm">
          {/* Mode Switcher Tabs */}
          {mode !== 'otp' && (
            <div className="flex border-b border-[#0B2419]/10 mb-6 text-xs uppercase tracking-wider font-semibold">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 py-3 text-center border-b-2 transition-all ${
                  mode === 'login'
                    ? 'border-[#0B2419] text-[#0B2419]'
                    : 'border-transparent text-[#0B2419]/40 hover:text-[#0B2419]'
                }`}
              >
                Đăng Nhập
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`flex-1 py-3 text-center border-b-2 transition-all ${
                  mode === 'register'
                    ? 'border-[#0B2419] text-[#0B2419]'
                    : 'border-transparent text-[#0B2419]/40 hover:text-[#0B2419]'
                }`}
              >
                Tạo Tài Khoản
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            {mode === 'otp' ? (
              <div>
                <div className="text-center mb-6">
                  <span className="material-symbols-outlined text-4xl text-[#0B2419] mb-2">mark_email_read</span>
                  <h3 className="text-base font-bold text-[#0B2419]">Xác Thực Mã OTP 6 Số</h3>
                  <p className="text-xs text-[#0B2419]/60 mt-1">
                    Mã bảo mật đã được gửi tới{' '}
                    <span className="font-semibold text-[#0B2419]">{identifier}</span>
                  </p>
                </div>

                <div className="flex justify-center gap-2 mb-6">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-${idx}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      className="w-11 h-12 text-center text-lg font-bold border border-[#0B2419]/20 focus:outline-none focus:border-[#0B2419] bg-[#FAF9F5]"
                    />
                  ))}
                </div>

                <p className="text-center text-xs text-[#0B2419]/60 mb-6">
                  Không nhận được mã?{' '}
                  <button
                    type="button"
                    onClick={() => showToast('Mã OTP mới đã được phát hành lại.')}
                    className="font-semibold text-[#0B2419] underline"
                  >
                    Gửi lại mã (59s)
                  </button>
                </p>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#0B2419] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#123A29] transition-colors"
                >
                  Xác Nhận & Hoàn Tất
                </button>

                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="w-full mt-3 text-xs text-[#0B2419]/60 hover:text-[#0B2419] text-center block"
                >
                  Quay lại đăng ký
                </button>
              </div>
            ) : (
              <>
                {/* Auth Method toggle */}
                <div className="flex items-center justify-between text-xs text-[#0B2419]/60 pb-1">
                  <span>Phương thức đăng nhập:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAuthMethod('phone')}
                      className={`px-2 py-0.5 ${
                        authMethod === 'phone'
                          ? 'bg-[#0B2419] text-white font-medium'
                          : 'bg-[#0B2419]/5 hover:bg-[#0B2419]/10'
                      }`}
                    >
                      Số điện thoại
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMethod('email')}
                      className={`px-2 py-0.5 ${
                        authMethod === 'email'
                          ? 'bg-[#0B2419] text-white font-medium'
                          : 'bg-[#0B2419]/5 hover:bg-[#0B2419]/10'
                      }`}
                    >
                      Email
                    </button>
                  </div>
                </div>

                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-medium text-[#0B2419] mb-1">
                      Họ và tên quý khách *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full text-xs px-3.5 py-2.5 border border-[#0B2419]/20 focus:outline-none focus:border-[#0B2419] bg-[#FAF9F5]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-[#0B2419] mb-1">
                    {authMethod === 'phone' ? 'Số điện thoại *' : 'Địa chỉ Email *'}
                  </label>
                  <input
                    type={authMethod === 'phone' ? 'tel' : 'email'}
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={authMethod === 'phone' ? '0987 654 321' : 'quykhach@domain.com'}
                    className="w-full text-xs px-3.5 py-2.5 border border-[#0B2419]/20 focus:outline-none focus:border-[#0B2419] bg-[#FAF9F5]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-[#0B2419]">Mật khẩu bảo mật *</label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => showToast('Liên kết đặt lại mật khẩu đã gửi qua tin nhắn SMS')}
                        className="text-[11px] text-[#0B2419]/60 hover:text-[#0B2419] underline"
                      >
                        Quên mật khẩu?
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự"
                    className="w-full text-xs px-3.5 py-2.5 border border-[#0B2419]/20 focus:outline-none focus:border-[#0B2419] bg-[#FAF9F5]"
                  />
                </div>

                {mode === 'login' && (
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      defaultChecked
                      className="h-4 w-4 accent-[#0B2419] rounded-none border-[#0B2419]/20"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-xs text-[#0B2419]/70">
                      Ghi nhớ phiên đăng nhập trên thiết bị này trong 30 ngày
                    </label>
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-[#0B2419] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#123A29] transition-colors"
                  >
                    {mode === 'login' ? 'Đăng Nhập Ngay' : 'Tiếp Tục Xác Nhận OTP'}
                  </button>
                </div>
              </>
            )}
          </form>

          {/* Social or Fast auth */}
          {mode !== 'otp' && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#0B2419]/10" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-[#0B2419]/50">Hoặc tiếp tục nhanh với</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    showToast('Đã đăng nhập bằng Google Authentication');
                    setCurrentScreen('profile');
                  }}
                  className="w-full inline-flex justify-center py-2 px-4 border border-[#0B2419]/20 text-xs font-medium text-[#0B2419] bg-white hover:bg-[#FAF9F5]"
                >
                  <span className="font-bold text-blue-600 mr-2">G</span> Google
                </button>
                <button
                  type="button"
                  onClick={() => {
                    showToast('Đã đăng nhập bằng Apple ID');
                    setCurrentScreen('profile');
                  }}
                  className="w-full inline-flex justify-center py-2 px-4 border border-[#0B2419]/20 text-xs font-medium text-[#0B2419] bg-white hover:bg-[#FAF9F5]"
                >
                  <span className="material-symbols-outlined text-sm mr-1">apple</span> Apple ID
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Guest checkout prompt */}
        <div className="mt-4 text-center">
          <p className="text-xs text-[#0B2419]/60">
            Bạn muốn mua hàng ngay không cần tài khoản?{' '}
            <button
              onClick={() => setCurrentScreen('checkout')}
              className="font-semibold text-[#0B2419] hover:underline"
            >
              Thanh toán COD trực tiếp
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
