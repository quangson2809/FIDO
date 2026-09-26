import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';

export const CartDrawer: React.FC = () => {
  const {
    isCartOpen,
    setIsCartOpen,
    cartItems,
    removeFromCart,
    updateCartQuantity,
    setCurrentScreen,
  } = useApp();

  useEffect(() => {
    if (!isCartOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsCartOpen(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCartOpen, setIsCartOpen]);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const checkout = () => {
    setIsCartOpen(false);
    setCurrentScreen('checkout');
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden ${isCartOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-hidden={!isCartOpen}
    >
      <button
        type="button"
        aria-label="Đóng giỏ hàng"
        onClick={() => setIsCartOpen(false)}
        className={`fixed inset-0 bg-[#071A12]/60 backdrop-blur-sm transition-opacity duration-300 ease-out ${isCartOpen ? 'opacity-100' : 'opacity-0'}`}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-4 sm:pl-6">
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Giỏ hàng"
          className={`w-screen max-w-[480px] bg-[#FDFDFB] shadow-2xl flex flex-col h-full border-l border-[#E8E9E3] relative z-10 transform-gpu will-change-transform transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <header className="px-5 sm:px-6 py-5 bg-white border-b border-[#E8E9E3] flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] font-bold text-[#1B5038]">CartDto mock</div>
              <h2 className="font-['Playfair_Display',serif] text-xl font-bold text-[#0B2419] mt-1">
                Giỏ hàng <span className="font-sans text-xs font-normal text-[#687069]">({totalQuantity} sản phẩm)</span>
              </h2>
            </div>
            <button type="button" onClick={()=>setIsCartOpen(false)} className="w-9 h-9 rounded-full hover:bg-[#F3F4EF] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </header>

          <div className="px-5 sm:px-6 py-3 bg-[#FAF4DF] border-b border-[#E8C75B]/30 text-[11px] text-[#625f4e]">
            Mock cart chỉ chứa variant, quantity, giá dẫn xuất và available quantity. Không áp dụng voucher/discount rule chưa được khóa.
          </div>

          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
            {cartItems.length === 0 ? (
              <div className="h-full min-h-[340px] flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-5xl text-[#0B2419]/25">shopping_bag</span>
                <h3 className="font-bold text-[#0B2419] mt-3">Giỏ hàng đang trống</h3>
                <p className="text-xs text-[#687069] mt-1">Thêm variant từ catalog để test luồng checkout.</p>
                <button
                  type="button"
                  onClick={() => { setIsCartOpen(false); setCurrentScreen('catalog'); }}
                  className="mt-5 px-5 py-2.5 bg-[#0B2419] text-white text-xs font-bold rounded"
                >
                  Xem sản phẩm
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {cartItems.map((item)=>(
                  <article key={item.id} className="flex gap-4 pb-5 border-b border-[#E8E9E3]">
                    <img src={item.imageUrl} alt={item.name} className="w-20 h-24 object-cover bg-[#F3F4EF] shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-bold text-[#0B2419] leading-snug">{item.name}</h3>
                          <p className="text-[11px] text-[#687069] mt-1">{item.sku || 'Không SKU'}</p>
                        </div>
                        <button type="button" onClick={()=>removeFromCart(item.id)} className="text-[#687069] hover:text-[#BA1A1A]">
                          <span className="material-symbols-outlined text-[19px]">delete_outline</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-[#424844] mt-2">Size: <strong>{item.size}</strong> · Màu: <strong>{item.color}</strong></p>
                      <div className="flex items-center justify-between mt-3">
                        <div className="inline-flex border border-[#E8E9E3] bg-white rounded">
                          <button type="button" onClick={()=>updateCartQuantity(item.id,item.quantity-1)} className="w-8 h-8 hover:bg-[#F3F4EF]">−</button>
                          <span className="w-8 h-8 flex items-center justify-center text-xs font-bold">{item.quantity}</span>
                          <button type="button" onClick={()=>updateCartQuantity(item.id,item.quantity+1)} className="w-8 h-8 hover:bg-[#F3F4EF]">+</button>
                        </div>
                        <div className="font-bold text-[#0B2419]">{(item.price*item.quantity).toLocaleString('vi-VN')}₫</div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <footer className="p-5 sm:p-6 bg-white border-t border-[#E8E9E3] shadow-[0_-8px_24px_rgba(7,26,18,0.05)]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#0B2419]">Subtotal</span>
              <strong className="text-xl text-[#0B2419]">{subtotal.toLocaleString('vi-VN')}₫</strong>
            </div>
            <p className="text-[10px] text-[#687069] mt-1">Giá checkout sẽ được backend revalidate trong quote/order thật.</p>
            <button
              type="button"
              disabled={!cartItems.length}
              onClick={checkout}
              className="w-full mt-4 py-3 bg-[#0B2419] hover:bg-[#1B5038] disabled:opacity-40 text-white text-xs uppercase tracking-wider font-bold rounded transition-colors"
            >
              Tiến hành checkout COD
            </button>
            <button
              type="button"
              onClick={()=>{setIsCartOpen(false);setCurrentScreen('catalog');}}
              className="w-full mt-2 py-2.5 border border-[#0B2419] text-[#0B2419] text-xs font-bold rounded"
            >
              Tiếp tục mua sắm
            </button>
          </footer>
        </aside>
      </div>
    </div>
  );
};
