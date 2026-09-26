import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const OrderSuccessScreen: React.FC = () => {
  const { setCurrentScreen, setSelectedOrderId, showToast } = useApp();
  const [copied, setCopied] = useState(false);

  const orderId = 'ORD-20260924-001';

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(orderId);
      setCopied(true);
      showToast('Đã sao chép mã đơn hàng: ' + orderId);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTrackOrder = () => {
    setSelectedOrderId(orderId);
    setCurrentScreen('order-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full bg-[#FFFDF5] min-h-screen">
      {/* Top Breadcrumb */}
      <div className="w-full h-[44px] bg-[#F5F6F2] border-b border-[#E2E5DE] px-4 sm:px-8 flex items-center text-[13px] text-[#606863] font-medium">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2">
          <button onClick={() => setCurrentScreen('home')} className="hover:text-[#0B2419] transition-colors">
            Trang chủ
          </button>
          <span className="text-[#A0A69F]">/</span>
          <button onClick={() => setCurrentScreen('catalog')} className="hover:text-[#0B2419] transition-colors">
            Giỏ hàng
          </button>
          <span className="text-[#A0A69F]">/</span>
          <span className="text-[#0B2419] font-semibold">Xác nhận đặt hàng</span>
        </nav>
      </div>

      {/* Top Stepper / Process Bar */}
      <section className="w-full bg-[#FFFFFF] py-4 px-4 sm:px-8 lg:px-14 border-b border-[#E8E9E3]">
        <div className="max-w-5xl mx-auto">
          <nav aria-label="Tiến trình mua hàng" className="w-full">
            <ol className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {/* Step 1 */}
              <li className="flex items-center gap-3 opacity-90">
                <div className="w-7 h-7 rounded-full bg-[#0B2419] text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px]">check</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-[#687069] uppercase tracking-wider font-bold">Bước 01</p>
                  <p className="text-xs font-semibold text-[#0B2419] truncate">Giỏ hàng</p>
                </div>
              </li>
              {/* Step 2 */}
              <li className="flex items-center gap-3 opacity-90">
                <div className="w-7 h-7 rounded-full bg-[#0B2419] text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px]">check</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-[#687069] uppercase tracking-wider font-bold">Bước 02</p>
                  <p className="text-xs font-semibold text-[#0B2419] truncate">Địa chỉ &amp; COD</p>
                </div>
              </li>
              {/* Step 3 (Current) */}
              <li className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#E8C75B] text-[#101310] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                  03
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-[#725c00] font-bold uppercase tracking-wider">Hoàn tất</p>
                  <p className="text-xs font-bold text-[#0B2419] truncate">Xác nhận đơn</p>
                </div>
              </li>
              {/* Step 4 */}
              <li className="flex items-center gap-3 opacity-50">
                <div className="w-7 h-7 rounded-full bg-[#edeee9] text-[#424844] flex items-center justify-center text-xs shrink-0 font-bold">
                  04
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-[#687069] uppercase tracking-wider font-bold">Bước 04</p>
                  <p className="text-xs text-[#687069] truncate">Đóng gói &amp; Vận chuyển</p>
                </div>
              </li>
            </ol>
          </nav>
        </div>
      </section>

      {/* Hero Confirmation Message */}
      <section className="w-full py-12 px-4 sm:px-8 lg:px-14 bg-[#FAF4DF] text-center relative overflow-hidden border-b border-[#E8E9E3]">
        <div className="max-w-3xl mx-auto flex flex-col items-center relative z-10 space-y-3">
          <div className="w-16 h-16 rounded-full bg-[#0B2419] text-[#E8C75B] flex items-center justify-center shadow-lg ring-8 ring-[#E8C75B]/20">
            <span className="material-symbols-outlined text-[34px]">verified</span>
          </div>
          <span className="text-[11px] uppercase tracking-[0.25em] text-[#725c00] font-bold">
            MÃ XÁC NHẬN BẢO CHỨNG ATELIER VERT
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-[#0B2419] font-normal tracking-tight">
            Đơn Hàng Của Quý Khách Đã Được Tiếp Nhận
          </h1>
          <p className="text-sm sm:text-base text-[#625f4e] max-w-2xl leading-relaxed">
            Cảm ơn quý khách đã tin chọn <span className="text-[#0B2419] font-bold">Atelier Vert</span>. Bản chi tiết biên lai kỹ thuật số và xác nhận kích cỡ đã được gửi về hộp thư điện tử của quý khách.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded text-[#123A29] text-xs font-semibold shadow-sm border border-[#E8C75B]/30">
            <span className="material-symbols-outlined text-[18px] text-[#725c00]">support_agent</span>
            <span>Bộ phận Private Concierge sẽ liên hệ xác nhận số đo và thời điểm giao nhận tối ưu nhất.</span>
          </div>
        </div>
      </section>

      {/* Main Order Dossier */}
      <section className="w-full py-12 px-4 sm:px-8 lg:px-14 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Details & Items (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Order Meta Card */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-[#E8E9E3] flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E8E9E3]">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] uppercase tracking-widest text-[#687069] font-bold">
                    Mã giao dịch:
                  </span>
                  <span className="font-mono text-base tracking-wider text-[#0B2419] font-bold bg-[#f3f4ef] px-3 py-1 rounded">
                    {orderId}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="text-[11px] uppercase tracking-widest text-[#0B2419] hover:text-[#1B5038] bg-[#FAF4DF] px-2.5 py-1 rounded font-bold border border-[#E8C75B]/40 transition-colors cursor-pointer"
                  >
                    {copied ? 'ĐÃ SAO CHÉP' : 'SAO CHÉP'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF4DF] text-[#725c00] text-[11px] rounded uppercase font-bold tracking-wider border border-[#E8C75B]/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E8C75B]"></span>
                    Chờ xác nhận
                  </span>
                  <span className="inline-flex items-center px-3 py-1 bg-[#e7e9e3] text-[#0B2419] text-[11px] rounded uppercase font-bold tracking-wider">
                    COD
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div className="bg-[#f8faf4] p-3 rounded border border-[#E8E9E3]">
                  <p className="text-[10px] text-[#687069] uppercase tracking-wider font-bold mb-1">
                    Thời gian khởi tạo
                  </p>
                  <p className="text-xs text-[#0B2419] font-bold font-mono">24/09/2026 — 14:35:18</p>
                  <p className="text-[11px] text-[#687069] mt-0.5">Theo chuẩn Haute Horlogerie</p>
                </div>
                <div className="bg-[#f8faf4] p-3 rounded border border-[#E8E9E3]">
                  <p className="text-[10px] text-[#687069] uppercase tracking-wider font-bold mb-1">
                    Hình thức thanh toán
                  </p>
                  <p className="text-xs text-[#0B2419] font-bold">COD (Đồng kiểm tận nơi)</p>
                  <p className="text-[11px] text-[#687069] mt-0.5">Thử đồ trước khi thanh toán</p>
                </div>
                <div className="bg-[#f8faf4] p-3 rounded border border-[#E8E9E3]">
                  <p className="text-[10px] text-[#687069] uppercase tracking-wider font-bold mb-1">
                    Dự kiến phát hàng
                  </p>
                  <p className="text-xs text-[#0B2419] font-bold">1 - 2 ngày làm việc</p>
                  <p className="text-[11px] text-[#687069] mt-0.5">Chuyển phát đặc quyền Signature</p>
                </div>
              </div>
            </div>

            {/* Ordered Items Summary */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-[#E8E9E3] flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E9E3]">
                <h2 className="font-serif text-2xl text-[#0B2419]">Danh Mục Sản Phẩm Đã Chọn</h2>
                <span className="text-[11px] text-[#687069] uppercase tracking-widest font-bold">
                  2 Tuyệt tác
                </span>
              </div>

              <div className="flex flex-col gap-4">
                {/* Item 1 */}
                <article className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 bg-[#f8faf4] rounded border border-[#E8E9E3]">
                  <div className="flex items-center gap-4">
                    <img
                      className="w-20 h-24 object-cover rounded shadow-sm shrink-0 border border-[#E8E9E3]"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDexrS6ttHD5c9LS5hfmykpCnF2ZRfhsa5ltk3uhopKaVczSP17qt4gbUaNsa0QSBoB_5sERupF3Z5f1ubmuAsk7wUzLg2go83F1irL4WXB6rZVGop5Ptr6qB67Me7F2JfE9vJdBeY1GvGem4xkincqC0bxLlgnrN9pJ6cbxzVfqMYmMPxW2u1kqBCkMK56-IJ0sqwt8tPt4XUe4MAj580ahp_qsiE-mtnDGsUZAxuAnEV7uGB8kr8Eag"
                      alt="Quần Jean Straight Fit Dark Indigo Selvedge"
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-[#725c00] uppercase tracking-wider font-bold">
                        Bespoke Denim Atelier
                      </span>
                      <h3 className="text-sm font-bold text-[#0B2419] leading-tight">
                        Quần Jean Straight Fit Dark Indigo Selvedge 13.5oz
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#687069]">
                        <span>
                          Cỡ: <strong className="text-[#0B2419]">31</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Sắc thái: <strong className="text-[#0B2419]">Chàm Indigo Đậm</strong>
                        </span>
                        <span>•</span>
                        <span>
                          SL: <strong className="text-[#0B2419]">01</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[10px] text-[#687069] uppercase block font-semibold">Đơn giá</span>
                    <span className="text-base text-[#0B2419] font-bold font-mono">689.000 ₫</span>
                  </div>
                </article>

                {/* Item 2 */}
                <article className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 bg-[#f8faf4] rounded border border-[#E8E9E3]">
                  <div className="flex items-center gap-4">
                    <img
                      className="w-20 h-24 object-cover rounded shadow-sm shrink-0 border border-[#E8E9E3]"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuChtLLstyaKxAGJn-dCU8cyng17eDpioNz4orLI7IPcUinNxoeMuJ2sghTXqXEN8RzhQbFbNhqwZ6G3EeYShJkMMbd5zXCL6l6GpD6a7a8qCzMD_5g2N-LOXI12EahpFOH-64cEaFwWxSTvKHkPr0vkrLyXiGM5_NgcRYivQ6X2PNKIs03220XDbdq2pX_ymdladZx2ZyVE2YJBI-SZKafYBWBYtQ4MZzVqRiHQyvbgonN9loTqYS4ryg"
                      alt="Áo Sơ Mi Cổ Cuban Dark Smoke Linen"
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-[#725c00] uppercase tracking-wider font-bold">
                        Seasonal Resortwear
                      </span>
                      <h3 className="text-sm font-bold text-[#0B2419] leading-tight">
                        Áo Sơ Mi Cổ Cuban Dark Smoke Linen
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#687069]">
                        <span>
                          Cỡ: <strong className="text-[#0B2419]">L</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Sắc thái: <strong className="text-[#0B2419]">Xám Khói Dark Smoke</strong>
                        </span>
                        <span>•</span>
                        <span>
                          SL: <strong className="text-[#0B2419]">01</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[10px] text-[#687069] uppercase block font-semibold">Đơn giá</span>
                    <span className="text-base text-[#0B2419] font-bold font-mono">489.000 ₫</span>
                  </div>
                </article>
              </div>
            </div>

            {/* Recipient & Logistics Card */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-[#E8E9E3] flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E8E9E3]">
                <h2 className="font-serif text-2xl text-[#0B2419]">Thông Tin Tiếp Nhận &amp; Bàn Giao</h2>
                <span className="inline-flex items-center gap-1 text-[#725c00] text-[11px] uppercase tracking-wider font-bold">
                  <span className="material-symbols-outlined text-[16px]">verified_user</span>
                  Hồ sơ VIP Xác Thực
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <p className="text-[10px] text-[#687069] uppercase tracking-widest font-bold">
                    Họ &amp; Tên Quý Khách
                  </p>
                  <p className="text-base text-[#0B2419] font-bold">Nguyễn Văn An</p>
                  <div className="pt-2 flex flex-col gap-1 text-xs text-[#625f4e]">
                    <p className="flex items-center gap-2 font-mono">
                      <span className="material-symbols-outlined text-[16px] text-[#123A29]">call</span>
                      0912 345 678
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#123A29]">mail</span>
                      customer.vip@ateliervert.vn
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <p className="text-[10px] text-[#687069] uppercase tracking-widest font-bold">
                    Địa Chỉ Giao Nhận
                  </p>
                  <p className="text-xs text-[#0B2419] font-medium leading-relaxed">
                    Số 128 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh
                  </p>
                  <div className="mt-2 p-2.5 bg-[#FAF4DF] rounded border border-[#E8C75B]/30 flex flex-col gap-0.5">
                    <span className="text-[10px] text-[#725c00] uppercase tracking-wider font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">edit_note</span>
                      Chỉ Dẫn Cho Nghệ Nhân &amp; Chuyển Phát:
                    </span>
                    <p className="text-xs text-[#071A12] italic">
                      “Giao giờ hành chính, gọi trước 15 phút, lên gấu quần selvedge giữ viền nguyên bản.”
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Financial Summary & Actions (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Financial Card */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-[#E8E9E3] flex flex-col gap-4">
              <h2 className="font-serif text-2xl text-[#0B2419] pb-2 border-b border-[#E8E9E3]">
                Tổng Kết Thanh Toán
              </h2>
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex justify-between items-center text-[#625f4e]">
                  <span>Tạm tính (2 món)</span>
                  <span className="font-bold text-[#0B2419] font-mono">900.000 ₫</span>
                </div>
                <div className="flex justify-between items-center text-[#1B5038]">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">local_offer</span>
                    Đặc quyền (Voucher ABC123)
                  </span>
                  <span className="font-bold font-mono">- 50.000 ₫</span>
                </div>
                <div className="flex justify-between items-center text-[#625f4e]">
                  <span>Phí chuyển phát bảo chứng</span>
                  <span className="font-bold text-[#0B2419] font-mono">30.000 ₫</span>
                </div>
                <div className="h-px w-full bg-[#E8E9E3] my-1"></div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-bold text-[#0B2419]">Tổng thanh toán</span>
                  <span className="text-xl font-bold text-[#0B2419] font-mono">880.000 ₫</span>
                </div>
              </div>

              {/* Highlight COD Cash Box */}
              <div className="p-4 bg-[#0B2419] text-white rounded-lg flex flex-col gap-1 shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#E8C75B] uppercase tracking-widest font-bold">
                    Số tiền thu hộ COD
                  </span>
                  <span className="material-symbols-outlined text-[#E8C75B] text-[20px]">payments</span>
                </div>
                <div className="font-mono text-3xl text-[#E8C75B] font-bold tracking-tight">
                  880.000 ₫
                </div>
                <p className="text-[11px] text-[#edeee9] leading-relaxed pt-1">
                  Quý khách vui lòng chuẩn bị chính xác tiền mặt hoặc thực hiện quét mã VietQR khi nhân viên giao hàng trao tay hộp sản phẩm.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleTrackOrder}
                  className="w-full bg-[#0B2419] hover:bg-[#1B5038] text-white text-xs font-bold uppercase tracking-widest py-3 rounded transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">near_me</span>
                  <span>Theo Dõi Hành Trình Đơn Hàng</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentScreen('catalog');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full bg-transparent hover:bg-[#FAF4DF] text-[#0B2419] text-xs font-bold uppercase tracking-widest py-3 rounded transition-colors flex items-center justify-center gap-2 border border-[#0B2419] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
                  <span>Tiếp Tục Mua Sắm</span>
                </button>
              </div>

              {/* Private Concierge Quick Connect */}
              <div className="bg-[#f8faf4] p-3 rounded border border-[#E8E9E3] flex items-center gap-3">
                <span className="material-symbols-outlined text-[#0B2419] text-[24px]">ring_volume</span>
                <div className="flex flex-col text-xs">
                  <span className="text-[10px] text-[#687069] uppercase tracking-wider font-bold">
                    Hỗ trợ khẩn cấp 24/7
                  </span>
                  <p className="text-[#0B2419] font-medium">
                    Cần hiệu chỉnh đơn? Gọi <strong className="text-[#725c00] font-bold">1900 8899</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Atelier Vert Guarantees / Service Badges */}
            <div className="bg-white p-5 rounded-lg shadow-sm border border-[#E8E9E3] flex flex-col gap-4">
              <span className="text-[11px] uppercase tracking-widest text-[#687069] font-bold">
                Cam Kết Dịch Vụ Atelier
              </span>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[#725c00] text-[20px] shrink-0 mt-0.5">
                  package_2
                </span>
                <div className="text-xs">
                  <h4 className="font-bold text-[#0B2419]">Mở Hộp &amp; Đồng Kiểm Tại Chỗ</h4>
                  <p className="text-[#687069] mt-0.5">Kiểm tra đường may và chất liệu vải trước khi thanh toán cho chuyên viên vận chuyển.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[#725c00] text-[20px] shrink-0 mt-0.5">
                  change_circle
                </span>
                <div className="text-xs">
                  <h4 className="font-bold text-[#0B2419]">Đổi Size May Đo Trong 15 Ngày</h4>
                  <p className="text-[#687069] mt-0.5">Chuyên viên đến tận tư gia để lấy mẫu và hoàn trả size hoàn hảo miễn phí.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[#725c00] text-[20px] shrink-0 mt-0.5">
                  shield_with_heart
                </span>
                <div className="text-xs">
                  <h4 className="font-bold text-[#0B2419]">Hộp Cứng Cao Cấp 2 Lớp</h4>
                  <p className="text-[#687069] mt-0.5">Tặng kèm túi chống ẩm tơ tằm và thư cảm ơn viết tay từ Atelier Vert.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
