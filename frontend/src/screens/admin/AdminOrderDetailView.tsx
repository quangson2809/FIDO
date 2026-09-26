import React, { useState } from 'react';

export const AdminOrderDetailView: React.FC<{
  onNavigateTab: (tab: string, breadcrumb: string) => void;
  showToast: (msg: string) => void;
}> = ({ onNavigateTab, showToast }) => {
  const [afterSalesTab, setAfterSalesTab] = useState<'exchange' | 'return'>('exchange');
  const [exchangeSize, setExchangeSize] = useState('DENIM-ST-IND-32');
  const [exchangeReason, setExchangeReason] = useState(
    'Khách thử hơi kích vòng đùi, đổi lên size 32 theo đặc quyền Home Fitting.'
  );

  const [returnReason, setReturnReason] = useState(
    'Khách hàng đổi ý, không phù hợp dáng người'
  );

  const [collectCodModal, setCollectCodModal] = useState(false);
  const [refundModal, setRefundModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [editRecipientModal, setEditRecipientModal] = useState(false);

  // Recipient state
  const [recipientName, setRecipientName] = useState('Nguyễn Văn An');
  const [recipientPhone, setRecipientPhone] = useState('0912.345.678');
  const [recipientAddress, setRecipientAddress] = useState(
    'Số 128 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh'
  );

  return (
    <div className="flex flex-col w-full space-y-6 pb-12">
      {/* Top Command & Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-lg shadow-sm border border-[#E8E9E3]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigateTab('don-hang', 'Quản lý Đơn hàng')}
            className="inline-flex items-center gap-2 px-3 py-2 bg-[#f3f4ef] hover:bg-[#edeee9] text-[#0B2419] text-xs font-semibold rounded transition-colors group"
          >
            <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform">
              arrow_back
            </span>
            <span>Quay lại Danh Sách Đơn Hàng</span>
          </button>
          <span className="h-4 w-[1px] bg-[#E8E9E3] hidden sm:inline-block"></span>
          <div className="flex items-center gap-2 text-xs text-[#687069]">
            <span className="uppercase tracking-widest text-[10px] font-bold text-[#123A29]">
              Atelier Protocol
            </span>
            <span>/</span>
            <span className="text-[#101310] font-mono font-bold">ORD-2024-8891</span>
          </div>
        </div>

        {/* Quick Status Badges */}
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-[#FAF4DF] text-[#0B2419] text-[10px] font-bold rounded uppercase tracking-wider inline-flex items-center gap-1.5 border border-[#E5C358]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#123A29]"></span>
            Chờ chuẩn bị &amp; Xuất kho
          </span>
          <span className="px-2.5 py-1 bg-[#edeee9] text-[#424844] text-[10px] font-bold rounded tracking-wider uppercase">
            COD Tận Nơi
          </span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText('ORD-2024-8891');
              showToast('Đã sao chép mã đơn hàng: ORD-2024-8891');
            }}
            className="p-1.5 text-[#687069] hover:text-[#0B2419] transition-colors"
            title="Sao chép toàn bộ ID đơn"
          >
            <span className="material-symbols-outlined text-[18px]">share</span>
          </button>
        </div>
      </div>

      {/* Primary 2-Column Responsive Layout: Left 8 cols | Right 4 cols */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (8/12 Columns) */}
        <div className="lg:col-span-8 flex flex-col space-y-6">
          {/* KHỐI A: Thông tin chính & Tiến trình đơn hàng */}
          <section className="bg-white p-6 rounded-lg shadow-sm border border-[#E8E9E3] flex flex-col space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E8E9E3]">
              <div className="flex flex-col">
                <div className="flex items-center gap-3">
                  <h1 className="font-['Playfair_Display',serif] text-xl sm:text-2xl text-[#0B2419] font-bold tracking-tight">
                    Đơn hàng #ORD-2024-8891
                  </h1>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText('ORD-2024-8891');
                      showToast('Đã sao chép mã đơn hàng');
                    }}
                    className="px-2 py-0.5 text-[10px] font-bold uppercase bg-[#edeee9] text-[#0B2419] rounded hover:bg-[#E5C358] hover:text-[#101310] transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    Sao chép
                  </button>
                </div>
                <p className="text-xs text-[#687069] mt-0.5">
                  Đặt qua Atelier Web Boutique (Client Version 3.4.1)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-[#0B2419] text-white text-[11px] font-bold tracking-widest uppercase">
                  <span className="w-2 h-2 rounded-full bg-[#E5C358]"></span>
                  Đang Xử Lý
                </span>
              </div>
            </div>

            {/* Order Progression Stepper */}
            <div className="py-4 px-2">
              <div className="relative flex items-center justify-between">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-[#edeee9] z-0"></div>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[50%] h-1 bg-[#1B5038] z-0 transition-all duration-500"></div>

                {/* Step 1 */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-[#0B2419] text-white flex items-center justify-center text-xs shadow-sm font-bold">
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  </div>
                  <span className="mt-2 text-xs font-bold text-[#0B2419]">Mới đặt</span>
                  <span className="text-[11px] text-[#687069]">14:35 — 24/09</span>
                </div>

                {/* Step 2 */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-[#0B2419] text-white flex items-center justify-center text-xs shadow-sm font-bold">
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  </div>
                  <span className="mt-2 text-xs font-bold text-[#0B2419]">Đã xác nhận</span>
                  <span className="text-[11px] text-[#687069]">15:02 — 24/09</span>
                </div>

                {/* Step 3 (Active) */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-[#E5C358] text-[#101310] flex items-center justify-center text-xs shadow-sm font-bold">
                    <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
                  </div>
                  <span className="mt-2 text-xs font-bold text-[#0B2419]">Đang chuẩn bị</span>
                  <span className="text-[11px] text-[#1B5038] font-semibold">16:10 — 24/09</span>
                </div>

                {/* Step 4 */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-[#e7e9e3] text-[#687069] flex items-center justify-center text-xs">
                    <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                  </div>
                  <span className="mt-2 text-xs text-[#687069]">Đang giao</span>
                  <span className="text-[11px] text-[#687069]">Dự kiến 25/09</span>
                </div>

                {/* Step 5 */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-[#e7e9e3] text-[#687069] flex items-center justify-center text-xs">
                    <span className="material-symbols-outlined text-[16px]">task_alt</span>
                  </div>
                  <span className="mt-2 text-xs text-[#687069]">Hoàn tất</span>
                  <span className="text-[11px] text-[#687069]">—</span>
                </div>
              </div>
            </div>

            {/* Temporal Metadata Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="p-3 bg-[#f3f4ef] rounded border border-[#E8E9E3]">
                <span className="text-[10px] font-bold text-[#687069] uppercase tracking-wider block">
                  Ngày tạo
                </span>
                <span className="font-bold text-[#101310] mt-1 block">24/09/2026</span>
                <span className="text-[11px] text-[#687069]">14:35:18</span>
              </div>
              <div className="p-3 bg-[#f3f4ef] rounded border border-[#E8E9E3]">
                <span className="text-[10px] font-bold text-[#687069] uppercase tracking-wider block">
                  Cập nhật cuối
                </span>
                <span className="font-bold text-[#101310] mt-1 block">24/09/2026</span>
                <span className="text-[11px] text-[#687069]">16:10:05</span>
              </div>
              <div className="p-3 bg-[#f3f4ef] rounded border border-[#E8E9E3]">
                <span className="text-[10px] font-bold text-[#687069] uppercase tracking-wider block">
                  Ngày hoàn tất
                </span>
                <span className="font-semibold text-[#687069] mt-1 block">—</span>
                <span className="text-[11px] text-[#687069]">Chưa kết thúc</span>
              </div>
              <div className="p-3 bg-[#f3f4ef] rounded border border-[#E8E9E3]">
                <span className="text-[10px] font-bold text-[#687069] uppercase tracking-wider block">
                  Ngày trả hàng
                </span>
                <span className="font-semibold text-[#687069] mt-1 block">—</span>
                <span className="text-[11px] text-[#687069]">Không phát sinh</span>
              </div>
            </div>
          </section>

          {/* KHỐI B: Khách hàng & Người nhận */}
          <section className="bg-white p-6 rounded-lg shadow-sm border border-[#E8E9E3]">
            <div className="flex items-center justify-between pb-4 border-b border-[#E8E9E3]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0B2419] text-[22px]">person_pin</span>
                <h2 className="text-base font-bold text-[#0B2419]">
                  Khách Hàng &amp; Thông Tin Giao Nhận
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditRecipientModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#edeee9] hover:bg-[#0B2419] hover:text-white text-[#0B2419] rounded text-xs font-bold tracking-wider uppercase transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                <span>Chỉnh sửa người nhận (PATCH)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 text-xs">
              {/* Left: Account & Loyalty Profile */}
              <div className="p-4 bg-[#f3f4ef] rounded border border-[#E8E9E3] flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#687069] uppercase tracking-wider">
                      Hồ sơ khách hàng
                    </span>
                    <span className="px-2 py-0.5 bg-[#ffe081] text-[#231b00] rounded text-[10px] font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">military_tech</span> VIP Gold
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#123A29] text-white flex items-center justify-center font-bold text-sm">
                      NA
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-[#101310]">{recipientName}</span>
                      <button
                        type="button"
                        onClick={() => onNavigateTab('khach-hang', 'Khách hàng (CRM)')}
                        className="text-xs text-[#1B5038] hover:underline inline-flex items-center gap-1 font-semibold"
                      >
                        Mã CRM: #CUST-0428
                        <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      </button>
                    </div>
                  </div>
                  <div className="pt-2 text-[#424844] space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#687069]">mail</span>
                      <span>customer.vip@ateliervert.vn</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#687069]">receipt_long</span>
                      <span>
                        Tổng đơn tích lũy: <strong className="text-[#101310]">14 đơn</strong> (Hạng Vàng)
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-[#E8E9E3] flex items-center justify-between text-[11px] text-[#123A29]">
                  <span>Đặc quyền miễn phí vận chuyển trọn đời</span>
                  <span className="w-2 h-2 rounded-full bg-[#1B5038]"></span>
                </div>
              </div>

              {/* Right: Shipping Dispatch Data */}
              <div className="p-4 bg-[#f3f4ef] rounded border border-[#E8E9E3] space-y-3">
                <span className="text-[10px] font-bold text-[#687069] uppercase tracking-wider block">
                  Địa chỉ giao hàng
                </span>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[#1B5038] text-[18px] shrink-0 mt-0.5">
                      location_on
                    </span>
                    <p className="text-xs font-semibold text-[#101310] leading-relaxed">
                      {recipientAddress}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#687069] text-[18px]">phone</span>
                      <span className="font-bold text-[#0B2419]">{recipientPhone}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(recipientPhone);
                          showToast('Đã sao chép số điện thoại người nhận');
                        }}
                        className="p-1 hover:bg-[#edeee9] rounded text-[#687069] hover:text-[#0B2419]"
                        title="Sao chép SĐT"
                      >
                        <span className="material-symbols-outlined text-[16px]">content_copy</span>
                      </button>
                      <a
                        href={`tel:${recipientPhone}`}
                        className="p-1 hover:bg-[#edeee9] rounded text-[#1B5038] hover:text-[#0B2419]"
                        title="Gọi ngay"
                      >
                        <span className="material-symbols-outlined text-[16px]">call</span>
                      </a>
                    </div>
                  </div>
                  <div className="p-2.5 bg-white rounded text-[11px] text-[#424844] flex items-center gap-2 border border-[#E8E9E3]">
                    <span className="material-symbols-outlined text-[16px] text-[#725c00]">verified_user</span>
                    <span>Tuyến giao trung tâm Q1 — Ưu tiên giao ca chiều trước 17:30</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* KHỐI C: Sản phẩm trong đơn (Order Items) */}
          <section className="bg-white p-6 rounded-lg shadow-sm border border-[#E8E9E3] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E9E3]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0B2419] text-[22px]">inventory</span>
                <h2 className="text-base font-bold text-[#0B2419]">
                  Danh Mục Sản Phẩm (02 mặt hàng)
                </h2>
              </div>
              <span className="text-[10px] font-bold text-[#687069] uppercase tracking-widest">
                Kiểm định bởi xưởng Vert
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#FAF9F5] text-[#687069] font-bold text-[10px] uppercase tracking-wider border-b border-[#E8E9E3]">
                    <th className="py-3 px-4">Kiểu dáng &amp; Chi tiết mặt hàng</th>
                    <th className="py-3 px-4">Thông số / Phân loại</th>
                    <th className="py-3 px-3 text-right">Đơn giá</th>
                    <th className="py-3 px-3 text-center">SL</th>
                    <th className="py-3 px-4 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E9E3]">
                  {/* Item 1 */}
                  <tr className="hover:bg-[#f8faf4] transition-colors">
                    <td className="py-4 px-4 flex items-center gap-4">
                      <div className="w-16 h-20 rounded bg-[#edeee9] shrink-0 overflow-hidden relative shadow-xs">
                        <img
                          className="w-full h-full object-cover"
                          alt="Quần Jean Straight Fit Dark Indigo Selvedge 13.5oz"
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDKJqRwUygrUcweaHU2gKXoM-_oM4SM0rnItPCBdR5rXiHDxbl9lje6y3SYoIjhNgYTI_QKssYtg440KJM3k7st_J8vTrevSLnpgSuc0YMbnNYd64NKncHhibRyfR6hgkMqggZjOovUzrD7rksYIwFtFcYY2xvND1-jitQdcCOZQQ21lKMAM3UknYRqP_3IKWeI-GxBYKDsBweevnX0QlCJhrwUNKPYbkEeBSIc1mkY52y-sdBM6_aBwQ"
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-sm text-[#101310]">
                          Quần Jean Straight Fit Dark Indigo Selvedge 13.5oz
                        </span>
                        <span className="text-[11px] text-[#687069] mt-0.5">
                          SKU: <strong className="text-[#101310]">DENIM-ST-IND-31</strong>
                        </span>
                        <span className="text-[11px] text-[#1B5038]">Variant ID: #1042 — Tồn kho xưởng: 18</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-[#1b2a47] shrink-0 shadow-xs"></span>
                          <span className="font-semibold text-[#101310]">Chàm Indigo Đậm</span>
                        </div>
                        <span className="text-[11px] bg-[#edeee9] px-2 py-0.5 rounded w-max text-[#0B2419] font-bold">
                          Size: 31
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-right font-medium text-[#101310]">
                      689.000 ₫
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className="px-2.5 py-1 bg-[#edeee9] rounded font-bold text-[#0B2419]">01</span>
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-[#0B2419] text-sm">
                      689.000 ₫
                    </td>
                  </tr>

                  {/* Item 2 */}
                  <tr className="hover:bg-[#f8faf4] transition-colors">
                    <td className="py-4 px-4 flex items-center gap-4">
                      <div className="w-16 h-20 rounded bg-[#edeee9] shrink-0 overflow-hidden relative shadow-xs">
                        <img
                          className="w-full h-full object-cover"
                          alt="Áo Sơ Mi Cổ Cuban Dark Smoke Linen"
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJMbNhR2wcejOEobWbQ6TKWo6MlyKeGsB--jtOy5KdTbIvYkwU3tT00VSu6fcqbl3BKZ-0Tfa5bXLNyOcMzc1ZYQV0wi4tA_k5Nd4Th5DUteQtq_HhNu5T8gYI1KbBWNHotA9CJkmSZV062jmrbtyxaB1DkYqq5PCGQceWT9HA4vHyFK0y3hijYC-HRI68ucQ--_QhwiIED4_Bim5hT2g1DQ5SXMj0rNT4S0rRa5kVfevTq6vEA3vCmQ"
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-sm text-[#101310]">
                          Áo Sơ Mi Cổ Cuban Dark Smoke Linen
                        </span>
                        <span className="text-[11px] text-[#687069] mt-0.5">
                          SKU: <strong className="text-[#101310]">SHIRT-CB-SMK-L</strong>
                        </span>
                        <span className="text-[11px] text-[#1B5038]">Variant ID: #2018 — Tồn kho xưởng: 07</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-[#3d3f44] shrink-0 shadow-xs"></span>
                          <span className="font-semibold text-[#101310]">Xám Khói Dark Smoke</span>
                        </div>
                        <span className="text-[11px] bg-[#edeee9] px-2 py-0.5 rounded w-max text-[#0B2419] font-bold">
                          Size: L
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-3 text-right font-medium text-[#101310]">
                      489.000 ₫
                    </td>
                    <td className="py-4 px-3 text-center">
                      <span className="px-2.5 py-1 bg-[#edeee9] rounded font-bold text-[#0B2419]">01</span>
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-[#0B2419] text-sm">
                      489.000 ₫
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* KHỐI F: Vận Chuyển & Logistics */}
          <section className="bg-white p-6 rounded-lg shadow-sm border border-[#E8E9E3] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E9E3]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0B2419] text-[22px]">local_shipping</span>
                <h2 className="text-base font-bold text-[#0B2419]">Giao Hàng &amp; Vận Chuyển</h2>
              </div>
              <span className="text-xs text-[#1B5038] font-bold">Đồng kiểm khi nhận</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-xs">
              <div className="p-4 bg-[#f3f4ef] rounded border border-[#E8E9E3]">
                <span className="text-[10px] font-bold text-[#687069] uppercase tracking-wider block">
                  Đơn vị vận chuyển
                </span>
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-bold text-sm text-[#101310]">Viettel Post Hỏa Tốc</span>
                </div>
                <span className="text-[11px] text-[#687069] block mt-1">Mã vận đơn: <strong>VTP-88492019</strong></span>
              </div>
              <div className="p-4 bg-[#f3f4ef] rounded border border-[#E8E9E3]">
                <span className="text-[10px] font-bold text-[#687069] uppercase tracking-wider block">
                  Thời gian dự kiến giao
                </span>
                <div className="flex items-center gap-2 mt-2">
                  <span className="material-symbols-outlined text-[#0B2419] text-[20px]">event_available</span>
                  <span className="font-bold text-sm text-[#101310]">25/09/2026</span>
                </div>
                <span className="text-[11px] text-[#123A29] font-medium block mt-1">
                  Ca chiều (14:00 — 17:30)
                </span>
              </div>
              <div className="p-4 bg-[#f3f4ef] rounded border border-[#E8E9E3]">
                <span className="text-[10px] font-bold text-[#687069] uppercase tracking-wider block">
                  Hình thức giao nhận
                </span>
                <div className="flex items-center gap-2 mt-2">
                  <span className="material-symbols-outlined text-[#725c00] text-[20px]">checkroom</span>
                  <span className="font-bold text-sm text-[#725c00]">Mở Hộp Thử Đồ</span>
                </div>
                <span className="text-[11px] text-[#687069] block mt-1">Bưu tá đợi khách thử size tại chỗ</span>
              </div>
            </div>
          </section>

          {/* KHỐI G: Chăm sóc khách hàng (CSKH Notes) */}
          <section className="bg-white p-6 rounded-lg shadow-sm border border-[#E8E9E3] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E9E3]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0B2419] text-[22px]">support_agent</span>
                <h2 className="text-base font-bold text-[#0B2419]">Chăm Sóc Khách Hàng &amp; Ghi Chú Nội Bộ</h2>
              </div>
              <button
                type="button"
                onClick={() => showToast('Đã lưu nội dung ghi chú CSKH vào nhật ký!')}
                className="px-3 py-1.5 bg-[#0B2419] text-white rounded text-xs font-bold uppercase tracking-wider hover:bg-[#1B5038] transition-colors"
              >
                Cập nhật ghi chú CSKH
              </button>
            </div>
            <div className="space-y-4 pt-1 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#687069] mb-1.5">
                  Ghi chú phục vụ khách hàng (customer_service_note)
                </label>
                <textarea
                  className="w-full bg-[#f3f4ef] p-3.5 rounded text-xs text-[#101310] focus:outline-none focus:ring-1 focus:ring-[#0B2419] resize-none leading-relaxed border border-[#E8E9E3]"
                  rows={2}
                  defaultValue="Khách dặn giao trong giờ hành chính chiều, bưu tá gọi trước 15 phút để mang đồ thử size tận nơi."
                />
              </div>
              <div className="p-3.5 bg-[#f3f4ef] rounded flex items-center justify-between border border-[#E8E9E3]">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#687069] text-[20px]">info</span>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#687069] block">
                      Lý do hủy đơn nếu có (cancel_reason)
                    </span>
                    <span className="font-semibold text-[#0B2419] mt-0.5 block">
                      Không có (Đơn hàng đang vận hành bình thường)
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#FAF4DF] text-[#0B2419] text-[10px] font-bold">
                  Active OK
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN (4/12 Columns) */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          {/* KHỐI D: Bảng Tổng Kết Chi Phí & Voucher */}
          <section className="bg-white p-6 rounded-lg shadow-sm border border-[#E8E9E3] space-y-5">
            <h2 className="text-base font-bold text-[#0B2419] flex items-center gap-2 pb-2 border-b border-[#E8E9E3]">
              <span className="material-symbols-outlined text-[20px]">receipt</span>
              Quyết Toán Chi Phí
            </h2>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between text-[#424844]">
                <span>Tạm tính mặt hàng:</span>
                <span className="font-semibold text-[#101310]">1.178.000 ₫</span>
              </div>
              <div className="flex items-center justify-between text-[#424844]">
                <span>Giảm trừ chiến dịch:</span>
                <span className="font-semibold text-[#1B5038]">-248.000 ₫</span>
              </div>
              <div className="p-3 bg-[#FAF4DF] rounded flex flex-col space-y-1.5 border border-[#E5C358]/30">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#0B2419] uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">confirmation_number</span>
                    VOUCHER-VIP-AUTUMN
                  </span>
                  <span className="font-bold text-[#0B2419]">-50.000 ₫</span>
                </div>
                <span className="text-[10px] text-[#725c00]">
                  Voucher ID: #VCH-88 (Đặc quyền VIP Gold Mùa Thu)
                </span>
              </div>
              <div className="flex items-center justify-between text-[#424844]">
                <span>Phí giao hàng:</span>
                <span className="font-semibold text-[#101310]">30.000 ₫</span>
              </div>
            </div>
            <div className="pt-4 p-4 bg-[#FAF4DF]/60 rounded flex items-end justify-between border border-[#E8E9E3]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#123A29] block">
                  Tổng Tiền Thu Nhận
                </span>
                <span className="text-[10px] text-[#687069]">
                  Đã bao gồm VAT &amp; bảo hiểm hàng may sẵn
                </span>
              </div>
              <span className="font-['Playfair_Display',serif] text-xl font-bold text-[#0B2419]">
                880.000 ₫
              </span>
            </div>
          </section>

          {/* KHỐI E: Thanh toán chi tiết */}
          <section className="bg-white p-6 rounded-lg shadow-sm border border-[#E8E9E3] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E9E3]">
              <h2 className="text-base font-bold text-[#0B2419] flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">payments</span>
                Chi Tiết Thanh Toán
              </h2>
              <span className="px-2 py-0.5 bg-[#E5C358] text-[#101310] rounded text-[10px] font-bold uppercase tracking-wider">
                COD Chờ Thu Hộ
              </span>
            </div>
            <div className="space-y-2 text-xs pt-1">
              <div className="flex justify-between py-1.5 bg-[#f3f4ef] px-3 rounded">
                <span className="text-[#687069] uppercase text-[10px] font-bold">Số tiền cần thu:</span>
                <span className="font-bold text-[#101310]">880.000 ₫</span>
              </div>
              <div className="flex justify-between py-1.5 bg-[#f3f4ef] px-3 rounded">
                <span className="text-[#687069] uppercase text-[10px] font-bold">Số tiền đã thu:</span>
                <span className="font-bold text-[#687069]">0 ₫</span>
              </div>
              <div className="flex justify-between py-1.5 bg-[#f3f4ef] px-3 rounded">
                <span className="text-[#687069] uppercase text-[10px] font-bold">Số tiền đã hoàn:</span>
                <span className="font-bold text-[#687069]">0 ₫</span>
              </div>
            </div>
            <div className="p-3 bg-[#f3f4ef] rounded text-[11px] space-y-1.5 text-[#424844] border border-[#E8E9E3]">
              <div className="flex items-center justify-between">
                <span className="text-[#687069] uppercase text-[10px] font-bold">Người phụ trách thu:</span>
                <span className="font-semibold text-[#101310]">Đặng Quốc Tuấn (Kế toán kho)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#687069] uppercase text-[10px] font-bold">Thời gian ghi nhận:</span>
                <span>Chờ giao hoàn tất</span>
              </div>
            </div>
          </section>

          {/* KHỐI H: Hành Động Xử Lý Đơn */}
          <section className="bg-white p-6 rounded-lg shadow-sm border border-[#E8E9E3] space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-[#E8E9E3]">
              <h2 className="text-base font-bold text-[#0B2419] flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">tune</span>
                Hành Động Trạng Thái
              </h2>
              <span className="text-[10px] font-bold text-[#1B5038] uppercase tracking-wider">
                POST /ACTIONS
              </span>
            </div>
            <p className="text-xs text-[#687069]">
              Các thao tác được cấp quyền theo quy trình vận hành:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
              <button
                type="button"
                onClick={() => showToast('Đã xác nhận đơn hàng sang trạng thái PREPARE!')}
                className="w-full py-2.5 px-3 bg-[#0B2419] text-white hover:bg-[#1B5038] text-[11px] font-bold uppercase tracking-wider rounded flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">done_all</span> Xác nhận đơn
              </button>
              <button
                type="button"
                onClick={() => showToast('Đang tiến hành gom đồ & đóng hộp Atelier Box!')}
                className="w-full py-2.5 px-3 bg-[#123A29] text-white hover:bg-[#0B2419] text-[11px] font-bold uppercase tracking-wider rounded flex items-center justify-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">inventory_2</span> Chuẩn bị hàng
              </button>
              <button
                type="button"
                onClick={() => showToast('Lệnh bàn giao cho Viettel Post đã được tạo!')}
                className="w-full py-2.5 px-3 bg-[#e7e9e3] hover:bg-[#0B2419] hover:text-white text-[#0B2419] text-[11px] font-bold uppercase tracking-wider rounded flex items-center justify-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">flight_takeoff</span> Bắt đầu giao
              </button>
              <button
                type="button"
                onClick={() => showToast('Đơn hàng được chốt hoàn tất thành công!')}
                className="w-full py-2.5 px-3 bg-[#e7e9e3] hover:bg-[#0B2419] hover:text-white text-[#0B2419] text-[11px] font-bold uppercase tracking-wider rounded flex items-center justify-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">task</span> Hoàn tất
              </button>
              <button
                type="button"
                onClick={() => showToast('Tạo lịch hẹn giao lại lần 2 cho khách')}
                className="w-full py-2 px-3 bg-[#f3f4ef] hover:bg-[#edeee9] text-[#101310] text-[11px] font-bold uppercase tracking-wider rounded flex items-center justify-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">replay</span> Giao lại
              </button>
              <button
                type="button"
                onClick={() => showToast('Xác nhận bưu tá đã mang đồ hoàn về kho xưởng')}
                className="w-full py-2 px-3 bg-[#f3f4ef] hover:bg-[#edeee9] text-[#101310] text-[11px] font-bold uppercase tracking-wider rounded flex items-center justify-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">keyboard_return</span> Nhận hàng hoàn
              </button>
            </div>
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => showToast('Ghi nhận giao không thành công - Chờ khách phản hồi')}
                className="w-1/2 py-2 px-2 bg-[#ffdad6]/60 hover:bg-[#ffdad6] text-[#ba1a1a] text-[11px] font-bold uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[15px]">error_outline</span> Giao thất bại
              </button>
              <button
                type="button"
                onClick={() => setCancelModal(true)}
                className="w-1/2 py-2 px-2 bg-[#ba1a1a] hover:bg-[#93000a] text-white text-[11px] font-bold uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-1 shadow-xs"
              >
                <span className="material-symbols-outlined text-[15px]">cancel</span> Hủy đơn hàng
              </button>
            </div>
          </section>

          {/* KHỐI I: Quản Lý Dòng Tiền COD */}
          <section className="bg-white p-6 rounded-lg shadow-sm border border-[#E8E9E3] space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-[#E8E9E3]">
              <h2 className="text-base font-bold text-[#0B2419] flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
                Nghiệp Vụ COD &amp; Hoàn Tiền
              </h2>
              <span className="text-[10px] font-bold text-[#1B5038] uppercase tracking-wider">
                POST /PAYMENT-ACTIONS
              </span>
            </div>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#FAF4DF] rounded space-y-2 border border-[#E5C358]/30">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#0B2419] uppercase tracking-wider">
                    Thu Hộ Khi Giao (COD)
                  </span>
                  <span className="font-bold text-[#0B2419] text-sm">880.000 ₫</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCollectCodModal(true)}
                  className="w-full py-2.5 px-3 bg-[#E5C358] hover:bg-[#d6b54a] text-[#101310] text-xs font-bold uppercase tracking-wider rounded transition-colors shadow-xs flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">price_check</span>
                  Ghi nhận đã thu COD
                </button>
              </div>
              <button
                type="button"
                onClick={() => setRefundModal(true)}
                className="w-full py-2 px-3 bg-[#e7e9e3] hover:bg-[#edeee9] text-[#101310] text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">currency_exchange</span>
                Hoàn tiền cho khách (REFUND)
              </button>
            </div>
          </section>

          {/* KHỐI J: Xử Lý Sau Bán (After-sales) */}
          <section className="bg-white p-6 rounded-lg shadow-sm border border-[#E8E9E3] space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-[#E8E9E3]">
              <h2 className="text-base font-bold text-[#0B2419] flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">published_with_changes</span>
                Xử Lý Sau Bán (After-Sales)
              </h2>
              <span className="text-[10px] font-bold text-[#1B5038] uppercase tracking-wider">
                POST /AFTER-SALES
              </span>
            </div>
            {/* Custom Mode Toggle */}
            <div className="flex p-1 bg-[#f3f4ef] rounded border border-[#E8E9E3]">
              <button
                type="button"
                onClick={() => setAfterSalesTab('exchange')}
                className={`w-1/2 py-1.5 text-[11px] font-bold uppercase rounded transition-colors ${
                  afterSalesTab === 'exchange'
                    ? 'bg-[#0B2419] text-white shadow-xs'
                    : 'text-[#687069] hover:text-[#101310]'
                }`}
              >
                Đổi Size Tại Xưởng
              </button>
              <button
                type="button"
                onClick={() => setAfterSalesTab('return')}
                className={`w-1/2 py-1.5 text-[11px] font-bold uppercase rounded transition-colors ${
                  afterSalesTab === 'return'
                    ? 'bg-[#0B2419] text-white shadow-xs'
                    : 'text-[#687069] hover:text-[#101310]'
                }`}
              >
                Trả Hàng / Hoàn Tiền
              </button>
            </div>

            {afterSalesTab === 'exchange' ? (
              <div className="space-y-3.5 pt-1 text-xs">
                <div className="p-3 bg-[#f3f4ef] rounded space-y-1 border border-[#E8E9E3]">
                  <span className="text-[10px] font-bold text-[#687069] uppercase tracking-wider block">
                    Variant Cũ Cần Đổi:
                  </span>
                  <span className="font-bold text-[#101310] block">
                    Quần Jean Dark Indigo — Size 31
                  </span>
                  <span className="text-[10px] text-[#687069] font-mono block">
                    SKU: DENIM-ST-IND-31 (Variant #1042)
                  </span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#687069] mb-1">
                    Variant mới thay thế:
                  </label>
                  <select
                    value={exchangeSize}
                    onChange={(e) => setExchangeSize(e.target.value)}
                    className="w-full bg-[#f3f4ef] p-2.5 rounded font-semibold text-[#0B2419] border border-[#E8E9E3] focus:outline-none focus:border-[#0B2419]"
                  >
                    <option value="DENIM-ST-IND-32">Quần Jean Dark Indigo — Size 32 (Tồn kho: 18 cái)</option>
                    <option value="DENIM-ST-IND-33">Quần Jean Dark Indigo — Size 33 (Tồn kho: 09 cái)</option>
                    <option value="DENIM-ST-IND-30">Quần Jean Dark Indigo — Size 30 (Tồn kho: 04 cái)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#687069] mb-1">
                      Số lượng đổi:
                    </label>
                    <input
                      className="w-full bg-[#f3f4ef] p-2 rounded text-[#101310] font-bold border border-[#E8E9E3]"
                      type="number"
                      readOnly
                      value={1}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#687069] mb-1">
                      Phí đổi size:
                    </label>
                    <span className="block py-2 px-2 bg-[#f3f4ef] rounded font-bold text-[#1B5038] border border-[#E8E9E3]">
                      0 ₫ (VIP Free)
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#687069] mb-1">
                    Lý do đổi hàng:
                  </label>
                  <input
                    type="text"
                    value={exchangeReason}
                    onChange={(e) => setExchangeReason(e.target.value)}
                    className="w-full bg-[#f3f4ef] p-2 rounded text-[#101310] border border-[#E8E9E3] focus:outline-none focus:border-[#0B2419]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    showToast('Đã lập Phiếu Đổi Size & Lệnh Điều Kho #EXC-992 thành công!')
                  }
                  className="w-full py-2.5 px-3 bg-[#0B2419] hover:bg-[#1B5038] text-white text-xs font-bold uppercase tracking-wider rounded transition-colors shadow-xs flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">sync_alt</span>
                  Tạo Phiếu Đổi Size &amp; Lệnh Điều Kho
                </button>
              </div>
            ) : (
              <div className="space-y-3.5 pt-1 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#687069] mb-1">
                    Lý do trả hàng toàn phần:
                  </label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full bg-[#f3f4ef] p-2.5 rounded text-[#101310] border border-[#E8E9E3] focus:outline-none focus:border-[#0B2419]"
                  >
                    <option>Khách hàng đổi ý, không phù hợp dáng người</option>
                    <option>Lỗi may đo / chỉ thừa xưởng xuất xưởng</option>
                    <option>Thời gian giao hàng chậm hơn hẹn</option>
                  </select>
                </div>
                <div className="p-3 bg-[#f3f4ef] rounded border border-[#E8E9E3]">
                  <span className="text-[10px] font-bold text-[#687069] uppercase tracking-wider block">
                    Số tiền dự kiến hoàn về ví khách:
                  </span>
                  <span className="font-['Playfair_Display',serif] text-xl font-bold text-[#0B2419] mt-1 block">
                    880.000 ₫
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    showToast('Đã khởi tạo yêu cầu hoàn trả & nhập kho lại!')
                  }
                  className="w-full py-2.5 px-3 bg-[#101310] hover:bg-[#0B2419] text-white text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">assignment_return</span>
                  Xác Nhận Lập Phiếu Trả Hàng (RETURN)
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* MODAL: Ghi Nhận Thu COD */}
      {collectCodModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071A12]/60 backdrop-blur-xs"
          onClick={() => setCollectCodModal(false)}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full p-6 space-y-5 shadow-2xl border border-[#E8E9E3]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E9E3]">
              <h3 className="text-base font-bold text-[#0B2419] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1B5038]">price_check</span>
                Xác Nhận Thu Hộ Tiền Mặt COD
              </h3>
              <button
                type="button"
                onClick={() => setCollectCodModal(false)}
                className="p-1 text-[#687069] hover:text-[#0B2419]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-[#687069] uppercase tracking-wider mb-1">
                  Số tiền thực tế đã nhận:
                </label>
                <input
                  type="text"
                  defaultValue="880.000 ₫"
                  className="w-full bg-[#f3f4ef] p-2.5 rounded font-bold text-sm text-[#0B2419] border border-[#E8E9E3] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#687069] uppercase tracking-wider mb-1">
                  Phương thức thực nhận:
                </label>
                <select className="w-full bg-[#f3f4ef] p-2.5 rounded text-[#101310] border border-[#E8E9E3]">
                  <option>Tiền mặt (Bưu tá giao hàng nộp về quỹ)</option>
                  <option>Chuyển khoản QR Viettel Post trực tiếp</option>
                  <option>Quẹt thẻ mPOS khi giao</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#687069] uppercase tracking-wider mb-1">
                  Ghi chú kế toán kho:
                </label>
                <input
                  type="text"
                  defaultValue="Thu đủ tiền COD mã đơn #ORD-2024-8891, khớp lệnh vận đơn."
                  className="w-full bg-[#f3f4ef] p-2.5 rounded text-[#101310] border border-[#E8E9E3]"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8E9E3]">
              <button
                type="button"
                onClick={() => setCollectCodModal(false)}
                className="px-4 py-2 bg-[#f3f4ef] text-[#101310] text-xs font-bold uppercase rounded"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast('Đã cập nhật số tiền đã thu: 880.000 ₫!');
                  setCollectCodModal(false);
                }}
                className="px-5 py-2 bg-[#0B2419] text-white hover:bg-[#1B5038] text-xs font-bold uppercase tracking-wider rounded"
              >
                Lưu Xác Nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Hủy Đơn Hàng */}
      {cancelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071A12]/60 backdrop-blur-xs"
          onClick={() => setCancelModal(false)}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#E8E9E3]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E9E3]">
              <h3 className="text-base font-bold text-[#ba1a1a] flex items-center gap-2">
                <span className="material-symbols-outlined">warning</span>
                Hủy Đơn Hàng #ORD-2024-8891
              </h3>
              <button
                type="button"
                onClick={() => setCancelModal(false)}
                className="p-1 text-[#687069] hover:text-[#0B2419]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="text-xs text-[#424844]">
              Hành động này sẽ giải phóng tồn kho đã giữ cho 2 sản phẩm và hủy mã vận đơn liên kết với đối tác logistics.
            </p>
            <div className="text-xs">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#687069] mb-1">
                Lý do hủy đơn (cancel_reason):
              </label>
              <select className="w-full bg-[#f3f4ef] p-2.5 rounded text-[#101310] border border-[#E8E9E3]">
                <option>Khách hàng yêu cầu hủy qua điện thoại</option>
                <option>Không liên lạc được khách sau 3 lần gọi</option>
                <option>Sản phẩm bị lỗi trong công đoạn hoàn thiện cuối</option>
                <option>Sai sót địa chỉ / Khu vực không hỗ trợ giao</option>
              </select>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8E9E3]">
              <button
                type="button"
                onClick={() => setCancelModal(false)}
                className="px-4 py-2 bg-[#f3f4ef] text-[#101310] text-xs font-bold uppercase rounded"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast('Đã cập nhật trạng thái đơn thành CANCELLED!');
                  setCancelModal(false);
                }}
                className="px-5 py-2 bg-[#ba1a1a] text-white hover:bg-[#93000a] text-xs font-bold uppercase tracking-wider rounded"
              >
                Xác Nhận Hủy Đơn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Chỉnh Sửa Người Nhận */}
      {editRecipientModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071A12]/60 backdrop-blur-xs"
          onClick={() => setEditRecipientModal(false)}
        >
          <div
            className="bg-white rounded-lg max-w-lg w-full p-6 space-y-4 shadow-2xl border border-[#E8E9E3]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E9E3]">
              <h3 className="text-base font-bold text-[#0B2419] flex items-center gap-2">
                <span className="material-symbols-outlined">edit_location_alt</span>
                Chỉnh Sửa Thông Tin Người Nhận
              </h3>
              <button
                type="button"
                onClick={() => setEditRecipientModal(false)}
                className="p-1 text-[#687069] hover:text-[#0B2419]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#687069] mb-1">
                  Tên người nhận:
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full bg-[#f3f4ef] p-2.5 rounded text-[#101310] border border-[#E8E9E3] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#687069] mb-1">
                  Số điện thoại nhận:
                </label>
                <input
                  type="text"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="w-full bg-[#f3f4ef] p-2.5 rounded text-[#101310] border border-[#E8E9E3] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#687069] mb-1">
                  Địa chỉ chi tiết (PATCH address):
                </label>
                <textarea
                  rows={3}
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="w-full bg-[#f3f4ef] p-2.5 rounded text-[#101310] border border-[#E8E9E3] focus:outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8E9E3]">
              <button
                type="button"
                onClick={() => setEditRecipientModal(false)}
                className="px-4 py-2 bg-[#f3f4ef] text-[#101310] text-xs font-bold uppercase rounded"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast('Đã cập nhật thông tin người nhận đơn thành công qua PATCH!');
                  setEditRecipientModal(false);
                }}
                className="px-5 py-2 bg-[#0B2419] text-white hover:bg-[#1B5038] text-xs font-bold uppercase tracking-wider rounded"
              >
                Cập Nhật Ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Hoàn Tiền (Refund) */}
      {refundModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071A12]/60 backdrop-blur-xs"
          onClick={() => setRefundModal(false)}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 shadow-2xl border border-[#E8E9E3]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E9E3]">
              <h3 className="text-base font-bold text-[#0B2419] flex items-center gap-2">
                <span className="material-symbols-outlined">currency_exchange</span>
                Khởi Tạo Hoàn Tiền Cho Khách (REFUND)
              </h3>
              <button
                type="button"
                onClick={() => setRefundModal(false)}
                className="p-1 text-[#687069] hover:text-[#0B2419]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#687069] mb-1">
                  Số tiền hoàn:
                </label>
                <input
                  type="text"
                  defaultValue="880.000 ₫"
                  className="w-full bg-[#f3f4ef] p-2.5 rounded text-[#101310] font-bold border border-[#E8E9E3]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#687069] mb-1">
                  Số tài khoản / Ngân hàng thụ hưởng:
                </label>
                <input
                  type="text"
                  placeholder="1903... Techcombank - NGUYEN VAN AN"
                  className="w-full bg-[#f3f4ef] p-2.5 rounded text-[#101310] border border-[#E8E9E3]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#687069] mb-1">
                  Lý do hoàn tiền:
                </label>
                <textarea
                  rows={2}
                  placeholder="Nhập lý do hoàn trả chi tiết..."
                  className="w-full bg-[#f3f4ef] p-2.5 rounded text-[#101310] border border-[#E8E9E3] resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8E9E3]">
              <button
                type="button"
                onClick={() => setRefundModal(false)}
                className="px-4 py-2 bg-[#f3f4ef] text-[#101310] text-xs font-bold uppercase rounded"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  showToast('Đã lập lệnh hoàn tiền chuyển bộ phận Kế toán kiểm duyệt!');
                  setRefundModal(false);
                }}
                className="px-5 py-2 bg-[#0B2419] text-white hover:bg-[#1B5038] text-xs font-bold uppercase tracking-wider rounded"
              >
                Lập Lệnh Hoàn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
