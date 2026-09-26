import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

const money = (value: number) => value.toLocaleString('vi-VN') + '₫';

export const OrderDetailScreen: React.FC = () => {
  const { selectedOrderId, orders, updateOrderRecipient, setCurrentScreen, showToast } = useApp();
  const order = orders.find((item)=>item.id===selectedOrderId) ?? orders[0];
  const [phone, setPhone] = useState(order?.customerPhone ?? '');
  const [address, setAddress] = useState(order?.recipientAddress ?? '');
  const [editing, setEditing] = useState(false);

  if (!order) {
    return <div className="min-h-[60vh] flex items-center justify-center text-sm text-[#687069]">Không có dữ liệu đơn hàng mock.</div>;
  }

  const canEditRecipient = ['PENDING','CONFIRMED','PREPARING','processing','confirmed'].includes(order.status);

  const saveRecipient = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canEditRecipient) {
      showToast('Từ SHIPPING trở đi, mock recipient update trả 409.');
      return;
    }
    updateOrderRecipient(order.id, phone, address);
    setEditing(false);
    showToast(`Mock PATCH /api/v1/me/orders/${order.id}/recipient`);
  };

  return (
    <div className="min-h-screen bg-[#FFFDF5] py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex items-center gap-2 text-xs text-[#687069]">
          <button onClick={()=>setCurrentScreen('my-orders')} className="font-bold hover:text-[#0B2419]">Đơn hàng của tôi</button><span>/</span><span>{order.id}</span>
        </div>

        <section className="bg-white border border-[#E8E9E3] rounded-lg p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-[#1B5038]">OrderCustomerDetailDto mock</div>
              <h1 className="font-['Playfair_Display',serif] text-3xl font-bold text-[#0B2419] mt-1">{order.id}</h1>
              <p className="text-xs text-[#687069] mt-1">Tạo lúc {order.createdAt}</p>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1.5 bg-[#FAF4DF] text-[#725c00] text-xs font-bold rounded">{order.status}</span>
              <span className="px-3 py-1.5 bg-[#F3F4EF] text-[#424844] text-xs font-bold rounded">{order.paymentStatus}</span>
            </div>
          </div>
        </section>

        <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
          <section className="bg-white border border-[#E8E9E3] rounded-lg overflow-hidden">
            <div className="p-4 border-b"><h2 className="font-bold text-[#0B2419]">Sản phẩm snapshot</h2></div>
            <div className="divide-y">
              {order.items.map((item)=>(
                <div key={item.id} className="p-4 flex gap-4">
                  <img src={item.imageUrl} alt={item.name} className="w-16 h-20 object-cover bg-[#F3F4EF]"/>
                  <div className="flex-1 text-xs">
                    <div className="font-bold text-sm text-[#0B2419]">{item.name}</div>
                    <div className="text-[#687069] mt-1">{item.sku || 'Không SKU'} · {item.size} · {item.color}</div>
                    <div className="mt-2">Số lượng: <strong>{item.quantity}</strong></div>
                  </div>
                  <div className="text-sm font-bold">{money(item.price*item.quantity)}</div>
                </div>
              ))}
            </div>
            <div className="p-5 border-t ml-auto max-w-sm text-xs space-y-2">
              <div className="flex justify-between"><span>Subtotal</span><strong>{money(order.subtotal)}</strong></div>
              <div className="flex justify-between"><span>Discount</span><strong>-{money(order.voucherDiscount ?? 0)}</strong></div>
              <div className="flex justify-between"><span>Shipping</span><strong>{money(order.shippingFee)}</strong></div>
              <div className="flex justify-between text-base border-t pt-2"><span>Total</span><strong>{money(order.total)}</strong></div>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="bg-white border border-[#E8E9E3] rounded-lg p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-[#0B2419]">Người nhận</h2>
                {canEditRecipient && <button onClick={()=>setEditing((value)=>!value)} className="text-xs font-bold text-[#1B5038]">{editing?'Hủy':'Sửa'}</button>}
              </div>
              {editing ? (
                <form onSubmit={saveRecipient} className="mt-4 space-y-3">
                  <input required value={phone} onChange={(e)=>setPhone(e.target.value)} className="w-full px-3 py-2 border rounded text-xs"/>
                  <textarea required rows={4} value={address} onChange={(e)=>setAddress(e.target.value)} className="w-full px-3 py-2 border rounded text-xs"/>
                  <button className="w-full py-2 bg-[#0B2419] text-white text-xs font-bold rounded">Lưu mock</button>
                </form>
              ) : (
                <div className="mt-4 text-xs space-y-2"><div className="font-bold">{order.customerPhone}</div><div>{order.customerEmail || 'Không email'}</div><div>{order.recipientAddress}</div></div>
              )}
              {!canEditRecipient && <p className="text-[10px] text-[#BA1A1A] mt-3">Recipient bị khóa từ SHIPPING trở đi.</p>}
            </section>

            <section className="bg-white border border-[#E8E9E3] rounded-lg p-5 text-xs">
              <h2 className="font-bold text-[#0B2419]">COD</h2>
              <div className="mt-3 flex justify-between"><span>Phương thức</span><strong>{order.paymentMethod}</strong></div>
              <div className="mt-2 flex justify-between"><span>PaymentStatus</span><strong>{order.paymentStatus}</strong></div>
              {order.courier && <div className="mt-2 flex justify-between"><span>Carrier</span><strong>{order.courier}</strong></div>}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};
