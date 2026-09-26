import React from 'react';

export const AdminDashboardView: React.FC<{
  onNavigateTab: (tab: string, breadcrumb: string) => void;
  showToast: (msg: string) => void;
}> = ({ onNavigateTab, showToast }) => {
  return (
    <div className="flex flex-col w-full space-y-8">
      {/* Top Welcome & Filter Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
        <div className="flex flex-col space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#FAF4DF] text-[#0B2419] text-[11px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[#123A29]"></span>
              Báo cáo vận hành Q4/2026
            </span>
            <span className="text-[#687069] text-xs font-medium">· Cập nhật 2 phút trước</span>
          </div>
          <h1 className="font-['Playfair_Display',serif] text-2xl sm:text-3xl text-[#0B2419] font-bold tracking-tight">
            Tổng Quan Hoạt Động Doanh Nghiệp
          </h1>
          <p className="text-xs sm:text-sm text-[#424844]">
            Báo cáo doanh thu thời gian thực, vận hành đơn hàng COD, trạng thái Kho Hàng May Sẵn (Ready-to-Wear Inventory) và phân hạng hội viên Atelier Club.
          </p>
        </div>

        {/* Actions & Date Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex p-1 bg-[#e7e9e3] rounded shadow-sm text-xs">
            <button
              onClick={() => showToast('Đang lọc dữ liệu hôm nay...')}
              className="px-3 py-1.5 text-[#424844] hover:text-[#191c19] font-medium transition-colors"
              type="button"
            >
              Hôm nay
            </button>
            <button
              onClick={() => showToast('Đang lọc 7 ngày gần nhất...')}
              className="px-3 py-1.5 text-[#424844] hover:text-[#191c19] font-medium transition-colors"
              type="button"
            >
              7 ngày qua
            </button>
            <button
              className="px-3.5 py-1.5 bg-[#0B2419] text-white rounded shadow-sm font-bold uppercase tracking-wider text-[11px]"
              type="button"
            >
              Tháng 10 (01/10 - 31/10)
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => showToast('Đang xuất toàn bộ dữ liệu báo cáo kinh doanh ra file Excel (.xlsx)...')}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-[#f3f4ef] text-[#0B2419] shadow-sm rounded border border-[#E8E9E3] text-xs font-bold uppercase tracking-wider transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Xuất Báo Cáo</span>
            </button>
            <button
              onClick={() => showToast('Đã làm mới dữ liệu thời gian thực!')}
              className="p-2 bg-white hover:bg-[#f3f4ef] text-[#0B2419] shadow-sm rounded border border-[#E8E9E3] transition-colors"
              title="Làm mới dữ liệu"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px] text-[#0B2419]">sync</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Card 1: Doanh Thu Thuần */}
        <div className="bg-white rounded-lg p-5 shadow-sm border border-[#E8E9E3] flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#687069]">
                Báo Cáo Doanh Thu
              </span>
              <span className="text-sm font-bold text-[#0B2419] mt-0.5">Doanh Thu Thuần</span>
            </div>
            <div className="w-10 h-10 rounded bg-[#f3f4ef] flex items-center justify-center text-[#0B2419]">
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="font-['Playfair_Display',serif] text-2xl font-bold text-[#071A12] tracking-tight">
                482.650.000₫
              </span>
              <span className="inline-flex items-center text-[10px] font-bold text-[#1B5038] bg-[#edeee9] px-1.5 py-0.5 rounded">
                <span className="material-symbols-outlined text-[12px] mr-0.5">trending_up</span>+14.2%
              </span>
            </div>
            <div className="mt-3 pt-3 flex flex-col space-y-1.5 bg-[#f3f4ef]/60 p-2.5 rounded text-xs">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#424844]">Doanh số hoàn tất:</span>
                <span className="font-bold text-[#0B2419]">512.400.000₫</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#424844]">Điều chỉnh đổi/trả:</span>
                <span className="font-bold text-[#ba1a1a]">-29.750.000₫</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Đơn Hàng Vận Hành */}
        <div className="bg-white rounded-lg p-5 shadow-sm border border-[#E8E9E3] flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#687069]">
                Tiến Độ Đơn Hàng
              </span>
              <span className="text-sm font-bold text-[#0B2419] mt-0.5">Đơn Hàng Vận Hành</span>
            </div>
            <div className="w-10 h-10 rounded bg-[#f3f4ef] flex items-center justify-center text-[#0B2419]">
              <span className="material-symbols-outlined text-[20px]">local_mall</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="font-['Playfair_Display',serif] text-2xl font-bold text-[#071A12] tracking-tight">
                328 <span className="font-sans font-normal text-sm text-[#687069]">kiện</span>
              </span>
              <span className="inline-flex items-center text-[10px] font-bold text-[#1B5038] bg-[#edeee9] px-1.5 py-0.5 rounded">
                <span className="material-symbols-outlined text-[12px] mr-0.5">trending_up</span>+8.6%
              </span>
            </div>
            <div className="mt-3 pt-3 flex flex-wrap gap-1.5">
              <span className="px-2 py-1 bg-[#FAF4DF] text-[#0B2419] text-[10px] font-bold rounded uppercase tracking-wider">
                18 Chờ duyệt
              </span>
              <span className="px-2 py-1 bg-[#edeee9] text-[#424844] text-[10px] font-bold rounded uppercase tracking-wider">
                42 Đóng gói
              </span>
              <span className="px-2 py-1 bg-[#edeee9] text-[#424844] text-[10px] font-bold rounded uppercase tracking-wider">
                65 Đang giao
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Tỷ Lệ Thu Hộ COD */}
        <div className="bg-white rounded-lg p-5 shadow-sm border border-[#E8E9E3] flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#687069]">
                Hiệu Suất Giao Hàng
              </span>
              <span className="text-sm font-bold text-[#0B2419] mt-0.5">Thành Công Thu Hộ COD</span>
            </div>
            <div className="w-10 h-10 rounded bg-[#f3f4ef] flex items-center justify-center text-[#0B2419]">
              <span className="material-symbols-outlined text-[20px]">verified</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="font-['Playfair_Display',serif] text-2xl font-bold text-[#071A12] tracking-tight">
                96.4%
              </span>
              <span className="inline-flex items-center text-[10px] font-bold text-[#1B5038] bg-[#edeee9] px-1.5 py-0.5 rounded">
                <span className="material-symbols-outlined text-[12px] mr-0.5">north_east</span>+1.8%
              </span>
            </div>
            <div className="mt-3 pt-3 flex flex-col space-y-1.5 bg-[#f3f4ef]/60 p-2.5 rounded text-xs">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#424844]">Tiền mặt bưu tá thu:</span>
                <span className="font-bold text-[#0B2419]">389.200.000₫</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[#424844]">Trạng thái:</span>
                <span className="text-[10px] text-[#725c00] font-bold uppercase tracking-wider">
                  Đối soát kỳ 2
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Cảnh Báo Tồn Kho */}
        <div className="bg-white rounded-lg p-5 shadow-sm border border-[#E8E9E3] flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#687069]">
                Kiểm Soát Tồn Kho
              </span>
              <span className="text-sm font-bold text-[#0B2419] mt-0.5">Cảnh Báo Tồn Kho</span>
            </div>
            <div className="w-10 h-10 rounded bg-[#ffdad6]/60 flex items-center justify-center text-[#ba1a1a]">
              <span className="material-symbols-outlined text-[20px]">warning</span>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="font-['Playfair_Display',serif] text-2xl font-bold text-[#ba1a1a] tracking-tight">
                12 <span className="font-sans font-normal text-sm">SKU</span>
              </span>
              <span className="inline-flex items-center text-[10px] font-bold text-[#ba1a1a] bg-[#ffdad6]/50 px-1.5 py-0.5 rounded">
                Chạm ngưỡng &lt; 5
              </span>
            </div>
            <div className="mt-3 pt-3 flex justify-between items-center text-[11px] bg-[#f3f4ef]/60 p-2.5 rounded">
              <span className="text-[#424844]">Sẵn sàng giao ngay:</span>
              <span className="font-bold text-[#0B2419]">3.420 sản phẩm tại kho &amp; showroom</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mid Section: Visual Sales Chart & Status Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Sales Revenue Trend Visualization (Column Left 8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-lg p-6 shadow-sm border border-[#E8E9E3] flex flex-col justify-between space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-['Playfair_Display',serif] text-lg font-bold text-[#0B2419]">
                  Biểu Đồ Doanh Thu &amp; Điều Chỉnh Đổi Trả
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-[#edeee9] text-[#687069] rounded uppercase">
                  30 ngày qua
                </span>
              </div>
              <span className="text-xs text-[#424844] mt-0.5">
                Điểm cực đại đạt <strong className="text-[#0B2419]">42.800.000₫</strong> vào ngày 20/10 (Chiến dịch Thu - Đông Lookbook).
              </span>
            </div>
            {/* Chart Legend */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#0B2419]"></span>
                <span className="text-[#424844]">Doanh số hoàn tất</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#D97757]"></span>
                <span className="text-[#424844]">Hoàn trả/Hủy COD</span>
              </div>
            </div>
          </div>

          {/* Custom SVG Revenue & Order Bar/Trend Visualization */}
          <div className="w-full relative pt-4">
            <svg className="w-full h-60 overflow-visible" fill="none" preserveAspectRatio="none" viewBox="0 0 740 220">
              <line stroke="#f0f1ec" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="740" y1="20" y2="20"></line>
              <line stroke="#f0f1ec" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="740" y1="70" y2="70"></line>
              <line stroke="#f0f1ec" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="740" y1="120" y2="120"></line>
              <line stroke="#f0f1ec" strokeDasharray="4 4" strokeWidth="1" x1="0" x2="740" y1="170" y2="170"></line>
              <line stroke="#e1e3de" strokeWidth="1" x1="0" x2="740" y1="200" y2="200"></line>

              {/* Bars */}
              <rect fill="#0B2419" height="90" opacity="0.85" rx="1" width="16" x="20" y="110"></rect>
              <rect fill="#D97757" height="8" rx="1" width="16" x="20" y="200"></rect>

              <rect fill="#0B2419" height="110" opacity="0.85" rx="1" width="16" x="70" y="90"></rect>
              <rect fill="#D97757" height="6" rx="1" width="16" x="70" y="200"></rect>

              <rect fill="#0B2419" height="75" opacity="0.85" rx="1" width="16" x="120" y="125"></rect>
              <rect fill="#D97757" height="12" rx="1" width="16" x="120" y="200"></rect>

              <rect fill="#0B2419" height="120" opacity="0.85" rx="1" width="16" x="170" y="80"></rect>
              <rect fill="#D97757" height="5" rx="1" width="16" x="170" y="200"></rect>

              <rect fill="#0B2419" height="105" opacity="0.85" rx="1" width="16" x="220" y="95"></rect>
              <rect fill="#D97757" height="7" rx="1" width="16" x="220" y="200"></rect>

              <rect fill="#0B2419" height="140" opacity="0.9" rx="1" width="16" x="270" y="60"></rect>
              <rect fill="#D97757" height="9" rx="1" width="16" x="270" y="200"></rect>

              <rect fill="#0B2419" height="155" opacity="0.9" rx="1" width="16" x="320" y="45"></rect>
              <rect fill="#D97757" height="4" rx="1" width="16" x="320" y="200"></rect>

              {/* Peak: 42.8M */}
              <rect fill="#1B5038" height="178" rx="1" width="18" x="370" y="22"></rect>
              <rect fill="#D97757" height="6" rx="1" width="18" x="370" y="200"></rect>

              <rect fill="#0B2419" height="130" opacity="0.85" rx="1" width="16" x="425" y="70"></rect>
              <rect fill="#D97757" height="10" rx="1" width="16" x="425" y="200"></rect>

              <rect fill="#0B2419" height="115" opacity="0.85" rx="1" width="16" x="475" y="85"></rect>
              <rect fill="#D97757" height="5" rx="1" width="16" x="475" y="200"></rect>

              <rect fill="#0B2419" height="135" opacity="0.85" rx="1" width="16" x="525" y="65"></rect>
              <rect fill="#D97757" height="8" rx="1" width="16" x="525" y="200"></rect>

              <rect fill="#0B2419" height="150" opacity="0.9" rx="1" width="16" x="575" y="50"></rect>
              <rect fill="#D97757" height="5" rx="1" width="16" x="575" y="200"></rect>

              <rect fill="#0B2419" height="140" opacity="0.9" rx="1" width="16" x="625" y="60"></rect>
              <rect fill="#D97757" height="4" rx="1" width="16" x="625" y="200"></rect>

              <rect fill="#0B2419" height="122" opacity="0.85" rx="1" width="16" x="675" y="78"></rect>
              <rect fill="#D97757" height="7" rx="1" width="16" x="675" y="200"></rect>

              {/* Trend spline line overlay */}
              <path
                d="M 28 110 Q 120 70, 228 95 T 379 22 T 533 65 T 683 78"
                fill="none"
                stroke="#E5C358"
                strokeLinecap="round"
                strokeWidth="2.5"
              ></path>

              {/* Peak badge annotation */}
              <circle cx="379" cy="22" fill="#E5C358" r="4.5" stroke="#0B2419" strokeWidth="2"></circle>
              <rect fill="#0B2419" height="16" rx="2" width="80" x="340" y="2"></rect>
              <text fill="#FFFDF5" fontSize="9" fontWeight="600" textAnchor="middle" x="380" y="13">
                42.8M (20/10)
              </text>
            </svg>

            {/* Chart Timeline Labels */}
            <div className="flex justify-between text-[11px] text-[#687069] pt-2 px-3 uppercase tracking-wider">
              <span>01/10</span>
              <span>06/10</span>
              <span>12/10</span>
              <span>18/10</span>
              <span className="text-[#0B2419] font-bold">20/10 (Lookbook)</span>
              <span>24/10</span>
              <span>28/10</span>
              <span>31/10</span>
            </div>
          </div>

          {/* Quick stat banner footer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 bg-[#f3f4ef]/70 p-3.5 rounded text-xs">
            <div>
              <span className="text-[#687069] text-[10px] font-bold uppercase tracking-wider block">
                Giá Trị Đơn Trung Bình
              </span>
              <span className="text-sm font-bold text-[#0B2419] mt-0.5 block">1.471.000₫</span>
            </div>
            <div>
              <span className="text-[#687069] text-[10px] font-bold uppercase tracking-wider block">
                Tỷ Lệ Hoàn Tất Giao Hàng
              </span>
              <span className="text-sm font-bold text-[#1B5038] mt-0.5 block">94.2% lượt giao</span>
            </div>
            <div>
              <span className="text-[#687069] text-[10px] font-bold uppercase tracking-wider block">
                Chiết Khấu Voucher / VIP
              </span>
              <span className="text-sm font-bold text-[#424844] mt-0.5 block">18.450.000₫</span>
            </div>
          </div>
        </div>

        {/* Status Distribution Donut (Column Right 4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-lg p-6 shadow-sm border border-[#E8E9E3] flex flex-col justify-between space-y-5">
          <div className="flex flex-col">
            <div className="flex items-center justify-between">
              <span className="font-['Playfair_Display',serif] text-lg font-bold text-[#0B2419]">
                Phân Bổ Trạng Thái
              </span>
              <span className="text-xs text-[#687069] font-bold uppercase">328 đơn</span>
            </div>
            <p className="text-xs text-[#424844] mt-0.5">
              Đóng gói từ kho sẵn &amp; Giao hỏa tốc 2H / Giao COD đồng kiểm
            </p>
          </div>

          {/* Visual Donut Chart SVG */}
          <div className="flex items-center justify-center relative py-2">
            <svg className="w-44 h-44 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" fill="transparent" r="38" stroke="#f3f4ef" strokeWidth="12"></circle>
              {/* COMPLETE: 60.4% */}
              <circle
                cx="50"
                cy="50"
                fill="transparent"
                r="38"
                stroke="#0B2419"
                strokeDasharray="144.2 238.7"
                strokeDashoffset="0"
                strokeWidth="12"
              ></circle>
              {/* SHIP: 19.8% */}
              <circle
                cx="50"
                cy="50"
                fill="transparent"
                r="38"
                stroke="#1B5038"
                strokeDasharray="47.2 238.7"
                strokeDashoffset="-144.2"
                strokeWidth="12"
              ></circle>
              {/* PREPARE: 12.8% */}
              <circle
                cx="50"
                cy="50"
                fill="transparent"
                r="38"
                stroke="#E5C358"
                strokeDasharray="30.5 238.7"
                strokeDashoffset="-191.4"
                strokeWidth="12"
              ></circle>
              {/* PENDING: 5.5% */}
              <circle
                cx="50"
                cy="50"
                fill="transparent"
                r="38"
                stroke="#c7a840"
                strokeDasharray="13.1 238.7"
                strokeDashoffset="-221.9"
                strokeWidth="12"
              ></circle>
              {/* CANCEL: 1.5% */}
              <circle
                cx="50"
                cy="50"
                fill="transparent"
                r="38"
                stroke="#D97757"
                strokeDasharray="3.6 238.7"
                strokeDashoffset="-235"
                strokeWidth="12"
              ></circle>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="font-['Playfair_Display',serif] text-2xl font-bold text-[#0B2419] leading-none">
                198
              </span>
              <span className="text-[10px] text-[#687069] uppercase tracking-widest mt-1 font-bold">
                Đã giao COD
              </span>
            </div>
          </div>

          {/* Segment list */}
          <div className="flex flex-col space-y-2 text-xs pt-2">
            <div className="flex items-center justify-between py-1 px-2 rounded bg-[#FAF4DF]/50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#c7a840]"></span>
                <span className="text-[#0B2419] font-bold">PENDING (Chờ duyệt)</span>
              </div>
              <span className="font-bold text-[#0B2419]">
                18 đơn <span className="font-normal text-[#687069]">(5.5%)</span>
              </span>
            </div>
            <div className="flex items-center justify-between py-1 px-2 rounded">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E5C358]"></span>
                <span className="text-[#191c19]">PREPARE (Đóng gói kho may sẵn)</span>
              </div>
              <span className="font-medium text-[#191c19]">
                42 đơn <span className="text-[#687069]">(12.8%)</span>
              </span>
            </div>
            <div className="flex items-center justify-between py-1 px-2 rounded">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1B5038]"></span>
                <span className="text-[#191c19]">SHIP (Đang luân chuyển COD)</span>
              </div>
              <span className="font-medium text-[#191c19]">
                65 đơn <span className="text-[#687069]">(19.8%)</span>
              </span>
            </div>
            <div className="flex items-center justify-between py-1 px-2 rounded">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0B2419]"></span>
                <span className="text-[#191c19]">COMPLETE (Giao thành công)</span>
              </div>
              <span className="font-bold text-[#0B2419]">
                198 đơn <span className="text-[#687069]">(60.4%)</span>
              </span>
            </div>
            <div className="flex items-center justify-between py-1 px-2 rounded">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D97757]"></span>
                <span className="text-[#ba1a1a]">CANCEL / RETURN</span>
              </div>
              <span className="font-bold text-[#ba1a1a]">
                5 đơn <span className="text-[#687069]">(1.5%)</span>
              </span>
            </div>
          </div>

          {/* Quick Action CTA */}
          <button
            type="button"
            onClick={() => onNavigateTab('don-hang', 'Quản lý Đơn hàng')}
            className="w-full py-2.5 px-3 bg-[#0B2419] hover:bg-[#1B5038] text-white rounded text-center text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Xử lý 18 đơn chờ duyệt ngay</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Bottom Section - 2 High Priority Data Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Table 1: Đơn Hàng Cần Xử Lý Gấp (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-lg shadow-sm border border-[#E8E9E3] overflow-hidden flex flex-col">
          <div className="p-5 flex items-center justify-between border-b border-[#E8E9E3]">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-['Playfair_Display',serif] text-base font-bold text-[#0B2419]">
                  Đơn Hàng Cần Xử Lý Gấp
                </span>
                <span className="px-2 py-0.5 rounded bg-[#ffdad6]/60 text-[#ba1a1a] text-[10px] font-bold uppercase">
                  Ưu tiên COD
                </span>
              </div>
              <p className="text-xs text-[#424844] mt-0.5">
                Xác nhận gọi điện và đồng kiểm trước khi bàn giao bưu tá
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('don-hang', 'Quản lý Đơn hàng')}
              className="text-[#0B2419] hover:text-[#1B5038] text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
            >
              Xem tất cả (18)
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#191c19]">
              <thead>
                <tr className="bg-[#FAF9F5] text-[#687069] text-[10px] uppercase font-bold tracking-wider border-b border-[#E8E9E3]">
                  <th className="py-3 px-4">Mã Đơn / Khách Hàng</th>
                  <th className="py-3 px-4">Sản Phẩm Tóm Tắt</th>
                  <th className="py-3 px-4">Tổng Tiền / PTTT</th>
                  <th className="py-3 px-4 text-center">Trạng Thái</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E9E3]">
                {/* Row 1 */}
                <tr className="hover:bg-[#f3f4ef]/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="font-mono font-bold text-[#0B2419]">#AV-20241028-091</span>
                      <span className="font-semibold text-[#191c19]">Trần Hoàng Nam</span>
                      <span className="text-[11px] text-[#687069]">0918.442.xxx · Quận 1, TP.HCM</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <img
                        className="w-10 h-10 object-cover rounded shadow-xs shrink-0"
                        alt="Jean Selvedge Kurabo"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuAjpyitCAVUHdzRY9_Y8--VUOfcBKGYXufNQIN4jwk2Xs3E0HMFBtGrgUllVskrnPK2AjnAcww7vhAOAA55Xj0v5yutEqNy_kUHsPfLY6gk36g1Sewe4jNdMUA2z91_J3T3MSP2mGQYny-21wV_iseEzo0eWZrfdAEKlaJJmdiAA9H6B6YuiH0gNlpjKQBafBAXU0bvCzYaK4502Iopi5bL2lhgvrDhjxd8SH-c_cZTVwon-GhVn3xsgQ"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate font-semibold text-[12px] text-[#071A12]">
                          Jean Selvedge Kurabo (Size 31)
                        </span>
                        <span className="text-[11px] text-[#687069]">SL: 1 cái · Màu Indigo</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-[#0B2419]">2.850.000₫</span>
                      <span className="text-[11px] text-[#424844]">COD Đồng Kiểm</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex px-2 py-0.5 rounded bg-[#FAF4DF] text-[#0B2419] text-[10px] font-bold uppercase">
                      Chờ duyệt
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => showToast('Đã duyệt đơn #AV-20241028-091 và chuyển xưởng chuẩn bị!')}
                        className="px-2.5 py-1 bg-[#0B2419] hover:bg-[#1B5038] text-white rounded text-[11px] font-bold uppercase tracking-wider transition-colors shadow-xs"
                      >
                        Duyệt
                      </button>
                      <button
                        onClick={() => onNavigateTab('don-hang', 'Quản lý Đơn hàng')}
                        className="p-1 hover:bg-[#edeee9] text-[#687069] hover:text-[#0B2419] rounded transition-colors"
                        title="Chi tiết đơn hàng"
                      >
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Row 2 */}
                <tr className="hover:bg-[#f3f4ef]/50 transition-colors bg-[#f3f4ef]/20">
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="font-mono font-bold text-[#0B2419]">#AV-20241028-088</span>
                      <span className="font-semibold text-[#191c19]">Đặng Mai Phương</span>
                      <span className="text-[11px] text-[#687069]">0903.112.xxx · Ba Đình, Hà Nội</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <img
                        className="w-10 h-10 object-cover rounded shadow-xs shrink-0"
                        alt="Raw Indigo Straight Fit"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuA1P2vLmQw1bo6IdA3g8-ljzcBaJFFuqLVcflpsJhKHPn49rEnSzY7hyJZMfzV_DXaB-LI1uooXHbPYoMkY4GOPT-5r3f1sRZYo7qjNs-Hshre1dZCHlVvURbFxmiXtqB2rh8K5gAiU60l50vKkKPFsKK4mnWA7eFaHnGHKE224tzAKK3VJAzvC3H6Y8dsyYMlYRy_2xEO5K-0FGtIKQhEDvDSUHLBEz80xy1SINuFNb2gqqh4Bgyu2bg"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate font-semibold text-[12px] text-[#071A12]">
                          Raw Indigo Straight Fit + Khăn Linen
                        </span>
                        <span className="text-[11px] text-[#687069]">SL: 2 cái · Combo Thu Đông</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-[#0B2419]">4.120.000₫</span>
                      <span className="text-[11px] text-[#424844]">Đã CK VNPAY</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex px-2 py-0.5 rounded bg-[#edeee9] text-[#424844] text-[10px] font-bold uppercase">
                      Đang gói
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => showToast('Lệnh soạn hàng đã gửi đến bàn đóng gói kho!')}
                        className="px-2.5 py-1 bg-[#edeee9] hover:bg-[#0B2419] hover:text-white text-[#0B2419] rounded text-[11px] font-bold uppercase tracking-wider transition-colors"
                      >
                        Soạn Hàng
                      </button>
                      <button
                        onClick={() => onNavigateTab('don-hang', 'Quản lý Đơn hàng')}
                        className="p-1 hover:bg-[#edeee9] text-[#687069] hover:text-[#0B2419] rounded transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Row 3 */}
                <tr className="hover:bg-[#f3f4ef]/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="font-mono font-bold text-[#0B2419]">#AV-20241028-085</span>
                      <span className="font-semibold text-[#191c19]">Vũ Thành Đạt</span>
                      <span className="text-[11px] text-[#687069]">0934.887.xxx · Hải Châu, Đà Nẵng</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <img
                        className="w-10 h-10 object-cover rounded shadow-xs shrink-0"
                        alt="Chelsea Boots Nero"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBp-vxox7MFpgm0vi6Z8djmUpDY-qBzPoCFqZ9r7bPAgXfFNks2T1mVgkd0MFiiObS2OWYwuUAbU5rlD6q9UANNuvI_9NKIQx7ea5ysCuGW__EeVG7wqetBnjWeXpUOhOWQpSagALOIGIaUBWqakFdiW8DTtX9kJHBN9qeCLVqgWMZ1omAovMgBfj8-uQ9WQ32GhkvX1DD7enSRA006hREqOSeqCa5MH-FunkprCQ4flcP3KWfofQYrIw"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate font-semibold text-[12px] text-[#071A12]">
                          Chelsea Boots Nero (Size 42)
                        </span>
                        <span className="text-[11px] text-[#687069]">SL: 1 đôi · Da Calfskin</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-[#0B2419]">5.650.000₫</span>
                      <span className="text-[11px] text-[#424844]">COD Đồng Kiểm</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex px-2 py-0.5 rounded bg-[#FAF4DF] text-[#0B2419] text-[10px] font-bold uppercase">
                      Chờ duyệt
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => showToast('Đã duyệt đơn #AV-20241028-085!')}
                        className="px-2.5 py-1 bg-[#0B2419] hover:bg-[#1B5038] text-white rounded text-[11px] font-bold uppercase tracking-wider transition-colors shadow-xs"
                      >
                        Duyệt
                      </button>
                      <button
                        onClick={() => onNavigateTab('don-hang', 'Quản lý Đơn hàng')}
                        className="p-1 hover:bg-[#edeee9] text-[#687069] hover:text-[#0B2419] rounded transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-[#FAF9F5] text-center border-t border-[#E8E9E3]">
            <span className="text-xs text-[#687069]">
              Hệ thống đồng bộ tự động với đối tác vận chuyển GHN &amp; Viettel Post cứ mỗi 5 phút
            </span>
          </div>
        </div>

        {/* Table 2: Cảnh Báo Tồn Kho & Yêu Cầu Nhập Hàng (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-lg shadow-sm border border-[#E8E9E3] overflow-hidden flex flex-col">
          <div className="p-5 flex items-center justify-between border-b border-[#E8E9E3]">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-['Playfair_Display',serif] text-base font-bold text-[#0B2419]">
                  Cảnh Báo Tồn Kho
                </span>
                <span className="px-2 py-0.5 rounded bg-[#ffdad6]/60 text-[#ba1a1a] text-[10px] font-bold uppercase">
                  5 SKU khẩn
                </span>
              </div>
              <p className="text-xs text-[#424844] mt-0.5">
                Dưới ngưỡng đệm an toàn Kho Hàng May Sẵn (Ready-to-Wear)
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('ton-kho', 'Tồn kho')}
              className="p-1.5 hover:bg-[#edeee9] rounded text-[#0B2419] transition-colors"
              title="Cấu hình định mức"
            >
              <span className="material-symbols-outlined text-[20px]">tune</span>
            </button>
          </div>

          <div className="p-4 pt-3 space-y-3">
            {/* Item 1 */}
            <div className="p-3 rounded bg-[#f3f4ef]/70 flex items-center justify-between gap-3 border border-[#E8E9E3]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded bg-[#FAF4DF] flex items-center justify-center shrink-0 text-[#0B2419]">
                  <span className="material-symbols-outlined text-[20px]">inventory</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-xs text-[#071A12] truncate">
                    Jean Selvedge Kurabo Dark Indigo
                  </span>
                  <span className="text-[11px] text-[#687069]">SKU: DENIM-KRB-31 · Size 31</span>
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="px-2 py-0.5 rounded bg-[#ffdad6] text-[#ba1a1a] text-[10px] font-bold uppercase">
                  Còn 2 cái
                </span>
                <span className="text-[10px] text-[#687069] mt-0.5">Định mức: 10</span>
              </div>
            </div>

            {/* Item 2 */}
            <div className="p-3 rounded bg-[#f3f4ef]/70 flex items-center justify-between gap-3 border border-[#E8E9E3]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded bg-[#FAF4DF] flex items-center justify-center shrink-0 text-[#0B2419]">
                  <span className="material-symbols-outlined text-[20px]">inventory</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-xs text-[#071A12] truncate">
                    Quần Jean Raw Indigo Straight Fit
                  </span>
                  <span className="text-[11px] text-[#687069]">SKU: RAW-ST-IND-32 · Size 32</span>
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="px-2 py-0.5 rounded bg-[#ffdad6] text-[#ba1a1a] text-[10px] font-bold uppercase">
                  Còn 3 cái
                </span>
                <span className="text-[10px] text-[#687069] mt-0.5">Định mức: 12</span>
              </div>
            </div>

            {/* Item 3 */}
            <div className="p-3 rounded bg-[#f3f4ef]/70 flex items-center justify-between gap-3 border border-[#E8E9E3]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded bg-[#FAF4DF] flex items-center justify-center shrink-0 text-[#0B2419]">
                  <span className="material-symbols-outlined text-[20px]">inventory</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-xs text-[#071A12] truncate">
                    Áo Cuban Smoke Linen
                  </span>
                  <span className="text-[11px] text-[#687069]">SKU: SHIRT-LINEN-M · Size M</span>
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="px-2 py-0.5 rounded bg-[#FAF4DF] text-[#725c00] text-[10px] font-bold uppercase">
                  Còn 4 cái
                </span>
                <span className="text-[10px] text-[#687069] mt-0.5">Định mức: 15</span>
              </div>
            </div>

            {/* Item 4 */}
            <div className="p-3 rounded bg-[#f3f4ef]/70 flex items-center justify-between gap-3 border border-[#E8E9E3]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded bg-[#FAF4DF] flex items-center justify-center shrink-0 text-[#0B2419]">
                  <span className="material-symbols-outlined text-[20px]">inventory</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-xs text-[#071A12] truncate">
                    Chelsea Boots Nero
                  </span>
                  <span className="text-[11px] text-[#687069]">SKU: BOOT-NERO-42 · Size 42</span>
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="px-2 py-0.5 rounded bg-[#ffdad6] text-[#ba1a1a] text-[10px] font-bold uppercase">
                  Còn 1 đôi
                </span>
                <span className="text-[10px] text-[#687069] mt-0.5">Định mức: 5</span>
              </div>
            </div>
          </div>

          {/* Quick Goods Receipt CTA */}
          <div className="p-4 bg-[#FAF4DF]/50 mt-auto border-t border-[#E8E9E3]">
            <button
              onClick={() => onNavigateTab('phieu-nhap-kho', 'Phiếu nhập kho')}
              className="w-full py-2.5 px-3 bg-[#123A29] hover:bg-[#1B5038] text-white rounded text-center text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <span>Nhập Hàng May Sẵn (Goods Receipt)</span>
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Activity Stream / Audit Log Snippet */}
      <div className="bg-white rounded-lg p-5 shadow-sm border border-[#E8E9E3] flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0B2419] text-[20px]">history_toggle_off</span>
            <span className="font-bold text-sm text-[#0B2419]">
              Nhật Ký Thao Tác Hệ Thống Gần Nhất
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('nhat-ky-thao-tac', 'Nhật ký thao tác (Audit)')}
            className="text-[#687069] hover:text-[#0B2419] text-xs font-bold uppercase tracking-wider transition-colors"
          >
            Xem toàn bộ lịch sử &rarr;
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Log 1 */}
          <div className="flex items-start gap-3 p-3 rounded bg-[#f3f4ef]/50 border border-[#E8E9E3]">
            <div className="w-7 h-7 rounded-full bg-[#0B2419] text-white flex items-center justify-center shrink-0 text-xs font-bold">
              HQ
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-[#191c19] leading-snug">
                <strong>Admin Lê Hoàng Quân</strong> vừa xác nhận xuất kho hàng may sẵn cho đơn COD{' '}
                <strong className="text-[#0B2419]">#AV-20241028-088</strong>
              </span>
              <span className="text-[10px] text-[#687069] mt-1">5 phút trước · Web Admin Console</span>
            </div>
          </div>
          {/* Log 2 */}
          <div className="flex items-start gap-3 p-3 rounded bg-[#f3f4ef]/50 border border-[#E8E9E3]">
            <div className="w-7 h-7 rounded-full bg-[#1B5038] text-white flex items-center justify-center shrink-0 text-xs font-bold">
              TD
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-[#191c19] leading-snug">
                <strong>Kho Thủ Đức</strong> kiểm đếm hoàn tất phiếu nhập vải{' '}
                <strong className="text-[#0B2419]">#GR-0042</strong> (200 chiếc)
              </span>
              <span className="text-[10px] text-[#687069] mt-1">22 phút trước · Kho vận trung tâm</span>
            </div>
          </div>
          {/* Log 3 */}
          <div className="flex items-start gap-3 p-3 rounded bg-[#f3f4ef]/50 border border-[#E8E9E3]">
            <div className="w-7 h-7 rounded-full bg-[#E5C358] text-[#101310] flex items-center justify-center shrink-0 text-xs font-bold">
              KT
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-[#191c19] leading-snug">
                <strong>Kế toán Nguyễn Nga</strong> đối soát thành công{' '}
                <strong className="text-[#0B2419]">45.200.000₫</strong> bưu cục GHN
              </span>
              <span className="text-[10px] text-[#687069] mt-1">1 giờ trước · Cổng thanh toán COD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
