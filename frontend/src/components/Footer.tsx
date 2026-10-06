import React from 'react';
import { useApp } from '../context/AppContext';

export const Footer: React.FC = () => {
  const { setCurrentScreen } = useApp();

  return (
    <footer className="border-t border-[#164E35] bg-[#0B2419] text-white/80">
      <div className="mx-auto max-w-7xl px-6 pb-10 pt-14 lg:px-8">
        <div className="grid grid-cols-1 gap-10 border-b border-white/10 pb-12 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-[0.16em] text-white">FIDO</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#E5C358]" />
              <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E5C358]">Fashion</span>
            </div>
            <p className="mt-3 text-xs font-medium tracking-wide text-[#E5C358]">Fit • Innovate • Devote • Open</p>
            <p className="mt-4 max-w-xs text-xs leading-6 text-white/55">
              Không gian thời trang FIDO với ngôn ngữ thị giác tối giản, tập trung vào sản phẩm và trải nghiệm mua sắm rõ ràng.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-white">Khám phá</h4>
            <div className="mt-4 flex flex-col items-start gap-2.5 text-xs text-white/60">
              <button type="button" onClick={() => setCurrentScreen('home')} className="transition-colors hover:text-white">Trang chủ</button>
              <button type="button" onClick={() => setCurrentScreen('catalog')} className="transition-colors hover:text-white">Sản phẩm</button>
              <button type="button" onClick={() => setCurrentScreen('policy')} className="transition-colors hover:text-white">Chính sách</button>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-white">Tài khoản</h4>
            <div className="mt-4 flex flex-col items-start gap-2.5 text-xs text-white/60">
              <button type="button" onClick={() => setCurrentScreen('profile')} className="transition-colors hover:text-white">Hồ sơ</button>
              <button type="button" onClick={() => setCurrentScreen('my-orders')} className="transition-colors hover:text-white">Đơn hàng của tôi</button>
              <button type="button" onClick={() => setCurrentScreen('auth')} className="transition-colors hover:text-white">Đăng nhập / đăng ký</button>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-white">Trải nghiệm FIDO</h4>
            <div className="mt-4 space-y-3 text-xs leading-6 text-white/60">
              <p className="flex items-start gap-2"><span className="material-symbols-outlined mt-0.5 text-[16px] text-[#E5C358]">payments</span><span>Thanh toán COD trong luồng đặt hàng hiện tại.</span></p>
              <p className="flex items-start gap-2"><span className="material-symbols-outlined mt-0.5 text-[16px] text-[#E5C358]">tune</span><span>Chọn size và màu theo biến thể sản phẩm.</span></p>
              <p className="flex items-start gap-2"><span className="material-symbols-outlined mt-0.5 text-[16px] text-[#E5C358]">inventory_2</span><span>Giá và khả dụng được lấy từ dữ liệu hệ thống.</span></p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-6 text-[11px] text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 FIDO Fashion. All rights reserved.</p>
          <p className="uppercase tracking-[0.16em]">Ready-to-Wear • COD</p>
        </div>
      </div>
    </footer>
  );
};
