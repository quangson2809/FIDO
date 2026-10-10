import { AdminIcon } from '../../shared/admin/AdminIcon';
import { AdminWorkQueue } from '../../features/adminAccess/components/AdminWorkQueue';
import React from 'react';
import { DashboardAnalytics } from '../../features/report/components/ReportTabs';
import { defaultReportRange } from '../../features/report/model/reportFilters';

const modules = [
  ['vouchers', 'Voucher', 'Chính sách ưu đãi và mã giảm giá', 'sell'],
  ['categories', 'Danh mục', 'Phân loại sản phẩm', 'category'],
  ['brands', 'Thương hiệu', 'Quản lý thương hiệu', 'verified'],
  ['sizes', 'Hệ size', 'Hệ thống kích cỡ và giá trị size', 'straighten'],
  ['colors', 'Màu sắc', 'Quản lý màu sắc sản phẩm', 'palette'],
  ['suppliers', 'Nhà cung cấp', 'Thông tin nhà cung cấp', 'local_shipping'],
  ['roles', 'Vai trò và quyền', 'Cấp quyền truy cập theo vai trò', 'shield'],
  ['content', 'Nội dung', 'Trang thông tin cửa hàng', 'description'],
  ['orders', 'Đơn hàng', 'Xác nhận, chuẩn bị và giao đơn hàng', 'receipt_long'],
  ['products', 'Sản phẩm', 'Danh mục sản phẩm và biến thể', 'styler'],
  ['inventory', 'Tồn kho', 'Tồn kho và lịch sử giao dịch', 'inventory_2'],
  ['inward', 'Phiếu nhập', 'Đối chiếu phiếu và xác nhận nhập kho', 'move_to_inbox'],
  ['customers', 'Khách hàng', 'Tài khoản khách hàng và lịch sử đơn', 'groups'],
  ['staff', 'Nhân viên', 'Tài khoản nội bộ và vai trò', 'badge'],
  ['audit', 'Audit', 'Nhật ký hành động hệ thống', 'history'],
  ['reports', 'Báo cáo', 'Doanh số và số đơn theo trạng thái', 'monitoring'],
] as const;

export const AdminDashboardView: React.FC<{
  onNavigateTab: (tab: string, breadcrumb: string) => void;
  visibleModuleKeys: readonly string[];
}> = ({ onNavigateTab, visibleModuleKeys }) => {
  const visibleModules = modules.filter(([key]) => visibleModuleKeys.includes(key));

  return (
  <section className="space-y-7">
    <div className="relative overflow-hidden border border-[#123A29] bg-[#071A12] px-6 py-7 text-white shadow-sm sm:px-8 sm:py-9">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-[#E8C75B]/20" />
      <div className="absolute -bottom-36 left-1/3 h-96 w-96 rounded-full border border-white/5" />
      <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div className="max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#E8C75B]">FIDO Operations</p>
          <h1 className="mt-2 font-serif text-3xl sm:text-4xl">Tổng quan hệ thống</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/60">Theo dõi công việc cần xử lý và truy cập nhanh các công cụ quản trị cửa hàng.</p>
        </div>
        <div className="flex items-center gap-3 border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E8C75B] text-[#071A12]"><AdminIcon name="admin_panel_settings" /></span>
          <div><p className="text-[9px] font-bold uppercase tracking-wider text-white/45">Workspace</p><p className="text-xs font-semibold text-white">Admin Console</p></div>
        </div>
      </div>
    </div>

    {visibleModuleKeys.includes('reports') && <DashboardAnalytics query={defaultReportRange()} canReadCatalog={visibleModuleKeys.includes('products')} />}
    <AdminWorkQueue modules={visibleModuleKeys} showOrderAmounts={visibleModuleKeys.includes('reports')} />
    <div className="flex items-end justify-between border-b border-[#D9DDD6] pb-4">
      <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#687069]">Modules</p><h2 className="font-serif text-2xl">Không gian vận hành</h2></div>
      <span className="hidden text-[10px] font-bold uppercase tracking-wider text-[#687069] sm:inline">{visibleModules.length} module khả dụng</span>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {visibleModules.map(([key, label, description, icon], index) => (
        <button
          key={key}
          type="button"
          onClick={() => onNavigateTab(key, label)}
          className="group relative min-h-48 overflow-hidden border border-[#E8E9E3] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#0B2419] hover:shadow-md"
        >
          <span className="absolute right-4 top-3 font-serif text-4xl text-[#0B2419]/5">0{index + 1}</span>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFFDF5] text-[#0B2419] ring-1 ring-[#E8E9E3] transition group-hover:bg-[#0B2419] group-hover:text-[#E8C75B]"><AdminIcon name={icon} /></div>
          <h3 className="mt-5 font-serif text-xl">{label}</h3>
          <p className="mt-2 text-xs leading-5 text-[#687069]">{description}</p>
          <span className="mt-5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#1B5038]">Mở module <AdminIcon name="arrow_forward" /></span>
        </button>
      ))}
    </div>
  </section>
  );
};