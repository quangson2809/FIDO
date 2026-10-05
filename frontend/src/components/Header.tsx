import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const Header: React.FC = () => {
  const { currentScreen, setCurrentScreen, setIsCartOpen, cartItems } = useApp();
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const totalCartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  const navigate = (screen: 'home' | 'catalog' | 'policy' | 'my-orders' | 'profile') => {
    setCurrentScreen(screen);
    setIsCategoryOpen(false);
  };

  return (
    <>
      <div className="flex w-full flex-wrap items-center justify-center gap-3 bg-[#0B2419] px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FFFDF5]">
        <span>Thanh toán COD</span><span className="opacity-40">•</span><span>Đăng nhập để dùng giỏ hàng và đặt hàng</span>
      </div>
      <header className="sticky top-0 z-40 flex h-[68px] w-full items-center justify-between border-b border-[#E2E5DE] bg-white px-4 shadow-sm sm:px-8">
        <div className="flex items-center gap-6 sm:gap-8">
          <button type="button" onClick={() => navigate('home')} className="flex items-baseline gap-1.5 text-left">
            <span className="text-2xl font-black tracking-widest">FIDO</span><span className="text-[10px] font-bold uppercase tracking-wider text-[#1B5038]">Fashion</span>
          </button>
          <div className="relative">
            <button type="button" onClick={() => setIsCategoryOpen((value) => !value)} className="flex items-center gap-1.5 py-2 text-sm font-semibold"><span className="material-symbols-outlined text-[20px]">grid_view</span>Danh mục</button>
            {isCategoryOpen && <div className="absolute left-0 top-full w-56 border border-[#E2E5DE] bg-white p-2 shadow-xl"><button type="button" onClick={() => navigate('catalog')} className="w-full px-3 py-2 text-left text-sm font-semibold hover:bg-[#F5F6F2]">Tất cả sản phẩm</button></div>}
          </div>
          <nav className="hidden items-center gap-6 text-[13px] font-semibold uppercase tracking-wider text-[#606863] xl:flex">
            <button type="button" onClick={() => navigate('home')} className={currentScreen === 'home' ? 'text-[#0B2419]' : ''}>Trang chủ</button>
            <button type="button" onClick={() => navigate('catalog')} className={currentScreen === 'catalog' ? 'text-[#0B2419]' : ''}>Sản phẩm</button>
            <button type="button" onClick={() => navigate('policy')} className={currentScreen === 'policy' ? 'text-[#0B2419]' : ''}>Chính sách</button>
            <button type="button" onClick={() => navigate('my-orders')} className={currentScreen === 'my-orders' ? 'text-[#0B2419]' : ''}>Đơn hàng</button>
          </nav>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <button type="button" onClick={() => navigate('profile')} className="flex items-center gap-1.5 text-sm font-medium"><span className="material-symbols-outlined text-[20px]">person</span><span className="hidden sm:inline">Tài khoản</span></button>
          <button type="button" onClick={() => setIsCartOpen(true)} className="flex items-center gap-2 text-sm font-medium"><span className="material-symbols-outlined text-[20px]">shopping_bag</span><span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0B2419] px-1 text-[11px] font-bold text-[#E8C75B]">{totalCartCount}</span><span className="hidden sm:inline">Giỏ hàng</span></button>
        </div>
      </header>
    </>
  );
};
