import type { CheckoutQuoteDto, CheckoutRequest } from '../types';
import { StorefrontDialog } from '../../../shared/ui/storefront/StorefrontDialog';

const money = (value: number): string => `${value.toLocaleString('vi-VN')}₫`;

interface Props {
  request: CheckoutRequest;
  quote: CheckoutQuoteDto;
  busy: boolean;
  current: boolean;
  replaying?: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function CheckoutConfirmationDialog({
  request,
  quote,
  busy,
  current,
  replaying,
  error,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <StorefrontDialog
      name="Xác nhận đặt hàng"
      busy={busy}
      onClose={onCancel}
      className="checkout-confirmation-dialog"
    >
      <div className="checkout-confirmation-body p-5 sm:p-7">
        <h2 className="font-serif text-2xl">Xác nhận đặt hàng</h2>
        <p className="mt-2 text-sm text-[#687069]">
          {replaying
            ? 'Gửi lại đúng thông tin và cùng mã chống trùng để xác minh kết quả lần gửi trước.'
            : 'Kiểm tra thông tin bên dưới trước khi gửi đơn hàng.'}
        </p>

        <section className="mt-5 border-y border-[#E8E9E3] py-4 text-sm">
          <h3 className="mb-2 font-semibold">Thông tin nhận hàng</h3>
          <p>{request.recipient_name}</p>
          <p>{request.recipient_phone}</p>
          <p className="mt-1">
            {request.address_line}, {request.ward}, {request.district}, {request.province}
          </p>
        </section>

        <ul className="divide-y divide-[#E8E9E3]">
          {quote.items.map((item) => (
            <li
              key={item.product_id}
              className="grid gap-2 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4"
            >
              <div className="min-w-0">
                <p className="break-words font-semibold">{item.product_name}</p>
                <p className="mt-1 text-[#687069]">
                  SKU {item.sku || '—'} · Số lượng: {item.quantity}
                </p>
              </div>
              <span className="shrink-0">{money(item.line_total)}</span>
            </li>
          ))}
        </ul>

        <dl className="space-y-2 border-t border-[#E8E9E3] pt-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt>Tạm tính</dt>
            <dd>{money(quote.subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Giảm giá voucher</dt>
            <dd>-{money(quote.discount_amount)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Phí giao hàng</dt>
            <dd>{money(quote.shipping_fee)}</dd>
          </div>
          <div className="flex justify-between gap-3 text-lg font-bold">
            <dt>Tổng COD theo báo giá</dt>
            <dd>{money(quote.total_amount)}</dd>
          </div>
        </dl>

        <p className="mt-3 text-sm">Thanh toán tiền mặt khi nhận hàng (COD).</p>
        <p className="mt-3 text-xs leading-5 text-[#687069]">
          Báo giá không phải mã xác nhận đơn. Backend sẽ kiểm tra lại giá, tồn kho và tính tổng
          tiền trong giao dịch tạo đơn; số tiền xác nhận cuối cùng của Backend là nguồn chuẩn.
        </p>
        {!current && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            Giỏ hàng hoặc thông tin nhận hàng đã thay đổi. Quay lại để cập nhật báo giá.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>

      <footer className="checkout-confirmation-actions">
        <p className="mb-3 text-sm font-semibold">
          Tổng COD theo báo giá: {money(quote.total_amount)}
        </p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="min-h-11 border border-[#0B2419] px-5 py-3 text-sm font-semibold disabled:opacity-40"
          >
            {replaying ? 'Đóng xác minh' : 'Quay lại chỉnh sửa'}
          </button>
          <button
            type="button"
            disabled={busy || !current}
            onClick={onConfirm}
            className="min-h-11 bg-[#0B2419] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {busy
              ? replaying
                ? 'Đang xác minh...'
                : 'Đang tạo đơn...'
              : replaying
                ? 'Xác minh đơn COD đã gửi'
                : 'Xác nhận đặt hàng COD'}
          </button>
        </div>
      </footer>
    </StorefrontDialog>
  );
}
