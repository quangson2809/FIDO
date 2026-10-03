import React, { useState } from 'react';

export const AdminCustomerDetailView: React.FC<{
  onNavigateTab: (tab: string, breadcrumb: string) => void;
  showToast: (msg: string) => void;
}> = ({ onNavigateTab }) => {
  const [activeCustomer] = useState({
    id: 'CUST-0428',
    phone: '0912 345 678',
    email: 'customer@email.com',
    createdAt: '15/08/2026 09:15',
    updatedAt: '22/09/2026 10:30',
    addresses: [
      {
        id: 'addr-1',
        isDefault: true,
        address: '123 Xuân Thủy, Phường Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội',
        dateAdded: '20/09/2026 14:10',
      },
      {
        id: 'addr-2',
        isDefault: false,
        address: '25 Trần Duy Hưng, Phường Trung Hòa, Quận Cầu Giấy, Hà Nội',
        dateAdded: '10/08/2026 08:30',
      },
    ],
    orders: [
      {
        id: 'ORD-2024-8891',
        status: 'Hoàn tất',
        statusType: 'completed',
        payment: 'Đã thanh toán',
        total: '880.000 ₫',
        orderDate: '20/09/2026 14:30',
        completeDate: '23/09/2026 11:15',
        returnDate: '—',
      },
      {
        id: 'ORD-2024-8840',
        status: 'Đang giao',
        statusType: 'shipping',
        payment: 'Chưa thanh toán (COD)',
        total: '1.450.000 ₫',
        orderDate: '24/09/2026 09:20',
        completeDate: '—',
        returnDate: '—',
      },
      {
        id: 'ORD-2024-8712',
        status: 'Chờ xác nhận',
        statusType: 'pending',
        payment: 'Chưa thanh toán',
        total: '689.000 ₫',
        orderDate: '24/09/2026 16:45',
        completeDate: '—',
        returnDate: '—',
      },
      {
        id: 'ORD-2024-8205',
        status: 'Đã trả hàng',
        statusType: 'returned',
        payment: 'Đã hoàn tiền',
        total: '489.000 ₫',
        orderDate: '02/09/2026 10:15',
        completeDate: '05/09/2026 15:00',
        returnDate: '08/09/2026 09:30',
      },
    ],
  });

  return (
    <div className="flex flex-col w-full max-w-[1400px] mx-auto space-y-6">
      {/* PHẦN ĐẦU TRANG (Header Bar) */}
      <section className="flex flex-col gap-2 bg-white p-5 sm:p-6 rounded-lg shadow-sm border border-[#E8E9E3]">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab('khach-hang', 'Khách hàng (CRM)')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[#0B2419] bg-[#f3f4ef] hover:bg-[#edeee9] transition-colors rounded text-xs font-semibold group"
          >
            <span className="material-symbols-outlined text-[18px] transition-transform group-hover:-translate-x-0.5">
              arrow_back
            </span>
            <span>Quay lại danh sách khách hàng</span>
          </button>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 pt-1">
          <div>
            <h1 className="font-['Playfair_Display',serif] text-2xl sm:text-3xl text-[#0B2419] font-bold tracking-tight">
              Chi tiết khách hàng
            </h1>
            <p className="text-xs sm:text-sm text-[#687069] mt-0.5">
              Xem toàn bộ thông tin tài khoản, sổ địa chỉ và lịch sử giao dịch của khách hàng trong hệ thống Atelier Vert.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FAF4DF] text-[#101310] rounded text-[11px] font-bold uppercase tracking-wider self-start md:self-auto border border-[#E5C358]/30">
            <span className="material-symbols-outlined text-[16px] text-[#725c00]">lock</span>
            Chế độ xem dữ liệu (Read-only)
          </div>
        </div>
      </section>

      {/* GRID BỐ CỤC: THÔNG TIN TÀI KHOẢN & SỔ ĐỊA CHỈ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* KHỐI A — THÔNG TIN TÀI KHOẢN (Account Overview) */}
        <section className="lg:col-span-5 bg-white rounded-lg shadow-sm border border-[#E8E9E3] overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 bg-[#f3f4ef] flex items-center justify-between border-b border-[#E8E9E3]">
            <div className="flex items-center gap-2 text-[#0B2419]">
              <span className="material-symbols-outlined text-[20px]">account_circle</span>
              <h2 className="text-sm font-bold text-[#0B2419]">Thông tin tài khoản</h2>
            </div>
            <span className="px-2 py-0.5 bg-[#0B2419]/5 text-[#0B2419] text-[10px] font-bold rounded uppercase tracking-wider">
              Xác thực
            </span>
          </div>
          <div className="p-5 flex flex-col divide-y divide-[#E8E9E3] text-xs">
            <div className="py-3 flex items-center justify-between first:pt-0">
              <span className="text-[#687069]">Số điện thoại</span>
              <span className="text-[#101310] font-mono font-bold text-sm">{activeCustomer.phone}</span>
            </div>
            <div className="py-3 flex items-center justify-between">
              <span className="text-[#687069]">Email</span>
              <span className="text-[#101310] font-medium select-all">{activeCustomer.email}</span>
            </div>
            <div className="py-3 flex items-center justify-between">
              <span className="text-[#687069]">Ngày tạo tài khoản</span>
              <span className="text-[#101310]">{activeCustomer.createdAt}</span>
            </div>
            <div className="py-3 flex items-center justify-between last:pb-0">
              <span className="text-[#687069]">Cập nhật lần cuối</span>
              <span className="text-[#101310]">{activeCustomer.updatedAt}</span>
            </div>
          </div>
          <div className="px-5 py-2.5 bg-[#FAF4DF]/50 border-t border-[#E8E9E3] flex items-center gap-2 text-xs text-[#625f4e]">
            <span className="material-symbols-outlined text-[16px] text-[#725c00]">verified_user</span>
            <span className="text-[11px]">Hồ sơ khách hàng định danh trực tiếp qua hệ thống xác thực.</span>
          </div>
        </section>

        {/* KHỐI B — ĐỊA CHỈ ĐÃ LƯU (Saved Addresses) */}
        <section className="lg:col-span-7 bg-white rounded-lg shadow-sm border border-[#E8E9E3] overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 bg-[#f3f4ef] flex items-center justify-between border-b border-[#E8E9E3]">
            <div className="flex items-center gap-2 text-[#0B2419]">
              <span className="material-symbols-outlined text-[20px]">pin_drop</span>
              <h2 className="text-sm font-bold text-[#0B2419]">Địa chỉ đã lưu</h2>
            </div>
            <span className="px-2.5 py-0.5 bg-[#0B2419] text-white text-[10px] font-bold rounded-full">
              {activeCustomer.addresses.length} địa chỉ
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#edeee9] text-[#0B2419] border-b border-[#E8E9E3]">
                  <th className="py-2.5 px-5 font-bold uppercase tracking-wider text-[10px]">ĐỊA CHỈ</th>
                  <th className="py-2.5 px-5 font-bold uppercase tracking-wider text-right w-44 text-[10px]">
                    NGÀY THÊM
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E9E3]">
                {activeCustomer.addresses.map((item) => (
                  <tr key={item.id} className="hover:bg-[#f8faf4] transition-colors">
                    <td className="py-3 px-5 align-top">
                      <div className="flex items-start gap-2">
                        {item.isDefault && (
                          <span className="inline-flex mt-0.5 px-1.5 py-0.5 bg-[#123A29] text-white rounded text-[10px] font-bold uppercase tracking-wider shrink-0">
                            Mặc định
                          </span>
                        )}
                        <span className="text-[#101310] font-medium leading-relaxed">{item.address}</span>
                      </div>
                    </td>
                    <td className="py-3 px-5 text-right align-top text-[#687069] font-mono text-[11px] whitespace-nowrap">
                      {item.dateAdded}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* KHỐI C — LỊCH SỬ ĐƠN HÀNG (Order History) */}
      <section className="bg-white rounded-lg shadow-sm border border-[#E8E9E3] overflow-hidden flex flex-col">
        <div className="px-5 py-3.5 bg-[#f3f4ef] flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E9E3]">
          <div className="flex items-center gap-2 text-[#0B2419]">
            <span className="material-symbols-outlined text-[22px]">receipt_long</span>
            <h2 className="text-sm font-bold text-[#0B2419]">Đơn hàng của khách hàng</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-[#FAF4DF] text-[#101310] text-[11px] font-semibold rounded">
              {activeCustomer.orders.length} đơn hàng
            </span>
            <span className="px-3 py-1 bg-[#0B2419] text-white text-[11px] font-bold rounded tracking-wide">
              Tổng chi tiêu: 8.420.000 ₫
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px] text-xs">
            <thead>
              <tr className="bg-[#edeee9] text-[#0B2419] border-b border-[#E8E9E3]">
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">Mã đơn</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">Trạng thái đơn</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">Thanh toán</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-right">Tổng tiền</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">Ngày đặt</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">Hoàn tất</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px]">Trả hàng</th>
                <th className="py-3 px-4 font-bold uppercase tracking-wider text-[10px] text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E9E3]">
              {activeCustomer.orders.map((ord) => (
                <tr key={ord.id} className="hover:bg-[#f8faf4] transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[#0B2419]">{ord.id}</td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {ord.statusType === 'completed' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#cde9d8] text-[#072015]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1B5038]"></span>
                        Hoàn tất
                      </span>
                    )}
                    {ord.statusType === 'shipping' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#FAF4DF] text-[#101310]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#725c00]"></span>
                        Đang giao
                      </span>
                    )}
                    {ord.statusType === 'pending' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#edeee9] text-[#424844]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#727974]"></span>
                        Chờ xác nhận
                      </span>
                    )}
                    {ord.statusType === 'returned' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#ffdad6] text-[#ba1a1a]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a]"></span>
                        Đã trả hàng
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-[#424844]">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#0B2419]/5 text-[#0B2419]">
                      {ord.payment}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-[#101310] whitespace-nowrap">
                    {ord.total}
                  </td>
                  <td className="py-3 px-4 text-[#687069] whitespace-nowrap font-mono text-[11px]">
                    {ord.orderDate}
                  </td>
                  <td className="py-3 px-4 text-[#101310] whitespace-nowrap font-mono text-[11px]">
                    {ord.completeDate}
                  </td>
                  <td className="py-3 px-4 text-[#ba1a1a] font-mono text-[11px] whitespace-nowrap">
                    {ord.returnDate}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => onNavigateTab('don-hang', 'Quản lý Đơn hàng')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[#0B2419] bg-[#f3f4ef] hover:bg-[#0B2419] hover:text-white transition-colors rounded text-[11px] font-bold"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      <span>Xem đơn</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 bg-[#f8faf4] border-t border-[#E8E9E3] flex items-center justify-between flex-wrap gap-2 text-xs text-[#687069]">
          <span className="text-[11px]">Hiển thị 4 đơn hàng gần nhất trong số 12 giao dịch.</span>
          <button
            type="button"
            onClick={() => onNavigateTab('don-hang', 'Quản lý Đơn hàng')}
            className="text-[11px] text-[#0B2419] hover:underline uppercase tracking-wider font-bold"
          >
            Xem toàn bộ giao dịch của khách hàng &rarr;
          </button>
        </div>
      </section>
    </div>
  );
};