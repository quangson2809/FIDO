import React from 'react';
import { useApp } from '../context/AppContext';

export const PolicyScreen: React.FC = () => {
  const { setCurrentScreen } = useApp();

  return (
    <div className="bg-[#FAF9F5] min-h-screen text-[#0B2419] font-['Plus_Jakarta_Sans',sans-serif] py-10 lg:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#0B2419]/60 uppercase tracking-widest mb-6">
          <button onClick={() => setCurrentScreen('home')} className="hover:text-[#0B2419]">
            Trang chủ
          </button>
          <span>/</span>
          <span className="text-[#0B2419] font-semibold">Chính Sách & Cam Kết Dịch Vụ</span>
        </div>

        {/* Hero title */}
        <div className="text-center pb-8 border-b border-[#0B2419]/10 mb-10">
          <span className="text-xs uppercase tracking-[0.25em] text-[#123A29] font-bold block mb-2">
            ATELIER VERT COMMITMENT
          </span>
          <h1 className="text-3xl sm:text-4xl font-['Playfair_Display',serif] font-bold text-[#0B2419] mb-4">
            Chính Sách Đổi Trả & Bảo Hành May Đo
          </h1>
          <p className="text-sm text-[#0B2419]/70 max-w-xl mx-auto leading-relaxed">
            FIDO Fashion áp dụng tiêu chuẩn phục vụ cao cấp, đảm bảo trải nghiệm mua sắm an tâm tuyệt đối từ thử đồ tại gia đến bảo dưỡng sản phẩm trọn đời.
          </p>
        </div>

        {/* 3 Core pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white border border-[#0B2419]/10 p-6 text-center shadow-xs">
            <div className="w-12 h-12 mx-auto bg-[#0B2419] text-[#E8C75B] flex items-center justify-center rounded-none mb-4">
              <span className="material-symbols-outlined text-2xl">verified</span>
            </div>
            <h3 className="font-['Playfair_Display',serif] text-base font-bold mb-2 text-[#0B2419]">
              30 Ngày Đổi Trả Miễn Phí
            </h3>
            <p className="text-xs text-[#0B2419]/70 leading-relaxed">
              Đổi size, đổi mẫu tận nhà hoàn toàn miễn phí. Hỗ trợ shipper thu hồi sản phẩm ngay tại địa chỉ của quý khách.
            </p>
          </div>

          <div className="bg-white border border-[#0B2419]/10 p-6 text-center shadow-xs">
            <div className="w-12 h-12 mx-auto bg-[#0B2419] text-[#E8C75B] flex items-center justify-center rounded-none mb-4">
              <span className="material-symbols-outlined text-2xl">content_cut</span>
            </div>
            <h3 className="font-['Playfair_Display',serif] text-base font-bold mb-2 text-[#0B2419]">
              Miễn Phí Cắt Lên Gấu Quần
            </h3>
            <p className="text-xs text-[#0B2419]/70 leading-relaxed">
              Thợ may Atelier đo đạc và cắt lai quần âu, jeans chuẩn xác theo chiều cao từng khách hàng trước khi đóng gói gửi đi.
            </p>
          </div>

          <div className="bg-white border border-[#0B2419]/10 p-6 text-center shadow-xs">
            <div className="w-12 h-12 mx-auto bg-[#0B2419] text-[#E8C75B] flex items-center justify-center rounded-none mb-4">
              <span className="material-symbols-outlined text-2xl">local_shipping</span>
            </div>
            <h3 className="font-['Playfair_Display',serif] text-base font-bold mb-2 text-[#0B2419]">
              Đồng Kiểm & Thử Hàng COD
            </h3>
            <p className="text-xs text-[#0B2419]/70 leading-relaxed">
              Quý khách được quyền mở kiện kiểm tra đường may, chất vải và mặc thử trước khi thanh toán tiền mặt cho nhân viên giao nhận.
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="bg-white border border-[#0B2419]/10 p-6 sm:p-10 space-y-8 mb-10 shadow-xs">
          <div>
            <h2 className="text-lg font-['Playfair_Display',serif] font-bold text-[#0B2419] mb-3 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-[#0B2419] inline-block"></span>
              1. Điều Kiện Áp Dụng Đổi Trả Sản Phẩm
            </h2>
            <ul className="text-xs sm:text-sm text-[#0B2419]/80 space-y-2 list-disc list-inside leading-relaxed pl-2">
              <li>Sản phẩm còn nguyên tem mác, hóa đơn mua hàng và chưa qua giặt tẩy hoặc sử dụng nặng mùi cơ thể.</li>
              <li>Sản phẩm áp dụng đổi trong vòng <strong>30 ngày</strong> kể từ thời điểm khách hàng nhận bưu kiện thành công.</li>
              <li>Đối với sản phẩm có yêu cầu cắt lai may đo riêng: Quý khách vẫn được hỗ trợ sửa đổi hoặc đổi sang mẫu khác nếu chiều dài chưa chuẩn form dáng.</li>
              <li>Mỗi đơn hàng được hỗ trợ đổi tối đa 02 lần mà không phát sinh thêm bất kỳ chi phí vận chuyển nào.</li>
            </ul>
          </div>

          <div className="border-t border-[#0B2419]/10 pt-8">
            <h2 className="text-lg font-['Playfair_Display',serif] font-bold text-[#0B2419] mb-3 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-[#0B2419] inline-block"></span>
              2. Quy Trình 3 Bước Đổi Trả Tận Cửa
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div className="bg-[#FAF9F5] p-4 border border-[#0B2419]/10">
                <span className="text-xl font-bold font-mono text-[#0B2419] mb-1 block">BƯỚC 01</span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B2419] mb-1">Liên Hệ Chuyên Viên</h4>
                <p className="text-xs text-[#0B2419]/70">
                  Gọi hotline 1800 6868 hoặc nhắn tin trực tiếp qua cửa sổ hỗ trợ với mã đơn hàng của quý khách.
                </p>
              </div>
              <div className="bg-[#FAF9F5] p-4 border border-[#0B2419]/10">
                <span className="text-xl font-bold font-mono text-[#0B2419] mb-1 block">BƯỚC 02</span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B2419] mb-1">Xác Nhận Đổi Hàng</h4>
                <p className="text-xs text-[#0B2419]/70">
                  FIDO gửi sản phẩm mới theo size/màu quý khách mong muốn bằng dịch vụ chuyển phát hỏa tốc.
                </p>
              </div>
              <div className="bg-[#FAF9F5] p-4 border border-[#0B2419]/10">
                <span className="text-xl font-bold font-mono text-[#0B2419] mb-1 block">BƯỚC 03</span>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B2419] mb-1">Thu Hồi & Bàn Giao</h4>
                <p className="text-xs text-[#0B2419]/70">
                  Bưu tá giao sản phẩm mới và đồng thời nhận lại sản phẩm cũ ngay tại nhà quý khách. Không cần ra bưu cục.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-[#0B2419]/10 pt-8">
            <h2 className="text-lg font-['Playfair_Display',serif] font-bold text-[#0B2419] mb-3 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-[#0B2419] inline-block"></span>
              3. Bảo Hành May Đo & Đường Kim Mũi Chỉ Trọn Đời
            </h2>
            <p className="text-xs sm:text-sm text-[#0B2419]/80 leading-relaxed mb-3">
              Tất cả trang phục Atelier Vert & FIDO Fashion được bảo hành trọn đời đối với các vấn đề kỹ thuật bao gồm:
            </p>
            <ul className="text-xs sm:text-sm text-[#0B2419]/80 space-y-2 list-disc list-inside leading-relaxed pl-2">
              <li>Đơm cúc sừng, thay thế cúc dự phòng chuẩn hãng.</li>
              <li>Chỉnh sửa độ rộng gấu quần, hạ hoặc nâng lai quần miễn phí bất cứ lúc nào.</li>
              <li>Bảo dưỡng đường may đũng quần, khóa kéo kim loại YKK cao cấp.</li>
              <li>Khách hàng có thể mang trang phục trực tiếp tới bất kỳ showroom FIDO nào trên toàn quốc.</li>
            </ul>
          </div>
        </div>

        {/* Support CTA Box */}
        <div className="bg-[#0B2419] text-white p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-lg font-['Playfair_Display',serif] font-bold text-[#E8C75B] mb-1">
              Quý Khách Cần Hỗ Trợ Đổi Hàng Ngay?
            </h3>
            <p className="text-xs text-white/70">
              Đội ngũ Concierge may đo FIDO luôn túc trực từ 8:30 - 22:00 tất cả các ngày trong tuần.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setCurrentScreen('my-orders')}
              className="px-5 py-2.5 bg-white text-[#0B2419] text-xs font-semibold uppercase tracking-wider hover:bg-white/90 transition-colors"
            >
              Xem đơn hàng của tôi
            </button>
            <button
              onClick={() => setCurrentScreen('showrooms')}
              className="px-5 py-2.5 border border-[#E8C75B] text-[#E8C75B] text-xs font-semibold uppercase tracking-wider hover:bg-[#E8C75B] hover:text-[#0B2419] transition-colors"
            >
              Hệ thống Showroom
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
