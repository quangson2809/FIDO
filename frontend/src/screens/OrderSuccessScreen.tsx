import React from 'react';
import { useApp } from '../context/AppContext';

export const OrderSuccessScreen: React.FC = () => {
  const { selectedOrderId, setCurrentScreen } = useApp();

  return (
    <div className="min-h-[70vh] bg-[#FFFDF5] px-4 py-14 text-[#0B2419] sm:px-8">
      <section className="relative mx-auto max-w-4xl overflow-hidden border border-[#E8E9E3] bg-white px-6 py-12 text-center shadow-sm sm:px-12 sm:py-16">
        <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full border border-[#E8C75B]/35" />
        <div className="pointer-events-none absolute -bottom-28 -right-16 h-72 w-72 rounded-full border border-[#0B2419]/10" />

        <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#0B2419] text-[#E8C75B] shadow-lg">
          <span className="material-symbols-outlined text-[34px]">check_circle</span>
        </div>

        <p className="relative mt-6 text-[11px] font-bold uppercase tracking-[0.24em] text-[#1B5038]">FIDO Checkout</p>
        <h1 className="relative mt-2 font-serif text-4xl">Đơn hàng đã được ghi nhận</h1>
        <p className="relative mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#606863]">
          Thông tin đơn hàng, tổng thanh toán và trạng thái tiếp theo được quản lý bởi backend. Bạn có thể theo dõi tiến trình trong khu vực đơn hàng của tài khoản.
        </p>

        {selectedOrderId && (
          <div className="relative mx-auto mt-7 w-fit border border-[#E8E9E3] bg-[#FAF9F5] px-5 py-3 text-sm">
            <span className="text-[#687069]">Mã tham chiếu nội bộ: </span>
            <strong className="font-mono">#{selectedOrderId}</strong>
          </div>
        )}

        <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {selectedOrderId && (
            <button
              type="button"
              onClick={() => setCurrentScreen('order-detail')}
              className="bg-[#0B2419] px-6 py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#1B5038]"
            >
              Xem chi tiết đơn
            </button>
          )}
          <button
            type="button"
            onClick={() => setCurrentScreen('my-orders')}
            className="border border-[#0B2419] px-6 py-3 text-xs font-bold uppercase tracking-widest"
          >
            Đơn hàng của tôi
          </button>
          <button
            type="button"
            onClick={() => setCurrentScreen('catalog')}
            className="border border-[#D9DDD6] px-6 py-3 text-xs font-bold uppercase tracking-widest text-[#606863]"
          >
            Tiếp tục mua sắm
          </button>
        </div>
      </section>
    </div>
  );
};
