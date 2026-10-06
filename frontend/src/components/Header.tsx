import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const Header: React.FC = () => {
  const { currentScreen, setCurrentScreen, setIsCartOpen, cartItems } = useApp();
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const totalCartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  const navigate = (screen: 'home' | 'catalog' | 'policy' | 'my-orders' | 'profile' | 'auth') => {
    setCurrentScreen(screen);
    setIsCategoryOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <div className="w-full bg-[#0B2419] px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FFFDF5] sm:text-[11px]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <span>FIDO Ready-to-Wear</span>
          <span className="hidden opacity-35 sm:inline">•</span>
          <span>Thanh toán COD</span>
          <span className="hidden opacity-35 md:inline">•</span>
          <span className="hidden md:inline">Đăng nhập để dùng giỏ hàng và đặt hàng</span>
        </div>
      </div>

      <header className="sticky top-0 z-40 h-[72px] w-full border-b border-[#E2E5DE] bg-white/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-4 sm:px-8 lg:px-12">
          <div className="flex items-center gap-6 lg:gap-9">
            <button
              type="button"
              onClick={() => navigate('home')}
              className="group flex items-baseline gap-1.5 text-left focus:outline-none"
            >
              <span className="flex items-baseline text-2xl font-black tracking-[0.16em] text-[#0B2419]">
                FIDO
                <span className="ml-0.5 inline-block h-2 w-2 rounded-full bg-[#E8C75B] transition-transform group-hover:scale-125" />
              </span>
              <span className="hidden text-[9px] font-bold uppercase tracking-[0.18em] text-[#1B5038] sm:inline">Fashion</span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsCategoryOpen((value) => !value)}
                onMouseEnter={() => setIsCategoryOpen(true)}
                className="flex items-center gap-1.5 py-2 text-[13px] font-semibold tracking-wide text-[#0B2419] transition-colors hover:text-[#1B5038]"
              >
                <span className="material-symbols-outlined text-[19px]">grid_view</span>
                <span>Danh mục</span>
                <span className={`material-symbols-outlined text-[17px] transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`}>expand_more</span>
              </button>

              {isCategoryOpen && (
                <div
                  onMouseLeave={() => setIsCategoryOpen(false)}
                  className="absolute left-0 top-full w-64 border border-[#E2E5DE] bg-white p-2 shadow-2xl"
                >
                  <button
                    type="button"
                    onClick={() => navigate('catalog')}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-[13px] font-semibold text-[#0B2419] transition-colors hover:bg-[#F5F6F2]"
                  >
                    <span>Tất cả sản phẩm</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                  <div className="my-1 h-px bg-[#E8E9E3]" />
                  <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8A918B]">
                    Danh mục chi tiết được tải trong catalog
                  </p>
                </div>
              )}
            </div>

            <nav className="hidden items-center gap-6 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#606863] xl:flex">
              {[
                ['home', 'Trang chủ'],
                ['catalog', 'Sản phẩm'],
                ['policy', 'Chính sách'],
                ['my-orders', 'Đơn hàng'],
              ].map(([screen, label]) => (
                <button
                  key={screen}
                  type="button"
                  onClick={() => navigate(screen as 'home' | 'catalog' | 'policy' | 'my-orders')}
                  className={`relative py-2 transition-colors hover:text-[#0B2419] ${currentScreen === screen ? 'text-[#0B2419]' : ''}`}
                >
                  {label}
                  {currentScreen === screen && <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-[#0B2419]" />}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => navigate('profile')}
              className="flex h-10 items-center gap-1.5 px-2 text-[13px] font-medium text-[#0B2419] transition-colors hover:bg-[#F5F6F2] sm:px-3"
            >
              <span className="material-symbols-outlined text-[20px]">person</span>
              <span className="hidden sm:inline">Tài khoản</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="flex h-10 items-center gap-2 bg-[#0B2419] px-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#123A29] sm:px-4"
            >
              <span className="material-symbols-outlined text-[19px]">shopping_bag</span>
              <span className="hidden sm:inline">Giỏ hàng</span>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E8C75B] px-1 text-[10px] font-black text-[#071A12]">
                {totalCartCount}
              </span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
};
