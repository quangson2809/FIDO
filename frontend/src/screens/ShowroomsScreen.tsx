import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { showroomService } from '../features/content/api/service';
import type { ShowroomDto } from '../features/content/types';

export const ShowroomsScreen: React.FC = () => {
  const { setCurrentScreen, showToast } = useApp();
  const [showrooms, setShowrooms] = useState<ShowroomDto[]>([]);
  const [selectedShowroom, setSelectedShowroom] = useState<ShowroomDto | null>(null);
  const [bookingDate, setBookingDate] = useState('2026-09-28');
  const [bookingTime, setBookingTime] = useState('15:00');
  const [guestCount, setGuestCount] = useState('1');
  const [serviceType, setServiceType] = useState('fitting-ready-to-wear');
  const [notes, setNotes] = useState('');

  React.useEffect(() => {
    showroomService.getShowrooms().then((list) => {
      setShowrooms(list);
      setSelectedShowroom(list[0] ?? null);
    });
  }, []);

  if (!selectedShowroom) {
    return <div>Loading...</div>;
  }

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(
      `Đã xác nhận đặt lịch hẹn Fitting tại ${selectedShowroom.name} vào ${bookingTime} ngày ${bookingDate}. Concierge sẽ gọi xác nhận trong 15 phút!`,
    );
  };

  return (
    <div className="bg-[#FAF9F5] min-h-screen text-[#0B2419] font-['Plus_Jakarta_Sans',sans-serif] py-8 lg:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#0B2419]/60 uppercase tracking-widest mb-6">
          <button onClick={() => setCurrentScreen('home')} className="hover:text-[#0B2419]">
            Trang chủ
          </button>
          <span>/</span>
          <span className="text-[#0B2419] font-semibold">Hệ Thống Showroom & Fitting Lounge</span>
        </div>

        {/* Hero title */}
        <div className="text-center pb-8 border-b border-[#0B2419]/10 mb-8">
          <span className="text-xs uppercase tracking-[0.25em] text-[#123A29] font-bold block mb-2">
            ATELIER VERT EXPERIENCE
          </span>
          <h1 className="text-3xl sm:text-4xl font-['Playfair_Display',serif] font-bold text-[#0B2419] mb-3">
            Không Gian Trải Nghiệm & May Đo Cá Nhân
          </h1>
          <p className="text-xs sm:text-sm text-[#0B2419]/70 max-w-xl mx-auto leading-relaxed">
            Ghé thăm không gian kiến trúc Atelier Vert tại Hà Nội và TP. Hồ Chí Minh để được phục vụ riêng bởi các thợ may bậc thầy và stylist chuyên môn cao.
          </p>
        </div>

        {/* 2-Column layout: Showroom list + Booking Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Showroom Cards */}
          <div className="lg:col-span-7 space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0B2419] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0B2419]"></span>
              Danh Sách Không Gian Trải Nghiệm ({showrooms.length})
            </h2>

            {showrooms.map((showroom) => (
              <div
                key={showroom.id}
                onClick={() => setSelectedShowroom(showroom)}
                className={`cursor-pointer transition-all border p-5 sm:p-6 bg-white ${
                  selectedShowroom.id === showroom.id
                    ? 'border-[#0B2419] shadow-md ring-1 ring-[#0B2419]'
                    : 'border-[#0B2419]/10 hover:border-[#0B2419]/40'
                }`}
              >
                <div className="flex flex-col sm:flex-row gap-5">
                  <img
                    src={showroom.imageUrl}
                    alt={showroom.name}
                    className="w-full sm:w-44 h-36 object-cover object-center shrink-0 border border-[#0B2419]/10"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-[#123A29] bg-[#123A29]/10 px-2 py-0.5">
                        {showroom.city.toUpperCase()}
                      </span>
                      {selectedShowroom.id === showroom.id && (
                        <span className="text-xs text-[#0B2419] font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm text-[#0B2419]">check_circle</span>
                          Đang chọn
                        </span>
                      )}
                    </div>
                    <h3 className="font-['Playfair_Display',serif] text-base font-bold text-[#0B2419] mt-2 mb-1">
                      {showroom.name}
                    </h3>
                    <p className="text-xs text-[#0B2419]/70 leading-relaxed mb-3 flex items-start gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#0B2419]/60 shrink-0 mt-0.5">
                        location_on
                      </span>
                      {showroom.address}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-[#0B2419]/70 pt-2 border-t border-[#0B2419]/5">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-[#0B2419]/50">schedule</span>
                        {showroom.openingHours}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-[#0B2419]/50">call</span>
                        {showroom.phone}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Booking Fitting Lounge Form */}
          <div className="lg:col-span-5 bg-white border border-[#0B2419]/10 p-6 sm:p-8 shadow-sm">
            <div className="border-b border-[#0B2419]/10 pb-4 mb-5">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#123A29] font-bold block mb-1">
                PRIVATE FITTING APPOINTMENT
              </span>
              <h3 className="text-lg font-['Playfair_Display',serif] font-bold text-[#0B2419]">
                Đặt Lịch Hẹn Thử Đồ Riêng
              </h3>
              <p className="text-xs text-[#0B2419]/60 mt-1">
                Địa điểm: <strong className="text-[#0B2419]">{selectedShowroom.name}</strong>
              </p>
            </div>

            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#0B2419] mb-1">
                  Dịch vụ may đo mong muốn *
                </label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 border border-[#0B2419]/20 bg-[#FAF9F5] focus:outline-none focus:border-[#0B2419]"
                >
                  <option value="fitting-ready-to-wear">Thử trang phục BST Sơ Mi & Quần Tây Mới</option>
                  <option value="tailoring-hemming">Đo đạc & Lấy số đo cắt gấu may đo riêng</option>
                  <option value="suit-styling">Tư vấn phong cách & May âu phục Bespoke</option>
                  <option value="vip-exchange">Đổi trả sản phẩm đã mua online tại showroom</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#0B2419] mb-1">Ngày hẹn *</label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 border border-[#0B2419]/20 bg-[#FAF9F5] focus:outline-none focus:border-[#0B2419]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#0B2419] mb-1">Khung giờ *</label>
                  <select
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 border border-[#0B2419]/20 bg-[#FAF9F5] focus:outline-none focus:border-[#0B2419]"
                  >
                    <option value="09:30">09:30 - Sáng</option>
                    <option value="11:00">11:00 - Trưa</option>
                    <option value="14:00">14:00 - Đầu giờ chiều</option>
                    <option value="15:00">15:00 - Chiều</option>
                    <option value="17:00">17:00 - Chiều muộn</option>
                    <option value="19:00">19:00 - Tối</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#0B2419] mb-1">
                  Số lượng người tham dự
                </label>
                <select
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                  className="w-full text-xs px-3 py-2.5 border border-[#0B2419]/20 bg-[#FAF9F5] focus:outline-none focus:border-[#0B2419]"
                >
                  <option value="1">1 người (Riêng tư)</option>
                  <option value="2">2 người (Đi cùng bạn bè/đối tác)</option>
                  <option value="3+">Nhóm từ 3 người trở lên</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#0B2419] mb-1">
                  Ghi chú riêng về số đo / yêu cầu đồ uống
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ví dụ: Cần thử sơ mi lụa trắng size 40, chuẩn bị cà phê coldbrew..."
                  className="w-full text-xs p-3 border border-[#0B2419]/20 bg-[#FAF9F5] focus:outline-none focus:border-[#0B2419]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-[#0B2419] text-[#E8C75B] text-xs font-semibold uppercase tracking-wider hover:bg-[#123A29] transition-colors"
                >
                  Xác Nhận Đặt Lịch Fitting Riêng
                </button>
              </div>

              <p className="text-[11px] text-[#0B2419]/50 text-center leading-relaxed">
                Buổi fitting hoàn toàn miễn phí. Phòng thử VIP có phục vụ trà hoa cúc và cà phê hảo hạng.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
