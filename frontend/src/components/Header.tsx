import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const Header: React.FC = () => {
  const { currentScreen, setCurrentScreen, setIsCartOpen, cartItems } = useApp();
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <>
      {/* Top Notification Bar */}
      <div className="w-full bg-[#0B2419] text-[#FFFDF5] py-2 px-4 sm:px-8 text-center text-[11px] font-semibold tracking-[0.14em] uppercase flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
        <span>HÀNG CÓ SẴN TẠI CỬA HÀNG - THỬ ĐỒ TRỰC TIẾP</span>
        <span className="opacity-40 hidden sm:inline">•</span>
        <span>GIAO HỎA TỐC 2H TRONG NỘI THÀNH</span>
        <span className="opacity-40 hidden sm:inline">•</span>
        <span className="hidden md:inline">ĐỔI SIZE TẬN NHÀ 15 NGÀY MIỄN PHÍ</span>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 left-0 w-full h-[68px] bg-white border-b border-[#E2E5DE] z-40 px-4 sm:px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6 sm:gap-8">
          {/* Brand Logo */}
          <button
            type="button"
            onClick={() => setCurrentScreen('home')}
            className="flex items-baseline gap-1.5 focus:outline-none group text-left"
          >
            <span className="text-2xl font-black tracking-widest text-[#0B2419] flex items-baseline">
              FIDO
              <span className="inline-block w-2 h-2 rounded-full bg-[#E8C75B] ml-0.5"></span>
            </span>
            <span className="text-[10px] tracking-wider text-[#1B5038] font-bold uppercase">
              FASHION
            </span>
          </button>

          {/* Category Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
              onMouseEnter={() => setIsCategoryOpen(true)}
              className="flex items-center gap-1.5 text-[14px] font-semibold text-[#0B2419] hover:text-[#1B5038] py-2 tracking-wide focus:outline-none transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">grid_view</span>
              <span>Danh mục</span>
              <span
                className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${
                  isCategoryOpen ? 'rotate-180' : ''
                }`}
              >
                expand_more
              </span>
            </button>

            {/* Dropdown Menu */}
            {isCategoryOpen && (
              <div
                onMouseLeave={() => setIsCategoryOpen(false)}
                className="absolute left-0 top-full w-60 bg-white border border-[#E2E5DE] shadow-xl py-2 rounded-md z-50 animate-in fade-in slide-in-from-top-1 duration-150"
              >
                <button
                  type="button"
                  onClick={() => {
                    setCurrentScreen('catalog');
                    setIsCategoryOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-[13px] text-[#0B2419] hover:bg-[#F5F6F2] hover:text-[#1B5038] font-semibold flex items-center justify-between transition-colors border-b border-[#E2E5DE]/60"
                >
                  <span>Tất cả sản phẩm (124)</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentScreen('catalog');
                    setIsCategoryOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-[13px] text-[#0B2419] hover:bg-[#F5F6F2] hover:text-[#1B5038] font-medium transition-colors"
                >
                  Quần Jean RTW & Selvedge
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentScreen('catalog');
                    setIsCategoryOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-[13px] text-[#0B2419] hover:bg-[#F5F6F2] hover:text-[#1B5038] font-medium transition-colors"
                >
                  Áo Sơ Mi Cao Cấp & Linen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentScreen('catalog');
                    setIsCategoryOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-[13px] text-[#0B2419] hover:bg-[#F5F6F2] hover:text-[#1B5038] font-medium transition-colors"
                >
                  Quần Tây & Khaki Công Sở
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentScreen('catalog');
                    setIsCategoryOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-[13px] text-[#0B2419] hover:bg-[#F5F6F2] hover:text-[#1B5038] font-medium transition-colors"
                >
                  Áo Polo & Phông Basic
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentScreen('catalog');
                    setIsCategoryOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-[13px] text-[#0B2419] hover:bg-[#F5F6F2] hover:text-[#1B5038] font-medium transition-colors"
                >
                  Áo Blazer & Áo Khoác Nam
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentScreen('catalog');
                    setIsCategoryOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-[13px] text-[#0B2419] hover:bg-[#F5F6F2] hover:text-[#1B5038] font-medium transition-colors"
                >
                  Phụ Kiện Da Thảo Mộc
                </button>
                <div className="h-px bg-[#E2E5DE] my-1.5"></div>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentScreen('showrooms');
                    setIsCategoryOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-[13px] text-[#1B5038] hover:bg-[#FAF4DF] font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">storefront</span>
                  <span>Hệ Thống 4 Showroom</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentScreen('policy');
                    setIsCategoryOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-[13px] text-[#625f4e] hover:bg-[#F5F6F2] font-medium flex items-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">policy</span>
                  <span>Chính Sách Đổi Trả 15 Ngày</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick link navigation on desktop */}
          <nav className="hidden xl:flex items-center gap-6 text-[13px] font-semibold uppercase tracking-wider text-[#606863]">
            <button
              type="button"
              onClick={() => setCurrentScreen('home')}
              className={`hover:text-[#0B2419] transition-colors ${
                currentScreen === 'home' ? 'text-[#0B2419] font-bold border-b-2 border-[#0B2419]' : ''
              }`}
            >
              Trang Chủ
            </button>
            <button
              type="button"
              onClick={() => setCurrentScreen('catalog')}
              className={`hover:text-[#0B2419] transition-colors ${
                currentScreen === 'catalog' ? 'text-[#0B2419] font-bold border-b-2 border-[#0B2419]' : ''
              }`}
            >
              Sản Phẩm RTW
            </button>
            <button
              type="button"
              onClick={() => setCurrentScreen('showrooms')}
              className={`hover:text-[#0B2419] transition-colors ${
                currentScreen === 'showrooms' ? 'text-[#0B2419] font-bold border-b-2 border-[#0B2419]' : ''
              }`}
            >
              Showroom
            </button>
            <button
              type="button"
              onClick={() => setCurrentScreen('policy')}
              className={`hover:text-[#0B2419] transition-colors ${
                currentScreen === 'policy' ? 'text-[#0B2419] font-bold border-b-2 border-[#0B2419]' : ''
              }`}
            >
              Chính Sách
            </button>
            <button
              type="button"
              onClick={() => setCurrentScreen('my-orders')}
              className={`hover:text-[#0B2419] transition-colors ${
                currentScreen === 'my-orders' ? 'text-[#0B2419] font-bold border-b-2 border-[#0B2419]' : ''
              }`}
            >
              Đơn Hàng
            </button>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Account button */}
          <button
            type="button"
            onClick={() => setCurrentScreen('profile')}
            className="flex items-center gap-1.5 text-[14px] font-medium text-[#0B2419] hover:text-[#1B5038] transition-colors focus:outline-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span className="hidden sm:inline">Tài khoản</span>
          </button>

          {/* Cart button */}
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-2 text-[14px] font-medium text-[#0B2419] hover:text-[#1B5038] transition-colors relative focus:outline-none"
          >
            <div className="relative flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path>
                <path d="M3 6h18"></path>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
              <span className="w-5 h-5 rounded-full bg-[#0B2419] text-[#E8C75B] text-[11px] font-bold flex items-center justify-center ml-1">
                {totalCartCount}
              </span>
            </div>
            <span className="hidden sm:inline">Giỏ hàng</span>
          </button>

          {/* Admin shortcut button */}
          <button
            type="button"
            onClick={() => setCurrentScreen('admin-login')}
            className={`hidden md:inline-flex items-center gap-1 px-3 py-1.5 rounded text-[12px] font-bold uppercase tracking-wider transition-all border ${
              currentScreen === 'admin' || currentScreen === 'admin-login'
                ? 'bg-[#E8C75B] text-[#071A12] border-[#E8C75B]'
                : 'bg-[#F5F6F2] text-[#0B2419] hover:bg-[#FAF4DF] border-[#E2E5DE]'
            }`}
            title="Mở bảng điều khiển quản trị"
          >
            <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
            <span>Admin</span>
          </button>
        </div>
      </header>
    </>
  );
};
