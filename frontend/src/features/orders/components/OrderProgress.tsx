import type { OrderStatus } from '../types';
import { orderStatusLabels } from '../../../shared/admin/statusLabels';
const steps: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPING', 'COMPLETED'];
export function OrderProgress({ status }: { status: OrderStatus }) {
  return <section aria-label="Quy trình xử lý đơn" className="rounded-xl border border-[#E2E5DE] bg-white p-4"><ol className="admin-steps">{steps.map((step, index) => <li key={step} aria-current={step === status ? 'step' : undefined}><span>{index + 1}</span>{orderStatusLabels[step]}</li>)}</ol>{!steps.includes(status) && <p className="mt-3 text-sm">Trạng thái hiện tại: <strong>{orderStatusLabels[status]}</strong></p>}<p className="mt-3 text-xs text-[#606863]">Các bước xử lý · Trạng thái hiện tại được đánh dấu.</p></section>;
}
