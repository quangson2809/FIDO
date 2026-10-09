import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminOrderService } from '../../orders/api/adminService';
import { inventoryAdminService } from '../../inventory/api/adminService';
import { useRemoteQuery } from '../../../shared/hooks/useRemoteQuery';
import { QueryFeedback } from '../../../shared/admin/QueryFeedback';

function PendingOrders() {
  const navigate = useNavigate();
  const query = useRemoteQuery(useCallback(() => adminOrderService.list({ order_status: 'PENDING', page: 1, page_size: 5 }), []));
  return <article className="admin-work-card"><h2>Đơn chờ xác nhận</h2><QueryFeedback loading={query.loading} error={query.error} empty={query.data?.data.length === 0} onRetry={query.reload} />{query.data && <><p className="admin-metric">{query.data.meta.total}</p><ul>{query.data.data.map((order) => <li key={order.order_id}><button type="button" onClick={() => navigate(`/admin/orders/${order.order_id}`)}>{order.order_code}<span>{order.total.toLocaleString('vi-VN')}₫</span></button></li>)}</ul><button type="button" className="admin-secondary" onClick={() => navigate('/admin/orders?status=PENDING')}>Xem tất cả đơn chờ</button></>}</article>;
}
function DraftReceipts() {
  const navigate = useNavigate();
  const query = useRemoteQuery(useCallback(() => inventoryAdminService.listReceipts({ receipt_status: 'DRAFT', page: 1, page_size: 5 }), []));
  return <article className="admin-work-card"><h2>Phiếu nhập nháp</h2><QueryFeedback loading={query.loading} error={query.error} empty={query.data?.data.length === 0} onRetry={query.reload} />{query.data && <><p className="admin-metric">{query.data.meta.total}</p><p>Các phiếu đang chờ kiểm tra và xác nhận nhập kho.</p><button type="button" className="admin-secondary" onClick={() => navigate('/admin/goods-receipts?status=DRAFT')}>Kiểm tra phiếu nháp</button></>}</article>;
}
export function AdminWorkQueue({ modules }: { modules: readonly string[] }) {
  return <section aria-label="Công việc cần xử lý" className="grid gap-4 md:grid-cols-2">{modules.includes('orders') && <PendingOrders />}{modules.includes('inward') && <DraftReceipts />}</section>;
}
