import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const AuthScreen: React.FC = () => {
  const { setCurrentScreen, showToast, userProfile, updateUserProfile } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState(userProfile.phone || '0912345678');
  const [phone, setPhone] = useState(userProfile.phone || '');
  const [email, setEmail] = useState(userProfile.email || '');
  const [password, setPassword] = useState('mock-password');
  const [showPassword, setShowPassword] = useState(false);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    if (mode === 'login') {
      showToast('Mock POST /api/v1/auth/login: identifier + password → JWT access token.');
      setCurrentScreen('profile');
      return;
    }

    updateUserProfile({
      phone: phone.trim(),
      email: email.trim(),
    });
    showToast('Mock POST /api/v1/auth/register: phone/email + password.');
    setCurrentScreen('profile');
  };

  return (
    <div className="min-h-[calc(100vh-100px)] bg-[#FAF9F5] px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-[#1B5038]">
            <span className="w-2 h-2 rounded-full bg-[#E8C75B]" />
            Auth mock · API baseline
          </div>
          <h1 className="font-['Playfair_Display',serif] text-3xl font-bold text-[#0B2419] mt-2">
            {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </h1>
          <p className="text-xs text-[#687069] mt-2">
            Không OTP, không social login, không thêm trường hồ sơ ngoài contract.
          </p>
        </div>

        <div className="bg-white border border-[#E8E9E3] shadow-sm rounded-lg p-6 sm:p-8">
          <div className="grid grid-cols-2 gap-1 bg-[#F3F4EF] p-1 rounded-lg mb-6">
            <button type="button" onClick={()=>setMode('login')} className={`py-2 text-xs font-bold rounded ${mode==='login'?'bg-[#0B2419] text-white':'text-[#687069]'}`}>Đăng nhập</button>
            <button type="button" onClick={()=>setMode('register')} className={`py-2 text-xs font-bold rounded ${mode==='register'?'bg-[#0B2419] text-white':'text-[#687069]'}`}>Đăng ký</button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'login' ? (
              <div>
                <label className="text-xs font-bold text-[#0B2419]">Số điện thoại / identifier</label>
                <input required value={identifier} onChange={(e)=>setIdentifier(e.target.value)} className="w-full mt-1 px-3 py-2.5 border rounded bg-[#FAF9F5] text-sm" />
                <p className="text-[10px] text-[#687069] mt-1">Fixture hiện dùng số điện thoại theo quyết định physical design của dự án.</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs font-bold text-[#0B2419]">Số điện thoại</label>
                  <input value={phone} onChange={(e)=>setPhone(e.target.value)} className="w-full mt-1 px-3 py-2.5 border rounded bg-[#FAF9F5] text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#0B2419]">Email</label>
                  <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full mt-1 px-3 py-2.5 border rounded bg-[#FAF9F5] text-sm" />
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-bold text-[#0B2419]">Mật khẩu *</label>
              <div className="mt-1 flex border rounded bg-[#FAF9F5]">
                <input required type={showPassword?'text':'password'} value={password} onChange={(e)=>setPassword(e.target.value)} className="flex-1 px-3 py-2.5 bg-transparent text-sm outline-none" />
                <button type="button" onClick={()=>setShowPassword((value)=>!value)} className="px-3 text-[#687069]"><span className="material-symbols-outlined text-[18px]">{showPassword?'visibility_off':'visibility'}</span></button>
              </div>
            </div>

            <button className="w-full py-3 bg-[#0B2419] hover:bg-[#1B5038] text-white text-xs font-bold uppercase tracking-wider rounded">
              {mode === 'login' ? 'Đăng nhập mock' : 'Đăng ký mock'}
            </button>
          </form>

          <div className="mt-5 p-3 bg-[#FAF4DF] border border-[#E8C75B]/30 rounded text-[11px] text-[#625f4e]">
            Login response mock có <strong>access_token</strong>, <strong>token_type=Bearer</strong>, <strong>expires_in</strong> và <strong>account</strong>; không tạo refresh endpoint.
          </div>
        </div>
      </div>
    </div>
  );
};
