import React, { useState } from 'react';
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

interface NavItem { key: string; label: string; icon: string }
const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Tổng quan', icon: 'dashboard' }, { key: 'orders', label: 'Đơn hàng', icon: 'receipt_long' }, { key: 'products', label: 'Sản phẩm', icon: 'styler' },
  { key: 'categories', label: 'Danh mục', icon: 'category' }, { key: 'brands', label: 'Thương hiệu', icon: 'verified' }, { key: 'sizes', label: 'Hệ size', icon: 'straighten' }, { key: 'colors', label: 'Màu sắc', icon: 'palette' },
  { key: 'inventory', label: 'Tồn kho', icon: 'inventory_2' }, { key: 'inward', label: 'Phiếu nhập', icon: 'move_to_inbox' }, { key: 'suppliers', label: 'Nhà cung cấp', icon: 'local_shipping' },
  { key: 'customers', label: 'Khách hàng', icon: 'groups' }, { key: 'staff', label: 'Nhân viên', icon: 'badge' }, { key: 'roles', label: 'Vai trò & quyền', icon: 'admin_panel_settings' }, { key: 'audit', label: 'Audit', icon: 'history' },
  { key: 'reports', label: 'Báo cáo', icon: 'monitoring' }, { key: 'settings', label: 'Nội dung', icon: 'article' },
];

export const AdminScreen: React.FC = () => {
  const { setCurrentScreen, showToast } = useApp();
  const [activeMenu, setActiveMenu] = useState('orders');
  const [breadcrumb, setBreadcrumb] = useState('Đơn hàng');
  const [selectedAdminOrderId, setSelectedAdminOrderId] = useState<number | null>(null);
  const navigate = (key: string, label: string) => { setActiveMenu(key); setBreadcrumb(label); };
  const openOrder = (orderId: number) => { setSelectedAdminOrderId(orderId); navigate('order-detail', 'Chi tiết đơn hàng'); };

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

  return <div className="min-h-screen bg-[#F8FAF4] text-[#191C19]"><aside className="fixed inset-y-0 left-0 z-40 hidden w-64 overflow-y-auto bg-[#0B2419] px-3 py-5 text-white lg:block"><div className="px-3 pb-5"><p className="text-lg font-black tracking-widest text-[#E5C358]">FIDO</p><p className="text-[10px] uppercase tracking-[0.2em] text-white/55">Admin console</p></div><nav className="space-y-1">{navItems.map((item) => <button key={item.key} type="button" onClick={() => navigate(item.key, item.label)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-semibold ${activeMenu === item.key ? 'bg-[#E5C358] text-[#111814]' : 'text-white/75 hover:bg-white/10'}`}><span className="material-symbols-outlined text-[18px]">{item.icon}</span>{item.label}</button>)}</nav></aside><div className="lg:pl-64"><header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-[#E2E5DE] bg-white px-4 py-3 sm:px-6"><div><p className="text-[10px] uppercase tracking-wider text-[#606863]">Hệ thống quản trị</p><h2 className="text-sm font-bold text-[#0B2419]">{breadcrumb}</h2></div><button type="button" onClick={() => setCurrentScreen('home')} className="border border-[#0B2419] px-3 py-2 text-xs font-bold uppercase">Về cửa hàng</button></header><div className="border-b border-[#E2E5DE] bg-white px-4 py-2 lg:hidden"><select value={activeMenu === 'order-detail' ? 'orders' : activeMenu} onChange={(event) => { const item = navItems.find((candidate) => candidate.key === event.target.value); if (item) navigate(item.key, item.label); }} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm">{navItems.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></div><main className="p-4 sm:p-6">{renderContent()}</main></div></div>;
};
