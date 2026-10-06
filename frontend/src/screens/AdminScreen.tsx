import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { AdminDashboardView } from './admin/AdminDashboardView';
import { AdminProductsView } from './admin/AdminProductsView';
import { AdminProductDetailView } from './admin/AdminProductDetailView';
import { AdminCatalogMetaView } from './admin/AdminCatalogMetaView';
import { AdminOrdersView } from './admin/AdminOrdersView';
import { AdminOrderDetailView } from './admin/AdminOrderDetailView';
import { AdminSuppliersView } from './admin/AdminSuppliersView';
import { AdminInwardView } from './admin/AdminInwardView';
import { AdminInventoryView } from './admin/AdminInventoryView';
import { AdminAuditView } from './admin/AdminAuditView';
import { AdminCustomersView } from './admin/AdminCustomersView';
import { AdminStaffView } from './admin/AdminStaffView';
import { AdminRolesView } from './admin/AdminRolesView';
import { AdminReportsView } from './admin/AdminReportsView';
import { AdminSettingsView } from './admin/AdminSettingsView';

interface NavItem {
  key: string;
  label: string;
  icon: string;
  group: 'Vận hành' | 'Catalog' | 'Kho' | 'Tài khoản' | 'Hệ thống';
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Tổng quan', icon: 'dashboard', group: 'Vận hành' },
  { key: 'orders', label: 'Đơn hàng', icon: 'receipt_long', group: 'Vận hành' },
  { key: 'products', label: 'Sản phẩm', icon: 'styler', group: 'Catalog' },
  { key: 'categories', label: 'Danh mục', icon: 'category', group: 'Catalog' },
  { key: 'brands', label: 'Thương hiệu', icon: 'verified', group: 'Catalog' },
  { key: 'sizes', label: 'Hệ size', icon: 'straighten', group: 'Catalog' },
  { key: 'colors', label: 'Màu sắc', icon: 'palette', group: 'Catalog' },
  { key: 'inventory', label: 'Tồn kho', icon: 'inventory_2', group: 'Kho' },
  { key: 'inward', label: 'Phiếu nhập', icon: 'move_to_inbox', group: 'Kho' },
  { key: 'suppliers', label: 'Nhà cung cấp', icon: 'local_shipping', group: 'Kho' },
  { key: 'customers', label: 'Khách hàng', icon: 'groups', group: 'Tài khoản' },
  { key: 'staff', label: 'Nhân viên', icon: 'badge', group: 'Tài khoản' },
  { key: 'roles', label: 'Vai trò & quyền', icon: 'admin_panel_settings', group: 'Tài khoản' },
  { key: 'audit', label: 'Audit', icon: 'history', group: 'Hệ thống' },
  { key: 'reports', label: 'Báo cáo', icon: 'monitoring', group: 'Hệ thống' },
  { key: 'settings', label: 'Nội dung', icon: 'article', group: 'Hệ thống' },
];

const groups: NavItem['group'][] = ['Vận hành', 'Catalog', 'Kho', 'Tài khoản', 'Hệ thống'];

