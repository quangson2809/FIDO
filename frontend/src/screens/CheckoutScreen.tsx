import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { profileService } from '../features/auth/api/profileService';
import { checkoutService } from '../features/orders/api/checkoutService';
import type {
  CheckoutQuoteDto,
  CheckoutRequest,
  OrderConfirmationDto,
} from '../features/orders/types';
import { hasApiAccessToken } from '../services/http/apiClient';

const money = (value: number): string => `${value.toLocaleString('vi-VN')}₫`;

export const CheckoutScreen: React.FC = () => {
  const {
    cartItems,
    cartSubtotal,
    setCurrentScreen,
    setSelectedOrderId,
    showToast,
  } = useApp();

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [quote, setQuote] = useState<CheckoutQuoteDto | null>(null);
  const [confirmation, setConfirmation] = useState<OrderConfirmationDto | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!hasApiAccessToken()) {
      showToast('Vui lòng đăng nhập trước khi đặt hàng.');
      setCurrentScreen('auth');
      return () => {
        active = false;
      };
    }

    const loadProfile = async () => {
      try {
        const me = await profileService.getMe();
        if (!active) return;
        setPhone(me.account.phone);
        setEmail(me.account.email ?? '');
        setAddress(me.addresses[0]?.address_text ?? '');
      } catch {
        if (active) {
          setError('Không thể tải thông tin tài khoản.');
        }
      } finally {
        if (active) setProfileLoading(false);
      }
    };

    void loadProfile();
    return () => {
      active = false;
    };
  }, [setCurrentScreen, showToast]);

  const invalidateQuote = () => {
    setQuote(null);
    setError(null);
  };

  const request = useMemo<CheckoutRequest>(() => ({
    recipient_phone: phone.trim(),
    recipient_email: email.trim() || null,
    recipient_address: address.trim(),
    voucher_code: voucherCode.trim() || null,
  }), [address, email, phone, voucherCode]);

  const canRequestQuote = request.recipient_phone.length > 0
    && request.recipient_address.length > 0
    && cartItems.length > 0;

  const loadQuote = async () => {
    if (!canRequestQuote) {
      setError('Cần có sản phẩm trong giỏ, số điện thoại và địa chỉ nhận hàng.');
      return;
    }

    setQuoteLoading(true);
    setError(null);
    try {
      setQuote(await checkoutService.quote(request));
    } catch {
      setQuote(null);
      setError('Không thể tạo báo giá. Kiểm tra thông tin nhận hàng, voucher và tồn kho.');
    } finally {
      setQuoteLoading(false);
    }
  };

  const placeOrder = async () => {
    if (!quote || orderSubmitting) return;

    setOrderSubmitting(true);
    setError(null);
    try {
      const result = await checkoutService.createOrder(request);
      setConfirmation(result);
      setSelectedOrderId(String(result.order_id));
    } catch {
      setError('Không thể tạo đơn hàng. Dữ liệu giỏ hàng có thể đã thay đổi; hãy cập nhật báo giá và thử lại.');
      setQuote(null);
    } finally {
      setOrderSubmitting(false);
    }
  };

  if (confirmation) {
    return (
      <section className="mx-auto min-h-[60vh] max-w-3xl px-4 py-14 sm:px-8">
        <div className="border border-[#D9DDD6] bg-white p-7 shadow-sm sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B5038]">Đặt hàng thành công</p>
          <h1 className="mt-2 font-serif text-3xl text-[#0B2419]">{confirmation.order_code}</h1>
          <p className="mt-2 text-sm text-[#606863]">
            Đơn hàng đã được tạo với trạng thái {confirmation.order_status}. Thanh toán hiện tại: {confirmation.payment.payment_status}.
          </p>

          <dl className="mt-7 space-y-3 border-y border-[#E8E9E3] py-5 text-sm">
            <div className="flex justify-between gap-4"><dt>Tạm tính</dt><dd className="font-semibold">{money(confirmation.subtotal)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Giảm giá</dt><dd className="font-semibold">-{money(confirmation.discount)}</dd></div>
            <div className="flex justify-between gap-4"><dt>Phí giao hàng</dt><dd className="font-semibold">{money(confirmation.shipping_fee)}</dd></div>
            <div className="flex justify-between gap-4 text-base"><dt className="font-bold">Tổng COD</dt><dd className="font-bold">{money(confirmation.total)}</dd></div>
          </dl>

          <p className="mt-5 text-xs leading-5 text-[#687069]">
            Giỏ hàng không được xóa cục bộ sau khi đặt hàng; giao diện giữ nguyên dữ liệu backend cho đến khi backend định nghĩa lifecycle giỏ hàng sau tạo đơn.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setCurrentScreen('order-detail')}
              className="bg-[#0B2419] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white"
            >
              Xem đơn hàng
            </button>
            <button
              type="button"
              onClick={() => setCurrentScreen('my-orders')}
              className="border border-[#0B2419] px-5 py-3 text-xs font-bold uppercase tracking-wider"
            >
              Danh sách đơn hàng
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#0B2419]">
      <div className="border-b border-[#E2E5DE] bg-[#F5F6F2] px-4 py-3 sm:px-8">
        <nav className="mx-auto flex max-w-6xl items-center gap-2 text-sm text-[#606863]">
          <button type="button" onClick={() => setCurrentScreen('catalog')} className="hover:text-[#0B2419]">Sản phẩm</button>
          <span>/</span>
          <span className="font-semibold text-[#0B2419]">Checkout</span>
        </nav>
      </div>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <header>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B5038]">FIDO Checkout</p>
            <h1 className="mt-1 font-serif text-3xl">Thông tin nhận hàng</h1>
            <p className="mt-2 text-sm leading-6 text-[#606863]">
              Đơn hàng yêu cầu đăng nhập. Backend xác nhận lại giỏ hàng, giá, tồn kho, voucher và toàn bộ số tiền trước khi tạo đơn.
            </p>
          </header>

          <div className="space-y-5 border border-[#E8E9E3] bg-white p-6">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold">Số điện thoại người nhận *</span>
              <input
                type="tel"
                maxLength={20}
                disabled={profileLoading}
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  invalidateQuote();
                }}
                className="w-full border border-[#D9DDD6] px-3 py-2.5 text-sm outline-none focus:border-[#0B2419]"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold">Email người nhận</span>
              <input
                type="email"
                maxLength={254}
                disabled={profileLoading}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  invalidateQuote();
                }}
                className="w-full border border-[#D9DDD6] px-3 py-2.5 text-sm outline-none focus:border-[#0B2419]"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold">Địa chỉ nhận hàng *</span>
              <textarea
                rows={3}
                maxLength={500}
                disabled={profileLoading}
                value={address}
                onChange={(event) => {
                  setAddress(event.target.value);
                  invalidateQuote();
                }}
                className="w-full resize-y border border-[#D9DDD6] px-3 py-2.5 text-sm outline-none focus:border-[#0B2419]"
                placeholder="Nhập địa chỉ nhận hàng"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-xs font-semibold">Voucher</span>
              <input
                type="text"
                maxLength={80}
                value={voucherCode}
                onChange={(event) => {
                  setVoucherCode(event.target.value);
                  invalidateQuote();
                }}
                className="w-full border border-[#D9DDD6] px-3 py-2.5 text-sm uppercase outline-none focus:border-[#0B2419]"
                placeholder="Không bắt buộc"
              />
            </label>

            <button
              type="button"
              disabled={!canRequestQuote || quoteLoading || profileLoading}
              onClick={() => void loadQuote()}
              className="bg-[#0B2419] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {quoteLoading ? 'Đang kiểm tra...' : quote ? 'Cập nhật báo giá' : 'Kiểm tra và báo giá'}
            </button>
          </div>

          {error && (
            <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="border border-[#E8E9E3] bg-white p-5">
            <div className="flex items-center justify-between border-b border-[#E8E9E3] pb-3">
              <h2 className="font-serif text-xl">Giỏ hàng</h2>
              <span className="text-xs text-[#687069]">{cartItems.length} dòng</span>
            </div>

            {cartItems.length === 0 ? (
              <div className="py-8 text-sm text-[#687069]">
                Giỏ hàng trống. Hãy quay lại catalog trước khi checkout.
              </div>
            ) : (
              <div className="divide-y divide-[#E8E9E3]">
                {cartItems.map((item) => (
                  <div key={item.id} className="py-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{item.name}</p>
                        <p className="mt-1 text-xs text-[#687069]">{item.size} · {item.color} · x{item.quantity}</p>
                      </div>
                      <span className="shrink-0 font-semibold">{money(item.price * item.quantity)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between border-t border-[#E8E9E3] pt-4 text-sm">
              <span>Tạm tính giỏ hàng</span>
              <span className="font-bold">{money(cartSubtotal)}</span>
            </div>
          </div>

          <div className="border border-[#E8E9E3] bg-white p-5">
            <h2 className="font-serif text-xl">Báo giá checkout</h2>
            {!quote ? (
              <p className="mt-3 text-sm leading-6 text-[#687069]">
                Nhập thông tin nhận hàng rồi yêu cầu báo giá. Frontend không tự tính discount, phí giao hàng hoặc tổng thanh toán.
              </p>
            ) : (
              <>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-4"><dt>Tạm tính</dt><dd>{money(quote.subtotal)}</dd></div>
                  <div className="flex justify-between gap-4"><dt>Giảm giá</dt><dd>-{money(quote.discount)}</dd></div>
                  <div className="flex justify-between gap-4"><dt>Phí giao hàng</dt><dd>{money(quote.shipping_fee)}</dd></div>
                  <div className="flex justify-between gap-4 border-t border-[#E8E9E3] pt-3 text-base"><dt className="font-bold">Tổng COD</dt><dd className="font-bold">{money(quote.total)}</dd></div>
                </dl>

                <p className="mt-3 text-xs text-[#687069]">
                  {quote.items.length} dòng hàng đã được backend kiểm tra. {voucherCode.trim() ? `Voucher gửi kiểm tra: ${voucherCode.trim()}.` : 'Không dùng voucher.'}
                </p>

                <button
                  type="button"
                  disabled={orderSubmitting}
                  onClick={() => void placeOrder()}
                  className="mt-5 w-full bg-[#0B2419] px-5 py-3 text-xs font-bold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {orderSubmitting ? 'Đang tạo đơn...' : `Đặt hàng COD — ${money(quote.total)}`}
                </button>
              </>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
};
