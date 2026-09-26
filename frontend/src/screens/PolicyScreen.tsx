import React from 'react';
import { useApp } from '../context/AppContext';

export const PolicyScreen: React.FC = () => {
  const { setCurrentScreen } = useApp();

  return (
    <div className="min-h-screen bg-[#FAF9F5] py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex items-center gap-2 text-xs text-[#687069]">
          <button onClick={()=>setCurrentScreen('home')} className="hover:text-[#0B2419]">Trang chủ</button>
          <span>/</span>
          <span className="font-bold text-[#0B2419]">Chính sách</span>
        </div>

        <section className="bg-[#0B2419] text-white rounded-xl p-7 sm:p-9">
          <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#E8C75B]">Baseline nghiệp vụ</div>
          <h1 className="font-['Playfair_Display',serif] text-3xl sm:text-4xl font-bold mt-2">Đổi size & hoàn trả</h1>
          <p className="text-sm text-white/70 mt-3 max-w-3xl leading-relaxed">
            Mock frontend sử dụng đúng phạm vi đã khóa: xử lý tại cửa hàng trong 02 ngày kể từ khi đơn ở trạng thái COMPLETED và đáp ứng điều kiện nhãn/mác.
          </p>
        </section>

        <div className="grid md:grid-cols-2 gap-5">
          <section className="bg-white border border-[#E8E9E3] rounded-lg p-6">
            <div className="w-10 h-10 rounded-full bg-[#FAF4DF] flex items-center justify-center text-[#725c00]"><span className="material-symbols-outlined">schedule</span></div>
            <h2 className="font-bold text-[#0B2419] mt-4">Thời hạn 02 ngày</h2>
            <p className="text-sm text-[#687069] mt-2 leading-relaxed">
              Thời hạn được tính từ mốc COMPLETED. Frontend không hiển thị 15 ngày, 30 ngày hoặc đổi tận nhà vì các rule đó không thuộc baseline hiện tại.
            </p>
          </section>

          <section className="bg-white border border-[#E8E9E3] rounded-lg p-6">
            <div className="w-10 h-10 rounded-full bg-[#F3F4EF] flex items-center justify-center text-[#1B5038]"><span className="material-symbols-outlined">sell</span></div>
            <h2 className="font-bold text-[#0B2419] mt-4">Điều kiện nhãn/mác</h2>
            <p className="text-sm text-[#687069] mt-2 leading-relaxed">
              Việc đổi/hoàn chỉ tiếp tục khi sản phẩm đáp ứng điều kiện nhãn/mác theo baseline nghiệp vụ.
            </p>
          </section>

          <section className="bg-white border border-[#E8E9E3] rounded-lg p-6">
            <div className="w-10 h-10 rounded-full bg-[#F3F4EF] flex items-center justify-center text-[#1B5038]"><span className="material-symbols-outlined">assignment_return</span></div>
            <h2 className="font-bold text-[#0B2419] mt-4">RETURNED & REFUNDED độc lập</h2>
            <p className="text-sm text-[#687069] mt-2 leading-relaxed">
              OrderStatus và PaymentStatus được quản lý độc lập. Khi có hoàn tiền, PaymentStatus phản ánh REFUNDED; RETURNED được dùng để điều chỉnh báo cáo.
            </p>
          </section>

          <section className="bg-white border border-[#E8E9E3] rounded-lg p-6">
            <div className="w-10 h-10 rounded-full bg-[#F3F4EF] flex items-center justify-center text-[#1B5038]"><span className="material-symbols-outlined">inventory</span></div>
            <h2 className="font-bold text-[#0B2419] mt-4">Không tự động hoàn tồn</h2>
            <p className="text-sm text-[#687069] mt-2 leading-relaxed">
              RETURNED không tự tăng tồn. InventoryTransaction chỉ ghi nhận nhập lại khi hàng thực tế đã được nhận và đủ điều kiện bán lại.
            </p>
          </section>
        </div>

        <section className="bg-white border border-[#E8E9E3] rounded-lg p-6">
          <h2 className="font-bold text-[#0B2419]">Những gì frontend không giả định</h2>
          <div className="mt-4 grid sm:grid-cols-2 gap-3 text-xs text-[#687069]">
            {[
              'Không có shipping tracking API trong baseline.',
              'Không có payment gateway hoặc thanh toán thẻ; chỉ COD.',
              'Không có hồ sơ after-sales item-level độc lập.',
              'Không tự tạo workflow bảo hành trọn đời hoặc đổi hàng tại nhà.',
            ].map((item)=><div key={item} className="p-3 bg-[#FAF9F5] rounded flex gap-2"><span className="material-symbols-outlined text-[16px] text-[#1B5038]">check</span>{item}</div>)}
          </div>
        </section>
      </div>
    </div>
  );
};
