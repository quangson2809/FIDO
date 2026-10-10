import type { OrderCustomerDetailDto, OrderStatus } from '../types';
import { customerOrderLabels, customerOrderNotes } from '../model/orderLabels';
import { formatVietnamDateTime } from '../../../shared/time/formatVietnamDateTime';
const steps: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPING', 'COMPLETED'];
export function CustomerOrderProgress({ order }: { order: OrderCustomerDetailDto }) {
  return <section aria-label="Tiến trình đơn hàng" className="border border-border-subtle bg-white p-5">
    <h2 className="font-serif text-xl">Tiến trình đơn hàng</h2>
    <p className="mt-2 text-sm text-muted-grey">{customerOrderNotes[order.order_status]}</p>
    <ol className="order-steps mt-4">{steps.map((step, index) => <li key={step} aria-current={step === order.order_status ? 'step' : undefined}>{index + 1}. {customerOrderLabels[step]}</li>)}</ol>
    {!steps.includes(order.order_status) && <p className="mt-3 text-sm">Trạng thái hiện tại: <strong>{customerOrderLabels[order.order_status]}</strong></p>}
    <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-grey"><div><dt>Ngày tạo đơn</dt><dd>{formatVietnamDateTime(order.created_at)}</dd></div>{order.completed_at && <div><dt>Ngày hoàn tất</dt><dd>{formatVietnamDateTime(order.completed_at)}</dd></div>}{order.returned_at && <div><dt>Ngày trả hàng</dt><dd>{formatVietnamDateTime(order.returned_at)}</dd></div>}</dl>
  </section>;
}
