import { StorefrontIcon } from '../components/StorefrontIcon';
import { LogoutButton } from '../shared/ui/storefront/LogoutButton';
import { QueryFeedback } from '../shared/ui/storefront/QueryFeedback';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../shared/ui/toast/useToast';
import { profileService } from '../features/auth/api/profileService';
import type { AddressDto, AddressInput, MeDto } from '../features/auth/types';
import { getStorefrontErrorMessage } from '../services/http/storefrontError';

type AddressFieldKey =
  | 'recipient_name'
  | 'recipient_phone'
  | 'province'
  | 'district'
  | 'ward'
  | 'address_line';

const addressFieldDefinitions: ReadonlyArray<{
  key: AddressFieldKey;
  label: string;
  maxLength: number;
  autoComplete: string;
}> = [
  { key: 'recipient_name', label: 'Họ tên người nhận', maxLength: 150, autoComplete: 'name' },
  { key: 'recipient_phone', label: 'Số điện thoại người nhận', maxLength: 20, autoComplete: 'tel' },
  { key: 'province', label: 'Tỉnh / thành phố', maxLength: 120, autoComplete: 'address-level1' },
  { key: 'district', label: 'Quận / huyện', maxLength: 120, autoComplete: 'address-level2' },
  { key: 'ward', label: 'Phường / xã', maxLength: 120, autoComplete: 'address-level3' },
  { key: 'address_line', label: 'Địa chỉ cụ thể', maxLength: 500, autoComplete: 'street-address' },
];

const emptyAddressInput = (): AddressInput => ({
  recipient_name: '',
  recipient_phone: '',
  province: '',
  district: '',
  ward: '',
  address_line: '',
});

const addressInputFromDto = (address: AddressDto): AddressInput => ({
  recipient_name: address.recipient_name ?? '',
  recipient_phone: address.recipient_phone ?? '',
  province: address.province ?? '',
  district: address.district ?? '',
  ward: address.ward ?? '',
  address_line: address.address_line ?? '',
  is_default: address.is_default,
});

const normalizeAddressInput = (input: AddressInput): AddressInput | null => {
  const normalized: AddressInput = {
    recipient_name: input.recipient_name.trim(),
    recipient_phone: input.recipient_phone.trim(),
    province: input.province.trim(),
    district: input.district.trim(),
    ward: input.ward.trim(),
    address_line: input.address_line.trim(),
    ...(typeof input.is_default === 'boolean' ? { is_default: input.is_default } : {}),
  };
  const required: AddressFieldKey[] = [
    'recipient_name', 'recipient_phone', 'province', 'district', 'ward', 'address_line',
  ];
  return required.every((field) => normalized[field].length > 0) ? normalized : null;
};

const AddressFields: React.FC<{
  value: AddressInput;
  onChange: (field: AddressFieldKey, value: string) => void;
  disabled: boolean;
  inputPrefix: string;
}> = ({ value, onChange, disabled, inputPrefix }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    {addressFieldDefinitions.map((field) => (
      <label key={field.key} className="space-y-1.5 text-xs font-medium">
        <span>{field.label} *</span>
        <input
          aria-label={field.label + ' (' + inputPrefix + ')'}
          autoComplete={field.autoComplete}
          required
          maxLength={field.maxLength}
          disabled={disabled}
          value={value[field.key]}
          onChange={(event) => onChange(field.key, event.target.value)}
          className="w-full border border-[#D9DDD6] bg-[#FAF9F5] px-3.5 py-3 text-sm outline-none transition focus:border-[#0B2419] disabled:opacity-60"
        />
      </label>
    ))}
  </div>
);

