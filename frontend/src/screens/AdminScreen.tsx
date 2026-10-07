import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getAdminPath, resolveAdminRoute } from '../routes/paths';
import { canAccessAdminModule, type AdminModuleKey } from '../features/auth/session/adminAccessPolicy';
import { useAuthSession } from '../features/auth/session/useAuthSession';

interface NavItem {
  key: AdminModuleKey;
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
  { key: 'content', label: 'Nội dung', icon: 'article', group: 'Hệ thống' },
];

const groups: NavItem['group'][] = ['Vận hành', 'Catalog', 'Kho', 'Tài khoản', 'Hệ thống'];

export const AdminScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, permissionCodes } = useAuthSession();
  const route = resolveAdminRoute(location.pathname);

  const activeMenu = (() => {
    if (route.menuKey === 'product-detail') return 'products';
    if (route.menuKey === 'order-detail') return 'orders';
    if (route.menuKey === 'customer-detail') return 'customers';
    if (route.menuKey === 'history') return 'inventory';
    if (route.menuKey === 'settings') return 'content';
    return route.menuKey;
  })();

  const visibleNavItems = navItems.filter((item) =>
    canAccessAdminModule(item.key, profile, permissionCodes),
  );
  const activeNavItem = visibleNavItems.find((item) => item.key === activeMenu);
  const navigateAdmin = (key: string) => navigate(getAdminPath(key));

  return (
    <div className="min-h-screen bg-[#F6F7F2] text-[#191C19]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 overflow-y-auto border-r border-white/10 bg-[#071A12] text-white lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-5 py-6">
          <button type="button" onClick={() => navigateAdmin('dashboard')} className="flex items-center gap-3 text-left">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E8C75B] text-[#071A12]">
              <span className="material-symbols-outlined text-[22px]">storefront</span>
            </span>
            <div>
              <p className="text-xl font-black tracking-[0.18em] text-white">FIDO</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#E8C75B]">Operations Console</p>
            </div>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4">
          {groups.map((group) => {
            const groupItems = visibleNavItems.filter((item) => item.group === group);
            if (groupItems.length === 0) return null;
            return (
            <div key={group} className="mb-5 last:mb-0">
              <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">{group}</p>
              <div className="space-y-1">
                {groupItems.map((item) => {
                  const active = activeMenu === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      aria-current={active ? 'page' : undefined}
                      onClick={() => navigateAdmin(item.key)}
                      className={`group flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-semibold transition ${active ? 'bg-[#E8C75B] text-[#071A12] shadow-sm' : 'text-white/70 hover:bg-white/8 hover:text-white'}`}
                    >
                      <span className="flex items-center gap-3">
                        <span className={`material-symbols-outlined text-[18px] ${active ? 'text-[#071A12]' : 'text-white/55 group-hover:text-[#E8C75B]'}`}>{item.icon}</span>
                        {item.label}
                      </span>
                      {active && <span className="h-1.5 w-1.5 rounded-full bg-[#071A12]" />}
                    </button>
                  );
                })}
              </div>
            </div>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <button type="button" onClick={() => navigate('/')} className="flex w-full items-center justify-between border border-white/15 bg-white/5 px-3 py-3 text-xs font-bold uppercase tracking-wider text-white/80 transition hover:bg-white/10 hover:text-white">
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Về cửa hàng
            </span>
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-[#E2E5DE] bg-white/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="hidden h-9 w-9 items-center justify-center rounded-full bg-[#FFFDF5] text-[#0B2419] ring-1 ring-[#E8E9E3] sm:flex">
                <span className="material-symbols-outlined text-[19px]">{activeNavItem?.icon ?? 'admin_panel_settings'}</span>
              </span>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#687069]">Hệ thống quản trị</p>
                <h2 className="truncate font-serif text-lg text-[#0B2419]">{route.breadcrumb}</h2>
              </div>
            </div>
            <button type="button" onClick={() => navigate('/')} className="inline-flex items-center gap-2 border border-[#D9DDD6] bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider transition hover:border-[#0B2419]">
              <span className="material-symbols-outlined text-[17px]">storefront</span>
              <span className="hidden sm:inline">Cửa hàng</span>
            </button>
          </div>
          <div className="border-t border-[#E8E9E3] bg-[#FFFDF5] px-4 py-2 lg:hidden">
            <select
              value={activeMenu}
              onChange={(event) => navigateAdmin(event.target.value)}
              className="w-full border border-[#D9DDD6] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0B2419]"
            >
              {visibleNavItems.map((item) => <option key={item.key} value={item.key}>{item.group} · {item.label}</option>)}
            </select>
          </div>
        </header>

        <main className="min-h-[calc(100vh-64px)] p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
