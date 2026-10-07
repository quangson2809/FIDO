import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { profileService } from '../features/auth/api/profileService';
import { checkoutService } from '../features/orders/api/checkoutService';
import type { CheckoutQuoteDto, CheckoutRequest } from '../features/orders/types';
import { getApiErrorMessage } from '../services/http/apiError';

const money = (value: number): string => `${value.toLocaleString('vi-VN')}₫`;
const requestKey = (request: CheckoutRequest): string => JSON.stringify(request);

export const CheckoutScreen: React.FC = () => {
  const { cartItems, cartSubtotal } = useApp();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [quote, setQuote] = useState<CheckoutQuoteDto | null>(null);
  const [quotedRequestKey, setQuotedRequestKey] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      try {
        const me = await profileService.getMe();
        if (!active) return;
        setPhone(me.account.phone);
        setEmail(me.account.email ?? '');
        setAddress(me.addresses[0]?.address_text ?? '');
      } catch (requestError: unknown) {
        if (active) setError(getApiErrorMessage(requestError, 'Không thể tải thông tin tài khoản.'));
      } finally {
        if (active) setProfileLoading(false);
      }
    };

    void loadProfile();
    return () => { active = false; };
  }, []);

  const invalidateQuote = () => {
    setQuote(null);
    setQuotedRequestKey(null);
    setError(null);
  };

  const request = useMemo<CheckoutRequest>(() => ({
    recipient_phone: phone.trim(),
    recipient_email: email.trim() || null,
    recipient_address: address.trim(),
    voucher_code: voucherCode.trim() || null,
  }), [address, email, phone, voucherCode]);

  const currentRequestKey = requestKey(request);
  const quoteIsCurrent = quote !== null && quotedRequestKey === currentRequestKey;
  const canRequestQuote = request.recipient_phone.length > 0 && request.recipient_address.length > 0 && cartItems.length > 0;

  const loadQuote = async () => {
    if (!canRequestQuote) {
      setError('Cần có sản phẩm trong giỏ, số điện thoại và địa chỉ nhận hàng.');
      return;
    }
    const submittedRequest = request;
    const submittedRequestKey = currentRequestKey;
    setQuoteLoading(true);
    setError(null);
    try {
      const result = await checkoutService.quote(submittedRequest);
      setQuote(result);
      setQuotedRequestKey(submittedRequestKey);
    } catch (requestError: unknown) {
      setQuote(null);
      setQuotedRequestKey(null);
      setError(getApiErrorMessage(requestError, 'Không thể tạo báo giá. Kiểm tra thông tin nhận hàng, voucher và tồn kho.'));
    } finally {
      setQuoteLoading(false);
    }
  };

  const placeOrder = async () => {
    if (!quoteIsCurrent || orderSubmitting) return;
    setOrderSubmitting(true);
    setError(null);
    try {
      const result = await checkoutService.createOrder(request);
      navigate(`/checkout/success/${result.order_id}`);
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể tạo đơn hàng. Dữ liệu giỏ hàng có thể đã thay đổi; hãy cập nhật báo giá và thử lại.'));
      setQuote(null);
      setQuotedRequestKey(null);
    } finally {
      setOrderSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#0B2419]">
      <div className="border-b border-[#E2E5DE] bg-[#F5F6F2] px-4 py-3 sm:px-8">
        <nav className="mx-auto flex max-w-7xl items-center gap-2 text-[13px] text-[#606863]"><button type="button" onClick={() => navigate('/products')} className="hover:text-[#0B2419]">Sản phẩm</button><span>/</span><span className="font-semibold text-[#0B2419]">Checkout</span></nav>
      </div>

      <section className="border-b border-[#E8E9E3] bg-[#071A12] text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8 lg:px-14">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#E8C75B]">FIDO Checkout</p>
          <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><h1 className="font-serif text-3xl sm:text-4xl">Xác nhận thông tin nhận hàng</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">Giá, tồn kho, voucher và tổng tiền được xác nhận lại từ backend trước khi tạo đơn.</p></div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/60"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E8C75B] text-[#071A12]">1</span><span>Thông tin</span><span className="h-px w-6 bg-white/20"/><span className={`flex h-7 w-7 items-center justify-center rounded-full ${quoteIsCurrent ? 'bg-[#E8C75B] text-[#071A12]' : 'border border-white/30'}`}>2</span><span>Báo giá</span></div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:px-14">
        <div className="space-y-6">
          <section className="border border-[#E8E9E3] bg-white p-6 shadow-sm sm:p-7">
            <div className="mb-5 flex items-center gap-3 border-b border-[#E8E9E3] pb-4"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFFDF5] text-[#0B2419] ring-1 ring-[#E8E9E3]"><span className="material-symbols-outlined text-[20px]">local_shipping</span></span><div><p className="text-[10px] font-bold uppercase tracking-wider text-[#687069]">Recipient</p><h2 className="font-serif text-xl">Thông tin người nhận</h2></div></div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Số điện thoại người nhận *"><input type="tel" maxLength={20} disabled={profileLoading || orderSubmitting} value={phone} onChange={(event) => { setPhone(event.target.value); invalidateQuote(); }} className="field-input" /></Field>
              <Field label="Email người nhận"><input type="email" maxLength={254} disabled={profileLoading || orderSubmitting} value={email} onChange={(event) => { setEmail(event.target.value); invalidateQuote(); }} className="field-input" /></Field>
              <div className="sm:col-span-2"><Field label="Địa chỉ nhận hàng *"><textarea rows={4} maxLength={500} disabled={profileLoading || orderSubmitting} value={address} onChange={(event) => { setAddress(event.target.value); invalidateQuote(); }} className="field-input resize-y" placeholder="Nhập địa chỉ nhận hàng" /></Field></div>
            </div>
          </section>

          <section className="border border-[#E8E9E3] bg-white p-6 shadow-sm sm:p-7">
            <div className="mb-5 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFFDF5] text-[#0B2419] ring-1 ring-[#E8E9E3]"><span className="material-symbols-outlined text-[20px]">sell</span></span><div><p className="text-[10px] font-bold uppercase tracking-wider text-[#687069]">Optional</p><h2 className="font-serif text-xl">Voucher</h2></div></div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input type="text" maxLength={80} disabled={orderSubmitting} value={voucherCode} onChange={(event) => { setVoucherCode(event.target.value); invalidateQuote(); }} className="field-input min-w-0 flex-1 uppercase" placeholder="Nhập mã voucher nếu có" />
              <button type="button" disabled={!canRequestQuote || quoteLoading || profileLoading || orderSubmitting} onClick={() => void loadQuote()} className="bg-[#0B2419] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-40">{quoteLoading ? 'Đang kiểm tra...' : quoteIsCurrent ? 'Cập nhật báo giá' : 'Kiểm tra & báo giá'}</button>
            </div>
          </section>

          {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <section className="overflow-hidden border border-[#E8E9E3] bg-white shadow-sm">
            <div className="border-b border-[#E8E9E3] bg-[#FFFDF5] px-5 py-4"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#687069]">Cart</p><h2 className="font-serif text-xl">Giỏ hàng</h2></div><span className="rounded-full bg-[#0B2419] px-2.5 py-1 text-[10px] font-bold text-[#E8C75B]">{cartItems.length} dòng</span></div></div>
            {cartItems.length === 0 ? <div className="p-6 text-sm text-[#687069]">Giỏ hàng trống. Hãy quay lại catalog trước khi checkout.</div> : <div className="divide-y divide-[#E8E9E3] px-5">{cartItems.map((item) => <div key={item.id} className="flex gap-3 py-4"><div className="h-16 w-12 shrink-0 overflow-hidden bg-[#F3F4EF]">{item.imageUrl && <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.name}</p><p className="mt-1 text-[10px] uppercase tracking-wide text-[#687069]">{item.size} · {item.color} · x{item.quantity}</p></div><span className="shrink-0 text-xs font-bold">{money(item.price * item.quantity)}</span></div>)}</div>}
            <div className="flex justify-between border-t border-[#E8E9E3] px-5 py-4 text-sm"><span>Tạm tính giỏ hàng</span><span className="font-serif text-lg font-bold">{money(cartSubtotal)}</span></div>
          </section>

          <section className={`border p-5 shadow-sm ${quoteIsCurrent ? 'border-[#0B2419] bg-white' : 'border-[#E8E9E3] bg-[#FFFDF5]'}`}>
            <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#687069]">Server quote</p><h2 className="font-serif text-xl">Báo giá checkout</h2></div>{quoteIsCurrent && <span className="material-symbols-outlined text-[#1B5038]">verified</span>}</div>
            {!quoteIsCurrent ? (
              <p className="mt-3 text-sm leading-6 text-[#687069]">Hoàn tất thông tin nhận hàng và yêu cầu báo giá. Frontend không tự tính discount, phí giao hàng hoặc tổng thanh toán.</p>
            ) : (
              <>
                <dl className="mt-5 space-y-2.5 text-sm">
                  <div className="flex justify-between gap-4"><dt>Tạm tính</dt><dd>{money(quote.subtotal)}</dd></div>
                  <div className="flex justify-between gap-4"><dt>Giảm giá</dt><dd>-{money(quote.discount)}</dd></div>
                  <div className="flex justify-between gap-4"><dt>Phí giao hàng</dt><dd>{money(quote.shipping_fee)}</dd></div>
                  <div className="flex justify-between gap-4 border-t border-[#E8E9E3] pt-4"><dt className="font-bold">Tổng COD</dt><dd className="font-serif text-xl font-bold">{money(quote.total)}</dd></div>
                </dl>
                <p className="mt-3 text-[10px] leading-5 text-[#687069]">{quote.items.length} dòng hàng đã được backend kiểm tra.{voucherCode.trim() ? ` Voucher: ${voucherCode.trim()}.` : ''}</p>
                <button type="button" disabled={orderSubmitting} onClick={() => void placeOrder()} className="mt-5 flex w-full items-center justify-center gap-2 bg-[#0B2419] px-5 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#1B5038] disabled:opacity-40"><span>{orderSubmitting ? 'Đang tạo đơn...' : `Đặt hàng COD · ${money(quote.total)}`}</span><span className="material-symbols-outlined text-[18px]">arrow_forward</span></button>
              </>
            )}
          </section>
        </aside>
      </section>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block space-y-1.5"><span className="text-xs font-semibold text-[#0B2419]">{label}</span>{children}</label>
);
