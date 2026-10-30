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
import { recipientErrors } from '../features/orders/model/recipientValidation';
import type { AddressDto } from '../features/auth/types';
import { buildCheckoutQuoteKey } from '../features/orders/model/checkoutQuoteKey';
import { CheckoutConfirmationDialog } from '../features/orders/components/CheckoutConfirmationDialog';
import { useToast } from '../shared/ui/toast/useToast';

interface PendingCheckout {
  request: CheckoutRequest;
  quote: CheckoutQuoteDto;
  idempotencyKey: string;
}

const money = (value: number): string => `${value.toLocaleString('vi-VN')}₫`;

const createIdempotencyKey = (): string => {
  if (typeof window !== 'undefined' && typeof window.crypto?.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

export const CheckoutScreen: React.FC = () => {
  const {
    cartItems,
    cartSubtotal,
    cartRevision,
    isCartBusy,
    cartLoading,
    cartError,
    refreshCart,
    withCartLock,
    synchronizePurchasedCart,
  } = useCart();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [addresses, setAddresses] = useState<AddressDto[]>([]);
  const [addressChoice, setAddressChoice] = useState('new');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileRetry, setProfileRetry] = useState(0);
  const [validationVisible, setValidationVisible] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [quote, setQuote] = useState<CheckoutQuoteDto | null>(null);
  const [quotedRequestKey, setQuotedRequestKey] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [uncertainOrder, setUncertainOrder] = useState<PendingCheckout | null>(null);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      try {
        const me = await profileService.getMe();
        if (!active) return;
        setRecipientName((current) => current || me.account.full_name || '');
        setPhone((current) => current || me.account.phone);
        setAddresses(me.addresses);
        setProfileError(null);
      } catch (requestError: unknown) {
        if (active) {
          const status = normalizeApiError(requestError).status;
          if (status === 401) {
            navigate('/login', { state: { from: '/checkout' }, replace: true });
          } else {
            setProfileError(
              getStorefrontErrorMessage(
                requestError,
                'Không thể tải địa chỉ đã lưu. Bạn vẫn có thể nhập thông tin nhận hàng.',
              ),
            );
          }
        }
      } finally {
        if (active) setProfileLoading(false);
      }
    };

    void loadProfile();
    return () => {
      active = false;
    };
  }, [navigate, profileRetry]);

  const invalidateQuote = () => {
    if (uncertainOrder) return;
    setQuote(null);
    setQuotedRequestKey(null);
    setError(null);
  };

  const request = useMemo<CheckoutRequest>(
    () => ({
      recipient_name: recipientName.trim(),
      recipient_phone: phone.trim(),
      province: province.trim(),
      district: district.trim(),
      ward: ward.trim(),
      address_line: addressLine.trim(),
      voucher_code: voucherCode.trim() || null,
    }),
    [recipientName, phone, province, district, ward, addressLine, voucherCode],
  );

  const currentRequestKey = buildCheckoutQuoteKey(request, cartRevision);
  const quoteIsCurrent = quote !== null && quotedRequestKey === currentRequestKey;
  const fieldErrors = recipientErrors(request);
  const formIsValid = !Object.values(fieldErrors).some(Boolean);
  const canRequestQuote = request.recipient_phone.length > 0 && cartItems.length > 0;

  const focusFirstInvalidField = () => {
    const fieldOrder: Array<[keyof typeof fieldErrors, string]> = [
      ['name', 'checkout-name'],
      ['phone', 'checkout-phone'],
      ['province', 'checkout-province'],
      ['district', 'checkout-district'],
      ['ward', 'checkout-ward'],
      ['addressLine', 'checkout-address-line'],
    ];
    const firstInvalid = fieldOrder.find(([key]) => Boolean(fieldErrors[key]));
    if (firstInvalid) document.getElementById(firstInvalid[1])?.focus();
  };

  const handleUnauthorized = (requestError: unknown): boolean => {
    if (normalizeApiError(requestError).status !== 401) return false;
    navigate('/login', { state: { from: '/checkout' }, replace: true });
    return true;
  };

  const loadQuote = async () => {
    if (isCartBusy || quoteLoading || uncertainOrder) return;
    setValidationVisible(true);
    if (!formIsValid) {
      focusFirstInvalidField();
      return;
    }
    if (!canRequestQuote || cartError) {
      setError(
        cartError
          ? 'Cần tải lại giỏ hàng thành công trước khi kiểm tra báo giá.'
          : 'Cần có sản phẩm trong giỏ hàng và thông tin nhận hàng đầy đủ.',
      );
      return;
    }

    const submittedRequest = request;
    const submittedRequestKey = currentRequestKey;
    setQuoteLoading(true);
    setError(null);
    try {
      const result = await withCartLock(() => checkoutService.quote(submittedRequest));
      setQuote(result);
      setQuotedRequestKey(submittedRequestKey);
    } catch (requestError: unknown) {
      setQuote(null);
      setQuotedRequestKey(null);
      if (!handleUnauthorized(requestError)) {
        setError(
          getStorefrontErrorMessage(
            requestError,
            'Không thể tạo báo giá. Kiểm tra thông tin nhận hàng và số lượng tồn kho.',
          ),
        );
      }
    } finally {
      setQuoteLoading(false);
    }
  };

  const placeOrder = async () => {
    if (!confirmationOpen || isCartBusy || submittingRef.current) return;
    if (!uncertainOrder && !quoteIsCurrent) return;

    const submission: PendingCheckout | null =
      uncertainOrder ??
      (quote
        ? {
            request: { ...request },
            quote,
            idempotencyKey: createIdempotencyKey(),
          }
        : null);
    if (!submission) {
      setError('Chưa có báo giá hiện hành. Vui lòng kiểm tra lại trước khi đặt hàng.');
      setConfirmationOpen(false);
      return;
    }

    submittingRef.current = true;
    setOrderSubmitting(true);
    setError(null);
    try {
      await withCartLock(async () => {
        const result = await checkoutService.createOrder(
          submission.request,
          submission.idempotencyKey,
        );
        synchronizePurchasedCart();
        if (result.total !== submission.quote.total_amount) {
          showToast(
            `Đơn đã được tạo; tổng COD cuối cùng do Backend xác nhận là ${money(result.total)}.`,
          );
        }
        navigate(`/checkout/success/${result.order_id}`);
      });
    } catch (requestError: unknown) {
      const status = normalizeApiError(requestError).status;
      if (status === undefined || status >= 500) {
        // A retry must reuse the same key and exact request to avoid duplicate orders.
        setUncertainOrder(submission);
      } else {
        setUncertainOrder(null);
        setQuote(null);
        setQuotedRequestKey(null);
      }

      if (!handleUnauthorized(requestError)) {
        setError(
          getStorefrontErrorMessage(
            requestError,
            'Chưa nhận được xác nhận đặt hàng. Hãy xác minh lại yêu cầu đã gửi trước khi tạo đơn khác.',
          ),
        );
      }
      setConfirmationOpen(false);
    } finally {
      submittingRef.current = false;
      setOrderSubmitting(false);
    }
  };

  const handleAddressChoice = (value: string) => {
    setAddressChoice(value);
    if (value !== 'new') {
      const saved = addresses.find((item) => String(item.address_id) === value);
      if (saved) {
        setRecipientName(saved.recipient_name ?? '');
        setPhone(saved.recipient_phone ?? '');
        setProvince(saved.province ?? '');
        setDistrict(saved.district ?? '');
        setWard(saved.ward ?? '');
        setAddressLine(saved.address_line ?? '');
      }
    }
    invalidateQuote();
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#0B2419]">
      <div className="border-b border-[#E2E5DE] bg-[#F5F6F2] px-4 py-3 sm:px-8">
        <nav className="mx-auto flex max-w-7xl items-center gap-2 text-[13px] text-[#606863]">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="hover:text-[#0B2419]"
          >
            Sản phẩm
          </button>
          <span aria-hidden="true">/</span>
          <span className="font-semibold text-[#0B2419]">Đặt hàng</span>
        </nav>
      </div>

      <section className="border-b border-[#E8E9E3] bg-[#071A12] text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8 lg:px-14">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#E8C75B]">
            Đặt hàng FIDO
          </p>
          <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl">Xác nhận thông tin nhận hàng</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
                Backend sẽ kiểm tra lại sản phẩm, tồn kho và tổng COD khi tạo đơn.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/60">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E8C75B] text-[#071A12]">
                1
              </span>
              <span>Thông tin</span>
              <span className="h-px w-6 bg-white/20" />
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full ${quoteIsCurrent ? 'bg-[#E8C75B] text-[#071A12]' : 'border border-white/30'}`}
              >
                2
              </span>
              <span>Báo giá</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:px-14">
        <div className="space-y-6">
          <section className="border border-[#E8E9E3] bg-white p-4 shadow-sm sm:p-7">
            <div className="mb-5 flex items-center gap-3 border-b border-[#E8E9E3] pb-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFFDF5] text-[#0B2419] ring-1 ring-[#E8E9E3]">
                <StorefrontIcon name="local_shipping" className="h-5 w-5 text-[20px]" />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#687069]">
                  Nhận hàng
                </p>
                <h2 className="font-serif text-xl">Thông tin người nhận</h2>
              </div>
            </div>

            {profileLoading && (
              <p role="status" className="mb-4 text-sm">Đang tải thông tin nhận hàng...</p>
            )}
            {profileError && (
              <p role="alert" className="mb-4 text-sm text-red-700">
                {profileError}
                <button
                  type="button"
                  onClick={() => setProfileRetry((value) => value + 1)}
                  className="ml-2 underline"
                >
                  Thử tải thông tin lại
                </button>
              </p>
            )}

            {addresses.length > 0 && (
              <label className="mb-5 block">
                <span className="mb-2 block text-sm font-semibold">Địa chỉ đã lưu</span>
                <select
                  className="field-input"
                  aria-label="Địa chỉ đã lưu"
                  value={addressChoice}
                  disabled={orderSubmitting || profileLoading || Boolean(uncertainOrder)}
                  onChange={(event) => handleAddressChoice(event.target.value)}
                >
                  <option value="new">Nhập địa chỉ mới</option>
                  {addresses.map((item) => (
                    <option key={item.address_id} value={item.address_id}>
                      {item.address_text || `Địa chỉ #${item.address_id}`}
                      {item.is_default ? ' (mặc định)' : ''}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-[#687069]">
                  Chọn một địa chỉ để điền các trường có sẵn; kiểm tra lại trước khi báo giá.
                </span>
              </label>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Họ tên người nhận *"
                error={validationVisible ? fieldErrors.name : null}
                errorId="checkout-name-error"
              >
                <input
                  id="checkout-name"
                  type="text"
                  autoComplete="name"
                  maxLength={150}
                  disabled={profileLoading || orderSubmitting || Boolean(uncertainOrder)}
                  value={recipientName}
                  onBlur={() => setValidationVisible(true)}
                  aria-invalid={validationVisible && Boolean(fieldErrors.name)}
                  aria-describedby="checkout-name-error"
                  onChange={(event) => { setRecipientName(event.target.value); invalidateQuote(); }}
                  className="field-input"
                />
              </Field>
              <Field
                label="Số điện thoại người nhận *"
                error={validationVisible ? fieldErrors.phone : null}
                errorId="checkout-phone-error"
              >
                <input
                  id="checkout-phone"
                  type="tel"
                  autoComplete="tel"
                  maxLength={20}
                  disabled={profileLoading || orderSubmitting || Boolean(uncertainOrder)}
                  value={phone}
                  onBlur={() => setValidationVisible(true)}
                  aria-invalid={validationVisible && Boolean(fieldErrors.phone)}
                  aria-describedby="checkout-phone-error"
                  onChange={(event) => { setPhone(event.target.value); invalidateQuote(); }}
                  className="field-input"
                />
              </Field>
              <Field
                label="Tỉnh / thành phố *"
                error={validationVisible ? fieldErrors.province : null}
                errorId="checkout-province-error"
              >
                <input
                  id="checkout-province"
                  autoComplete="address-level1"
                  maxLength={120}
                  disabled={profileLoading || orderSubmitting || Boolean(uncertainOrder)}
                  value={province}
                  onBlur={() => setValidationVisible(true)}
                  aria-invalid={validationVisible && Boolean(fieldErrors.province)}
                  aria-describedby="checkout-province-error"
                  onChange={(event) => { setProvince(event.target.value); invalidateQuote(); }}
                  className="field-input"
                />
              </Field>
              <Field
                label="Quận / huyện *"
                error={validationVisible ? fieldErrors.district : null}
                errorId="checkout-district-error"
              >
                <input
                  id="checkout-district"
                  autoComplete="address-level2"
                  maxLength={120}
                  disabled={profileLoading || orderSubmitting || Boolean(uncertainOrder)}
                  value={district}
                  onBlur={() => setValidationVisible(true)}
                  aria-invalid={validationVisible && Boolean(fieldErrors.district)}
                  aria-describedby="checkout-district-error"
                  onChange={(event) => { setDistrict(event.target.value); invalidateQuote(); }}
                  className="field-input"
                />
              </Field>
              <Field
                label="Phường / xã *"
                error={validationVisible ? fieldErrors.ward : null}
                errorId="checkout-ward-error"
              >
                <input
                  id="checkout-ward"
                  autoComplete="address-level3"
                  maxLength={120}
                  disabled={profileLoading || orderSubmitting || Boolean(uncertainOrder)}
                  value={ward}
                  onBlur={() => setValidationVisible(true)}
                  aria-invalid={validationVisible && Boolean(fieldErrors.ward)}
                  aria-describedby="checkout-ward-error"
                  onChange={(event) => { setWard(event.target.value); invalidateQuote(); }}
                  className="field-input"
                />
              </Field>
              <div className="sm:col-span-2">
                <Field
                  label="Địa chỉ cụ thể *"
                  error={validationVisible ? fieldErrors.addressLine : null}
                  errorId="checkout-address-line-error"
                >
                  <textarea
                    id="checkout-address-line"
                    autoComplete="street-address"
                    rows={3}
                    maxLength={500}
                    disabled={profileLoading || orderSubmitting || Boolean(uncertainOrder)}
                    value={addressLine}
                    onBlur={() => setValidationVisible(true)}
                    aria-invalid={validationVisible && Boolean(fieldErrors.addressLine)}
                    aria-describedby="checkout-address-line-error"
                    onChange={(event) => { setAddressLine(event.target.value); invalidateQuote(); }}
                    className="field-input resize-y"
                    placeholder="Số nhà, tên đường, tòa nhà..."
                  />
                </Field>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-grey">
              Thông tin nhận hàng được lưu vào đơn đặt hàng; checkout không tự tạo địa chỉ trong hồ sơ.
            </p>
          </section>

          <section className="border border-[#E8E9E3] bg-white p-4 shadow-sm sm:p-7">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFFDF5] text-[#0B2419] ring-1 ring-[#E8E9E3]">
                <StorefrontIcon name="price_check" className="h-5 w-5 text-[20px]" />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#687069]">
                  Ưu đãi & tổng tiền
                </p>
                <h2 className="font-serif text-xl">Báo giá từ Backend</h2>
              </div>
            </div>
            <div className="mb-5 space-y-3">
              <Field label="Mã voucher">
                <input
                  maxLength={80}
                  value={voucherCode}
                  disabled={orderSubmitting || quoteLoading || Boolean(uncertainOrder)}
                  onChange={(event) => { setVoucherCode(event.target.value); invalidateQuote(); }}
                  placeholder="Nhập mã ưu đãi"
                  className="field-input"
                />
              </Field>
              <p className="text-sm text-[#687069]">
                Báo giá là bản tính tham khảo. Backend tính lại giá, tồn kho và tổng COD lúc tạo đơn.
              </p>
              {voucherCode && (
                <button
                  type="button"
                  disabled={orderSubmitting || quoteLoading || Boolean(uncertainOrder)}
                  className="text-sm underline"
                  onClick={() => { setVoucherCode(''); invalidateQuote(); }}
                >
                  Xóa mã voucher
                </button>
              )}
              {quoteIsCurrent && quote?.voucher && (
                <p role="status" className="text-sm text-green-800">
                  Đã áp dụng {quote.voucher.code}: giảm {money(quote.discount_amount)}
                </p>
              )}
            </div>
            <button
              type="button"
              disabled={
                cartItems.length === 0 ||
                cartLoading ||
                quoteLoading ||
                profileLoading ||
                orderSubmitting ||
                isCartBusy ||
                Boolean(cartError) ||
                Boolean(uncertainOrder)
              }
              onClick={() => void loadQuote()}
              className="w-full bg-[#0B2419] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {quoteLoading
                ? 'Đang kiểm tra...'
                : quoteIsCurrent
                  ? 'Cập nhật báo giá'
                  : 'Kiểm tra & báo giá'}
            </button>
          </section>

          {error && (
            <div role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p>{error}</p>
              {uncertainOrder && (
                <>
                  <p className="mt-3">
                    Kết quả lần gửi trước chưa rõ. Khi xác minh lại, hệ thống sẽ gửi đúng nội dung
                    và cùng mã chống trùng để tránh tạo đơn lặp.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/orders')}
                    className="mt-3 border border-red-700 px-4 underline"
                  >
                    Kiểm tra đơn hàng của tôi
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-36 lg:self-start">
          <section className="overflow-hidden border border-[#E8E9E3] bg-white shadow-sm">
            <div className="border-b border-[#E8E9E3] bg-[#FFFDF5] px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#687069]">
                    Sản phẩm đã chọn
                  </p>
                  <h2 className="font-serif text-xl">Giỏ hàng</h2>
                </div>
                <span className="rounded-full bg-[#0B2419] px-2.5 py-1 text-[10px] font-bold text-[#E8C75B]">
                  {cartItems.length} dòng
                </span>
              </div>
            </div>
            {cartLoading ? (
              <p role="status" className="p-6 text-sm">Đang tải giỏ hàng...</p>
            ) : cartError ? (
              <div role="alert" className="p-6 text-sm text-red-700">
                {cartError}
                <button
                  type="button"
                  disabled={isCartBusy}
                  onClick={() => { void refreshCart().catch(() => undefined); }}
                  className="ml-2 underline"
                >
                  Thử lại giỏ hàng
                </button>
              </div>
            ) : cartItems.length === 0 ? (
              <div className="p-6 text-sm text-[#687069]">
                Giỏ hàng trống. Hãy chọn sản phẩm trước khi đặt hàng.
                <button
                  type="button"
                  onClick={() => navigate('/products')}
                  className="mt-3 block underline"
                >
                  Khám phá sản phẩm
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#E8E9E3] px-5">
                {cartItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-[48px_minmax(0,1fr)] gap-3 py-4">
                    <div className="h-16 w-12 shrink-0 overflow-hidden bg-[#F3F4EF]">
                      {item.imageUrl ? (
                        <StorefrontImage src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full items-center justify-center text-center text-[9px] text-[#687069]">
                          Chưa có ảnh
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-semibold">{item.name}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-[#687069]">
                        SKU {item.sku || '—'} · x{item.quantity}
                      </p>
                      <p className="mt-1 text-xs text-[#687069]">
                        {money(item.price)} / sản phẩm
                      </p>
                      <p className="mt-1 text-sm font-semibold">{money(item.lineTotal)}</p>
                      <p className="mt-1 text-[10px] text-[#687069]">
                        Tồn khả dụng: {item.availableQuantity}
                      </p>
                      {item.quantity > item.availableQuantity && (
                        <p className="mt-1 text-xs text-amber-800">
                          Số lượng vượt tồn khả dụng; hãy điều chỉnh trong giỏ hàng.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between border-t border-[#E8E9E3] px-5 py-4 text-sm">
              <span>Tạm tính giỏ hàng</span>
              <span className="font-serif text-lg font-bold">{money(cartSubtotal)}</span>
            </div>
          </section>

          <section className={`border p-5 shadow-sm ${quoteIsCurrent ? 'border-[#0B2419] bg-white' : 'border-[#E8E9E3] bg-[#FFFDF5]'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#687069]">
                  Tổng thanh toán
                </p>
                <h2 className="font-serif text-xl">Báo giá đơn hàng</h2>
              </div>
              {quoteIsCurrent && (
                <StorefrontIcon name="verified" className="h-5 w-5 text-[#1B5038]" />
              )}
            </div>
            {!quote || !quoteIsCurrent ? (
              <p className="mt-3 text-sm leading-6 text-[#687069]">
                Hoàn tất thông tin nhận hàng, rồi kiểm tra báo giá để xem giảm giá, phí giao hàng
                và tổng COD.
              </p>
            ) : (
              <>
                <dl className="mt-5 space-y-2.5 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt>Tạm tính</dt><dd>{money(quote.subtotal)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Giảm giá</dt><dd>-{money(quote.discount_amount)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Phí giao hàng</dt><dd>{money(quote.shipping_fee)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-[#E8E9E3] pt-4">
                    <dt className="font-bold">Tổng COD</dt>
                    <dd className="font-serif text-xl font-bold">{money(quote.total_amount)}</dd>
                  </div>
                </dl>
                <div className="mt-4 divide-y divide-[#E8E9E3] border-y border-[#E8E9E3]">
                  {quote.items.map((item) => (
                    <div key={item.product_id} className="py-3 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="font-semibold">{item.product_name}</span>
                        <span className="shrink-0">{money(item.line_total)}</span>
                      </div>
                      <p className="mt-1 text-[10px] text-[#687069]">
                        SKU {item.sku || '—'} · x{item.quantity} · tồn {item.available_quantity}
                      </p>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={
                    orderSubmitting ||
                    quoteLoading ||
                    isCartBusy ||
                    Boolean(uncertainOrder)
                  }
                  onClick={() => setConfirmationOpen(true)}
                  className="mt-5 flex w-full items-center justify-center gap-2 bg-[#0B2419] px-5 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#1B5038] disabled:opacity-40"
                >
                  <span>
                    {orderSubmitting
                      ? 'Đang tạo đơn...'
                      : `Đặt hàng COD · ${money(quote.total_amount)}`}
                  </span>
                  <StorefrontIcon name="arrow_forward" className="h-5 w-5 text-[18px]" />
                </button>
              </>
            )}
            {uncertainOrder && (
              <button
                type="button"
                disabled={orderSubmitting || isCartBusy}
                onClick={() => setConfirmationOpen(true)}
                className="mt-3 min-h-11 w-full border border-[#0B2419] px-4 text-sm font-semibold"
              >
                Xác minh lại đơn đã gửi
              </button>
            )}
          </section>
        </aside>
      </section>

      {confirmationOpen && quote && (
        <CheckoutConfirmationDialog
          request={uncertainOrder?.request ?? request}
          quote={uncertainOrder?.quote ?? quote}
          busy={orderSubmitting}
          current={(Boolean(uncertainOrder) || quoteIsCurrent) && (!isCartBusy || orderSubmitting)}
          error={error}
          replaying={Boolean(uncertainOrder)}
          onCancel={() => setConfirmationOpen(false)}
          onConfirm={() => void placeOrder()}
        />
      )}
    </div>
  );
};

const Field: React.FC<{
  label: string;
  children: React.ReactNode;
  error?: string | null;
  errorId?: string;
}> = ({ label, children, error, errorId }) => (
  <div>
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-[#0B2419]">{label}</span>
      {children}
    </label>
    {error && (
      <p id={errorId} role="alert" className="mt-2 text-sm text-red-700">
        {error}
      </p>
    )}
  </div>
);
