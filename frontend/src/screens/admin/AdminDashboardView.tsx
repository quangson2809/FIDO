import React from 'react';

const modules = [
  ['orders', 'Đơn hàng', 'Theo dõi và xử lý state machine đơn hàng'],
  ['products', 'Sản phẩm', 'Danh mục sản phẩm và biến thể'],
  ['inventory', 'Tồn kho', 'Tồn kho và lịch sử giao dịch'],
  ['inward', 'Phiếu nhập', 'Goods receipt và xác nhận nhập kho'],
  ['customers', 'Khách hàng', 'Tài khoản khách hàng và lịch sử đơn'],
  ['staff', 'Nhân viên', 'Tài khoản nội bộ và vai trò'],
  ['audit', 'Audit', 'Nhật ký hành động hệ thống'],
  ['reports', 'Báo cáo', 'Doanh số và số đơn theo trạng thái'],
] as const;

export const AdminDashboardView: React.FC<{ onNavigateTab: (tab: string, breadcrumb: string) => void; showToast: (msg: string) => void }> = ({ onNavigateTab }) => (
  <section className="space-y-6">
    <header><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B5038]">Admin console</p><h1 className="mt-1 font-serif text-3xl">Tổng quan hệ thống</h1><p className="mt-2 max-w-3xl text-sm text-[#606863]">Dashboard không tự dựng KPI. Chọn module để xem dữ liệu từ API tương ứng.</p></header>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{modules.map(([key, label, description]) => <button key={key} type="button" onClick={() => onNavigateTab(key, label)} className="border border-[#E8E9E3] bg-white p-5 text-left hover:border-[#0B2419]"><h2 className="font-serif text-xl">{label}</h2><p className="mt-2 text-xs leading-5 text-[#687069]">{description}</p><span className="mt-4 inline-block text-xs font-bold uppercase tracking-wider">Mở module →</span></button>)}</div>
  </section>
);
