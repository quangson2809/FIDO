import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { profileService } from '../features/auth/api/profileService';
import type { MeDto } from '../features/auth/types';

export const ProfileScreen: React.FC = () => {
  const { showToast } = useApp();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<MeDto | null>(null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [editingAddressText, setEditingAddressText] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      try {
        const me = await profileService.getMe();
        if (!active) return;
        setProfile(me);
        setPhone(me.account.phone);
        setEmail(me.account.email ?? '');
        setError(null);
      } catch {
        if (active) setError('Không thể tải hồ sơ. Vui lòng đăng nhập lại nếu phiên đã hết hạn.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadProfile();
    return () => { active = false; };
  }, []);

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedPhone = phone.trim();
    const normalizedEmail = email.trim();
    if (!normalizedPhone) {
      showToast('Số điện thoại không được để trống.');
      return;
    }
    setSavingProfile(true);
    try {
      const account = await profileService.updateProfile({ phone: normalizedPhone, ...(normalizedEmail ? { email: normalizedEmail } : {}) });
      setProfile((current) => current ? { ...current, account } : current);
      setPhone(account.phone);
      setEmail(account.email ?? '');
      showToast('Đã cập nhật hồ sơ.');
    } catch {
      showToast('Không thể cập nhật hồ sơ.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddAddress = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const addressText = newAddress.trim();
    if (!addressText) return;
    setSavingAddress(true);
    try {
      const address = await profileService.addAddress({ address_text: addressText });
      setProfile((current) => current ? { ...current, addresses: [...current.addresses, address] } : current);
      setNewAddress('');
      showToast('Đã thêm địa chỉ.');
    } catch {
      showToast('Không thể thêm địa chỉ.');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleUpdateAddress = async (addressId: number) => {
    const addressText = editingAddressText.trim();
    if (!addressText) return;
    setSavingAddress(true);
    try {
      const updated = await profileService.updateAddress(addressId, { address_text: addressText });
      setProfile((current) => current ? { ...current, addresses: current.addresses.map((address) => address.address_id === addressId ? updated : address) } : current);
      setEditingAddressId(null);
      setEditingAddressText('');
      showToast('Đã cập nhật địa chỉ.');
    } catch {
      showToast('Không thể cập nhật địa chỉ.');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (addressId: number) => {
    setSavingAddress(true);
    try {
      await profileService.deleteAddress(addressId);
      setProfile((current) => current ? { ...current, addresses: current.addresses.filter((address) => address.address_id !== addressId) } : current);
      showToast('Đã xóa địa chỉ.');
    } catch {
      showToast('Không thể xóa địa chỉ.');
    } finally {
      setSavingAddress(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#FAF9F5] px-6 py-20 text-center text-sm text-[#0B2419]/60">Đang tải hồ sơ...</div>;
  if (error || !profile) {
    return <div className="min-h-screen bg-[#FAF9F5] px-6 py-20 text-center text-[#0B2419]"><p className="text-sm">{error ?? 'Không có dữ liệu hồ sơ.'}</p><button type="button" onClick={() => navigate('/login')} className="mt-5 bg-[#0B2419] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white">Đến trang đăng nhập</button></div>;
  }

  const roleNames = profile.roles.map((role) => role.code).join(' · ');

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#0B2419]">
      <section className="relative overflow-hidden bg-[#071A12] text-white">
        <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full border border-[#E8C75B]/20" />
        <div className="absolute -bottom-48 left-1/3 h-[420px] w-[420px] rounded-full border border-white/5" />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E8C75B] text-[#071A12]"><span className="material-symbols-outlined text-[30px]">person</span></div>
              <div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#E8C75B]">FIDO Account</p><h1 className="mt-1 font-serif text-3xl">Hồ sơ của tôi</h1><p className="mt-1 text-xs text-white/55">{roleNames || 'Tài khoản'}</p></div>
            </div>
            <button type="button" onClick={() => navigate('/orders')} className="border border-white/25 bg-white/5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white backdrop-blur transition hover:bg-white/10">Đơn hàng của tôi</button>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="border border-[#E8E9E3] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#687069]">Account overview</p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="border-b border-[#E8E9E3] pb-3"><p className="text-[10px] uppercase tracking-wider text-[#687069]">Số điện thoại</p><p className="mt-1 font-semibold">{profile.account.phone}</p></div>
              <div className="border-b border-[#E8E9E3] pb-3"><p className="text-[10px] uppercase tracking-wider text-[#687069]">Email</p><p className="mt-1 break-all font-semibold">{profile.account.email ?? 'Chưa có'}</p></div>
              <div><p className="text-[10px] uppercase tracking-wider text-[#687069]">Địa chỉ đã lưu</p><p className="mt-1 font-serif text-2xl font-bold">{profile.addresses.length}</p></div>
            </div>
          </div>
          <button type="button" onClick={() => navigate('/products')} className="flex w-full items-center justify-between border border-[#0B2419] bg-[#0B2419] px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white"><span>Tiếp tục mua sắm</span><span className="material-symbols-outlined text-[18px]">arrow_forward</span></button>
        </aside>

        <div className="space-y-6">
          <section className="border border-[#E8E9E3] bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3 border-b border-[#E8E9E3] pb-4"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFFDF5] ring-1 ring-[#E8E9E3]"><span className="material-symbols-outlined">manage_accounts</span></span><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#687069]">Profile</p><h2 className="font-serif text-xl">Thông tin tài khoản</h2></div></div>
            <form onSubmit={handleSaveProfile} className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs font-medium"><span>Số điện thoại *</span><input value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={20} required className="w-full border border-[#D9DDD6] bg-[#FAF9F5] px-3.5 py-3 text-sm outline-none transition focus:border-[#0B2419]" /></label>
              <label className="space-y-1.5 text-xs font-medium"><span>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} className="w-full border border-[#D9DDD6] bg-[#FAF9F5] px-3.5 py-3 text-sm outline-none transition focus:border-[#0B2419]" /></label>
              <div className="sm:col-span-2"><button type="submit" disabled={savingProfile} className="bg-[#0B2419] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#1B5038] disabled:opacity-50">{savingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}</button></div>
            </form>
          </section>

          <section className="border border-[#E8E9E3] bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col justify-between gap-3 border-b border-[#E8E9E3] pb-4 sm:flex-row sm:items-end">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFFDF5] ring-1 ring-[#E8E9E3]"><span className="material-symbols-outlined">location_on</span></span><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#687069]">Addresses</p><h2 className="font-serif text-xl">Địa chỉ đã lưu</h2></div></div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#687069]">{profile.addresses.length} địa chỉ</span>
            </div>

            <form onSubmit={handleAddAddress} className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input value={newAddress} onChange={(event) => setNewAddress(event.target.value)} maxLength={500} placeholder="Nhập địa chỉ mới" className="min-w-0 flex-1 border border-[#D9DDD6] bg-[#FAF9F5] px-3.5 py-3 text-sm outline-none transition focus:border-[#0B2419]" />
              <button type="submit" disabled={savingAddress || !newAddress.trim()} className="bg-[#0B2419] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50">Thêm địa chỉ</button>
            </form>

            <div className="mt-6 grid gap-3">
              {profile.addresses.length === 0 && <div className="border border-dashed border-[#D9DDD6] bg-[#FFFDF5] px-4 py-10 text-center"><span className="material-symbols-outlined text-3xl text-[#687069]">home_pin</span><p className="mt-2 text-sm text-[#687069]">Chưa có địa chỉ đã lưu.</p></div>}

              {profile.addresses.map((address, index) => (
                <article key={address.address_id} className="border border-[#E8E9E3] bg-[#FFFDF5] p-4 sm:p-5">
                  {editingAddressId === address.address_id ? (
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input value={editingAddressText} onChange={(event) => setEditingAddressText(event.target.value)} maxLength={500} className="min-w-0 flex-1 border border-[#D9DDD6] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0B2419]" />
                      <button type="button" disabled={savingAddress || !editingAddressText.trim()} onClick={() => void handleUpdateAddress(address.address_id)} className="bg-[#0B2419] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">Lưu</button>
                      <button type="button" onClick={() => { setEditingAddressId(null); setEditingAddressText(''); }} className="border border-[#D9DDD6] bg-white px-4 py-2.5 text-xs font-semibold">Hủy</button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0B2419] text-[11px] font-bold text-[#E8C75B]">{index + 1}</span><p className="pt-1 text-sm leading-6">{address.address_text}</p></div>
                      <div className="flex shrink-0 gap-2"><button type="button" onClick={() => { setEditingAddressId(address.address_id); setEditingAddressText(address.address_text); }} className="border border-[#D9DDD6] bg-white px-3 py-1.5 text-xs font-semibold">Sửa</button><button type="button" disabled={savingAddress} onClick={() => void handleDeleteAddress(address.address_id)} className="border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50">Xóa</button></div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};