export const ProfileScreen: React.FC = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<MeDto | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [newAddress, setNewAddress] = useState<AddressInput>(emptyAddressInput);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [editingAddress, setEditingAddress] = useState<AddressInput>(emptyAddressInput);
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      setLoading(true);
      try {
        const me = await profileService.getMe();
        if (!active) return;
        setProfile(me);
        setFullName(me.account.full_name ?? '');
        setEmail(me.account.email ?? '');
        setError(null);
      } catch (requestError: unknown) {
        if (active)
          setError(
            getStorefrontErrorMessage(
              requestError,
              'Không thể tải hồ sơ. Vui lòng đăng nhập lại nếu phiên đã hết hạn.',
            ),
          );
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadProfile();
    return () => {
      active = false;
    };
  }, [retry]);

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim();
    if (!normalizedName) {
      showToast('Họ và tên không được để trống.');
      return;
    }
    setSavingProfile(true);
    try {
      const account = await profileService.updateProfile({
        full_name: normalizedName,
        ...(normalizedEmail ? { email: normalizedEmail } : {}),
      });
      setProfile((current) => (current ? { ...current, account } : current));
      setFullName(account.full_name ?? normalizedName);
      setEmail(account.email ?? '');
      showToast('Đã cập nhật hồ sơ.');
    } catch (requestError: unknown) {
      showToast(getStorefrontErrorMessage(requestError, 'Không thể cập nhật hồ sơ.'));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddAddress = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = normalizeAddressInput(newAddress);
    if (!normalized) {
      showToast('Vui lòng nhập đầy đủ thông tin người nhận và địa chỉ.');
      return;
    }
    setSavingAddress(true);
    try {
      const address = await profileService.addAddress(normalized);
      setProfile((current) =>
        current ? { ...current, addresses: [...current.addresses, address] } : current,
      );
      setNewAddress(emptyAddressInput());
      showToast('Đã thêm địa chỉ.');
    } catch (requestError: unknown) {
      showToast(getStorefrontErrorMessage(requestError, 'Không thể thêm địa chỉ.'));
    } finally {
      setSavingAddress(false);
    }
  };

  const handleUpdateAddress = async (addressId: number) => {
    const normalized = normalizeAddressInput(editingAddress);
    if (!normalized) {
      showToast('Vui lòng nhập đầy đủ thông tin người nhận và địa chỉ.');
      return;
    }
    setSavingAddress(true);
    try {
      const updated = await profileService.updateAddress(addressId, normalized);
      setProfile((current) =>
        current
          ? {
              ...current,
              addresses: current.addresses.map((address) =>
                address.address_id === addressId ? updated : address,
              ),
            }
          : current,
      );
      setEditingAddressId(null);
      setEditingAddress(emptyAddressInput());
      showToast('Đã cập nhật địa chỉ.');
    } catch (requestError: unknown) {
      showToast(getStorefrontErrorMessage(requestError, 'Không thể cập nhật địa chỉ.'));
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (addressId: number) => {
    setSavingAddress(true);
    try {
      await profileService.deleteAddress(addressId);
      setProfile((current) =>
        current
          ? {
              ...current,
              addresses: current.addresses.filter((address) => address.address_id !== addressId),
            }
          : current,
      );
      showToast('Đã xóa địa chỉ.');
    } catch (requestError: unknown) {
      showToast(getStorefrontErrorMessage(requestError, 'Không thể xóa địa chỉ.'));
    } finally {
      setSavingAddress(false);
    }
  };

  if (loading)
    return (
      <div
        role="status"
        className="min-h-screen bg-[#FAF9F5] px-6 py-20 text-center text-sm text-muted-grey"
      >
        Đang tải hồ sơ...
      </div>
    );
  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#FAF9F5] px-6 py-20 text-center text-[#0B2419]">
        <QueryFeedback
          error={error ?? 'Không có dữ liệu hồ sơ.'}
          onRetry={() => setRetry((value) => value + 1)}
        />
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="mt-5 bg-[#0B2419] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white"
        >
          Đến trang đăng nhập
        </button>
      </div>
    );
  }

  const roleNames = profile.roles
    .map((role) => (role.code === 'CUSTOMER' ? 'Khách hàng' : role.name))
    .join(' · ');

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#0B2419]">
      <section className="relative overflow-hidden bg-[#071A12] text-white">
        <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full border border-[#E8C75B]/20" />
        <div className="absolute -bottom-48 left-1/3 h-[420px] w-[420px] rounded-full border border-white/5" />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E8C75B] text-[#071A12]">
                <StorefrontIcon name="person" className="h-8 w-8 text-[30px]" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#E8C75B]">
                  FIDO Account
                </p>
                <h1 className="mt-1 font-serif text-3xl">Hồ sơ của tôi</h1>
                <p className="mt-1 text-xs text-white/55">{roleNames || 'Tài khoản'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/orders')}
              className="border border-white/25 bg-white/5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white backdrop-blur transition hover:bg-white/10"
            >
              Đơn hàng của tôi
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="border border-[#E8E9E3] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#687069]">
              Tổng quan tài khoản
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="border-b border-[#E8E9E3] pb-3">
                <p className="text-[10px] uppercase tracking-wider text-[#687069]">Số điện thoại</p>
                <p className="mt-1 font-semibold">{profile.account.phone}</p>
              </div>
              <div className="border-b border-[#E8E9E3] pb-3">
                <p className="text-[10px] uppercase tracking-wider text-[#687069]">Email</p>
                <p className="mt-1 break-all font-semibold">{profile.account.email ?? 'Chưa có'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#687069]">
                  Địa chỉ đã lưu
                </p>
                <p className="mt-1 font-serif text-2xl font-bold">{profile.addresses.length}</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="flex w-full items-center justify-between border border-[#0B2419] bg-[#0B2419] px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-white"
          >
            <span>Tiếp tục mua sắm</span>
            <StorefrontIcon name="arrow_forward" className="h-5 w-5 text-[18px]" />
          </button>
          <LogoutButton className="w-full border border-border-subtle bg-white text-left" />
        </aside>

        <div className="space-y-6">
          <section className="border border-[#E8E9E3] bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-3 border-b border-[#E8E9E3] pb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFFDF5] ring-1 ring-[#E8E9E3]">
                <StorefrontIcon name="manage_accounts" className="h-5 w-5 " />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#687069]">
                  Hồ sơ
                </p>
                <h2 className="font-serif text-xl">Thông tin tài khoản</h2>
              </div>
            </div>
            <form onSubmit={handleSaveProfile} className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs font-medium">
                <span>Họ và tên *</span>
                <input
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  maxLength={150}
                  required
                  className="w-full border border-[#D9DDD6] bg-[#FAF9F5] px-3.5 py-3 text-sm outline-none transition focus:border-[#0B2419]"
                />
              </label>
              <label className="space-y-1.5 text-xs font-medium">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  maxLength={254}
                  className="w-full border border-[#D9DDD6] bg-[#FAF9F5] px-3.5 py-3 text-sm outline-none transition focus:border-[#0B2419]"
                />
              </label>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="bg-[#0B2419] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#1B5038] disabled:opacity-50"
                >
                  {savingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </section>

          <section className="border border-[#E8E9E3] bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col justify-between gap-3 border-b border-[#E8E9E3] pb-4 sm:flex-row sm:items-end">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFFDF5] ring-1 ring-[#E8E9E3]">
                  <StorefrontIcon name="location_on" className="h-5 w-5 " />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#687069]">
                    Địa chỉ
                  </p>
                  <h2 className="font-serif text-xl">Địa chỉ đã lưu</h2>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#687069]">
                {profile.addresses.length} địa chỉ
              </span>
            </div>

            <form onSubmit={handleAddAddress} className="mt-5 space-y-3">
              <AddressFields
                value={newAddress}
                onChange={(field, value) => setNewAddress((current) => ({ ...current, [field]: value }))}
                disabled={savingAddress}
                inputPrefix="địa chỉ mới"
              />
              <button
                type="submit"
                disabled={savingAddress || !normalizeAddressInput(newAddress)}
                className="bg-[#0B2419] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
              >
                {savingAddress ? 'Đang thêm...' : 'Thêm địa chỉ'}
              </button>
            </form>

            <div className="mt-6 grid gap-3">
              {profile.addresses.length === 0 && (
                <div className="border border-dashed border-[#D9DDD6] bg-[#FFFDF5] px-4 py-10 text-center">
                  <StorefrontIcon name="home_pin" className="h-8 w-8 text-3xl text-[#687069]" />
                  <p className="mt-2 text-sm text-[#687069]">Chưa có địa chỉ đã lưu.</p>
                </div>
              )}

              {profile.addresses.map((address, index) => (
                <article
                  key={address.address_id}
                  className="border border-[#E8E9E3] bg-[#FFFDF5] p-4 sm:p-5"
                >
                  {editingAddressId === address.address_id ? (
                    <div className="space-y-3">
                      <AddressFields
                        value={editingAddress}
                        onChange={(field, value) => setEditingAddress((current) => ({ ...current, [field]: value }))}
                        disabled={savingAddress}
                        inputPrefix="sửa địa chỉ"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={savingAddress || !normalizeAddressInput(editingAddress)}
                          onClick={() => void handleUpdateAddress(address.address_id)}
                          className="bg-[#0B2419] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          {savingAddress ? 'Đang lưu...' : 'Lưu'}
                        </button>
                        <button
                          type="button"
                          disabled={savingAddress}
                          onClick={() => {
                            setEditingAddressId(null);
                            setEditingAddress(emptyAddressInput());
                          }}
                          className="border border-[#D9DDD6] bg-white px-4 py-2.5 text-xs font-semibold"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0B2419] text-[11px] font-bold text-[#E8C75B]">
                          {index + 1}
                        </span>
                        <p className="pt-1 text-sm leading-6">{address.address_text}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          disabled={savingAddress}
                          onClick={() => {
                            setEditingAddressId(address.address_id);
                            setEditingAddress(addressInputFromDto(address));
                          }}
                          className="border border-[#D9DDD6] bg-white px-3 py-1.5 text-xs font-semibold"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          disabled={savingAddress}
                          onClick={() => void handleDeleteAddress(address.address_id)}
                          className="border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
};
