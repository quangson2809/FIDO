import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const CheckoutScreen: React.FC = () => {
  const { cartItems, userProfile, createOrder, setCurrentScreen, setSelectedOrderId, showToast } = useApp();
  const [phone, setPhone] = useState(userProfile.phone);
  const [email, setEmail] = useState(userProfile.email);
  const [address, setAddress] = useState(userProfile.addresses[0]?.address ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = cartItems.reduce((sum,item)=>sum + item.price * item.quantity,0);
  const discount = 0;
  const shippingFee = 30000;
  const total = subtotal - discount + shippingFee;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!cartItems.length) {
      showToast('Giỏ hàng mock đang trống.');
      return;
    }

    setIsSubmitting(true);
    const order = createOrder({
      customerName: `Tài khoản #${userProfile.id}`,
      customerPhone: phone,
      customerEmail: email,
      recipientAddress: address,
      status: 'PENDING',
      items: cartItems.map((item)=>({
        id: item.id,
        name: item.name,
        sku: item.sku,
        price: item.price,
        imageUrl: item.imageUrl,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
      })),
      subtotal,
      voucherDiscount: discount,
      shippingFee,
      total,
    });
    setSelectedOrderId(order.id);
    setIsSubmitting(false);
    showToast('Mock POST /api/v1/orders: server tạo PENDING + UNPAID COD.');
    setCurrentScreen('order-success');
  };

  return (
    <div className="min-h-screen bg-[#F8FAF4] py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-6">
          <div className="text-[10px] uppercase tracking-widest font-bold text-[#1B5038]">Checkout / COD</div>
          <h1 className="font-['Playfair_Display',serif] text-3xl font-bold text-[#0B2419] mt-1">Xác nhận thông tin nhận hàng</h1>
          <p className="text-sm text-[#687069] mt-1">Quote/order mock không tự bịa rule voucher. Discount giữ 0 khi rule còn TBD; phí giao mặc định 30.000₫ theo FR-09.</p>
        </div>

        <form onSubmit={submit} className="grid lg:grid-cols-[1fr_420px] gap-6 items-start">
          <section className="bg-white border border-[#E8E9E3] rounded-lg p-5 sm:p-6 space-y-4">
            <h2 className="font-bold text-[#0B2419]">RecipientDto</h2>
            <div>
              <label className="text-xs font-bold">Số điện thoại *</label>
              <input required value={phone} onChange={(e)=>setPhone(e.target.value)} className="w-full mt-1 px-3 py-2.5 border rounded"/>
            </div>
            <div>
              <label className="text-xs font-bold">Email</label>
              <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full mt-1 px-3 py-2.5 border rounded"/>
            </div>
            <div>
              <label className="text-xs font-bold">Địa chỉ *</label>
              <textarea required rows={4} value={address} onChange={(e)=>setAddress(e.target.value)} className="w-full mt-1 px-3 py-2.5 border rounded"/>
            </div>
            <div className="text-[11px] text-[#687069] bg-[#FAF9F5] p-3 rounded">
              Client không gửi total/status cho API thật; các giá trị ở mock UI được tính để test hiển thị, backend phải revalidate và snapshot khi tạo đơn.
            </div>
          </section>

          <aside className="bg-white border border-[#E8E9E3] rounded-lg overflow-hidden sticky top-24">
            <div className="p-5 border-b"><h2 className="font-bold text-[#0B2419]">Giỏ hàng ({cartItems.reduce((s,i)=>s+i.quantity,0)})</h2></div>
            <div className="p-5 space-y-3 max-h-[340px] overflow-y-auto">
              {cartItems.map((item)=>(
                <div key={item.id} className="flex gap-3 text-xs">
                  <img src={item.imageUrl} alt={item.name} className="w-14 h-16 object-cover bg-[#F3F4EF]"/>
                  <div className="flex-1"><div className="font-bold">{item.name}</div><div className="text-[#687069]">{item.size} · {item.color} · x{item.quantity}</div></div>
                  <div className="font-bold">{(item.price*item.quantity).toLocaleString('vi-VN')}₫</div>
                </div>
              ))}
              {!cartItems.length && <p className="text-xs text-[#687069]">Giỏ hàng trống.</p>}
            </div>
            <div className="p-5 border-t space-y-2 text-xs">
              <div className="flex justify-between"><span>Subtotal</span><strong>{subtotal.toLocaleString('vi-VN')}₫</strong></div>
              <div className="flex justify-between"><span>Discount mock</span><strong>{discount.toLocaleString('vi-VN')}₫</strong></div>
              <div className="flex justify-between"><span>Shipping mock</span><strong>{shippingFee.toLocaleString('vi-VN')}₫</strong></div>
              <div className="flex justify-between text-base border-t pt-3"><span>Total</span><strong>{total.toLocaleString('vi-VN')}₫</strong></div>
              <button disabled={isSubmitting || !cartItems.length} className="w-full mt-3 py-3 bg-[#0B2419] disabled:opacity-40 text-white text-xs font-bold rounded">
                {isSubmitting?'Đang tạo đơn mock...':'Đặt hàng COD mock'}
              </button>
              <button type="button" onClick={()=>setCurrentScreen('catalog')} className="w-full py-2 text-xs font-bold text-[#687069]">Tiếp tục mua sắm</button>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
};
