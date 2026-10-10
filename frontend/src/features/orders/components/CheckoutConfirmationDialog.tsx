import type { CheckoutQuoteDto, CheckoutRequest } from '../types';
import { StorefrontDialog } from '../../../shared/ui/storefront/StorefrontDialog';

const money = (value: number): string => `${value.toLocaleString('vi-VN')}₫`;

interface Props {
  request: CheckoutRequest;
  quote: CheckoutQuoteDto;
  busy: boolean;
  current: boolean;
  expired?: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function CheckoutConfirmationDialog({ request, quote, busy, current, expired, error, onCancel, onConfirm }: Props) {
  return (
    <StorefrontDialog name="Xác nhận đặt hàng" busy={busy} onClose={onCancel}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto">
      <div className="p-5 sm:p-7">
      <h2 className="font-serif text-2xl">Xác nhận đặt hàng</h2>
      <p className="mt-2 text-sm text-[#687069]">Kiểm tra thông tin bên dưới trước khi gửi đơn hàng.</p>
      <section className="mt-5 border-y border-[#E8E9E3] py-4 text-sm">
        <h3 className="mb-2 font-semibold">Thông tin nhận hàng</h3>
        <p>{request.recipient_phone}</p>
        {request.recipient_email && <p className="break-words">{request.recipient_email}</p>}
        <p className="mt-1 whitespace-pre-wrap break-words">{request.recipient_address}</p>
      </section>
      <ul className="divide-y divide-[#E8E9E3]">
        {quote.items.map((item) => <li key={item.variant_id} className="flex justify-between gap-4 py-3 text-sm">
          <div className="min-w-0"><p className="break-words font-semibold">{item.product_name}</p><p className="mt-1 text-[#687069]">{item.size} · {item.color} · Số lượng: {item.quantity}</p></div>
          <span className="shrink-0">{money(item.line_total)}</span>
        </li>)}
      </ul>
      <dl className="space-y-2 border-t border-[#E8E9E3] pt-4 text-sm">
        <div className="flex justify-between gap-3"><dt>Tạm tính</dt><dd>{money(quote.subtotal)}</dd></div>
        <div className="flex justify-between gap-3"><dt>Giảm giá voucher</dt><dd>-{money(quote.discount)}</dd></div>
        <div className="flex justify-between gap-3"><dt>Phí giao hàng</dt><dd>{money(quote.shipping_fee)}</dd></div>
        <div className="flex justify-between gap-3 text-lg font-bold"><dt>Tổng COD</dt><dd>{money(quote.total)}</dd></div>
      </dl>
      <p className="mt-3 text-sm">Thanh toán tiền mặt khi nhận hàng (COD).</p>
      {!current && <p role="alert" className="mt-4 text-sm text-red-700">{expired ? 'Báo giá đã hết hạn. Quay lại để kiểm tra báo giá mới trước khi đặt hàng.' : 'Giỏ hàng hoặc thông tin nhận hàng đã thay đổi. Quay lại để cập nhật báo giá.'}</p>}
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" disabled={busy} onClick={onCancel} className="min-h-11 border border-[#0B2419] px-5 py-3 text-sm font-semibold disabled:opacity-40">Quay lại chỉnh sửa</button>
        <button type="button" disabled={busy || !current} onClick={onConfirm} className="min-h-11 bg-[#0B2419] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40">{busy ? 'Đang tạo đơn...' : 'Xác nhận đặt hàng COD'}</button>
      </div>
      </div>
    </StorefrontDialog>
  );
}
