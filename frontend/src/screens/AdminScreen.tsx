import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getAdminPath, resolveAdminRoute } from '../routes/paths';
import { AdminDashboardView } from './admin/AdminDashboardView';
import { AdminProductsView } from './admin/AdminProductsView';
import { AdminProductDetailView } from './admin/AdminProductDetailView';
import { AdminCatalogMetaView } from './admin/AdminCatalogMetaView';
import { AdminOrdersView } from './admin/AdminOrdersView';
import { AdminOrderDetailView } from './admin/AdminOrderDetailView';
import { AdminCustomersView } from './admin/AdminCustomersView';
import { AdminCustomerDetailView } from './admin/AdminCustomerDetailView';
import { AdminVouchersView } from './admin/AdminVouchersView';
import { AdminSuppliersView } from './admin/AdminSuppliersView';
import { AdminInwardView } from './admin/AdminInwardView';
import { AdminInventoryView } from './admin/AdminInventoryView';
import { AdminAuditView } from './admin/AdminAuditView';
import { AdminStaffView } from './admin/AdminStaffView';
import { AdminRolesView } from './admin/AdminRolesView';
import { AdminReportsView } from './admin/AdminReportsView';
import { AdminSettingsView } from './admin/AdminSettingsView';

type MenuItem = { key: string; label: string; icon: string };
type MenuGroup = { label: string; items: MenuItem[] };

const menuGroups: MenuGroup[] = [
  { label: 'Tổng quan', items: [{ key: 'dashboard', label: 'Dashboard', icon: 'dashboard' }, { key: 'reports', label: 'Báo cáo', icon: 'analytics' }] },
  { label: 'Catalog', items: [
    { key: 'products', label: 'Sản phẩm', icon: 'styler' },
    { key: 'categories', label: 'Danh mục', icon: 'category' },
    { key: 'brands', label: 'Thương hiệu', icon: 'sell' },
    { key: 'sizes', label: 'Hệ size', icon: 'straighten' },
    { key: 'colors', label: 'Màu sắc', icon: 'palette' },
  ]},
  { label: 'Đơn & kho', items: [
    { key: 'orders', label: 'Đơn hàng', icon: 'receipt_long' },
    { key: 'inward', label: 'Phiếu nhập', icon: 'move_to_inbox' },
    { key: 'inventory', label: 'Tồn kho', icon: 'inventory_2' },
    { key: 'history', label: 'Ledger tồn kho', icon: 'history' },
    { key: 'suppliers', label: 'Nhà cung cấp', icon: 'factory' },
  ]},
  { label: 'Khách & ưu đãi', items: [
    { key: 'crm', label: 'Khách hàng', icon: 'group' },
    { key: 'vouchers', label: 'Voucher', icon: 'confirmation_number' },
  ]},
  { label: 'IAM & hệ thống', items: [
    { key: 'employees', label: 'Tài khoản nội bộ', icon: 'badge' },
    { key: 'rbac', label: 'Vai trò & quyền', icon: 'admin_panel_settings' },
    { key: 'audit', label: 'Audit log', icon: 'manage_search' },
    { key: 'policies', label: 'Nội dung', icon: 'article' },
  ]},
];

