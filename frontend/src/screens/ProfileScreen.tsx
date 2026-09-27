import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const ProfileScreen: React.FC = () => {
  const { userProfile, updateUserProfile, setCurrentScreen, showToast } = useApp();
  const [phone, setPhone] = useState(userProfile.phone);
  const [email, setEmail] = useState(userProfile.email);
  const [addressText, setAddressText] = useState('');
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  const saveAccount = (event: React.FormEvent) => {
    event.preventDefault();
    updateUserProfile({ phone, email });
    showToast('Mock PATCH /api/v1/me: phone/email');
  };

  const saveAddress = (event: React.FormEvent) => {
    event.preventDefault();
    const value = addressText.trim();
    if (!value) return;

    const nextAddresses = editingAddressId
      ? userProfile.addresses.map((address) =>
          address.id === editingAddressId ? { ...address, address: value } : address,
        )
      : [
          ...userProfile.addresses,
          {
            id: String(Math.max(0, ...userProfile.addresses.map((item)=>Number(item.id) || 0)) + 1),
            code: '',
            name: 'Địa chỉ đã lưu',
            phone: userProfile.phone,
            address: value,
            isDefault: false,
            tag: 'Đã lưu',
          },
        ];

    updateUserProfile({ addresses: nextAddresses });
    showToast(
      editingAddressId
        ? `Mock PATCH /api/v1/me/addresses/${editingAddressId}`
        : 'Mock POST /api/v1/me/addresses',
    );
    setAddressText('');
    setEditingAddressId(null);
  };

  const removeAddress = (addressId: string) => {
    updateUserProfile({
      addresses: userProfile.addresses.filter((address)=>address.id!==addressId),
    });
    if (editingAddressId === addressId) {
      setEditingAddressId(null);
      setAddressText('');
    }
    showToast(`Mock DELETE /api/v1/me/addresses/${addressId}`);
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
            <p className="text-xs text-white/60 mt-1">Account + Address[] · không display_name/account_status trong contract.</p>
          </div>
          <button onClick={()=>setCurrentScreen('my-orders')} className="px-4 py-2.5 bg-[#E8C75B] text-[#071A12] text-xs font-bold rounded">Đơn hàng của tôi</button>
        </section>

        <div className="grid lg:grid-cols-5 gap-5">
          <form onSubmit={saveAccount} className="lg:col-span-2 bg-white border border-[#E8E9E3] rounded-lg p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="font-bold text-[#0B2419]">AccountDto</h2>
              <p className="text-xs text-[#687069] mt-1">PATCH /me chỉ cho phone/email.</p>
            </div>
            <div>
              <label className="text-xs font-bold">Số điện thoại</label>
              <input value={phone} onChange={(e)=>setPhone(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded"/>
            </div>
            <div>
              <label className="text-xs font-bold">Email</label>
              <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded"/>
            </div>
            <button className="px-5 py-2.5 bg-[#0B2419] text-white text-xs font-bold rounded">Lưu account mock</button>
          </form>

          <section className="lg:col-span-3 bg-white border border-[#E8E9E3] rounded-lg p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <h2 className="font-bold text-[#0B2419]">AddressDto[]</h2>
                <p className="text-xs text-[#687069] mt-1">Baseline không có is_default.</p>
              </div>
              <span className="text-xs bg-[#F5F6F2] px-3 py-1 rounded">{userProfile.addresses.length} địa chỉ</span>
            </div>

            <form onSubmit={saveAddress} className="mt-4 flex gap-2">
              <input
                required
                value={addressText}
                onChange={(e)=>setAddressText(e.target.value)}
                placeholder={editingAddressId ? 'Sửa address_text...' : 'Thêm address_text...'}
                className="flex-1 px-3 py-2 border rounded text-xs"
              />
              <button className="px-4 py-2 bg-[#0B2419] text-white text-xs font-bold rounded">
                {editingAddressId ? 'Cập nhật' : 'Thêm'}
              </button>
              {editingAddressId && (
                <button type="button" onClick={()=>{setEditingAddressId(null);setAddressText('');}} className="px-3 py-2 border text-xs font-bold rounded">Hủy</button>
              )}
            </form>

            <div className="mt-4 space-y-3">
              {userProfile.addresses.map((address)=>(
                <div key={address.id} className="p-3 bg-[#FAF9F5] rounded text-xs flex items-start justify-between gap-3">
                  <div>
                    <div className="font-mono font-bold">address_id #{address.id}</div>
                    <div className="mt-1">{address.address}</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button type="button" onClick={()=>{setEditingAddressId(address.id);setAddressText(address.address);}} className="px-2 py-1 border rounded font-bold">Sửa</button>
                    <button type="button" onClick={()=>removeAddress(address.id)} className="px-2 py-1 border border-[#BA1A1A]/30 text-[#BA1A1A] rounded font-bold">Xóa</button>
                  </div>
                </div>
              ))}
              {!userProfile.addresses.length && <p className="text-xs text-[#687069]">Chưa có địa chỉ.</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
