import React from 'react';

export const AdminReportsView: React.FC<{
  showToast: (msg: string) => void;
}> = ({ showToast }) => {
  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#687069]">
            <span className="w-2 h-2 rounded-full bg-[#1B5038]"></span>
            <span>Báo cáo doanh số bưu kiện COD &amp; Hiệu suất xưởng may</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-['Playfair_Display',serif] text-[#0B2419] tracking-tight font-bold">
            Báo Cáo &amp; Phân Tích Kinh Doanh
          </h1>
          <p className="text-sm text-[#424844] max-w-3xl">
            Thống kê doanh thu tiền mặt COD thu về, tỷ lệ khách nhận hàng sau khi đồng kiểm và khối lượng sản phẩm được bảo hành may gấu miễn phí trọn đời.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => showToast('Đang xuất toàn bộ báo cáo doanh thu ra file Excel (.xlsx)...')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0B2419] text-[#E5C358] hover:bg-[#123A29] transition-colors text-xs font-bold uppercase tracking-wider rounded shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">file_download</span>
            <span>Tải Báo Cáo Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-[#E8E9E3] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#687069]">Doanh Thu Tháng 09</span>
          <div className="mt-2 text-3xl font-bold text-[#0B2419] font-['Playfair_Display',serif]">
            486.5M <span className="text-xs font-sans font-normal text-[#687069]">VNĐ</span>
          </div>
          <div className="mt-2 text-xs text-[#1B5038] font-medium">+22.4% so với tháng trước</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E8E9E3] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#1B5038]">Tỷ Lệ Nhận Hàng COD</span>
          <div className="mt-2 text-3xl font-bold text-[#1B5038] font-['Playfair_Display',serif]">
            96.8% <span className="text-xs font-sans font-normal text-[#687069]">thành công</span>
          </div>
          <div className="mt-2 text-xs text-[#687069]">Nhờ chính sách đồng kiểm tận nơi</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E8E9E3] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#725C00]">Sản Phẩm Lên Gấu</span>
          <div className="mt-2 text-3xl font-bold text-[#725C00] font-['Playfair_Display',serif]">
            342 <span className="text-xs font-sans font-normal text-[#687069]">chiếc</span>
          </div>
          <div className="mt-2 text-xs text-[#725C00] font-medium">100% miễn phí công may</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E8E9E3] shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#BA1A1A]">Tỷ Lệ Đổi Trả Size</span>
          <div className="mt-2 text-3xl font-bold text-[#BA1A1A] font-['Playfair_Display',serif]">
            1.9% <span className="text-xs font-sans font-normal text-[#687069]">toàn hệ thống</span>
          </div>
          <div className="mt-2 text-xs text-[#1B5038] font-medium">Thấp kỷ lục trong ngành thời trang</div>
        </div>
      </div>

      {/* Top Selling & Service Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white rounded-lg border border-[#E8E9E3] p-5 shadow-xs">
          <h3 className="text-base font-bold text-[#0B2419] mb-1">Top 5 Dòng Sản Phẩm Doanh Thu Cao Nhất</h3>
          <p className="text-xs text-[#687069] mb-4">Các mẫu Quiet Luxury được ưa chuộng nhất tháng 09/2026</p>

          <div className="space-y-4">
            {[
              { name: 'Quần Jeans Selvedge 14oz Cổ Điển', sold: 184, rev: '239.200.000₫', pct: 85 },
              { name: 'Áo Sơ Mi Lụa Cổ Cuban Xanh Rêu', sold: 142, rev: '163.300.000₫', pct: 68 },
              { name: 'Quần Âu Gurkha Cạp Cao Xếp Ly', sold: 110, rev: '159.500.000₫', pct: 54 },
              { name: 'Áo Polo Dệt Kim Cotton Mercerized', sold: 98, rev: '93.100.000₫', pct: 45 },
              { name: 'Áo Blazer Linen Ý Cấu Trúc Nhẹ', sold: 46, rev: '128.800.000₫', pct: 32 },
            ].map((prod, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#0B2419]">
                    #{idx + 1}. {prod.name}
                  </span>
                  <span className="font-bold text-[#0B2419]">{prod.rev}</span>
                </div>
                <div className="w-full bg-[#FAF9F5] h-2 rounded-full overflow-hidden border border-[#E8E9E3]">
                  <div
                    style={{ width: `${prod.pct}%` }}
                    className="h-full bg-[#0B2419] rounded-full"
                  ></div>
                </div>
                <div className="flex justify-between text-[11px] text-[#687069]">
                  <span>Đã bán: {prod.sold} chiếc</span>
                  <span>Đóng góp: {prod.pct}% doanh thu</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tailoring & Service Speed */}
        <div className="bg-white rounded-lg border border-[#E8E9E3] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-[#0B2419] mb-1">Thời Gian Xử Lý May Đo &amp; Giao Vận</h3>
            <p className="text-xs text-[#687069] mb-4">Chỉ số tốc độ hoàn thiện yêu cầu của khách hàng</p>

            <div className="space-y-4">
              <div className="p-3 bg-[#FAF9F5] rounded border border-[#E8E9E3] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#0B2419]">Thời gian thợ may lên gấu</div>
                  <div className="text-[11px] text-[#687069]">Từ khi nhận vải đến khi hoàn tất</div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-[#725C00]">1 giờ 45 phút</span>
                  <div className="text-[10px] text-[#1B5038]">Cam kết hoàn tất trong 4h</div>
                </div>
              </div>

              <div className="p-3 bg-[#FAF9F5] rounded border border-[#E8E9E3] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#0B2419]">Thời gian giao hàng COD nội thành</div>
                  <div className="text-[11px] text-[#687069]">Hà Nội &amp; TP. Hồ Chí Minh</div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-[#0B2419]">3 giờ 20 phút</span>
                  <div className="text-[10px] text-[#1B5038]">Hỏa tốc cùng thợ may</div>
                </div>
              </div>

              <div className="p-3 bg-[#FAF9F5] rounded border border-[#E8E9E3] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#0B2419]">Đánh giá độ vừa vặn sau khi nhận</div>
                  <div className="text-[11px] text-[#687069]">Dựa trên 520 khảo sát nhận hàng</div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-[#1B5038]">4.95 / 5.0 ★</span>
                  <div className="text-[10px] text-[#687069]">Khách khen vừa như may đo riêng</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#F0F2ED] mt-4">
            <button
              onClick={() => showToast('Đang tạo báo cáo chất lượng dịch vụ tháng...')}
              className="w-full py-2 bg-[#0B2419]/5 hover:bg-[#0B2419]/10 text-[#0B2419] text-xs font-bold rounded transition-colors text-center"
            >
              Xem Chi Tiết Đánh Giá Khách Hàng (520 phản hồi) &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
