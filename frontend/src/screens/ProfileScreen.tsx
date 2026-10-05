import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { profileService } from '../features/auth/api/profileService';
import type { MeDto } from '../features/auth/types';

export const ProfileScreen: React.FC = () => {
  const { setCurrentScreen, showToast } = useApp();
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
        if (active) {
          setError('Không thể tải hồ sơ. Vui lòng đăng nhập lại nếu phiên đã hết hạn.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadProfile();
    return () => {
      active = false;
    };
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
      const account = await profileService.updateProfile({
        phone: normalizedPhone,
        ...(normalizedEmail ? { email: normalizedEmail } : {}),
      });
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
      setProfile((current) => current
        ? { ...current, addresses: [...current.addresses, address] }
        : current);
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
      setProfile((current) => current
        ? {
            ...current,
            addresses: current.addresses.map((address) =>
              address.address_id === addressId ? updated : address,
            ),
          }
        : current);
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
      setProfile((current) => current
        ? {
            ...current,
            addresses: current.addresses.filter((address) => address.address_id !== addressId),
          }
        : current);
      showToast('Đã xóa địa chỉ.');
    } catch {
      showToast('Không thể xóa địa chỉ.');
    } finally {
      setSavingAddress(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#FAF9F5] px-6 py-20 text-center text-sm text-[#0B2419]/60">Đang tải hồ sơ...</div>;
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] px-6 py-20 text-center text-[#0B2419]">
        <p className="text-sm">{error ?? 'Không có dữ liệu hồ sơ.'}</p>
        <button
          type="button"
          onClick={() => setCurrentScreen('auth')}
          className="mt-5 bg-[#0B2419] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white"
        >
          Đến trang đăng nhập
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] px-4 py-10 text-[#0B2419] sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-col gap-4 border-b border-[#0B2419]/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0B2419]/55">Tài khoản FIDO</p>
            <h1 className="mt-1 font-['Playfair_Display',serif] text-3xl font-bold">Hồ sơ của tôi</h1>
          </div>
          <button
            type="button"
            onClick={() => setCurrentScreen('my-orders')}
            className="border border-[#0B2419] px-4 py-2.5 text-xs font-bold uppercase tracking-wider"
          >
            Đơn hàng của tôi
          </button>
        </div>

        <section className="border border-[#0B2419]/10 bg-white p-6 sm:p-8">
          <h2 className="text-base font-bold">Thông tin tài khoản</h2>
          <p className="mt-1 text-xs text-[#0B2419]/55">
            FIDO hiện lưu hồ sơ cơ bản gồm số điện thoại và email. Các trường chưa có trong API không được hiển thị như dữ liệu tài khoản.
          </p>
          <form onSubmit={handleSaveProfile} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-medium">
              <span>Số điện thoại *</span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                maxLength={20}
                required
                className="w-full border border-[#0B2419]/20 bg-[#FAF9F5] px-3.5 py-2.5 text-sm outline-none focus:border-[#0B2419]"
              />
            </label>
            <label className="space-y-1 text-xs font-medium">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={254}
                className="w-full border border-[#0B2419]/20 bg-[#FAF9F5] px-3.5 py-2.5 text-sm outline-none focus:border-[#0B2419]"
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="bg-[#0B2419] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
              >
                {savingProfile ? 'Đang lưu...' : 'Lưu hồ sơ'}
              </button>
            </div>
          </form>
        </section>

        <section className="border border-[#0B2419]/10 bg-white p-6 sm:p-8">
          <h2 className="text-base font-bold">Địa chỉ đã lưu</h2>
          <p className="mt-1 text-xs text-[#0B2419]/55">
            API hiện lưu nội dung địa chỉ; chưa có khái niệm địa chỉ mặc định, nhãn địa chỉ hay số điện thoại riêng cho từng địa chỉ.
          </p>

          <form onSubmit={handleAddAddress} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              value={newAddress}
              onChange={(event) => setNewAddress(event.target.value)}
              maxLength={500}
              placeholder="Nhập địa chỉ mới"
              className="min-w-0 flex-1 border border-[#0B2419]/20 bg-[#FAF9F5] px-3.5 py-2.5 text-sm outline-none focus:border-[#0B2419]"
            />
            <button
              type="submit"
              disabled={savingAddress || !newAddress.trim()}
              className="bg-[#0B2419] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
            >
              Thêm địa chỉ
            </button>
          </form>

          <div className="mt-6 space-y-3">
            {profile.addresses.length === 0 && (
              <div className="border border-dashed border-[#0B2419]/20 px-4 py-6 text-center text-sm text-[#0B2419]/55">
                Chưa có địa chỉ đã lưu.
              </div>
            )}

            {profile.addresses.map((address) => (
              <div key={address.address_id} className="border border-[#0B2419]/10 p-4">
                {editingAddressId === address.address_id ? (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      value={editingAddressText}
                      onChange={(event) => setEditingAddressText(event.target.value)}
                      maxLength={500}
                      className="min-w-0 flex-1 border border-[#0B2419]/20 px-3 py-2 text-sm outline-none focus:border-[#0B2419]"
                    />
                    <button
                      type="button"
                      disabled={savingAddress || !editingAddressText.trim()}
                      onClick={() => void handleUpdateAddress(address.address_id)}
                      className="bg-[#0B2419] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Lưu
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAddressId(null);
                        setEditingAddressText('');
                      }}
                      className="border border-[#0B2419]/20 px-4 py-2 text-xs font-semibold"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm leading-6">{address.address_text}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAddressId(address.address_id);
                          setEditingAddressText(address.address_text);
                        }}
                        className="border border-[#0B2419]/20 px-3 py-1.5 text-xs font-semibold"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        disabled={savingAddress}
                        onClick={() => void handleDeleteAddress(address.address_id)}
                        className="border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
