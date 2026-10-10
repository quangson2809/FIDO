import { StorefrontIcon } from '../components/StorefrontIcon';
import { StorefrontImage } from '../shared/ui/storefront/StorefrontImage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../features/cart/hooks/useCart';
import { profileService } from '../features/auth/api/profileService';
import { checkoutService } from '../features/orders/api/checkoutService';
import type { CheckoutQuoteDto, CheckoutRequest } from '../features/orders/types';
import { normalizeApiError } from '../services/http/apiError';
import { getStorefrontErrorMessage } from '../services/http/storefrontError';
import { formatVietnamDateTime } from '../shared/time/formatVietnamDateTime';
import { recipientErrors, quoteHasExpired } from '../features/orders/model/recipientValidation';
import type { AddressDto } from '../features/auth/types';
import { buildCheckoutQuoteKey } from '../features/orders/model/checkoutQuoteKey';
import { CheckoutConfirmationDialog } from '../features/orders/components/CheckoutConfirmationDialog';

const money = (value: number): string => `${value.toLocaleString('vi-VN')}₫`;

export const CheckoutScreen: React.FC = () => {
  const { cartItems, cartSubtotal, cartRevision, isCartBusy, cartLoading, cartError, refreshCart, withCartLock, synchronizePurchasedCart } = useCart();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [addresses, setAddresses] = useState<AddressDto[]>([]);
  const [addressChoice, setAddressChoice] = useState('new');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileRetry, setProfileRetry] = useState(0);
  const [validationVisible, setValidationVisible] = useState(false);
  const [expiredQuoteId, setExpiredQuoteId] = useState<string | null>(null);
  const [voucherCode, setVoucherCode] = useState('');
  const [quote, setQuote] = useState<CheckoutQuoteDto | null>(null);
  const [quotedRequestKey, setQuotedRequestKey] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [orderUncertain, setOrderUncertain] = useState(false);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      try {
        const me = await profileService.getMe();
        if (!active) return;
        setPhone(current => current || me.account.phone);
        setEmail(current => current || me.account.email || '');
        setAddresses(me.addresses);
        setProfileError(null);
      } catch (requestError: unknown) {
        if (active) setProfileError(getStorefrontErrorMessage(requestError, 'Không thể tải địa chỉ đã lưu. Bạn có thể nhập thông tin nhận hàng hoặc thử lại.'));
      } finally {
        if (active) setProfileLoading(false);
      }
    };

    void loadProfile();
    return () => { active = false; };
  }, [profileRetry]);

  const invalidateQuote = () => {
    setQuote(null);
    setQuotedRequestKey(null);
    setError(null);
    setOrderUncertain(false);
  };

  const selectedAddress = addresses.find(item => String(item.address_id) === addressChoice);
  const recipientAddress = selectedAddress?.address_text ?? address;
  const request = useMemo<CheckoutRequest>(() => ({
    recipient_phone: phone.trim(),
    recipient_email: email.trim() || null,
    recipient_address: recipientAddress.trim(),
    voucher_code: voucherCode.trim() || null,
  }), [recipientAddress, email, phone, voucherCode]);

  const currentRequestKey = buildCheckoutQuoteKey(request, cartRevision);
  const quoteExpired = Boolean(quote && (expiredQuoteId === quote.quote_id || quoteHasExpired(quote.expires_at)));
  const quoteIsCurrent = quote !== null && quotedRequestKey === currentRequestKey && !quoteExpired;
  const fieldErrors = recipientErrors(request);
  const formIsValid = !Object.values(fieldErrors).some(Boolean);
  useEffect(() => {
    if (!quote?.expires_at || !quote.quote_id) return;
    const expiry = Date.parse(quote.expires_at);
    if (!Number.isFinite(expiry)) return;
    const timer = window.setTimeout(() => setExpiredQuoteId(quote.quote_id ?? null), Math.max(0, expiry - Date.now()));
    return () => window.clearTimeout(timer);
  }, [quote]);
  const canRequestQuote = request.recipient_phone.length > 0 && request.recipient_address.length > 0 && cartItems.length > 0;

  const loadQuote = async () => {
    if (isCartBusy || quoteLoading) return;
    setValidationVisible(true);
    if (!formIsValid) { document.getElementById(fieldErrors.phone ? 'checkout-phone' : fieldErrors.email ? 'checkout-email' : 'checkout-address')?.focus(); return; }
    if (!canRequestQuote) {
      setError('Cần có sản phẩm trong giỏ, số điện thoại và địa chỉ nhận hàng.');
      return;
    }
    const submittedRequest = request;
    const submittedRequestKey = currentRequestKey;
    setQuoteLoading(true);
    setError(null);
    setOrderUncertain(false);
    try {
      const result = await withCartLock(() => checkoutService.quote(submittedRequest));
      setExpiredQuoteId(null);
      setQuote(result);
      setQuotedRequestKey(submittedRequestKey);
    } catch (requestError: unknown) {
      setQuote(null);
      setQuotedRequestKey(null);
      setError(getStorefrontErrorMessage(requestError, 'Không thể tạo báo giá. Kiểm tra thông tin nhận hàng và tồn kho.'));
    } finally {
      setQuoteLoading(false);
    }
  };

  const placeOrder = async () => {
    if (!confirmationOpen || !quoteIsCurrent || isCartBusy || submittingRef.current || quoteHasExpired(quote?.expires_at)) return;
    submittingRef.current = true;
    setOrderSubmitting(true);
    setError(null);
    setOrderUncertain(false);
    try {
      await withCartLock(async () => {
        if (!quote.quote_id) throw new Error('Báo giá thiếu mã xác nhận. Vui lòng tính lại.');
        const result = await checkoutService.createOrder({ ...request, quote_id: quote.quote_id });
        synchronizePurchasedCart();
        navigate(`/checkout/success/${result.order_id}`);
      });
    } catch (requestError: unknown) {
      const { status } = normalizeApiError(requestError);
      setOrderUncertain(!status || status >= 500);
      setError(getStorefrontErrorMessage(requestError, 'Chưa nhận được xác nhận đặt hàng. Kiểm tra đơn hàng của tôi trước khi thử lại với báo giá này.'));
      setConfirmationOpen(false);
      if (status && status < 500) {
        setQuote(null);
        setQuotedRequestKey(null);
      }
    } finally {
      submittingRef.current = false;
      setOrderSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#0B2419]">
      <div className="border-b border-[#E2E5DE] bg-[#F5F6F2] px-4 py-3 sm:px-8">
        <nav className="mx-auto flex max-w-7xl items-center gap-2 text-[13px] text-[#606863]"><button type="button" onClick={() => navigate('/products')} className="hover:text-[#0B2419]">Sản phẩm</button><span>/</span><span className="font-semibold text-[#0B2419]">Đặt hàng</span></nav>
      </div>

      <section className="border-b border-[#E8E9E3] bg-[#071A12] text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8 lg:px-14">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#E8C75B]">Đặt hàng FIDO</p>
          <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><h1 className="font-serif text-3xl sm:text-4xl">Xác nhận thông tin nhận hàng</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">Kiểm tra thông tin, xem tổng tiền và xác nhận đơn trước khi đặt hàng.</p></div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/60"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E8C75B] text-[#071A12]">1</span><span>Thông tin</span><span className="h-px w-6 bg-white/20"/><span className={`flex h-7 w-7 items-center justify-center rounded-full ${quoteIsCurrent ? 'bg-[#E8C75B] text-[#071A12]' : 'border border-white/30'}`}>2</span><span>Báo giá</span></div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:px-14">
        <div className="space-y-6">
          <section className="border border-[#E8E9E3] bg-white p-6 shadow-sm sm:p-7">
            <div className="mb-5 flex items-center gap-3 border-b border-[#E8E9E3] pb-4"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFFDF5] text-[#0B2419] ring-1 ring-[#E8E9E3]"><StorefrontIcon name="local_shipping" className="h-5 w-5 text-[20px]" /></span><div><p className="text-[10px] font-bold uppercase tracking-wider text-[#687069]">Nhận hàng</p><h2 className="font-serif text-xl">Thông tin người nhận</h2></div></div>

            {profileLoading && <p role="status" className="mb-4 text-sm">Đang tải thông tin nhận hàng...</p>}
            {profileError && <p role="alert" className="mb-4 text-sm text-red-700">{profileError}<button type="button" onClick={() => setProfileRetry(value => value + 1)} className="ml-2 underline">Thử lại địa chỉ</button></p>}
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Số điện thoại người nhận *" error={validationVisible ? fieldErrors.phone : null} errorId="checkout-phone-error"><input id="checkout-phone" type="tel" autoComplete="tel" maxLength={20} disabled={profileLoading || orderSubmitting} value={phone} onBlur={() => setValidationVisible(true)} aria-invalid={validationVisible && Boolean(fieldErrors.phone)} aria-describedby="checkout-phone-error" onChange={(event) => { setPhone(event.target.value); invalidateQuote(); }} className="field-input" /></Field>
              <Field label="Email người nhận" error={validationVisible ? fieldErrors.email : null} errorId="checkout-email-error"><input id="checkout-email" type="email" autoComplete="email" maxLength={254} disabled={profileLoading || orderSubmitting} value={email} onBlur={() => setValidationVisible(true)} aria-invalid={validationVisible && Boolean(fieldErrors.email)} aria-describedby="checkout-email-error" onChange={(event) => { setEmail(event.target.value); invalidateQuote(); }} className="field-input" /></Field>
              {addresses.length > 0 && <label className="sm:col-span-2"><span className="mb-2 block text-sm font-semibold">Chọn địa chỉ nhận hàng</span><select className="field-input" aria-label="Chọn địa chỉ nhận hàng" value={addressChoice} disabled={orderSubmitting || profileLoading} onChange={event => { setAddressChoice(event.target.value); invalidateQuote(); }}><option value="new">Nhập địa chỉ nhận mới</option>{addresses.map(item => <option key={item.address_id} value={item.address_id}>{item.address_text}</option>)}</select></label>}
              <div className="sm:col-span-2">{selectedAddress ? <div className="rounded-md border border-[#D9DDD6] bg-[#FFFDF5] p-4 text-sm"><p className="font-semibold">Địa chỉ đã chọn</p><p className="mt-2">{selectedAddress.address_text}</p></div> : <Field label="Địa chỉ nhận hàng *" error={validationVisible ? fieldErrors.address : null} errorId="checkout-address-error"><textarea id="checkout-address" autoComplete="street-address" rows={4} maxLength={500} disabled={profileLoading || orderSubmitting} value={address} onBlur={() => setValidationVisible(true)} aria-invalid={validationVisible && Boolean(fieldErrors.address)} aria-describedby="checkout-address-error" onChange={(event) => { setAddress(event.target.value); invalidateQuote(); }} className="field-input resize-y" placeholder="Nhập địa chỉ nhận hàng" /></Field>}</div>
              <p className="text-sm text-muted-grey sm:col-span-2">Địa chỉ nhập tại đây chỉ dùng cho đơn này.</p>
            </div>
          </section>

          <section className="border border-[#E8E9E3] bg-white p-6 shadow-sm sm:p-7">
            <div className="mb-4 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFFDF5] text-[#0B2419] ring-1 ring-[#E8E9E3]"><StorefrontIcon name="price_check" className="h-5 w-5 text-[20px]" /></span><div><p className="text-[10px] font-bold uppercase tracking-wider text-[#687069]">Ưu đãi & tổng tiền</p><h2 className="font-serif text-xl">Xác nhận báo giá</h2></div></div>
            <div className="mb-5 space-y-3">
              <Field label="Mã voucher"><input maxLength={80} value={voucherCode} disabled={orderSubmitting || quoteLoading}
                onChange={(event) => { setVoucherCode(event.target.value); invalidateQuote(); }}
                placeholder="Nhập mã ưu đãi" className="field-input" /></Field>
              <p className="text-sm text-[#687069]">Áp dụng một mã cho tiền hàng đủ điều kiện. Bấm kiểm tra báo giá để xem mức giảm.</p>
              {voucherCode && <button type="button" disabled={orderSubmitting || quoteLoading} className="text-sm underline"
                onClick={() => { setVoucherCode(''); invalidateQuote(); }}>Xóa mã voucher</button>}
              {quoteIsCurrent && quote.voucher && <p role="status" className="text-sm text-green-800">Đã áp dụng {quote.voucher.code}: giảm {money(quote.discount)}</p>}
            </div>
            <button type="button" disabled={cartItems.length === 0 || quoteLoading || profileLoading || orderSubmitting || isCartBusy || Boolean(cartError)} onClick={() => void loadQuote()} className="w-full bg-[#0B2419] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-40">{quoteLoading ? 'Đang kiểm tra...' : quoteIsCurrent ? 'Cập nhật báo giá' : 'Kiểm tra & báo giá'}</button>
          </section>

          {error && <div role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><p>{error}</p>{orderUncertain && <button type="button" onClick={() => navigate('/orders')} className="mt-3 border border-red-700 px-4 underline">Kiểm tra đơn hàng của tôi</button>}</div>}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <section className="overflow-hidden border border-[#E8E9E3] bg-white shadow-sm">
            <div className="border-b border-[#E8E9E3] bg-[#FFFDF5] px-5 py-4"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#687069]">Sản phẩm đã chọn</p><h2 className="font-serif text-xl">Giỏ hàng</h2></div><span className="rounded-full bg-[#0B2419] px-2.5 py-1 text-[10px] font-bold text-[#E8C75B]">{cartItems.length} dòng</span></div></div>
            {cartLoading ? <p role="status" className="p-6 text-sm">Đang tải giỏ hàng...</p> : cartError ? <div role="alert" className="p-6 text-sm text-red-700">{cartError}<button type="button" disabled={isCartBusy} onClick={() => { void refreshCart().catch(() => undefined); }} className="ml-2 underline">Thử lại giỏ hàng</button></div> : cartItems.length === 0 ? <div className="p-6 text-sm text-[#687069]">Giỏ hàng trống. Hãy chọn sản phẩm trước khi đặt hàng.<button type="button" onClick={() => navigate('/products')} className="mt-3 block underline">Khám phá sản phẩm</button></div> : <div className="divide-y divide-[#E8E9E3] px-5">{cartItems.map((item) => <div key={item.id} className="flex gap-3 py-4"><div className="h-16 w-12 shrink-0 overflow-hidden bg-[#F3F4EF]">{item.imageUrl && <StorefrontImage src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.name}</p><p className="mt-1 text-[10px] uppercase tracking-wide text-[#687069]">{item.size} · {item.color} · x{item.quantity}</p></div><span className="shrink-0 text-xs font-bold">{money(item.price * item.quantity)}</span></div>)}</div>}
            <div className="flex justify-between border-t border-[#E8E9E3] px-5 py-4 text-sm"><span>Tạm tính giỏ hàng</span><span className="font-serif text-lg font-bold">{money(cartSubtotal)}</span></div>
          </section>

          <section className={`border p-5 shadow-sm ${quoteIsCurrent ? 'border-[#0B2419] bg-white' : 'border-[#E8E9E3] bg-[#FFFDF5]'}`}>
            <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#687069]">Tổng thanh toán</p><h2 className="font-serif text-xl">Báo giá đơn hàng</h2></div>{quoteIsCurrent && <StorefrontIcon name="verified" className="h-5 w-5 text-[#1B5038]" />}</div>
            {quoteExpired && <p role="status" className="mt-3 text-sm text-red-700">Báo giá đã hết hạn. Vui lòng kiểm tra lại trước khi đặt hàng.</p>}
            {!quoteIsCurrent ? (
              <p className="mt-3 text-sm leading-6 text-[#687069]">Hoàn tất thông tin nhận hàng và bấm kiểm tra báo giá để xem giảm giá, phí giao hàng và tổng COD.</p>
            ) : (
              <>
                {quote.expires_at && <p className="mt-3 text-sm text-muted-grey">Báo giá có hiệu lực đến {formatVietnamDateTime(quote.expires_at)}</p>}
                <dl className="mt-5 space-y-2.5 text-sm">
                  <div className="flex justify-between gap-4"><dt>Tạm tính</dt><dd>{money(quote.subtotal)}</dd></div>
                  <div className="flex justify-between gap-4"><dt>Giảm giá</dt><dd>-{money(quote.discount)}</dd></div>
                  <div className="flex justify-between gap-4"><dt>Phí giao hàng</dt><dd>{money(quote.shipping_fee)}</dd></div>
                  <div className="flex justify-between gap-4 border-t border-[#E8E9E3] pt-4"><dt className="font-bold">Tổng COD</dt><dd className="font-serif text-xl font-bold">{money(quote.total)}</dd></div>
                </dl>
                <p className="mt-3 text-[10px] leading-5 text-[#687069]">{quote.items.length} sản phẩm đã được kiểm tra.</p>
                <button type="button" disabled={orderSubmitting || quoteLoading || isCartBusy} onClick={() => setConfirmationOpen(true)} className="mt-5 flex w-full items-center justify-center gap-2 bg-[#0B2419] px-5 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#1B5038] disabled:opacity-40"><span>{orderSubmitting ? 'Đang tạo đơn...' : `Đặt hàng COD · ${money(quote.total)}`}</span><StorefrontIcon name="arrow_forward" className="h-5 w-5 text-[18px]" /></button>
              </>
            )}
          </section>
        </aside>
      </section>
      {confirmationOpen && quote && <CheckoutConfirmationDialog
        request={request} quote={quote} busy={orderSubmitting}
        current={quoteIsCurrent && (!isCartBusy || orderSubmitting)} error={error}
        expired={quoteExpired}
        onCancel={() => setConfirmationOpen(false)} onConfirm={() => void placeOrder()}
      />}
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode; error?: string | null; errorId?: string }> = ({ label, children, error, errorId }) => (
  <div><label className="block space-y-1.5"><span className="text-sm font-semibold text-[#0B2419]">{label}</span>{children}</label>{error && <p id={errorId} role="alert" className="mt-2 text-sm text-red-700">{error}</p>}</div>
);
