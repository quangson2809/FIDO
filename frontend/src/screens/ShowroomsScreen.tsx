import React from 'react';
import { useApp } from '../context/AppContext';
import { mockUiShowrooms } from '../mocks/uiData';

export const ShowroomsScreen: React.FC = () => {
  const { setCurrentScreen } = useApp();

  return (
    <div className="min-h-screen bg-[#F8FAF4] py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#725c00]">Presentation fixture · ngoài API baseline</div>
          <h1 className="font-['Playfair_Display',serif] text-3xl font-bold text-[#0B2419] mt-1">Showroom UI fixture</h1>
          <p className="text-sm text-[#687069] mt-2 max-w-3xl">
            Bộ tài liệu API baseline hiện không khóa resource/endpoint Showroom hoặc Booking. Trang này chỉ giữ dữ liệu trình bày để kiểm thử layout; không mô phỏng nghiệp vụ đặt lịch, fitting hay service chưa có contract.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {mockUiShowrooms.map((showroom)=>(
            <article key={showroom.id} className="bg-white border border-[#E2E5DE] rounded-lg overflow-hidden">
              <img src={showroom.imageUrl} alt={showroom.name} className="w-full aspect-[16/9] object-cover bg-[#F3F4EF]"/>
              <div className="p-5">
                <div className="text-[10px] uppercase tracking-wider font-bold text-[#1B5038]">{showroom.typeBadge}</div>
                <h2 className="text-xl font-bold text-[#0B2419] mt-1">{showroom.name}</h2>
                <div className="mt-3 text-xs text-[#687069] space-y-1">
                  <div>{showroom.address}</div>
                  <div>{showroom.phone}</div>
                  <div>{showroom.openingHours}</div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {showroom.features.map((feature)=><span key={feature} className="px-2 py-1 bg-[#F5F6F2] rounded text-[10px] font-bold">{feature}</span>)}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="bg-[#FAF4DF] border border-[#E8C75B]/40 rounded-lg p-4 text-xs text-[#625f4e]">
          Khi tài liệu chốt Showroom/Booking contract, fixture này nên được thay bằng service/API tương ứng. Hiện tại frontend không tự tạo POST booking.
        </div>

        <button onClick={()=>setCurrentScreen('home')} className="px-4 py-2 bg-[#0B2419] text-white text-xs font-bold rounded">Về trang chủ</button>
      </div>
    </div>
  );
};
