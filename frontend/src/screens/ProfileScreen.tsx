import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const ProfileScreen: React.FC = () => {
  const { userProfile, updateUserProfile, setCurrentScreen, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'info' | 'measurements' | 'addresses'>('info');

  const [formData, setFormData] = useState({
    name: userProfile.fullName || userProfile.name || 'Nguyễn Hoàng Nam',
    email: userProfile.email || 'hoangnam@example.com',
    phone: userProfile.phone || '0912 345 678',
    address: userProfile.address || userProfile.addresses[0]?.address || '128 Nguyễn Trãi',
    city: userProfile.city || 'TP. Hồ Chí Minh',
    district: userProfile.district || 'Quận 1',
  });

  const defaultMeasurements = {
    height: 178,
    weight: 70,
    chest: 96,
    waist: 80,
    hips: 98,
    shoulder: 44,
    inseam: 78,
    preferredPantsLength: 96,
  };

  const [measurements, setMeasurements] = useState(
    userProfile.measurements || defaultMeasurements
  );

  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({
      fullName: formData.name,
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      city: formData.city,
      district: formData.district,
    });
    showToast('Đã lưu thông tin cá nhân thành công!');
  };

  const handleSaveMeasurements = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({ measurements });
    showToast('Đã cập nhật hồ sơ số đo may đo Atelier Vert!');
  };

  const memberTier = userProfile.membershipTier || userProfile.tier || 'ATELIER PRIVILEGE VIP';
  const memberName = userProfile.fullName || userProfile.name || 'Nguyễn Hoàng Nam';
  const points = userProfile.loyaltyPoints ?? userProfile.tierPoints ?? 24500;

  return (
    <div className="bg-[#FAF9F5] min-h-screen text-[#0B2419] font-['Plus_Jakarta_Sans',sans-serif] py-8 lg:py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#0B2419]/60 uppercase tracking-widest mb-6">
          <button onClick={() => setCurrentScreen('home')} className="hover:text-[#0B2419]">
            Trang chủ
          </button>
          <span>/</span>
          <span className="text-[#0B2419] font-semibold">Tài Khoản Thành Viên</span>
        </div>

        {/* Member Card Banner */}
        <div className="bg-gradient-to-r from-[#071A12] via-[#0B2419] to-[#123A29] text-white p-6 sm:p-8 mb-8 relative overflow-hidden shadow-lg">
          <div className="absolute right-0 top-0 w-80 h-80 bg-radial from-[#E8C75B]/20 to-transparent pointer-events-none -mr-20 -mt-20"></div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-[#E8C75B] animate-pulse"></span>
                <span className="text-xs uppercase tracking-[0.2em] text-[#E8C75B] font-bold">
                  {memberTier}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-['Playfair_Display',serif] font-bold">
                {memberName}
              </h1>
              <p className="text-xs text-white/70 mt-1">
                Mã hội viên: <span className="font-mono text-[#E8C75B] font-semibold">FID-VIP-88992</span> | Thành viên từ: 2024
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <span className="text-[11px] uppercase tracking-wider text-white/60 block">Điểm tích lũy</span>
                <span className="text-2xl font-bold font-mono text-[#E8C75B]">
                  {points.toLocaleString()} <span className="text-xs font-normal text-white">pts</span>
                </span>
                <span className="text-[10px] text-white/50 block mt-0.5">Tương đương 185.000₫ ưu đãi</span>
              </div>
              <button
                onClick={() => setCurrentScreen('my-orders')}
                className="px-4 py-2.5 bg-white text-[#0B2419] text-xs font-semibold uppercase tracking-wider hover:bg-white/90 transition-colors"
              >
                Đơn hàng của tôi
              </button>
            </div>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Navigation Sidebar */}
          <div className="md:col-span-1 space-y-2">
            <button
              onClick={() => setActiveTab('info')}
              className={`w-full text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-between ${
                activeTab === 'info'
                  ? 'bg-[#0B2419] text-white'
                  : 'bg-white text-[#0B2419] border border-[#0B2419]/10 hover:bg-[#FAF9F5]'
              }`}
            >
              <span>Thông tin chung</span>
              <span className="material-symbols-outlined text-sm">person</span>
            </button>
            <button
              onClick={() => setActiveTab('measurements')}
              className={`w-full text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-between ${
                activeTab === 'measurements'
                  ? 'bg-[#0B2419] text-white'
                  : 'bg-white text-[#0B2419] border border-[#0B2419]/10 hover:bg-[#FAF9F5]'
              }`}
            >
              <span>Hồ sơ số đo may đo</span>
              <span className="material-symbols-outlined text-sm">straighten</span>
            </button>
            <button
              onClick={() => setActiveTab('addresses')}
              className={`w-full text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-between ${
                activeTab === 'addresses'
                  ? 'bg-[#0B2419] text-white'
                  : 'bg-white text-[#0B2419] border border-[#0B2419]/10 hover:bg-[#FAF9F5]'
              }`}
            >
              <span>Sổ địa chỉ nhận hàng</span>
              <span className="material-symbols-outlined text-sm">home_pin</span>
            </button>
            <button
              onClick={() => setCurrentScreen('my-orders')}
              className="w-full text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider bg-white text-[#0B2419] border border-[#0B2419]/10 hover:bg-[#FAF9F5] transition-all flex items-center justify-between"
            >
              <span>Lịch sử đơn hàng</span>
              <span className="material-symbols-outlined text-sm">receipt_long</span>
            </button>
            <button
              onClick={() => setCurrentScreen('showrooms')}
              className="w-full text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider bg-white text-[#0B2419] border border-[#0B2419]/10 hover:bg-[#FAF9F5] transition-all flex items-center justify-between"
            >
              <span>Đặt lịch Fitting Showroom</span>
              <span className="material-symbols-outlined text-sm">calendar_month</span>
            </button>
          </div>

          {/* Main Content Area */}
          <div className="md:col-span-3">
            {activeTab === 'info' && (
              <div className="bg-white border border-[#0B2419]/10 p-6 sm:p-8 shadow-xs">
                <h3 className="text-base font-bold text-[#0B2419] mb-4 pb-2 border-b border-[#0B2419]/10">
                  Thông Tin Cá Nhân
                </h3>
                <form onSubmit={handleSaveInfo} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#0B2419] mb-1">Họ và tên</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full text-xs px-3.5 py-2.5 border border-[#0B2419]/20 focus:outline-none focus:border-[#0B2419] bg-[#FAF9F5]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#0B2419] mb-1">Số điện thoại</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full text-xs px-3.5 py-2.5 border border-[#0B2419]/20 focus:outline-none focus:border-[#0B2419] bg-[#FAF9F5]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#0B2419] mb-1">Địa chỉ Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full text-xs px-3.5 py-2.5 border border-[#0B2419]/20 focus:outline-none focus:border-[#0B2419] bg-[#FAF9F5]"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-[#0B2419] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#123A29] transition-colors"
                    >
                      Lưu thay đổi
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'measurements' && (
              <div className="bg-white border border-[#0B2419]/10 p-6 sm:p-8 shadow-xs">
                <div className="flex items-center justify-between pb-2 mb-4 border-b border-[#0B2419]/10">
                  <div>
                    <h3 className="text-base font-bold text-[#0B2419]">Hồ Sơ Số Đo May Đo</h3>
                    <p className="text-xs text-[#0B2419]/60">
                      Hệ thống tự động áp dụng khi quý khách chọn tính năng &quot;Miễn phí lên gấu may đo&quot; khi mua hàng
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-2xl text-[#123A29]">design_services</span>
                </div>

                <form onSubmit={handleSaveMeasurements} className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] font-medium text-[#0B2419] mb-1">Chiều cao (cm)</label>
                      <input
                        type="number"
                        value={measurements.height}
                        onChange={(e) => setMeasurements({ ...measurements, height: Number(e.target.value) })}
                        className="w-full text-xs px-3 py-2 border border-[#0B2419]/20 bg-[#FAF9F5]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#0B2419] mb-1">Cân nặng (kg)</label>
                      <input
                        type="number"
                        value={measurements.weight}
                        onChange={(e) => setMeasurements({ ...measurements, weight: Number(e.target.value) })}
                        className="w-full text-xs px-3 py-2 border border-[#0B2419]/20 bg-[#FAF9F5]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#0B2419] mb-1">Vòng ngực (cm)</label>
                      <input
                        type="number"
                        value={measurements.chest}
                        onChange={(e) => setMeasurements({ ...measurements, chest: Number(e.target.value) })}
                        className="w-full text-xs px-3 py-2 border border-[#0B2419]/20 bg-[#FAF9F5]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#0B2419] mb-1">Vòng eo (cm)</label>
                      <input
                        type="number"
                        value={measurements.waist}
                        onChange={(e) => setMeasurements({ ...measurements, waist: Number(e.target.value) })}
                        className="w-full text-xs px-3 py-2 border border-[#0B2419]/20 bg-[#FAF9F5]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#0B2419] mb-1">Vòng mông (cm)</label>
                      <input
                        type="number"
                        value={measurements.hips}
                        onChange={(e) => setMeasurements({ ...measurements, hips: Number(e.target.value) })}
                        className="w-full text-xs px-3 py-2 border border-[#0B2419]/20 bg-[#FAF9F5]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#0B2419] mb-1">Rộng vai (cm)</label>
                      <input
                        type="number"
                        value={measurements.shoulder}
                        onChange={(e) => setMeasurements({ ...measurements, shoulder: Number(e.target.value) })}
                        className="w-full text-xs px-3 py-2 border border-[#0B2419]/20 bg-[#FAF9F5]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#0B2419] mb-1">Dài đáy / Inseam (cm)</label>
                      <input
                        type="number"
                        value={measurements.inseam}
                        onChange={(e) => setMeasurements({ ...measurements, inseam: Number(e.target.value) })}
                        className="w-full text-xs px-3 py-2 border border-[#0B2419]/20 bg-[#FAF9F5]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#0B2419] mb-1">Dài quần mong muốn (cm)</label>
                      <input
                        type="number"
                        value={measurements.preferredPantsLength}
                        onChange={(e) =>
                          setMeasurements({ ...measurements, preferredPantsLength: Number(e.target.value) })
                        }
                        className="w-full text-xs px-3 py-2 border border-[#0B2419]/20 bg-[#FAF9F5]"
                      />
                    </div>
                  </div>

                  <div className="bg-[#FFFDF5] border border-[#0B2419]/10 p-3 text-xs text-[#0B2419]/70 flex items-center gap-2 mt-4">
                    <span className="material-symbols-outlined text-base text-[#123A29]">info</span>
                    Quý khách có thể ghé bất kỳ Showroom nào để chuyên viên đo may kiểm tra số đo miễn phí 100%.
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-[#0B2419] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#123A29] transition-colors"
                    >
                      Lưu Hồ Sơ Số Đo
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'addresses' && (
              <div className="bg-white border border-[#0B2419]/10 p-6 sm:p-8 shadow-xs">
                <div className="flex items-center justify-between pb-2 mb-4 border-b border-[#0B2419]/10">
                  <h3 className="text-base font-bold text-[#0B2419]">Sổ Địa Chỉ Giao Nhận</h3>
                  <button
                    onClick={() => showToast('Mở cửa sổ thêm địa chỉ mới')}
                    className="text-xs font-semibold text-[#123A29] underline"
                  >
                    + Thêm địa chỉ mới
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-4 border-2 border-[#0B2419] bg-[#FAF9F5] relative">
                    <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider bg-[#0B2419] text-white px-2 py-0.5">
                      Mặc định
                    </span>
                    <h4 className="text-xs font-bold text-[#0B2419]">{memberName}</h4>
                    <p className="text-xs text-[#0B2419]/70 mt-1">{userProfile.phone}</p>
                    <p className="text-xs text-[#0B2419]/80 mt-1">
                      {formData.address}, {formData.district}, {formData.city}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
