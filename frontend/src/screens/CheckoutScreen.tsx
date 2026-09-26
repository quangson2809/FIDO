import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export const CheckoutScreen: React.FC = () => {
  const {
    cartItems,
    appliedVoucher,
    voucherDiscount,
    applyVoucher,
    removeVoucher,
    createOrder,
    setCurrentScreen,
    setSelectedOrderId
  } = useApp();

  const [phone, setPhone] = useState('0912 345 678');
  const [email, setEmail] = useState('customer.vip@ateliervert.vn');
  const [address, setAddress] = useState('Số 128 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh');
  const [notes, setNotes] = useState('Giao giờ hành chính, gọi trước 15 phút, lên gấu quần selvedge giữ viền nguyên bản.');
  const [voucherInput, setVoucherInput] = useState('ABC123');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState('ORD-20260924-001');

  const subtotal = cartItems.length > 0
    ? cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0)
    : 900000;
  const discount = voucherDiscount || 50000;
  const shippingFee = 30000;
  const grandTotal = Math.max(0, subtotal - discount + shippingFee);

  const handleSubmitOrder = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      const order = createOrder({
        customerName: 'Nguyễn Văn An',
        customerPhone: phone,
        customerEmail: email,
        recipientAddress: address,
        deliveryNote: notes,
        subtotal,
        voucherCode: appliedVoucher || 'ABC123',
        voucherDiscount: discount,
        shippingFee,
        total: grandTotal
      });
      setPlacedOrderId(order.id);
      setSelectedOrderId(order.id);
      setIsSubmitting(false);
      setShowSuccessModal(true);
    }, 800);
  };

  return (
    <div className="w-full bg-[#f8faf4] min-h-screen">
      {/* Top Breadcrumb */}
      <div className="w-full h-[44px] bg-[#F5F6F2] border-b border-[#E2E5DE] px-4 sm:px-8 flex items-center text-[13px] text-[#606863] font-medium">
        <nav className="flex items-center gap-2">
          <button onClick={() => setCurrentScreen('home')} className="hover:text-[#0B2419] transition-colors">
            Trang chủ
          </button>
          <span className="text-[#C2C8C2]">/</span>
          <button onClick={() => setCurrentScreen('catalog')} className="hover:text-[#0B2419] transition-colors">
            Giỏ hàng
          </button>
          <span className="text-[#C2C8C2]">/</span>
          <span className="text-[#0B2419] font-semibold">Thanh toán COD</span>
        </nav>
      </div>

      <div className="w-full px-4 sm:px-8 lg:px-14 py-10 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-10 items-start">
          {/* LEFT COLUMN: 60% Width */}
          <div className="w-full lg:w-[60%] flex flex-col gap-6">
            {/* Header Lead */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#E8C75B]"></span>
                <span className="text-[10px] tracking-widest uppercase font-bold text-[#1B5038]">
                  Quy trình đặt hàng may sẵn
                </span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl text-[#071A12] tracking-tight">
                Thanh Toán Khi Nhận Hàng (COD)
              </h1>
              <p className="text-[14px] text-[#687069]">
                Quý khách vui lòng cung cấp thông tin liên hệ chính xác để bộ phận may đo Atelier Vert chuẩn bị kiện hàng kèm chứng thư vải nguyên bản.
              </p>
            </div>

            {/* Block A: Customer Information & Delivery Address */}
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-sm border border-[#E8E9E3] flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E8E9E3]">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-[#0B2419] text-white flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  <h2 className="text-[15px] font-bold uppercase tracking-wider text-[#0B2419]">
                    THÔNG TIN NHẬN HÀNG &amp; LIÊN HỆ
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentScreen('profile')}
                  className="inline-flex items-center gap-1 text-[#123A29] hover:text-[#0B2419] text-xs uppercase tracking-wider font-bold transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">bookmark</span>
                  <span>Sổ địa chỉ lưu sẵn (2)</span>
                </button>
              </div>

              <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
                {/* Row 1: Phone & Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label
                      className="text-[11px] uppercase tracking-widest text-[#0B2419] font-bold flex items-center justify-between"
                      htmlFor="recipient_phone"
                    >
                      <span>
                        Số điện thoại người nhận <span className="text-[#ba1a1a]">*</span>
                      </span>
                      <span className="text-[#687069] text-[10px] lowercase font-normal">recipient_phone</span>
                    </label>
                    <div className="relative flex items-center bg-[#f3f4ef] rounded border border-[#E8E9E3] focus-within:border-[#0B2419] transition-all">
                      <span className="pl-3 text-[#687069] text-xs font-bold select-none border-r border-[#E8E9E3] pr-2">
                        +84
                      </span>
                      <input
                        className="w-full bg-transparent px-3 py-2 text-sm text-[#071A12] font-semibold outline-none"
                        id="recipient_phone"
                        name="recipient_phone"
                        placeholder="Nhập 10 chữ số"
                        required
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                      <span className="material-symbols-outlined text-[#687069] text-[20px] pr-3">call</span>
                    </div>
                    <span className="text-[11px] text-[#687069]">
                      Shipper sẽ gọi trước 15-20 phút trước khi phát kiện.
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label
                      className="text-[11px] uppercase tracking-widest text-[#0B2419] font-bold flex items-center justify-between"
                      htmlFor="recipient_email"
                    >
                      <span>Địa chỉ email nhận e-Invoice</span>
                      <span className="text-[#687069] text-[10px] lowercase font-normal">recipient_email</span>
                    </label>
                    <div className="relative flex items-center bg-[#f3f4ef] rounded border border-[#E8E9E3] focus-within:border-[#0B2419] transition-all">
                      <input
                        className="w-full bg-transparent px-3 py-2 text-sm text-[#071A12] font-medium outline-none"
                        id="recipient_email"
                        name="recipient_email"
                        placeholder="dia-chi-email@vi-du.vn"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <span className="material-symbols-outlined text-[#687069] text-[20px] pr-3">mail</span>
                    </div>
                    <span className="text-[11px] text-[#687069]">
                      Nhận hóa đơn điện tử VAT và mã theo dõi hành trình đơn hàng.
                    </span>
                  </div>
                </div>

                {/* Row 2: Saved Address Shortcut Chip */}
                <div className="bg-[#FAF4DF]/60 p-3 rounded border border-[#E8C75B]/40 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-[#071A12]">
                    <span className="material-symbols-outlined text-[#725c00] text-[20px]">star</span>
                    <span>
                      <strong className="font-bold">Địa chỉ mặc định VIP:</strong> 128 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh
                    </span>
                  </div>
                  <span className="text-[#725c00] text-[11px] font-bold uppercase tracking-wider bg-white/70 px-2 py-0.5 rounded border border-[#E8C75B]/50">
                    ĐANG DÙNG
                  </span>
                </div>

                {/* Row 3: Full Address Input */}
                <div className="flex flex-col gap-1">
                  <label
                    className="text-[11px] uppercase tracking-widest text-[#0B2419] font-bold flex items-center justify-between"
                    htmlFor="recipient_address"
                  >
                    <span>
                      Địa chỉ nhận hàng chi tiết <span className="text-[#ba1a1a]">*</span>
                    </span>
                    <span className="text-[#687069] text-[10px] lowercase font-normal">recipient_address</span>
                  </label>
                  <div className="relative flex items-start bg-[#f3f4ef] rounded border border-[#E8E9E3] focus-within:border-[#0B2419] transition-all">
                    <textarea
                      className="w-full bg-transparent p-3 text-sm text-[#071A12] font-semibold outline-none resize-none leading-relaxed"
                      id="recipient_address"
                      name="recipient_address"
                      required
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                    <span className="material-symbols-outlined text-[#687069] text-[20px] p-3">pin_drop</span>
                  </div>
                </div>

                {/* Row 4: Atelier Delivery Instruction & Tailor Notes */}
                <div className="flex flex-col gap-1">
                  <label
                    className="text-[11px] uppercase tracking-widest text-[#0B2419] font-bold flex items-center justify-between"
                    htmlFor="delivery_notes"
                  >
                    <span>Ghi chú giao hàng &amp; May đo bổ sung (Tùy chọn)</span>
                    <span className="text-[#687069] text-[10px] font-normal font-mono">order_notes</span>
                  </label>
                  <div className="relative flex items-center bg-[#f3f4ef] rounded border border-[#E8E9E3] focus-within:border-[#0B2419] transition-all">
                    <input
                      type="text"
                      className="w-full bg-transparent px-3 py-2 text-xs text-[#071A12] outline-none"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                    <span className="material-symbols-outlined text-[#687069] text-[20px] pr-3">edit_note</span>
                  </div>
                </div>
              </form>

              {/* COD Payment Method Specification Card */}
              <div className="pt-4 border-t border-[#E8E9E3] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#0B2419] text-[22px]">payments</span>
                    <h3 className="text-sm uppercase tracking-wider text-[#0B2419] font-bold">
                      Phương thức thanh toán chỉ định
                    </h3>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest bg-[#123A29] text-white px-2 py-0.5 rounded font-bold">
                    MẶC ĐỊNH ĐÃ CHỌN
                  </span>
                </div>
                <div className="bg-[#071A12] text-white p-5 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#1B5038] text-[#E8C75B] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[24px]">local_shipping</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white">Thanh toán khi nhận hàng (COD)</span>
                        <span className="text-[#E8C75B] material-symbols-outlined text-[18px]">verified</span>
                      </div>
                      <p className="text-xs text-[#e1e3de] max-w-xl leading-relaxed">
                        Đặc quyền thượng khách Atelier Vert: Quý khách được{' '}
                        <strong className="text-white underline decoration-[#E8C75B]">mở hộp đồng kiểm</strong> kỹ lưỡng đường may, chất liệu len đay &amp; thử kích thước phom dáng trước khi tiến hành thanh toán tiền mặt cho nhân viên chuyển phát.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Voucher & Promotion Input Component */}
              <div className="pt-4 border-t border-[#E8E9E3] flex flex-col gap-2">
                <label className="text-[11px] uppercase tracking-widest text-[#0B2419] font-bold">
                  Mã voucher
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center bg-[#f3f4ef] rounded border border-[#E8E9E3] px-3 py-1.5">
                    <span className="material-symbols-outlined text-[#687069] text-[20px] mr-2">confirmation_number</span>
                    <input
                      className="bg-transparent text-sm uppercase tracking-wider text-[#0B2419] font-bold outline-none w-full"
                      placeholder="Nhập mã voucher"
                      type="text"
                      value={voucherInput}
                      onChange={(e) => setVoucherInput(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => applyVoucher(voucherInput)}
                    className="bg-[#0B2419] hover:bg-[#1B5038] text-white text-[11px] uppercase tracking-widest px-6 py-2.5 rounded transition-colors font-bold cursor-pointer"
                  >
                    Áp dụng
                  </button>
                </div>
                {appliedVoucher && (
                  <div className="bg-[#123A29]/10 border border-[#123A29]/20 rounded p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#0B2419]">
                      <span className="material-symbols-outlined text-[18px] text-[#1B5038]">check_circle</span>
                      <span className="text-xs">
                        Voucher đã áp dụng: <strong className="font-bold text-[#0B2419]">{appliedVoucher}</strong> (-50.000₫)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={removeVoucher}
                      className="text-[#687069] hover:text-[#ba1a1a] text-[11px] uppercase tracking-wider font-bold transition-colors cursor-pointer"
                    >
                      Gỡ mã
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Atelier Craft Assurance Banner */}
            <div className="bg-[#f3f4ef] p-5 rounded-lg border border-[#E8E9E3] flex flex-col sm:flex-row items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#0B2419] text-[#E8C75B] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[26px]">precision_manufacturing</span>
              </div>
              <div className="flex flex-col">
                <h4 className="text-sm font-bold text-[#071A12]">Chính sách xử lý đơn COD tại xưởng may</h4>
                <p className="text-xs text-[#687069] leading-relaxed mt-0.5">
                  Mỗi sản phẩm Jean và Sơ mi trước khi gửi đi đều trải qua bước hấp khử khuẩn bằng hơi nước công nghiệp, kiểm tra lại từng khuy đồng tán nhiệt và gấp nếp tiêu chuẩn hộp quà cứng Atelier Vert.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: 40% Width (Sticky Order Summary, Item details, Breakdown & Final COD CTA) */}
          <div className="w-full lg:w-[40%] flex flex-col gap-6 lg:sticky lg:top-24">
            <div className="bg-white rounded-lg border border-[#E8E9E3] shadow-sm p-6 flex flex-col gap-6">
              {/* Block B: Cart Items in Order */}
              <div className="flex flex-col gap-4 pb-4 border-b border-[#E8E9E3]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-[#0B2419] text-white flex items-center justify-center text-xs font-bold">
                      2
                    </span>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B2419]">
                      KIỂM TRA SẢN PHẨM ({cartItems.length > 0 ? cartItems.length : 2})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentScreen('catalog')}
                    className="text-xs uppercase tracking-wider text-[#687069] hover:text-[#0B2419] underline transition-colors"
                  >
                    Sửa giỏ hàng
                  </button>
                </div>

                {/* Items */}
                {(cartItems.length > 0
                  ? cartItems
                  : [
                      {
                        id: 'c1',
                        name: 'Quần Jean Straight Fit Dark Indigo Selvedge 13.5oz',
                        size: 31,
                        color: 'Chàm Indigo Đậm',
                        price: 689000,
                        imageUrl:
                          'https://lh3.googleusercontent.com/aida-public/AB6AXuAud5X3Fe_GBDKsFleLHxmvcDVkMW3Mu_P65bCTXSpHsqiLA8eLh0dFH6xW5sUezsivmo2eXh9B5bWXydJ6KjLkYqOFRjo4qaFJXREjkNqFh2BlyDIaOWRvBZ1EsLOV1UyXcGpWUAIuKse3b0nQditaYpZpeFkjmeYAr2rvXX9HerprbSyXsDg56hn4fW7Zxw7pNPZzlob4Zkgm6ZYK0Kxpm5_68-VRmH1IVU-iOqSI9S6snTDc3yJ_Ww',
                        quantity: 1
                      },
                      {
                        id: 'c2',
                        name: 'Áo Sơ Mi Cổ Cuban Dark Smoke Linen Cao Cấp',
                        size: 'L',
                        color: 'Xám Khói Dark Smoke',
                        price: 489000,
                        originalPrice: 620000,
                        imageUrl:
                          'https://lh3.googleusercontent.com/aida-public/AB6AXuCdErmgCgt2MpTxcfpFJsRHZuDy1JIZa_vRUfS2e44KpZsH3iMEweGcfN6zqKkzbl7ZtWkTy5mR5K71vgrAXWe0noMrw15MvL7YknlLr1eIX_LL7AeDrRYk7S0ezXMpjkjyanwZ7dq1aSo_dsmfzuyTLaFmFnzesaphKTKZ8kQkuZjS2tbN2PPtukACBfAPi3md47fVTF7PUJqVqtuYTggC1F10GxqjNkD-ggLDgO-1l-3jH90uiU3pXg',
                        quantity: 1
                      }
                    ]
                ).map((item) => (
                  <div key={item.id} className="flex items-start gap-3 pt-2">
                    <div className="relative w-16 h-20 bg-[#f3f4ef] shrink-0 overflow-hidden rounded border border-[#E8E9E3]">
                      <img alt={item.name} className="w-full h-full object-cover" src={item.imageUrl} />
                      <span className="absolute bottom-1 right-1 bg-[#071A12]/80 text-white text-[9px] px-1 font-mono rounded">
                        x{item.quantity}
                      </span>
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-[#071A12] truncate">{item.name}</h4>
                      <div className="flex items-center gap-2 text-[11px] text-[#687069] mt-0.5">
                        <span>
                          Size: <strong className="text-[#0B2419] font-bold">{item.size}</strong>
                        </span>
                        <span>|</span>
                        <span>
                          Màu: <strong className="text-[#0B2419] font-bold">{item.color}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#1B5038]"></span>
                        <span className="text-[10px] text-[#1B5038] font-medium">Tồn khả dụng: Có sẵn</span>
                      </div>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-xs font-bold text-[#0B2419] font-mono">
                          {item.price.toLocaleString('vi-VN')} ₫
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Block C: Cost Breakdown */}
              <div className="flex flex-col gap-2.5">
                <h4 className="text-[11px] uppercase tracking-widest text-[#687069] font-bold">
                  TỔNG KẾT CHI PHÍ CHI TIẾT
                </h4>
                <div className="flex flex-col gap-1.5 text-xs text-[#191c19]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#687069]">Tạm tính (Subtotal):</span>
                    <span className="font-bold text-[#0B2419] font-mono">{((subtotal as number) || 0).toLocaleString('vi-VN')} ₫</span>
                  </div>
                  <div className="flex items-center justify-between text-[#1B5038]">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">loyalty</span>
                      <span>Giảm giá (Voucher đã áp dụng: {appliedVoucher || 'ABC123'}):</span>
                    </span>
                    <span className="font-bold font-mono">-{((discount as number) || 0).toLocaleString('vi-VN')} ₫</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[#687069]">Phí giao hàng:</span>
                      <span className="text-[10px] text-[#687069]">Chuyển phát tiêu chuẩn kèm đồng kiểm tận tay</span>
                    </div>
                    <span className="font-bold text-[#0B2419] font-mono">{((shippingFee as number) || 0).toLocaleString('vi-VN')} ₫</span>
                  </div>
                </div>

                <div className="w-full h-px bg-[#E8E9E3] my-1"></div>

                {/* Final Grand Total */}
                <div className="flex items-baseline justify-between pt-1">
                  <div className="flex flex-col">
                    <span className="text-base font-bold text-[#071A12]">Tổng thanh toán COD:</span>
                    <span className="text-[10px] text-[#687069]">Đã bao gồm VAT &amp; Dịch vụ kiểm tra khi nhận</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-2xl font-bold text-[#0B2419] text-right font-mono">
                      {((grandTotal as number) || 0).toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                </div>

                {/* Applied Voucher Highlight Chip */}
                <div className="mt-1 bg-[#E8C75B]/20 border border-[#E8C75B]/40 rounded px-3 py-1.5 flex items-center justify-between text-[#071A12]">
                  <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider font-bold">
                    <span className="material-symbols-outlined text-[15px] text-[#725c00]">check</span>
                    <span>Voucher đã áp dụng: {appliedVoucher || 'ABC123'}</span>
                  </div>
                  <span className="text-xs font-bold text-[#0B2419] font-mono">-{((discount as number) || 0).toLocaleString('vi-VN')} ₫</span>
                </div>
              </div>

              {/* Block D: Action CTA Button & Atelier Commitments */}
              <div className="flex flex-col gap-3 pt-1">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSubmitOrder}
                  className="w-full py-4 bg-[#0B2419] hover:bg-[#1B5038] text-white text-sm font-bold uppercase tracking-widest rounded transition-all duration-300 shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined text-[20px] animate-spin text-[#E8C75B]">
                        refresh
                      </span>
                      <span>ĐANG XỬ LÝ ĐƠN HÀNG...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px] text-[#E8C75B]">lock</span>
                      <span>ĐẶT HÀNG COD — {((grandTotal as number) || 0).toLocaleString('vi-VN')} ₫</span>
                    </>
                  )}
                </button>

                {/* Brand Service Trust Badges */}
                <div className="flex flex-col gap-1.5 bg-[#f3f4ef] p-3.5 rounded text-xs text-[#191c19]">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[#1B5038] shrink-0 mt-0.5">
                      check_circle
                    </span>
                    <span className="text-[11px] text-[#071A12]">
                      Khách hàng được mở bọc đồng kiểm số đo &amp; chất liệu trước khi thanh toán tiền mặt
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[#1B5038] shrink-0 mt-0.5">
                      change_circle
                    </span>
                    <span className="text-[11px] text-[#071A12]">
                      Đổi size tận nơi miễn phí trong vòng 15 ngày nếu chưa vừa vặn
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[#1B5038] shrink-0 mt-0.5">
                      content_cut
                    </span>
                    <span className="text-[11px] text-[#071A12]">
                      Hỗ trợ cắt may lên gấu quần miễn phí tại tất cả Boutique Atelier Vert toàn quốc
                    </span>
                  </div>
                </div>

                {/* Customer Service Hotline Note */}
                <div className="flex items-center justify-between text-[#687069] text-xs pt-1">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">support_agent</span>
                    <span>Hỗ trợ may đo trực tiếp:</span>
                  </span>
                  <a className="font-bold text-[#0B2419] hover:underline" href="tel:19008899">
                    1900 8899 (8:30 - 21:30)
                  </a>
                </div>
              </div>
            </div>

            {/* Security & Return Guarantee Badge */}
            <div className="flex items-center justify-center gap-4 py-1 text-[#687069] text-xs">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">lock</span>
                <span>Mã hóa thanh toán</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">shield</span>
                <span>Bảo vệ quyền lợi COD</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                <span>Đóng gói 2 lớp hộp</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-[#071A12]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-8 shadow-2xl flex flex-col gap-4 border border-[#E8E9E3] animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-[#1B5038]/10 text-[#0B2419] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[32px] text-[#1B5038]">check_circle</span>
            </div>
            <div className="text-center flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-widest text-[#E8C75B] font-bold">
                Thành Công • POST /api/v1/orders
              </span>
              <h3 className="font-serif text-2xl text-[#071A12]">Đơn Hàng COD Đã Được Tiếp Nhận!</h3>
              <p className="text-xs text-[#687069] leading-relaxed">
                Mã đơn hàng: <strong className="text-[#0B2419] font-mono font-bold">#{placedOrderId}</strong>. Bộ phận chăm sóc khách hàng của Atelier Vert sẽ liên hệ xác nhận size áo L &amp; quần 31 trước khi chuyển giao bộ phận đóng gói.
              </p>
            </div>
            <div className="bg-[#f3f4ef] p-4 rounded text-xs text-[#0B2419] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#687069]">Hình thức:</span>
                <span className="font-semibold">COD (Thu tiền khi giao hàng)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#687069]">Số tiền shipper thu:</span>
                <span className="font-bold font-mono text-sm">{((grandTotal as number) || 0).toLocaleString('vi-VN')} ₫</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#687069]">Đặc quyền bưu phẩm:</span>
                <span className="font-semibold text-[#1B5038]">Được mở xem &amp; thử đồ</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  setCurrentScreen('order-success');
                }}
                className="flex-1 py-3 bg-[#0B2419] hover:bg-[#1B5038] text-white text-xs font-bold uppercase tracking-wider rounded transition-colors text-center"
              >
                Xem Xác Nhận Đơn Hàng
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  setCurrentScreen('home');
                }}
                className="py-3 px-4 bg-[#f3f4ef] hover:bg-[#e7e9e3] text-[#0B2419] text-xs font-bold uppercase tracking-wider rounded transition-colors"
              >
                Về Trang Chủ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
