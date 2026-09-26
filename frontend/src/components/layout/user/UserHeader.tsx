import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';

export const UserHeader: React.FC = () => {
  const { currentScreen, setCurrentScreen, setIsCartOpen, cartItems } = useApp();
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <>
      <div className="w-full bg-[#0B2419] text-[#FFFDF5] py-2 px-4 sm:px-8 text-center text-[11px] font-semibold tracking-[0.14em] uppercase flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
        <span>HÀNG CÓ SẴN TẠI CỬA HÀNG - THỬ ĐỒ TRỰC TIẾP</span>
        <span className="opacity-40 hidden sm:inline">•</span>
        <span>GIAO HỎA TỐC 2H TRONG NỘI THÀNH</span>
        <span className="opacity-40 hidden sm:inline">•</span>
        <span className="hidden md:inline">ĐỔI SIZE TẬN NHÀ 15 NGÀY MIỄN PHÍ</span>
      </div>

      <header className="sticky top-0 left-0 w-full h-[68px] bg-white border-b border-[#E2E5DE] z-40 px-4 sm:px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6 sm:gap-8">
          <button type="button" onClick={() => setCurrentScreen('home')} className="flex items-baseline gap-1.5 focus:outline-none group text-left">
            <span className="text-2xl font-black tracking-widest text-[#0B2419] flex items-baseline">
              FIDO
              <span className="inline-block w-2 h-2 rounded-full bg-[#E8C75B] ml-0.5"></span>
            </span>
            <span className="text-[10px] tracking-wider text-[#1B5038] font-bold uppercase">FASHION</span>
          </button>

          <div className="relative">
            <button type="button" onClick={() => setIsCategoryOpen(!isCategoryOpen)} onMouseEnter={() => setIsCategoryOpen(true)} className="flex items-center gap-1.5 text-[14px] font-semibold text-[#0B2419] hover:text-[#1B5038] py-2 tracking-wide focus:outline-none transition-colors">
              <span className="material-symbols-outlined text-[20px]">grid_view</span>
              <span>Danh mục</span>
              <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${isCategoryOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>
            {isCategoryOpen && (
              <div onMouseLeave={() => setIsCategoryOpen(false)} className="absolute left-0 top-full w-60 bg-white border border-[#E2E5DE] shadow-xl py-2 rounded-md z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <button type="button" onClick={() => { setCurrentScreen('catalog'); setIsCategoryOpen(false); }} className="w-full text-left px-4 py-2.5 text-[13px] text-[#0B2419] hover:bg-[#F5F6F2] hover:text-[#1B5038] font-semibold flex items-center justify-between transition-colors border-b border-[#E2E5DE]/60">
                    <span>Tất cả sản phẩm (124)</span>
                </button>
                {/* ... other items ... */}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
            {/* ... actions ... */}
        </div>
      </header>
    </>
  );
};