export const AdminScreen: React.FC = () => {
  const { setCurrentScreen, showToast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { menuKey: activeMenu, breadcrumb } = resolveAdminRoute(location.pathname);
  const [mobileOpen, setMobileOpen] = useState(false);

  const go = (key: string) => {
    navigate(getAdminPath(key));
    setMobileOpen(false);
  };

  const renderContent = () => {
    if (activeMenu === 'dashboard') return <AdminDashboardView onNavigateTab={(key)=>go(key)} showToast={showToast} />;
    if (activeMenu === 'products') return <AdminProductsView onSelectProduct={(id)=>navigate(`/admin/products/${encodeURIComponent(id)}`)} onEditProduct={(id)=>navigate(`/admin/products/${encodeURIComponent(id)}`)} onNavigateTab={(key)=>go(key)} showToast={showToast} />;
    if (activeMenu === 'product-detail') return <AdminProductDetailView onNavigateTab={(key)=>go(key)} showToast={showToast} />;
    if (activeMenu === 'categories') return <AdminCatalogMetaView initialTab="categories" showToast={showToast} />;
    if (activeMenu === 'brands') return <AdminCatalogMetaView initialTab="brands" showToast={showToast} />;
    if (activeMenu === 'sizes') return <AdminCatalogMetaView initialTab="sizes" showToast={showToast} />;
    if (activeMenu === 'colors') return <AdminCatalogMetaView initialTab="colors" showToast={showToast} />;
    if (activeMenu === 'orders' || activeMenu === 'tailoring') return <AdminOrdersView showToast={showToast} />;
    if (activeMenu === 'order-detail') return <AdminOrderDetailView onNavigateTab={(key)=>go(key)} showToast={showToast} />;
    if (activeMenu === 'inward') return <AdminInwardView onNavigateTab={(key)=>go(key)} showToast={showToast} />;
    if (activeMenu === 'inventory' || activeMenu === 'history') return <AdminInventoryView showToast={showToast} />;
    if (activeMenu === 'suppliers') return <AdminSuppliersView onNavigateTab={(key)=>go(key)} showToast={showToast} />;
    if (activeMenu === 'crm' || activeMenu === 'customers') return <AdminCustomersView showToast={showToast} />;
    if (activeMenu === 'customer-detail') return <AdminCustomerDetailView onNavigateTab={(key)=>go(key)} showToast={showToast} />;
    if (activeMenu === 'vouchers') return <AdminVouchersView showToast={showToast} />;
    if (activeMenu === 'employees' || activeMenu === 'staff') return <AdminStaffView showToast={showToast} />;
    if (activeMenu === 'rbac' || activeMenu === 'roles') return <AdminRolesView showToast={showToast} />;
    if (activeMenu === 'audit') return <AdminAuditView showToast={showToast} />;
    if (activeMenu === 'reports') return <AdminReportsView showToast={showToast} />;
    return <AdminSettingsView showToast={showToast} />;
  };

  return (
    <div className="min-h-screen bg-[#F8FAF4]">
      {mobileOpen && <button aria-label="Đóng menu" onClick={()=>setMobileOpen(false)} className="fixed inset-0 z-40 bg-black/50 lg:hidden"/>}

      <aside className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-[#0B2419] text-white flex flex-col transition-transform lg:translate-x-0 ${mobileOpen?'translate-x-0':'-translate-x-full'}`}>
        <div className="h-16 px-5 border-b border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#E8C75B] text-[#071A12] flex items-center justify-center font-bold">F</div>
          <div><div className="font-bold tracking-widest text-[#E8C75B]">FIDO</div><div className="text-[9px] uppercase tracking-widest text-white/50">Admin Console · Mock</div></div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 space-y-5">
          {menuGroups.map((group)=>(
            <div key={group.label}>
              <div className="px-5 mb-1.5 text-[9px] uppercase tracking-[0.16em] font-bold text-white/40">{group.label}</div>
              <div className="px-2 space-y-1">
                {group.items.map((item)=>{
                  const active = activeMenu===item.key || (item.key==='products'&&activeMenu==='product-detail') || (item.key==='orders'&&activeMenu==='order-detail') || (item.key==='crm'&&activeMenu==='customer-detail');
                  return <button key={item.key} onClick={()=>go(item.key)} className={`w-full px-3 py-2 rounded-lg flex items-center gap-2.5 text-xs font-semibold transition-colors ${active?'bg-[#E8C75B] text-[#071A12]':'text-white/75 hover:bg-white/10 hover:text-white'}`}><span className="material-symbols-outlined text-[18px]">{item.icon}</span>{item.label}</button>;
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <button onClick={()=>setCurrentScreen('home')} className="w-full px-3 py-2 text-xs text-white/70 hover:text-white flex items-center gap-2"><span className="material-symbols-outlined text-[17px]">logout</span>Thoát console</button>
        </div>
      </aside>

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-30 bg-white border-b border-[#E2E5DE]">
          <div className="h-16 px-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={()=>setMobileOpen(true)} className="lg:hidden p-2"><span className="material-symbols-outlined">menu</span></button>
              <div><div className="text-[10px] uppercase tracking-widest text-[#687069]">Hệ thống quản trị</div><div className="text-sm font-bold text-[#0B2419]">{breadcrumb}</div></div>
            </div>
            <button onClick={()=>setCurrentScreen('home')} className="px-3 py-2 border rounded text-xs font-bold text-[#0B2419]">Xem storefront</button>
          </div>
        </header>
        <main className="p-4 sm:p-6">{renderContent()}</main>
      </div>
    </div>
  );
};
