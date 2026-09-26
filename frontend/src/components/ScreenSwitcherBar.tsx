import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ScreenId } from '../types';

export const ScreenSwitcherBar: React.FC = () => {
  const { currentScreen, setCurrentScreen, setIsCartOpen } = useApp();
  const [isExpanded, setIsExpanded] = useState(false);

  const screens: { id: ScreenId; label: string; icon: string; badge?: string }[] = [
    { id: 'home', label: '1. Trang Chủ (RTW 2025)', icon: 'home' },
    { id: 'catalog', label: '2. Danh Mục Sản Phẩm', icon: 'grid_view' },
    { id: 'product-detail', label: '3. Chi Tiết Sản Phẩm', icon: 'apparel' },
    { id: 'cart', label: '4. Giỏ Hàng (Drawer)', icon: 'shopping_bag', badge: 'Drawer' },
    { id: 'checkout', label: '5. Thanh Toán COD', icon: 'payments' },
    { id: 'order-success', label: '6. Xác Nhận Đặt Hàng', icon: 'task_alt' },
    { id: 'order-detail', label: '7. Chi Tiết Đơn Hàng', icon: 'receipt_long' },
    { id: 'my-orders', label: '8. Đơn Hàng Của Tôi', icon: 'local_shipping' },
    { id: 'policy', label: '9. Chính Sách Đổi Trả', icon: 'policy' },
    { id: 'auth', label: '10. Đăng Nhập / Đăng Ký', icon: 'lock' },
    { id: 'profile', label: '11. Hồ Sơ Tài Khoản', icon: 'account_circle' },
    { id: 'showrooms', label: '12. Hệ Thống Showroom', icon: 'storefront' },
    { id: 'admin-login', label: '13. Đăng Nhập Quản Trị', icon: 'admin_panel_settings', badge: 'Admin' }
  ];

  return (
    <aside aria-label="Bộ điều hướng màn hình nhanh" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[95vw]">
      <div className="bg-[#071A12]/95 backdrop-blur-md text-white border border-[#E8C75B]/40 rounded-full shadow-2xl p-1.5 flex items-center gap-1.5 sm:gap-2">
        {/* Toggle / Current Screen Indicator */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#0B2419] hover:bg-[#123A29] text-[#E8C75B] text-xs font-bold uppercase tracking-wider rounded-full transition-colors border border-[#E8C75B]/30"
          title="Bấm để xem tất cả màn hình"
        >
          <span className="material-symbols-outlined text-[16px]">devices</span>
          <span className="hidden sm:inline">Chuyển màn hình</span>
          <span className="bg-[#E8C75B] text-[#071A12] text-[10px] px-1.5 py-0.2 rounded-full font-black">
            13
          </span>
          <span className="material-symbols-outlined text-[16px]">
            {isExpanded ? 'expand_more' : 'expand_less'}
          </span>
        </button>

        {/* Quick Shortcuts for primary screens */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[500px]">
          <button
            type="button"
            onClick={() => setCurrentScreen('home')}
            className={`px-2.5 py-1 text-xs rounded-full transition-colors whitespace-nowrap ${
              currentScreen === 'home'
                ? 'bg-[#E8C75B] text-[#071A12] font-bold'
                : 'text-white/80 hover:bg-white/10'
            }`}
          >
            Trang Chủ
          </button>
          <button
            type="button"
            onClick={() => setCurrentScreen('catalog')}
            className={`px-2.5 py-1 text-xs rounded-full transition-colors whitespace-nowrap ${
              currentScreen === 'catalog'
                ? 'bg-[#E8C75B] text-[#071A12] font-bold'
                : 'text-white/80 hover:bg-white/10'
            }`}
          >
            Danh Mục
          </button>
          <button
            type="button"
            onClick={() => setCurrentScreen('product-detail')}
            className={`px-2.5 py-1 text-xs rounded-full transition-colors whitespace-nowrap ${
              currentScreen === 'product-detail'
                ? 'bg-[#E8C75B] text-[#071A12] font-bold'
                : 'text-white/80 hover:bg-white/10'
            }`}
          >
            Chi Tiết SP
          </button>
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="px-2.5 py-1 text-xs rounded-full bg-[#123A29] text-[#E8C75B] hover:bg-[#1B5038] transition-colors whitespace-nowrap flex items-center gap-1 font-semibold"
          >
            <span className="material-symbols-outlined text-[14px]">shopping_bag</span>
            <span>Giỏ Hàng</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentScreen('checkout')}
            className={`px-2.5 py-1 text-xs rounded-full transition-colors whitespace-nowrap ${
              currentScreen === 'checkout'
                ? 'bg-[#E8C75B] text-[#071A12] font-bold'
                : 'text-white/80 hover:bg-white/10'
            }`}
          >
            Thanh Toán COD
          </button>
          <button
            type="button"
            onClick={() => setCurrentScreen('my-orders')}
            className={`px-2.5 py-1 text-xs rounded-full transition-colors whitespace-nowrap ${
              currentScreen === 'my-orders'
                ? 'bg-[#E8C75B] text-[#071A12] font-bold'
                : 'text-white/80 hover:bg-white/10'
            }`}
          >
            Đơn Hàng
          </button>
          <button
            type="button"
            onClick={() => setCurrentScreen('admin-login')}
            className={`px-2.5 py-1 text-xs rounded-full transition-colors whitespace-nowrap font-bold flex items-center gap-1 ${
              currentScreen === 'admin' || currentScreen === 'admin-login'
                ? 'bg-[#E8C75B] text-[#071A12]'
                : 'bg-emerald-950 text-emerald-300 hover:bg-emerald-900'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
            <span>Admin</span>
          </button>
        </div>
      </div>

      {/* Expanded Modal Grid with all 13 screens */}
      {isExpanded && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-[92vw] max-w-2xl bg-[#071A12]/95 backdrop-blur-xl border border-[#E8C75B]/40 rounded-2xl shadow-2xl p-4 sm:p-5 text-white animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#E8C75B]">auto_stories</span>
              <span className="font-bold text-sm uppercase tracking-wider text-[#E8C75B]">
                Toàn Bộ 13 Màn Hình Ứng Dụng FIDO & Atelier Vert
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="text-white/60 hover:text-white p-1"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto pr-1">
            {screens.map((screen) => {
              const isActive = currentScreen === screen.id;
              return (
                <button
                  key={screen.id}
                  type="button"
                  onClick={() => {
                    if (screen.id === 'cart') {
                      setIsCartOpen(true);
                    } else {
                      setCurrentScreen(screen.id);
                    }
                    setIsExpanded(false);
                  }}
                  className={`text-left p-2.5 rounded-lg border transition-all flex items-start gap-2.5 ${
                    isActive
                      ? 'bg-[#E8C75B] text-[#071A12] border-[#E8C75B] font-bold shadow-lg'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/90'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[18px] shrink-0 mt-0.5 ${
                      isActive ? 'text-[#071A12]' : 'text-[#E8C75B]'
                    }`}
                  >
                    {screen.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs leading-snug truncate">{screen.label}</p>
                    {screen.badge && (
                      <span
                        className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold mt-1 inline-block ${
                          isActive
                            ? 'bg-[#071A12] text-[#E8C75B]'
                            : 'bg-[#E8C75B]/20 text-[#E8C75B]'
                        }`}
                      >
                        {screen.badge}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
};
