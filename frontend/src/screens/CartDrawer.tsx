import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export const CartDrawer: React.FC = () => {
  const {
    isCartOpen,
    setIsCartOpen,
    cartItems,
    cartSubtotal,
    removeFromCart,
    changeCartQuantity,
  } = useApp();
  const navigate = useNavigate();
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    setIsCartOpen(false);
    navigate('/checkout');
  };

  return (
    <div
      inert={!isCartOpen}
      aria-hidden={!isCartOpen}
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      id="cart-drawer-container"
    >
      <button
        type="button"
        aria-label="Đóng giỏ hàng"
        className={`fixed inset-0 bg-[#071A12]/65 backdrop-blur-sm transition-opacity duration-300 ease-out motion-reduce:transition-none ${
          isCartOpen ? 'pointer-events-auto opacity-100' : 'opacity-0'
        }`}
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-3 sm:pl-6">
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-drawer-title"
          className={`relative z-10 flex h-full w-screen max-w-[500px] transform-gpu flex-col border-l border-white/10 bg-[#FDFDFB] shadow-2xl transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:transition-none ${
            isCartOpen ? 'pointer-events-auto translate-x-0' : 'translate-x-full'
          }`}
        >
          <header className="shrink-0 border-b border-[#E8E9E3] bg-white px-5 py-5 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[24px] text-[#0B2419]">shopping_bag</span>
                  <h2 id="cart-drawer-title" className="font-serif text-[22px] tracking-tight text-[#0B2419]">Giỏ hàng của bạn</h2>
                </div>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#687069]">{itemCount} sản phẩm · lưu trên tài khoản FIDO</p>
              </div>
              <button type="button" aria-label="Đóng giỏ hàng" onClick={() => setIsCartOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full text-[#424844] transition hover:bg-[#F3F4EF] hover:text-[#0B2419]"><span className="material-symbols-outlined text-[20px]">close</span></button>
            </div>
          </header>

          <div className="shrink-0 border-b border-[#E8E9E3] bg-[#071A12] px-5 py-3 text-white sm:px-6">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8C75B] text-[#071A12]"><span className="material-symbols-outlined text-[18px]">verified_user</span></span>
              <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#E8C75B]">Authenticated cart</p><p className="mt-0.5 text-xs text-white/70">Giá và số lượng sẽ được backend xác nhận lại ở bước checkout.</p></div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            {cartItems.length === 0 ? (
              <div className="flex min-h-[55vh] flex-col items-center justify-center text-center text-[#687069]">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#FFFDF5] ring-1 ring-[#E8E9E3]"><span className="material-symbols-outlined text-4xl text-[#0B2419]/45">production_quantity_limits</span></div>
                <p className="mt-5 font-serif text-xl text-[#0B2419]">Giỏ hàng đang trống</p>
                <p className="mt-2 max-w-xs text-xs leading-5">Chọn size và màu từ một sản phẩm đang bán để thêm biến thể vào giỏ hàng.</p>
                <button type="button" onClick={() => { setIsCartOpen(false); navigate('/products'); }} className="mt-5 bg-[#0B2419] px-5 py-3 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-[#1B5038]">Khám phá catalog</button>
              </div>
            ) : (
              <div className="divide-y divide-[#E8E9E3]">
                {cartItems.map((item) => (
                  <article key={item.id} className="group flex gap-4 py-5 first:pt-1">
                    <div className="relative h-32 w-24 shrink-0 overflow-hidden bg-[#F3F4EF] ring-1 ring-[#E8E9E3]">
                      {item.imageUrl ? <img alt={item.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" src={item.imageUrl} /> : <span className="flex h-full items-center justify-center px-2 text-center text-[10px] text-[#8A918B]">Chưa có ảnh</span>}
                      <span className="absolute bottom-1.5 left-1.5 bg-[#071A12]/85 px-1.5 py-0.5 font-mono text-[9px] text-white backdrop-blur">#{item.variantId}</span>
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-[#687069]">Variant</p><h3 className="mt-0.5 line-clamp-2 font-serif text-[16px] leading-5 text-[#0B2419]">{item.name}</h3></div>
                          <button type="button" aria-label="Xóa sản phẩm" onClick={() => removeFromCart(item.id)} className="p-1 text-[#687069] transition hover:bg-red-50 hover:text-[#BA1A1A]"><span className="material-symbols-outlined text-[18px]">delete_outline</span></button>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#424844]">
                          <span className="border border-[#D9DDD6] bg-white px-2 py-1">Size {item.size}</span>
                          <span className="border border-[#D9DDD6] bg-white px-2 py-1">{item.color}</span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-end justify-between gap-3 border-t border-[#E8E9E3]/70 pt-3">
                        <div className="flex h-8 items-center border border-[#D9DDD6] bg-white">
                          <button type="button" aria-label="Giảm số lượng" onClick={() => changeCartQuantity(item.id, -1)} className="flex h-full w-8 items-center justify-center transition hover:bg-[#F3F4EF]"><span className="material-symbols-outlined text-[15px]">remove</span></button>
                          <span className="w-9 text-center text-[13px] font-semibold">{item.quantity}</span>
                          <button type="button" aria-label="Tăng số lượng" onClick={() => changeCartQuantity(item.id, 1)} className="flex h-full w-8 items-center justify-center transition hover:bg-[#F3F4EF]"><span className="material-symbols-outlined text-[15px]">add</span></button>
                        </div>
                        <div className="text-right"><p className="text-[10px] text-[#687069]">{item.price.toLocaleString('vi-VN')}₫ / sản phẩm</p><p className="mt-0.5 font-serif text-lg font-bold text-[#0B2419]">{(item.price * item.quantity).toLocaleString('vi-VN')}₫</p></div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <footer className="shrink-0 border-t border-[#E8E9E3] bg-white px-5 py-5 shadow-[0_-10px_30px_rgba(7,26,18,0.06)] sm:px-6">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-[#424844]"><span>Tạm tính ({itemCount} sản phẩm)</span><span className="font-semibold text-[#0B2419]">{cartSubtotal.toLocaleString('vi-VN')}₫</span></div>
              <div className="flex items-center justify-between text-xs text-[#687069]"><span>Phí giao hàng và giảm giá</span><span>Xác nhận ở checkout</span></div>
            </div>
            <div className="mt-4 flex items-end justify-between border-t border-[#E8E9E3] pt-4"><span className="text-sm font-bold">Tạm tính</span><span className="font-serif text-2xl font-bold">{cartSubtotal.toLocaleString('vi-VN')}₫</span></div>
            <button type="button" disabled={cartItems.length === 0} onClick={handleCheckout} className="mt-4 flex w-full items-center justify-center gap-2 bg-[#0B2419] py-3.5 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-[#1B5038] disabled:cursor-not-allowed disabled:opacity-40"><span>Tiếp tục checkout</span><span className="material-symbols-outlined text-[18px]">arrow_forward</span></button>
            <button type="button" onClick={() => { setIsCartOpen(false); navigate('/products'); }} className="mt-2 w-full py-2 text-[11px] font-bold uppercase tracking-wider text-[#606863] transition hover:text-[#0B2419]">Tiếp tục mua sắm</button>
          </footer>
        </aside>
      </div>
    </div>
  );
};