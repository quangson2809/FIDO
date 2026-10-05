import React from 'react';
import { useApp } from '../context/AppContext';

export const PolicyScreen: React.FC = () => {
  const { setCurrentScreen } = useApp();
  return (
    <div className="min-h-[60vh] bg-[#FAF9F5] px-4 py-12 text-[#0B2419]">
      <div className="mx-auto max-w-3xl border border-[#E8E9E3] bg-white p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#687069]">FIDO content</p>
        <h1 className="mt-2 font-serif text-3xl">Chính sách</h1>
        <p className="mt-4 text-sm leading-6 text-[#606863]">Frontend không hardcode thời hạn đổi trả, hotline, showroom, bảo hành hoặc quy trình vận chuyển. Nội dung chính sách công khai phải được cấu hình dưới dạng content page của backend trước khi hiển thị tại đây.</p>
        <div className="mt-6 flex gap-3"><button type="button" onClick={() => setCurrentScreen('home')} className="border border-[#0B2419] px-4 py-2 text-xs font-bold uppercase">Trang chủ</button><button type="button" onClick={() => setCurrentScreen('my-orders')} className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase text-white">Đơn hàng của tôi</button></div>
      </div>
    </div>
  );
};
