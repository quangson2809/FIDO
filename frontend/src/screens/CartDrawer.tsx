import React from 'react';
import { useApp } from '../context/AppContext';

export const CartDrawer: React.FC = () => {
  const {
    isCartOpen,
    setIsCartOpen,
    cartItems,
    cartSubtotal,
    removeFromCart,
    updateCartQuantity,
    setCurrentScreen,
  } = useApp();

  if (!isCartOpen) return null;

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    setIsCartOpen(false);
    setCurrentScreen('checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" id="cart-drawer-container">
      <button
        type="button"
        aria-label="Đóng giỏ hàng"
        className="fixed inset-0 bg-[#071A12]/60 backdrop-blur-sm"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-4 sm:pl-6">
        <aside className="relative z-10 flex h-full w-screen max-w-[480px] flex-col border-l border-[#E8E9E3] bg-[#fdfdfb] shadow-2xl">
          <div className="flex shrink-0 items-center justify-between border-b border-[#E8E9E3] bg-white px-6 py-5">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[24px] text-[#0B2419]">shopping_bag</span>
              <div className="flex items-baseline gap-2">
                <h2 className="font-serif text-[20px] font-medium tracking-tight text-[#0B2419]">Giỏ hàng</h2>
                <span className="rounded-full bg-[#FAF4DF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1B5038]">
                  {cartItems.reduce((sum, item) => sum + item.quantity, 0)} món
                </span>
              </div>
            </div>
            <button type="button" aria-label="Đóng giỏ hàng" onClick={() => setIsCartOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full text-[#424844] hover:bg-[#f3f4ef]"><span className="material-symbols-outlined text-[20px]">close</span></button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {cartItems.length === 0 ? (
              <div className="py-12 text-center text-[#687069]">
                <span className="material-symbols-outlined mb-2 text-4xl text-[#0B2419]/40">production_quantity_limits</span>
                <p className="text-sm font-semibold">Giỏ hàng đang trống</p>
                <p className="mt-1 text-xs">Chọn một biến thể sản phẩm để thêm vào giỏ hàng.</p>
                <button type="button" onClick={() => { setIsCartOpen(false); setCurrentScreen('catalog'); }} className="mt-4 bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white">Xem sản phẩm</button>
              </div>
            ) : (
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <article key={item.id} className="flex gap-4 border-b border-[#E8E9E3] py-4 last:border-b-0">
                    <div className="h-28 w-20 shrink-0 overflow-hidden bg-[#f3f4ef] ring-1 ring-[#E8E9E3]">
                      {item.imageUrl ? <img alt={item.name} className="h-full w-full object-cover" src={item.imageUrl} /> : <span className="flex h-full items-center justify-center text-[10px] text-[#8A918B]">Chưa có ảnh</span>}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-[14px] font-semibold leading-snug text-[#0B2419]">{item.name}</h3>
                          <button type="button" aria-label="Xóa sản phẩm" onClick={() => removeFromCart(item.id)} className="p-0.5 text-[#687069] hover:text-[#ba1a1a]"><span className="material-symbols-outlined text-[18px]">delete_outline</span></button>
                        </div>
                        <p className="mt-1 text-[11px] text-[#424844]">Size: <span className="font-semibold text-[#0B2419]">{item.size}</span>{' · '}Màu: {item.color}</p>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[#687069]">Variant #{item.variantId}</p>
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t border-[#E8E9E3]/60 pt-2">
                        <div className="flex h-7 items-center border border-[#E8E9E3] bg-white">
                          <button type="button" aria-label="Giảm số lượng" onClick={() => updateCartQuantity(item.id, item.quantity - 1)} className="flex h-full w-7 items-center justify-center hover:bg-[#f3f4ef]"><span className="material-symbols-outlined text-[14px]">remove</span></button>
                          <span className="w-8 text-center text-[13px] font-semibold text-[#0B2419]">{item.quantity}</span>
                          <button type="button" aria-label="Tăng số lượng" onClick={() => updateCartQuantity(item.id, item.quantity + 1)} className="flex h-full w-7 items-center justify-center hover:bg-[#f3f4ef]"><span className="material-symbols-outlined text-[14px]">add</span></button>
                        </div>
                        <span className="text-sm font-bold text-[#0B2419]">{(item.price * item.quantity).toLocaleString('vi-VN')}₫</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-[#E8E9E3] bg-white px-6 py-5">
            <div className="mb-4 flex items-center justify-between text-sm"><span className="text-[#424844]">Tạm tính</span><span className="font-serif text-lg font-bold text-[#0B2419]">{cartSubtotal.toLocaleString('vi-VN')}₫</span></div>
            <button type="button" disabled={cartItems.length === 0} onClick={handleCheckout} className="w-full bg-[#0B2419] py-3 text-xs font-bold uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-40">Tiếp tục thanh toán</button>
            <p className="mt-3 text-center text-[10px] leading-5 text-[#687069]">Tổng tiền cuối cùng được backend xác nhận tại bước báo giá checkout.</p>
          </div>
        </aside>
      </div>
    </div>
  );
};