export const AdminScreen: React.FC = () => {
  const { setCurrentScreen, showToast } = useApp();
  const [activeMenu, setActiveMenu] = useState('orders');
  const [breadcrumb, setBreadcrumb] = useState('Đơn hàng');
  const [selectedAdminOrderId, setSelectedAdminOrderId] = useState<number | null>(null);

  const activeNavItem = useMemo(
    () => navItems.find((item) => item.key === (activeMenu === 'order-detail' ? 'orders' : activeMenu)),
    [activeMenu],
  );

  const navigate = (key: string, label: string) => {
    setActiveMenu(key);
    setBreadcrumb(label);
  };

  const openOrder = (orderId: number) => {
    setSelectedAdminOrderId(orderId);
    navigate('order-detail', 'Chi tiết đơn hàng');
  };

  const renderContent = () => {
    if (activeMenu === 'order-detail' && selectedAdminOrderId !== null) return <AdminOrderDetailView orderId={selectedAdminOrderId} onBack={() => navigate('orders', 'Đơn hàng')} />;
    if (activeMenu === 'orders') return <AdminOrdersView onSelectOrder={openOrder} />;
    if (activeMenu === 'dashboard') return <AdminDashboardView onNavigateTab={navigate} showToast={showToast} />;
    if (activeMenu === 'products') return <AdminProductsView onSelectProduct={() => navigate('product-detail', 'Chi tiết sản phẩm')} onEditProduct={() => navigate('product-detail', 'Chi tiết sản phẩm')} onNavigateTab={navigate} showToast={showToast} />;
    if (activeMenu === 'product-detail') return <AdminProductDetailView onNavigateTab={navigate} showToast={showToast} />;
    if (activeMenu === 'categories') return <AdminCatalogMetaView key="categories" initialTab="categories" onNavigateTab={navigate} showToast={showToast} />;
    if (activeMenu === 'brands') return <AdminCatalogMetaView key="brands" initialTab="brands" onNavigateTab={navigate} showToast={showToast} />;
    if (activeMenu === 'sizes') return <AdminCatalogMetaView key="sizes" initialTab="sizes" onNavigateTab={navigate} showToast={showToast} />;
    if (activeMenu === 'colors') return <AdminCatalogMetaView key="colors" initialTab="colors" onNavigateTab={navigate} showToast={showToast} />;
    if (activeMenu === 'inward') return <AdminInwardView showToast={showToast} onNavigateTab={navigate} />;
    if (activeMenu === 'inventory') return <AdminInventoryView showToast={showToast} />;
    if (activeMenu === 'suppliers') return <AdminSuppliersView showToast={showToast} onNavigateTab={navigate} />;
    if (activeMenu === 'customers') return <AdminCustomersView onNavigateTab={navigate} showToast={showToast} />;
    if (activeMenu === 'staff') return <AdminStaffView showToast={showToast} />;
    if (activeMenu === 'roles') return <AdminRolesView showToast={showToast} />;
    if (activeMenu === 'audit') return <AdminAuditView showToast={showToast} />;
    if (activeMenu === 'reports') return <AdminReportsView showToast={showToast} />;
    if (activeMenu === 'settings') return <AdminSettingsView showToast={showToast} />;
    return <div className="border border-[#E2E5DE] bg-white p-8 text-sm">Module chưa được ánh xạ.</div>;
  };

  return (
    <div className="min-h-screen bg-[#F6F7F2] text-[#191C19]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 overflow-y-auto border-r border-white/10 bg-[#071A12] text-white lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-5 py-6">
          <button type="button" onClick={() => navigate('dashboard', 'Tổng quan')} className="flex items-center gap-3 text-left">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E8C75B] text-[#071A12]"><span className="material-symbols-outlined text-[22px]">storefront</span></span>
            <div><p className="text-xl font-black tracking-[0.18em] text-white">FIDO</p><p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#E8C75B]">Operations Console</p></div>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4">
          {groups.map((group) => (
            <div key={group} className="mb-5 last:mb-0">
              <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">{group}</p>
              <div className="space-y-1">
                {navItems.filter((item) => item.group === group).map((item) => {
                  const active = activeMenu === item.key || (activeMenu === 'order-detail' && item.key === 'orders') || (activeMenu === 'product-detail' && item.key === 'products');
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => navigate(item.key, item.label)}
                      className={`group flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition ${active ? 'bg-[#E8C75B] text-[#071A12] shadow-sm' : 'text-white/70 hover:bg-white/8 hover:text-white'}`}
                    >
                      <span className="flex items-center gap-3"><span className={`material-symbols-outlined text-[18px] ${active ? 'text-[#071A12]' : 'text-white/55 group-hover:text-[#E8C75B]'}`}>{item.icon}</span>{item.label}</span>
                      {active && <span className="h-1.5 w-1.5 rounded-full bg-[#071A12]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <button type="button" onClick={() => setCurrentScreen('home')} className="flex w-full items-center justify-between border border-white/15 bg-white/5 px-3 py-3 text-xs font-bold uppercase tracking-wider text-white/80 transition hover:bg-white/10 hover:text-white"><span className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">arrow_back</span>Về cửa hàng</span><span className="material-symbols-outlined text-[16px]">open_in_new</span></button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-[#E2E5DE] bg-white/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="hidden h-9 w-9 items-center justify-center rounded-full bg-[#FFFDF5] text-[#0B2419] ring-1 ring-[#E8E9E3] sm:flex"><span className="material-symbols-outlined text-[19px]">{activeNavItem?.icon ?? 'admin_panel_settings'}</span></span>
              <div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#687069]">Hệ thống quản trị</p><h2 className="truncate font-serif text-lg text-[#0B2419]">{breadcrumb}</h2></div>
            </div>
            <button type="button" onClick={() => setCurrentScreen('home')} className="inline-flex items-center gap-2 border border-[#D9DDD6] bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider transition hover:border-[#0B2419]"><span className="material-symbols-outlined text-[17px]">storefront</span><span className="hidden sm:inline">Cửa hàng</span></button>
          </div>
          <div className="border-t border-[#E8E9E3] bg-[#FFFDF5] px-4 py-2 lg:hidden">
            <select
              value={activeMenu === 'order-detail' ? 'orders' : activeMenu === 'product-detail' ? 'products' : activeMenu}
              onChange={(event) => {
                const item = navItems.find((candidate) => candidate.key === event.target.value);
                if (item) navigate(item.key, item.label);
              }}
              className="w-full border border-[#D9DDD6] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0B2419]"
            >
              {navItems.map((item) => <option key={item.key} value={item.key}>{item.group} · {item.label}</option>)}
            </select>
          </div>
        </header>

        <main className="min-h-[calc(100vh-64px)] p-4 sm:p-6 lg:p-8">{renderContent()}</main>
      </div>
    </div>
  );
};