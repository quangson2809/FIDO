import React from 'react';
import { useApp } from '../context/AppContext';

export const ShowroomsScreen: React.FC = () => {
  const { setCurrentScreen } = useApp();

  return (
    <div className="min-h-[60vh] bg-[#FAF9F5] px-4 py-12 text-[#0B2419]">
      <div className="mx-auto max-w-2xl border border-[#E8E9E3] bg-white p-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#687069]">FIDO</p>
        <h1 className="mt-2 font-serif text-3xl">Showroom chưa thuộc contract hiện tại</h1>
        <p className="mt-4 text-sm leading-6 text-[#606863]">
          Backend FIDO hiện không cung cấp API showroom hoặc đặt lịch fitting. Frontend không hiển thị dữ liệu mẫu hoặc giả lập việc đặt lịch.
        </p>
        <button
          type="button"
          onClick={() => setCurrentScreen('catalog')}
          className="mt-6 bg-[#0B2419] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white"
        >
          Xem sản phẩm
        </button>
      </div>
    </div>
  );
};
