import React, { useState } from 'react';

export const AdminInwardView: React.FC<{
  showToast: (msg: string) => void;
  onNavigateTab: (tab: string, breadcrumb: string) => void;
}> = ({ showToast, onNavigateTab }) => {
  const [receipts] = useState([
    {
      id: 'GR-0042',
      supplier: 'Kurabo Denim Mills Japan',
      batch: 'Lô vải Indigo 13.5oz Thu Đông',
      qty: '200 cây vải (2.400 mét)',
      date: '24/09/2026 15:30',
      warehouse: 'Kho Vải Trung Tâm Hà Nội',
      status: 'COMPLETED',
      totalValue: '480.000.000 ₫',
    },
    {
      id: 'GR-0041',
      supplier: 'Albini Group Italy',
      batch: 'Lụa & Cotton Ai Cập Cổ Cuban',
      qty: '120 cây vải (1.500 mét)',
      date: '20/09/2026 10:15',
      warehouse: 'Showroom Lý Tự Trọng (HCM)',
      status: 'COMPLETED',
      totalValue: '315.000.000 ₫',
    },
    {
      id: 'GR-0040',
      supplier: 'Xưởng Dệt Sartorial Sài Gòn',
      batch: 'Lô Quần Gurkha Cạp Cao Xếp Ly',
      qty: '80 chiếc thành phẩm may sẵn',
      date: '18/09/2026 14:00',
      warehouse: 'Xưởng May Atelier Vert',
      status: 'COMPLETED',
      totalValue: '96.000.000 ₫',
    },
    {
      id: 'GR-0039',
      supplier: 'Loro Piana Heritage Wool',
      batch: 'Vải Len Cừu Super 150s Blazer',
      qty: '50 cây vải (600 mét)',
      date: '12/09/2026 09:00',
      warehouse: 'Kho Vải Trung Tâm Hà Nội',
      status: 'COMPLETED',
      totalValue: '425.000.000 ₫',
    },
  ]);

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#687069]">
            <span>Hệ thống Quản trị</span>
            <span>/</span>
            <span>Kho &amp; Vận hành</span>
            <span>/</span>
            <span className="text-[#0B2419] font-semibold">Phiếu nhập kho</span>
          </div>
          <h1 className="font-['Playfair_Display',serif] text-2xl sm:text-3xl font-bold text-[#0B2419] tracking-tight">
            Quản Lý Phiếu Nhập Kho (Goods Receipts)
          </h1>
          <p className="text-xs text-[#687069]">
            Lưu vết tất cả các đợt tiếp nhận nguyên phụ liệu dệt may và thành phẩm từ xưởng đối tác trong và ngoài nước.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => showToast('Mở biểu mẫu tạo phiếu nhập kho mới (POST #52)')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0B2419] hover:bg-[#1B5038] text-white text-xs font-bold uppercase tracking-wider rounded shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">add_box</span>
            Tạo Phiếu Nhập Kho Mới
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-lg border border-[#E8E9E3] shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#687069]">
            Tổng Phiếu Nhập Tháng Này
          </span>
          <div className="mt-2 text-3xl font-bold text-[#0B2419] font-['Playfair_Display',serif]">
            28 <span className="text-xs font-sans font-normal text-[#687069]">đợt giao</span>
          </div>
          <div className="mt-2 text-xs text-[#1B5038] font-medium">100% đạt kiểm định chất lượng</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E8E9E3] shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#687069]">
            Tổng Giá Trị Nhập
          </span>
          <div className="mt-2 text-3xl font-bold text-[#0B2419] font-['Playfair_Display',serif]">
            1.316.000.000₫
          </div>
          <div className="mt-2 text-xs text-[#687069]">Kỳ tháng 09/2026</div>
        </div>

        <div className="bg-white p-5 rounded-lg border border-[#E8E9E3] shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#1B5038]">
            Tồn Kho Sẵn Sàng Bán
          </span>
          <div className="mt-2 text-3xl font-bold text-[#1B5038] font-['Playfair_Display',serif]">
            3.420 <span className="text-xs font-sans font-normal text-[#687069]">sản phẩm</span>
          </div>
          <div className="mt-2 text-xs text-[#1B5038] font-medium">Sẵn sàng xuất giao ngay</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-[#E8E9E3] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E8E9E3] bg-[#FAF9F5] flex items-center justify-between">
          <h3 className="font-bold text-sm text-[#0B2419]">Danh Sách Phiếu Nhập Kho Gần Nhất</h3>
          <span className="text-xs text-[#687069]">Hiển thị 4 đợt nhập lớn</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#191c19]">
            <thead>
              <tr className="bg-[#FAF9F5] text-[#687069] font-bold text-[10px] uppercase tracking-wider border-b border-[#E8E9E3]">
                <th className="py-3 px-4">Mã Phiếu</th>
                <th className="py-3 px-4">Nhà Cung Cấp &amp; Lô Hàng</th>
                <th className="py-3 px-4">Kho Tiếp Nhận</th>
                <th className="py-3 px-4">Số Lượng Thực Nhập</th>
                <th className="py-3 px-4 text-right">Tổng Giá Trị</th>
                <th className="py-3 px-4 text-center">Trạng Thái</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E9E3]">
              {receipts.map((r) => (
                <tr key={r.id} className="hover:bg-[#FAF4DF]/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#0B2419]">
                    {r.id}
                    <div className="text-[10px] text-[#687069] font-normal">{r.date}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-[#101310]">{r.supplier}</div>
                    <div className="text-[11px] text-[#687069]">{r.batch}</div>
                  </td>
                  <td className="py-3.5 px-4 text-[#687069]">{r.warehouse}</td>
                  <td className="py-3.5 px-4 font-semibold text-[#0B2419]">{r.qty}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-[#0B2419]">{r.totalValue}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#cde9d8] text-[#072015]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1B5038]"></span>
                      Đã Nhập Kho
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => showToast(`In biên bản bàn giao phiếu ${r.id}`)}
                      className="px-2.5 py-1 text-xs font-semibold text-[#0B2419] hover:bg-[#edeee9] rounded border border-[#E8E9E3]"
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
