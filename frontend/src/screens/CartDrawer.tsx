import React from 'react';
import { useApp } from '../context/AppContext';

export const CartDrawer: React.FC = () => {
  const {
    isCartOpen,
    setIsCartOpen,
    cartItems,
    removeFromCart,
    updateCartQuantity,
    freeHemming,
    setFreeHemming,
    hemmingNote,
    setHemmingNote,
    setCurrentScreen,
    addToCart
  } = useApp();

  if (!isCartOpen) return null;

  const subtotal = cartItems && cartItems.length > 0
    ? cartItems.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0)
    : 0;
  const comboDiscount = subtotal > 1000000 ? Math.round(subtotal * 0.1) : 0;
  const shippingFee = 0; // free shipping > 599.000đ
  const total = subtotal - comboDiscount + shippingFee;
  
  // Note:beltProduct would normally be fetched via a service call in a real app,
  // keeping simple logic for now while ensuring build passes.
  const beltProduct = {
    id: 'prod-9',
    name: 'Thắt Lưng Da Bò Ý',
    price: 490000,
    originalPrice: 590000,
    imageUrl: 'https://placehold.co/400'
  };

  const handleCheckout = () => {
    setIsCartOpen(false);
    setCurrentScreen('checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" id="cart-drawer-container">
      {/* Dimmed Backdrop Overlay with subtle blur */}
      <div
        className="fixed inset-0 bg-[#071A12]/60 backdrop-blur-sm transition-opacity duration-300 ease-out"
        onClick={() => setIsCartOpen(false)}
      ></div>

      {/* Slide-in Drawer Container from Right */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-4 sm:pl-6">
        <aside className="w-screen max-w-[480px] bg-[#fdfdfb] shadow-2xl flex flex-col h-full border-l border-[#E8E9E3] relative z-10 transition-transform duration-300 ease-out animate-in slide-in-from-right">
          {/* 1. Drawer Header */}
          <div className="px-6 py-5 border-b border-[#E8E9E3] bg-[#FFFFFF] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#0B2419] text-[24px]">shopping_bag</span>
              <div className="flex items-baseline gap-2">
                <h2 className="font-serif text-[20px] text-[#0B2419] tracking-tight font-medium">
                  Giỏ Hàng Của Bạn
                </h2>
                <span className="text-[10px] text-[#1B5038] bg-[#FAF4DF] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  ({cartItems.reduce((acc, i) => acc + i.quantity, 0)} MÓN)
                </span>
              </div>
            </div>
            <button
              aria-label="Đóng giỏ hàng"
              onClick={() => setIsCartOpen(false)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f3f4ef] text-[#424844] hover:text-[#0B2419] transition-colors focus:outline-none cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Free Shipping Progress Tracker Strip */}
          <div className="px-6 py-3.5 bg-[#FFFDF5] border-b border-[#E8E9E3] shrink-0">
            <div className="flex items-center justify-between text-xs text-[#0B2419] mb-2 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#E8C75B] text-[16px]">electric_bolt</span>
                <span>
                  Bạn chỉ cần mua thêm <strong className="text-[#1B5038]">111.000₫</strong> để được{' '}
                  <strong>GIAO HỎA TỐC 2H</strong>
                </span>
              </span>
              <span className="font-bold text-[#0B2419]">85%</span>
            </div>
            <div className="w-full h-1.5 bg-[#e5e0cb] rounded-full overflow-hidden">
              <div className="h-full bg-[#0B2419] rounded-full transition-all duration-700" style={{ width: '85%' }}></div>
            </div>
          </div>

          {/* 2. Scrollable Body: Cart Items & Add-ons */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 divide-y divide-[#E8E9E3]">
            {/* Cart Items Section */}
            <div className="space-y-4 pt-1">
              {cartItems.length === 0 ? (
                <div className="py-12 text-center text-[#687069]">
                  <span className="material-symbols-outlined text-4xl mb-2 text-[#0B2419]/40">production_quantity_limits</span>
                  <p className="font-semibold text-sm">Giỏ hàng của bạn đang trống</p>
                  <p className="text-xs mt-1">Hãy khám phá bộ sưu tập may sẵn cao cấp của chúng tôi.</p>
                  <button
                    onClick={() => {
                      setIsCartOpen(false);
                      setCurrentScreen('catalog');
                    }}
                    className="mt-4 px-4 py-2 bg-[#0B2419] text-white text-xs font-bold uppercase tracking-wider rounded"
                  >
                    Khám phá sản phẩm
                  </button>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.id} className="flex gap-4 py-2 group">
                    <div className="w-20 h-28 shrink-0 bg-[#f3f4ef] overflow-hidden relative ring-1 ring-[#E8E9E3]">
                      <img
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        src={item.imageUrl}
                      />
                      {item.badge && (
                        <span className="absolute top-1 left-1 bg-[#071A12]/90 text-[8px] font-bold text-[#FFFDF5] px-1.5 py-0.5 uppercase tracking-wider">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex justify-between items-start gap-2">
                          <h3
                            onClick={() => {
                              setIsCartOpen(false);
                              setCurrentScreen('product-detail');
                            }}
                            className="text-[14px] text-[#0B2419] font-semibold leading-snug hover:text-[#1B5038] cursor-pointer"
                          >
                            {item.name}
                          </h3>
                          <button
                            aria-label="Xóa sản phẩm"
                            onClick={() => removeFromCart(item.id)}
                            className="text-[#687069] hover:text-[#ba1a1a] transition-colors p-0.5 focus:outline-none"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete_outline</span>
                          </button>
                        </div>
                        <p className="text-[11px] text-[#424844]">
                          Size: <span className="font-semibold text-[#0B2419]">{item.size}</span> • Màu: {item.color}
                        </p>
                        <p className="text-[10px] text-[#687069] tracking-wider uppercase">
                          {item.fabricSummary}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E8E9E3]/50">
                        <div className="flex items-center border border-[#E8E9E3] bg-[#FFFFFF] h-7">
                          <button
                            onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                            className="w-6 h-full flex items-center justify-center text-[#0B2419] hover:bg-[#f3f4ef] focus:outline-none"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[14px]">remove</span>
                          </button>
                          <span className="w-7 text-center text-[13px] text-[#0B2419] font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                            className="w-6 h-full flex items-center justify-center text-[#0B2419] hover:bg-[#f3f4ef] focus:outline-none"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[14px]">add</span>
                          </button>
                        </div>
                        <div className="text-right">
                          <span className="text-[15px] font-bold text-[#0B2419]">
                            {(item.price * item.quantity).toLocaleString('vi-VN')}₫
                          </span>
                          {item.originalPrice && (
                            <span className="block text-[11px] text-[#687069] line-through leading-none">
                              {(item.originalPrice * item.quantity).toLocaleString('vi-VN')}₫
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 3. Free Tailoring & Atelier Notes */}
            <div className="pt-4 space-y-3">
              <div className="p-3 bg-[#FFFFFF] border border-[#E8E9E3] space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    checked={freeHemming}
                    onChange={(e) => setFreeHemming(e.target.checked)}
                    className="w-4 h-4 accent-[#0B2419] rounded cursor-pointer"
                    type="checkbox"
                  />
                  <span className="text-[11px] text-[#0B2419] font-bold uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-[#1B5038]">content_cut</span>
                    Hỗ Trợ Lên Gấu Giữ Viền Selvedge Miễn Phí
                  </span>
                </label>
                <p className="text-[11px] text-[#424844] font-light pl-6 leading-relaxed">
                  Nhập số đo hoặc chiều cao/cân nặng để thợ may căn chỉnh chính xác trước khi gửi đi.
                </p>
                <input
                  value={hemmingNote}
                  onChange={(e) => setHemmingNote(e.target.value)}
                  className="w-full px-3 py-1.5 text-[12px] bg-[#f3f4ef] border border-[#E8E9E3] rounded-none text-[#0B2419] placeholder-[#687069] focus:outline-none focus:ring-1 focus:ring-[#E8C75B]"
                  placeholder="Ví dụ: Cao 1m75, cắt ngắn 2cm hoặc dài quần 99cm..."
                  type="text"
                />
              </div>
            </div>

            {/* 4. Curated Cross-sell Module (Add-on offer) */}
            <div className="pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-[#687069] font-semibold">
                  Gợi Ý Mua Kèm Ưu Đãi (-15%)
                </span>
                <span className="text-[10px] text-[#725c00] font-bold">GIẢM THÊM KHI GỘP ĐƠN</span>
              </div>
              <div className="p-2.5 bg-[#FFFDF5] border border-[#E8E9E3] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-14 bg-[#FFFFFF] shrink-0 overflow-hidden">
                    <img
                      alt={beltProduct.name}
                      className="w-full h-full object-cover"
                      src={beltProduct.imageUrl}
                    />
                  </div>
                  <div>
                    <h4 className="text-[12px] text-[#0B2419] font-semibold line-clamp-1">
                      {beltProduct.name}
                    </h4>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-bold text-[#0B2419]">
                        {beltProduct.price.toLocaleString('vi-VN')}₫
                      </span>
                      {beltProduct.originalPrice && (
                        <span className="text-[11px] text-[#687069] line-through">
                          {beltProduct.originalPrice.toLocaleString('vi-VN')}₫
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => addToCart(beltProduct, 'Bản 3.2cm', 'Nâu Bò Ý', 1)}
                  className="px-2.5 py-1.5 bg-[#FFFFFF] hover:bg-[#0B2419] hover:text-[#FFFFFF] text-[#0B2419] border border-[#0B2419] text-[10px] uppercase font-bold tracking-wider transition-colors shrink-0 focus:outline-none"
                  type="button"
                >
                  + Thêm Nhanh
                </button>
              </div>
            </div>
          </div>

          {/* 3. Drawer Footer with Breakdown & CTAs */}
          <div className="p-6 bg-[#FFFFFF] border-t border-[#E8E9E3] space-y-4 shrink-0 shadow-lg">
            {/* Pricing Breakdown */}
            <div className="space-y-1.5 text-[13px]">
              <div className="flex justify-between text-[#424844]">
                <span>Tạm tính ({cartItems.reduce((acc, i) => acc + i.quantity, 0)} sản phẩm):</span>
                <span className="font-medium text-[#0B2419]">{subtotal.toLocaleString('vi-VN')}₫</span>
              </div>
              {comboDiscount > 0 && (
                <div className="flex justify-between text-[#1B5038] font-medium">
                  <span>Ưu đãi Combo &amp; Voucher:</span>
                  <span>-{comboDiscount.toLocaleString('vi-VN')}₫</span>
                </div>
              )}
              <div className="flex justify-between text-[#424844]">
                <span>Phí vận chuyển hỏa tốc 2H:</span>
                <span className="text-[#1B5038] font-semibold uppercase text-[11px] bg-[#FAF4DF] px-1.5 py-0.5">
                  Miễn Phí
                </span>
              </div>
              <div className="pt-2.5 border-t border-[#E8E9E3] flex justify-between items-baseline">
                <span className="text-[15px] text-[#0B2419] font-bold">Tổng cộng:</span>
                <div className="text-right">
                  <span className="text-[22px] font-bold text-[#0B2419] leading-none">
                    {total.toLocaleString('vi-VN')}₫
                  </span>
                  <span className="block text-[10px] text-[#687069] mt-0.5">
                    (Đã bao gồm VAT &amp; Đóng gói quà tặng)
                  </span>
                </div>
              </div>
            </div>

            {/* Action CTAs */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleCheckout}
                className="w-full h-12 bg-[#0B2419] hover:bg-[#1B5038] text-[#FFFFFF] text-[12px] uppercase tracking-widest font-semibold flex items-center justify-center gap-2 transition-colors focus:outline-none shadow-md cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">lock</span>
                <span>TIẾN HÀNH THANH TOÁN (COD)</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
              <button
                onClick={() => {
                  setIsCartOpen(false);
                  setCurrentScreen('catalog');
                }}
                className="w-full h-10 bg-transparent hover:bg-[#f3f4ef] text-[#0B2419] text-[12px] uppercase tracking-wider font-semibold border border-[#0B2419] transition-colors focus:outline-none"
                type="button"
              >
                TIẾP TỤC MUA SẮM
              </button>
            </div>

            {/* Brand Assurance Micro Badges */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E8E9E3] text-center text-[#687069]">
              <div className="flex flex-col items-center gap-0.5">
                <span className="material-symbols-outlined text-[18px] text-[#0B2419]">verified_user</span>
                <span className="text-[9px] uppercase leading-tight">Đồng kiểm khi nhận COD</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="material-symbols-outlined text-[18px] text-[#0B2419]">published_with_changes</span>
                <span className="text-[9px] uppercase leading-tight">Đổi size 15 ngày tận nhà</span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className="material-symbols-outlined text-[18px] text-[#0B2419]">security</span>
                <span className="text-[9px] uppercase leading-tight">Bảo mật mã hóa 100%</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
