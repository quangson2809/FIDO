import { StorefrontIcon } from '../components/StorefrontIcon';
import { StorefrontImage } from '../shared/ui/storefront/StorefrontImage';
import React, { useState } from 'react';
import { StorefrontDialog } from '../shared/ui/storefront/StorefrontDialog';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../features/cart/hooks/useCart';

export const CartDrawer: React.FC = () => {
  const {
    isCartOpen,
    setIsCartOpen,
    cartItems,
    cartSubtotal,
    isCartBusy,
    cartLoading, cartError, refreshCart,
    removeFromCart,
    changeCartQuantity,
  } = useCart();
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const close = () => { setDeletingId(null); setIsCartOpen(false); };
  const deletingItem = cartItems.find(item => item.id === deletingId);
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    setIsCartOpen(false);
    navigate('/checkout');
  };

  if (!isCartOpen) return null;
  return (
    <StorefrontDialog name="Giỏ hàng của bạn" onClose={close} className="cart-dialog">
        <aside className="flex flex-col bg-[#FDFDFB]" aria-busy={isCartBusy}>
          <header className="shrink-0 border-b border-[#E8E9E3] bg-white px-5 py-5 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <StorefrontIcon name="shopping_bag" className="h-5 w-5 text-[24px] text-[#0B2419]" />
                  <h2 id="cart-drawer-title" className="font-serif text-[22px] tracking-tight text-[#0B2419]">Giỏ hàng của bạn</h2>
                </div>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#687069]">{itemCount} sản phẩm · lưu trên tài khoản FIDO</p>
              </div>
              <button type="button" aria-label="Đóng giỏ hàng" autoFocus onClick={close} className="flex h-9 w-9 items-center justify-center rounded-full text-[#424844] transition hover:bg-[#F3F4EF] hover:text-[#0B2419]"><StorefrontIcon name="close" className="h-5 w-5 text-[20px]" /></button>
            </div>
          </header>

          <div className="shrink-0 border-b border-[#E8E9E3] bg-[#071A12] px-5 py-3 text-white sm:px-6">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8C75B] text-[#071A12]"><StorefrontIcon name="verified_user" className="h-5 w-5 text-[18px]" /></span>
              <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#E8C75B]">Lựa chọn của bạn</p><p className="mt-0.5 text-xs text-white/70">Kiểm tra sản phẩm trước khi tiếp tục đặt hàng.</p></div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
            {cartLoading && <p role="status" className="py-6 text-sm">Đang tải giỏ hàng...</p>}
            {isCartBusy && !cartLoading && <p role="status" className="py-3 text-sm">Đang cập nhật giỏ hàng...</p>}
            {cartError && <div role="alert" className="mb-4 border border-red-200 bg-red-50 p-4 text-sm text-red-700">{cartError}<button type="button" disabled={isCartBusy} onClick={() => { void refreshCart().catch(() => undefined); }} className="ml-2 underline">Thử lại</button></div>}
            {deletingItem && <div className="mb-4 border border-[#E8C75B] bg-[#FFFDF5] p-4 text-sm"><p>Xóa {deletingItem.name} khỏi giỏ hàng?</p><div className="mt-3 flex gap-2"><button type="button" disabled={isCartBusy} onClick={() => { removeFromCart(deletingItem.id); setDeletingId(null); }} className="border border-red-700 px-3 text-red-700">Xác nhận xóa</button><button type="button" onClick={() => setDeletingId(null)} className="border px-3">Giữ sản phẩm</button></div></div>}
            {cartItems.length === 0 && !cartLoading && !cartError ? (
              <div className="flex min-h-[55vh] flex-col items-center justify-center text-center text-[#687069]">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#FFFDF5] ring-1 ring-[#E8E9E3]"><StorefrontIcon name="production_quantity_limits" className="h-8 w-8 text-4xl text-[#0B2419]/45" /></div>
                <p className="mt-5 font-serif text-xl text-[#0B2419]">Giỏ hàng đang trống</p>
                <p className="mt-2 max-w-xs text-xs leading-5">Chọn kích cỡ và màu sắc để thêm sản phẩm yêu thích vào giỏ.</p>
                <button type="button" onClick={() => { setIsCartOpen(false); navigate('/products'); }} className="mt-5 bg-[#0B2419] px-5 py-3 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-[#1B5038]">Khám phá sản phẩm</button>
              </div>
            ) : (
              <div className="divide-y divide-[#E8E9E3]">
                {cartItems.map((item) => (
                  <article key={item.id} className="group flex gap-4 py-5 first:pt-1">
                    <div className="relative h-32 w-24 shrink-0 overflow-hidden bg-[#F3F4EF] ring-1 ring-[#E8E9E3]">
                      {item.imageUrl ? <StorefrontImage alt={item.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" src={item.imageUrl} /> : <span className="flex h-full items-center justify-center px-2 text-center text-[10px] text-[#606863]">Chưa có ảnh</span>}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-[#687069]">Sản phẩm</p><h3 className="mt-0.5 line-clamp-2 font-serif text-[16px] leading-5 text-[#0B2419]">{item.name}</h3></div>
                          <button type="button" disabled={isCartBusy} aria-label="Xóa sản phẩm" onClick={() => setDeletingId(item.id)} className="p-1 text-[#687069] transition hover:bg-red-50 hover:text-[#BA1A1A]"><StorefrontIcon name="delete_outline" className="h-5 w-5 text-[18px]" /></button>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#424844]">
                          <span className="border border-[#D9DDD6] bg-white px-2 py-1">Size {item.size}</span>
                          <span className="border border-[#D9DDD6] bg-white px-2 py-1">{item.color}</span>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-[#E8E9E3]/70 pt-3">
                        <div className="flex h-11 items-center border border-[#D9DDD6] bg-white">
                          <button type="button" disabled={isCartBusy || item.quantity <= 1} aria-label="Giảm số lượng" onClick={() => changeCartQuantity(item.id, -1)} className="flex h-full w-11 items-center justify-center transition hover:bg-[#F3F4EF]"><StorefrontIcon name="remove" className="h-5 w-5 text-[15px]" /></button>
                          <span className="w-9 text-center text-[13px] font-semibold">{item.quantity}</span>
                          <button type="button" disabled={isCartBusy} aria-label="Tăng số lượng" onClick={() => changeCartQuantity(item.id, 1)} className="flex h-full w-11 items-center justify-center transition hover:bg-[#F3F4EF]"><StorefrontIcon name="add" className="h-5 w-5 text-[15px]" /></button>
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
              <div className="flex items-center justify-between text-xs text-[#687069]"><span>Phí giao hàng và giảm giá</span><span>Xem ở bước đặt hàng</span></div>
            </div>
            <div className="mt-4 flex items-end justify-between border-t border-[#E8E9E3] pt-4"><span className="text-sm font-bold">Tạm tính</span><span className="font-serif text-2xl font-bold">{cartSubtotal.toLocaleString('vi-VN')}₫</span></div>
            <button type="button" disabled={cartItems.length === 0 || isCartBusy || Boolean(cartError)} onClick={handleCheckout} className="mt-4 flex w-full items-center justify-center gap-2 bg-[#0B2419] py-3.5 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-[#1B5038] disabled:cursor-not-allowed disabled:opacity-40"><span>Tiếp tục đặt hàng</span><StorefrontIcon name="arrow_forward" className="h-5 w-5 text-[18px]" /></button>
            <button type="button" onClick={() => { setIsCartOpen(false); navigate('/products'); }} className="mt-2 w-full py-2 text-[11px] font-bold uppercase tracking-wider text-[#606863] transition hover:text-[#0B2419]">Tiếp tục mua sắm</button>
          </footer>
        </aside>
    </StorefrontDialog>
  );
};
