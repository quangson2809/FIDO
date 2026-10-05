import React from 'react';
import { useApp } from '../context/AppContext';

export const Footer: React.FC = () => {
  const { setCurrentScreen } = useApp();
  return (
    <footer className="border-t border-[#164E35] bg-[#0B2419] py-10 text-white/80">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 md:grid-cols-3 lg:px-8">
        <div><div className="text-2xl font-black tracking-widest text-white">FIDO</div><p className="mt-3 text-xs leading-6 text-white/60">Website bán quần áo FIDO. Dữ liệu sản phẩm, đơn hàng và nội dung được lấy từ contract backend hiện tại.</p></div>
        <div><h4 className="text-xs font-bold uppercase tracking-wider text-white">Điều hướng</h4><div className="mt-3 flex flex-col items-start gap-2 text-xs text-white/60"><button type="button" onClick={() => setCurrentScreen('catalog')}>Sản phẩm</button><button type="button" onClick={() => setCurrentScreen('my-orders')}>Đơn hàng của tôi</button><button type="button" onClick={() => setCurrentScreen('profile')}>Tài khoản</button><button type="button" onClick={() => setCurrentScreen('policy')}>Chính sách</button></div></div>
        <div><h4 className="text-xs font-bold uppercase tracking-wider text-white">Thanh toán</h4><p className="mt-3 text-sm font-semibold text-[#E5C358]">COD</p><p className="mt-2 text-xs leading-6 text-white/60">Không hiển thị cổng thanh toán, vận chuyển hoặc ưu đãi chưa có trong baseline FIDO.</p></div>
      </div>
      <div className="mx-auto mt-8 max-w-7xl border-t border-white/10 px-6 pt-5 text-xs text-white/50 lg:px-8">© 2026 FIDO.</div>
    </footer>
  );
};
