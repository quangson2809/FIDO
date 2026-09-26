import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const ProfileScreen: React.FC = () => {
  const { userProfile, updateUserProfile, setCurrentScreen, showToast } = useApp();
  const [phone, setPhone] = useState(userProfile.phone);
  const [email, setEmail] = useState(userProfile.email);

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    updateUserProfile({ phone, email });
    showToast('Mock PATCH /api/v1/me: chỉ cập nhật phone/email.');
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex items-center gap-2 text-xs text-[#687069]">
          <button onClick={()=>setCurrentScreen('home')} className="hover:text-[#0B2419]">Trang chủ</button>
          <span>/</span><span className="font-bold text-[#0B2419]">Tài khoản</span>
        </div>

        <section className="bg-[#0B2419] text-white rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#E8C75B] font-bold">MeDto mock</div>
            <h1 className="font-['Playfair_Display',serif] text-3xl mt-2">Tài khoản #{userProfile.id}</h1>
            <p className="text-xs text-white/60 mt-1">Thành viên từ {userProfile.joinedDate}</p>
          </div>
          <button onClick={()=>setCurrentScreen('my-orders')} className="px-4 py-2.5 bg-[#E8C75B] text-[#071A12] text-xs font-bold rounded">Đơn hàng của tôi</button>
        </section>

        <div className="grid lg:grid-cols-5 gap-5">
          <form onSubmit={save} className="lg:col-span-3 bg-white border border-[#E8E9E3] rounded-lg p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="font-bold text-[#0B2419]">AccountDto</h2>
              <p className="text-xs text-[#687069] mt-1">Profile baseline cho phép cập nhật phone và email.</p>
            </div>
            <div>
              <label className="text-xs font-bold">Số điện thoại</label>
              <input value={phone} onChange={(e)=>setPhone(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded"/>
            </div>
            <div>
              <label className="text-xs font-bold">Email</label>
              <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded"/>
            </div>
            <button className="px-5 py-2.5 bg-[#0B2419] text-white text-xs font-bold rounded">Lưu mock</button>
          </form>

          <section className="lg:col-span-2 bg-white border border-[#E8E9E3] rounded-lg p-5 sm:p-6">
            <h2 className="font-bold text-[#0B2419]">AddressDto[]</h2>
            <p className="text-xs text-[#687069] mt-1 mb-4">Không mock is_default vì schema baseline không có field này.</p>
            <div className="space-y-3">
              {userProfile.addresses.map((address)=>(
                <div key={address.id} className="p-3 bg-[#FAF9F5] rounded text-xs">
                  <div className="font-mono font-bold">#{address.id}</div>
                  <div className="mt-1">{address.address}</div>
                </div>
              ))}
              {!userProfile.addresses.length && <p className="text-xs text-[#687069]">Chưa có địa chỉ.</p>}
            </div>
          </section>
        </div>

        <div className="bg-white border border-[#E8E9E3] rounded-lg p-5 text-xs text-[#687069]">
          Các dữ liệu membership tier, loyalty point, số đo may đo và display name không được dùng làm mock nghiệp vụ ở màn này vì không thuộc MeDto baseline.
        </div>
      </div>
    </div>
  );
};
