import React, { useState } from 'react';

export const AdminSettingsView: React.FC<{
  showToast: (msg: string) => void;
}> = ({ showToast }) => {
  const [storeName, setStoreName] = useState('FIDO Fashion & Atelier Vert');
  const [hotline, setHotline] = useState('1800 6868');
  const [email, setEmail] = useState('concierge@fidofashion.com');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('1500000');
  const [codInspectionEnabled, setCodInspectionEnabled] = useState(true);
  const [freeHemmingGuarantee, setFreeHemmingGuarantee] = useState(true);
  const [autoSmsTracking, setAutoSmsTracking] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Đã lưu thành công cấu hình hệ thống & chính sách Atelier Vert!');
  };

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#687069]">
            <span className="w-2 h-2 rounded-full bg-[#1B5038]"></span>
            <span>Cấu hình trung tâm vận hành thương hiệu Atelier Vert</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-['Playfair_Display',serif] text-[#0B2419] tracking-tight font-bold">
            Cài Đặt &amp; Thiết Lập Hệ Thống
          </h1>
          <p className="text-sm text-[#424844] max-w-3xl">
            Tùy chỉnh thông tin thương hiệu, chính sách bưu kiện COD đồng kiểm, cam kết thợ may lên gấu miễn phí và cổng thông báo SMS.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => showToast('Đang khôi phục cài đặt mặc định tiêu chuẩn')}
            className="px-4 py-2.5 bg-white text-[#687069] hover:bg-[#FAF9F5] text-xs font-semibold uppercase tracking-wider rounded border border-[#E8E9E3]"
          >
            Mặc Định
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Brand & Contact Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-[#E8E9E3] p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-[#0B2419] border-b border-[#F0F2ED] pb-3">
              Thông Tin Thương Hiệu &amp; Dịch Vụ Khách Hàng
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-[#0B2419] mb-1">Tên Thương Hiệu Hiển Thị</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E8E9E3] rounded focus:outline-none focus:border-[#0B2419]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0B2419] mb-1">Tổng Đài Concierge (Miễn phí)</label>
                <input
                  type="text"
                  value={hotline}
                  onChange={(e) => setHotline(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E8E9E3] rounded focus:outline-none focus:border-[#0B2419]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0B2419] mb-1">Email Tiếp Nhận Yêu Cầu</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E8E9E3] rounded focus:outline-none focus:border-[#0B2419]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0B2419] mb-1">Ngưỡng Miễn Phí Vận Chuyển</label>
                <div className="relative">
                  <input
                    type="number"
                    value={freeShippingThreshold}
                    onChange={(e) => setFreeShippingThreshold(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E8E9E3] rounded focus:outline-none focus:border-[#0B2419]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#687069] text-xs font-semibold">
                    VNĐ
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#0B2419] text-xs mb-1">
                Địa Chỉ Xưởng May &amp; Showroom Flagship
              </label>
              <textarea
                rows={2}
                defaultValue="Flagship 01: 158 Lý Tự Trọng, Bến Thành, Quận 1, TP. HCM&#10;Flagship 02: 45 Tràng Tiền, Hoàn Kiếm, Hà Nội&#10;Xưởng May: 28 Đường Số 9, Khu Công Nghiệp Tân Bình, TP. HCM"
                className="w-full px-3 py-2 text-xs border border-[#E8E9E3] rounded focus:outline-none focus:border-[#0B2419]"
              />
            </div>
          </div>

          {/* Chính sách Bưu kiện COD & Đồng kiểm */}
          <div className="bg-white rounded-lg border border-[#E8E9E3] p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-[#0B2419] border-b border-[#F0F2ED] pb-3">
              Chính Sách Bưu Kiện COD &amp; Đồng Kiểm Tận Nơi
            </h3>

            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 bg-[#FAF9F5] rounded border border-[#E8E9E3] cursor-pointer">
                <input
                  type="checkbox"
                  checked={codInspectionEnabled}
                  onChange={(e) => setCodInspectionEnabled(e.target.checked)}
                  className="mt-0.5 rounded text-[#0B2419] focus:ring-[#0B2419]"
                />
                <div className="text-xs">
                  <span className="font-bold text-[#0B2419] block">
                    Bắt buộc cho khách mở hộp đồng kiểm và mặc thử trước khi trả tiền COD
                  </span>
                  <span className="text-[#687069]">
                    In tự động ghi chú "ĐƯỢC ĐỒNG KIỂM &amp; THỬ ĐỒ TẠI CHỖ" lên mọi phiếu giao hàng của Viettel Post / GHTK.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-[#FAF9F5] rounded border border-[#E8E9E3] cursor-pointer">
                <input
                  type="checkbox"
                  checked={freeHemmingGuarantee}
                  onChange={(e) => setFreeHemmingGuarantee(e.target.checked)}
                  className="mt-0.5 rounded text-[#0B2419] focus:ring-[#0B2419]"
                />
                <div className="text-xs">
                  <span className="font-bold text-[#0B2419] block">
                    Kích hoạt chính sách lên gấu miễn phí trọn đời (Lifetime Free Hemming)
                  </span>
                  <span className="text-[#687069]">
                    Khách hàng có thể mang quần đến bất kỳ showroom hoặc gửi bưu điện để thợ may sửa gấu không giới hạn số lần.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-[#FAF9F5] rounded border border-[#E8E9E3] cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSmsTracking}
                  onChange={(e) => setAutoSmsTracking(e.target.checked)}
                  className="mt-0.5 rounded text-[#0B2419] focus:ring-[#0B2419]"
                />
                <div className="text-xs">
                  <span className="font-bold text-[#0B2419] block">
                    Gửi tin nhắn Zalo ZNS / SMS tự động khi đơn hàng xuất xưởng
                  </span>
                  <span className="text-[#687069]">
                    Kèm mã vận đơn và số điện thoại thợ may phụ trách để khách tiện tra cứu lộ trình bưu phẩm.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Actions & Server Status */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-[#E8E9E3] p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#0B2419] border-b border-[#F0F2ED] pb-2">
              Trạng Thái Máy Chủ Atelier Vert
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#687069]">Trạng thái API:</span>
                <span className="font-bold text-[#1B5038] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#1B5038]"></span>
                  ONLINE (99.98%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#687069]">Thời gian phản hồi:</span>
                <span className="font-mono text-[#0B2419]">42ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#687069]">Cổng thanh toán COD:</span>
                <span className="text-[#0B2419] font-medium">Hoạt động bình thường</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#687069]">Phiên bản máy chủ:</span>
                <span className="font-mono text-[#0B2419]">v2.4.1-production</span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#F0F2ED]">
              <button
                type="submit"
                className="w-full py-2.5 bg-[#0B2419] text-[#E5C358] font-bold text-xs uppercase tracking-wider rounded hover:bg-[#123A29] shadow-sm transition-colors text-center"
              >
                Lưu Thay Đổi Cấu Hình
              </button>
            </div>
          </div>

          <div className="bg-[#FAF9F5] rounded-lg border border-[#E8E9E3] p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 text-[#725C00] font-bold">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>Bảo Chứng Nghệ Nhân</span>
            </div>
            <p className="text-[#687069]">
              Mọi cập nhật về chính sách may đo sẽ được đồng bộ ngay tức thì đến máy tính bảng tại bàn cắt của các thợ may xưởng Atelier Vert.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};
