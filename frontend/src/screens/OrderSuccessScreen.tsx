import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const OrderSuccessScreen: React.FC = () => {
  const { orders, setCurrentScreen, setSelectedOrderId, showToast } = useApp();
  const [copied, setCopied] = useState(false);
  const order = orders[0];

  if (!order) {
    return <div className="min-h-[60vh] flex items-center justify-center"><button onClick={()=>setCurrentScreen('catalog')} className="px-5 py-3 bg-[#0B2419] text-white rounded">Tiếp tục mua sắm</button></div>;
  }

  const copy = () => {
    navigator.clipboard?.writeText(order.id);
    setCopied(true);
    showToast('Đã sao chép mã đơn mock: ' + order.id);
    setTimeout(()=>setCopied(false),1500);
  };

  const detail = () => {
    setSelectedOrderId(order.id);
    setCurrentScreen('order-detail');
  };

  return (
    <div className="min-h-screen bg-[#FFFDF5] py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <section className="text-center bg-[#FAF4DF] border border-[#E8C75B]/30 rounded-xl p-8">
          <div className="w-16 h-16 rounded-full bg-[#0B2419] text-[#E8C75B] flex items-center justify-center mx-auto"><span className="material-symbols-outlined text-3xl">check</span></div>
          <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#725c00] mt-4">OrderConfirmation mock</div>
          <h1 className="font-['Playfair_Display',serif] text-3xl font-bold text-[#0B2419] mt-2">Đơn hàng đã được tạo</h1>
          <p className="text-sm text-[#687069] mt-2">Trạng thái khởi tạo: <strong>{order.status}</strong> · Thanh toán: <strong>{order.paymentStatusLabel}</strong></p>
        </section>

        <section className="mt-6 bg-white border border-[#E8E9E3] rounded-lg p-6">
          <div className="flex flex-wrap justify-between items-center gap-3 border-b pb-4">
            <div><div className="text-xs text-[#687069]">Mã đơn</div><div className="font-mono text-lg font-bold">{order.id}</div></div>
            <button onClick={copy} className="px-3 py-1.5 border rounded text-xs font-bold">{copied?'Đã sao chép':'Sao chép'}</button>
          </div>
          <div className="grid sm:grid-cols-2 gap-5 pt-5 text-xs">
            <div><div className="text-[#687069]">Người nhận / liên hệ</div><div className="font-bold mt-1">{order.customerPhone}</div><div>{order.customerEmail || 'Không email'}</div><div className="mt-1">{order.recipientAddress}</div></div>
            <div><div className="text-[#687069]">Tổng thanh toán COD</div><div className="text-2xl font-bold text-[#0B2419] mt-1">{order.total.toLocaleString('vi-VN')}₫</div><div className="mt-1">PaymentStatus: {order.paymentStatus}</div></div>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button onClick={detail} className="flex-1 py-3 bg-[#0B2419] text-white text-xs font-bold rounded">Xem chi tiết đơn</button>
            <button onClick={()=>setCurrentScreen('catalog')} className="flex-1 py-3 border text-xs font-bold rounded">Tiếp tục mua sắm</button>
          </div>
        </section>
      </div>
    </div>
  );
};
