import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../../services/http/apiClient';
import type { ApiResponse, ApiListResponse } from '../../../types/api';
import { useRemoteQuery } from '../../../shared/hooks/useRemoteQuery';
import { QueryFeedback } from '../../../shared/admin/QueryFeedback';
import { Pagination } from '../../../shared/admin/Pagination';
import { statusLabel } from '../../../shared/admin/statusLabels';
import { formatVietnamDateTime } from '../../../shared/time/formatVietnamDateTime';
import { adminOrderDetailPath, adminProductDetailPath } from '../../../routes/paths';
interface Metrics { from: string; to: string; timezone: string; placed_orders: number; average_order_value: number; status_rates_bps: Record<string, number>; slow_moving_from: string; slow_moving_to: string; slow_moving_products: number }
interface OrderRow { order_id: number; order_code: string; status: string; total_amount: number; created_at: string }
interface SlowProduct { product_id: number; sku: string; name: string | null; quantity_on_hand: number; last_sale_at: string | null }
function requireList<T>(result: ApiListResponse<T>): ApiListResponse<T> {
  if (!Array.isArray(result.data) || !result.meta)
    throw new TypeError('Danh sách đối chiếu chưa hợp lệ. Vui lòng tải lại.');
  return result;
}
export function OperationalReportPanel({ from, to, canReadOrders, canReadCatalog }: { from: string; to: string; canReadOrders: boolean; canReadCatalog: boolean }) {
  const metrics = useRemoteQuery(useCallback(async () => {
    const result = (await apiClient.get<ApiResponse<Metrics>>('/admin/reports/operations', { params: { from, to } })).data;
    if (!result || !Number.isSafeInteger(result.average_order_value) || !Number.isSafeInteger(result.placed_orders) || !result.status_rates_bps)
      throw new TypeError('Dữ liệu chỉ tiêu vận hành chưa hợp lệ. Vui lòng tải lại.');
    return result;
  }, [from, to]));
  const [status, setStatus] = useState(''); const [page, setPage] = useState(1); const [slowPage, setSlowPage] = useState(1);
  const orders = useRemoteQuery(useCallback(async () => requireList(await apiClient.get<ApiListResponse<OrderRow>>('/admin/reports/operations/orders', { params: { from, to, status: status || undefined, page, page_size: 10 } })), [from, to, status, page]));
  const slow = useRemoteQuery(useCallback(async () => requireList(await apiClient.get<ApiListResponse<SlowProduct>>('/admin/reports/operations/slow-moving', { params: { page: slowPage, page_size: 10 } })), [slowPage]));
  const data = metrics.data;
  return <section className="min-w-0 space-y-5 border bg-white p-5" aria-label="Chỉ tiêu vận hành và dữ liệu đối chiếu">
    <h2 className="font-serif text-2xl">Hiệu quả vận hành</h2><p className="text-sm">Kỳ đặt đơn: {from} – {to}, Asia/Ho_Chi_Minh. Giá trị đơn trung bình gồm mọi đơn đặt trong kỳ, làm tròn VND. Tỷ lệ là trạng thái hiện tại của các đơn đó, không phải số lần chuyển trạng thái.</p>
    <QueryFeedback loading={metrics.loading} error={metrics.error} onRetry={metrics.reload} />
    {data && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="border p-3"><h3>Giá trị đơn trung bình</h3><p>{data.average_order_value.toLocaleString('vi-VN')}₫ / {data.placed_orders} đơn</p></div>{['CANCELLED', 'DELIVERY_FAILED', 'RETURNED'].map(value => <button type="button" key={value} className="border p-3 text-left underline" onClick={() => { setStatus(value); setPage(1); }}><h3>Tỷ lệ {statusLabel(value)}</h3><p>{((data.status_rates_bps[value] ?? 0) / 100).toLocaleString('vi-VN')}% · Xem đơn nguồn</p></button>)}</div>}
    <label>Đối chiếu đơn trong kỳ<select className="field-input" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">Tất cả đơn</option>{['CANCELLED', 'DELIVERY_FAILED', 'RETURNED'].map(value => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></label>
    <QueryFeedback loading={orders.loading} error={orders.error} onRetry={orders.reload} />
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Đơn</th><th>Đặt lúc</th><th>Trạng thái</th><th>Tổng VND</th></tr></thead><tbody>{(orders.data?.data ?? []).map(order => <tr key={order.order_id}><td>{canReadOrders ? <Link className="underline" to={adminOrderDetailPath(order.order_id)}>{order.order_code}</Link> : order.order_code}</td><td>{formatVietnamDateTime(order.created_at)}</td><td>{statusLabel(order.status)}</td><td>{order.total_amount.toLocaleString('vi-VN')}₫</td></tr>)}</tbody></table></div>
    {orders.data?.data.length === 0 && <p>Không có đơn phù hợp trong kỳ.</p>}<Pagination meta={orders.data?.meta} loading={orders.loading} onPage={setPage} />
    <h3 className="font-serif text-xl">Hàng còn tồn, không bán trong 10 ngày</h3>
    <p className="text-sm">Tồn kho hiện tại; chỉ tính bán thành công ở trạng thái hoàn tất, đã thu COD. Cửa sổ {data?.slow_moving_from ?? '…'} – {data?.slow_moving_to ?? '…'} (10 ngày lịch đến hôm nay), độc lập kỳ đặt đơn phía trên. Tổng {data?.slow_moving_products ?? '…'} sản phẩm.</p>
    <QueryFeedback loading={slow.loading} error={slow.error} onRetry={slow.reload} />
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Sản phẩm</th><th>Tồn</th><th>Lần bán thành công gần nhất</th></tr></thead><tbody>{(slow.data?.data ?? []).map(product => <tr key={product.product_id}><td>{canReadCatalog ? <Link className="underline" to={adminProductDetailPath(product.product_id)}>{product.sku} · {product.name}</Link> : `${product.sku} · ${product.name ?? ''}`}</td><td>{product.quantity_on_hand}</td><td>{product.last_sale_at ? formatVietnamDateTime(product.last_sale_at) : 'Chưa có lần bán thành công'}</td></tr>)}</tbody></table></div>
    {slow.data?.data.length === 0 && <p>Không có hàng bán chậm trong cửa sổ 10 ngày.</p>}<Pagination meta={slow.data?.meta} loading={slow.loading} onPage={setSlowPage} />
  </section>;
}
