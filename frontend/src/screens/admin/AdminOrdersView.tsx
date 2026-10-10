import { StatusBadge } from '../../shared/admin/StatusBadge';
import { useSearchParams } from 'react-router-dom';
import { formatVietnamDateTime } from '../../shared/time/formatVietnamDateTime';
import { statusLabel } from '../../shared/admin/statusLabels';
import { useCallback } from 'react';
import { useRemoteQuery } from '../../shared/hooks/useRemoteQuery';
import { QueryFeedback } from '../../shared/admin/QueryFeedback';
import React from 'react';
import { adminOrderService } from '../../features/orders/api/adminService';
import type { OrderStatus, PaymentStatus } from '../../features/orders/types';

interface Props {
  onSelectOrder: (orderId: number) => void;
}

const orderStatuses: OrderStatus[] = [
  'PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPING',
  'COMPLETED', 'DELIVERY_FAILED', 'CANCELLED', 'RETURNED',
];

const paymentStatuses: PaymentStatus[] = ['UNPAID', 'PAID', 'REFUNDED'];

export const AdminOrdersView: React.FC<Props> = ({ onSelectOrder }) => {
  const [params, setParams] = useSearchParams();
  const orderCode = params.get('q') ?? '';
  const status = orderStatuses.find((value) => value === params.get('status')) ?? '';
  const paymentStatus = paymentStatuses.find((value) => value === params.get('payment')) ?? '';
  const createdFrom = params.get('created_from') ?? '';
  const createdTo = params.get('created_to') ?? '';
  const validTime = (value: string) => !value || Number.isFinite(Date.parse(value));
  const dateFiltersValid = validTime(createdFrom) && validTime(createdTo) && (!createdFrom || !createdTo || Date.parse(createdFrom) <= Date.parse(createdTo));
  const rawPage = Number(params.get('page'));
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const filter = (key: string, value: string) => setParams((current) => { const next = new URLSearchParams(current); if (value) next.set(key, value); else next.delete(key); if (key !== 'page') next.delete('page'); return next; });
  const setOrderCode = (value: string) => filter('q', value);
  const setStatus = (value: string) => filter('status', value);
  const setPaymentStatus = (value: string) => filter('payment', value);
  const setPage = (value: number) => filter('page', String(value));
  const list = useRemoteQuery(useCallback(() => dateFiltersValid ? adminOrderService.list({ order_code: orderCode.trim() || undefined, order_status: status || undefined, payment_status: paymentStatus || undefined, created_from: createdFrom || undefined, created_to: createdTo || undefined, page, page_size: 20 }) : Promise.resolve(null), [orderCode, status, paymentStatus, page, createdFrom, createdTo, dateFiltersValid]));
  const { data, loading, error } = list;


  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B5038]">Order management</p>
        <h1 className="mt-1 font-serif text-2xl font-bold text-[#0B2419]">Đơn hàng</h1>
        <p className="mt-1 text-sm text-[#606863]">Theo dõi đơn hàng, kiểm tra thanh toán và xử lý từng bước giao hàng.</p>
      </div>

      <div className="grid gap-3 rounded-lg border border-[#E2E5DE] bg-white p-4 md:grid-cols-3">
        <label className="space-y-1">
          <span className="text-xs font-semibold">Mã đơn</span>
          <input value={orderCode} onChange={(event) => { setOrderCode(event.target.value); }} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" placeholder="ORD-..." />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold">Trạng thái đơn</span>
          <select value={status} onChange={(event) => { setStatus(event.target.value as OrderStatus | ''); }} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm">
            <option value="">Tất cả</option>
            {orderStatuses.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold">Thanh toán</span>
          <select value={paymentStatus} onChange={(event) => { setPaymentStatus(event.target.value as PaymentStatus | ''); }} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm">
            <option value="">Tất cả</option>
            {paymentStatuses.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
          </select>
        </label>
      </div>

      {(createdFrom || createdTo) && <p className="admin-state">Lọc theo ngày tạo (UTC): {createdFrom || 'Không giới hạn'} → {createdTo || 'Không giới hạn'}{!dateFiltersValid && <strong> · Khoảng thời gian không hợp lệ.</strong>} <button type="button" className="admin-secondary" onClick={() => setParams((current) => { const next = new URLSearchParams(current); next.delete('created_from'); next.delete('created_to'); next.delete('page'); return next; })}>Bỏ lọc thời gian</button></p>}
      {!dateFiltersValid ? <QueryFeedback error="Khoảng thời gian không hợp lệ. Bỏ lọc thời gian để tiếp tục." /> : loading ? (
        <div className="rounded-lg border border-[#E2E5DE] bg-white p-10 text-center text-sm text-[#606863]">Đang tải đơn hàng...</div>
      ) : error ? (
        <QueryFeedback error={error} onRetry={list.reload} />
      ) : !data || data.data.length === 0 ? (
        <div className="rounded-lg border border-[#E2E5DE] bg-white p-10 text-center text-sm">Không có đơn hàng phù hợp.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#E2E5DE] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#F5F6F2] text-xs uppercase tracking-wide text-[#606863]">
              <tr><th className="px-4 py-3">Mã đơn</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Thanh toán</th><th className="px-4 py-3">Tổng</th><th className="px-4 py-3">Ngày tạo</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-[#E2E5DE]">
              {data.data.map((order) => (
                <tr key={order.order_id}>
                  <td className="px-4 py-3 font-mono font-semibold">{order.order_code}</td>
                  <td className="px-4 py-3"><StatusBadge status={order.order_status} /></td>
                  <td className="px-4 py-3"><StatusBadge status={order.payment_status} /></td>
                  <td className="px-4 py-3 font-semibold">{order.total.toLocaleString('vi-VN')}₫</td>
                  <td className="px-4 py-3 text-xs text-[#606863]">{formatVietnamDateTime(order.created_at)}</td>
                  <td className="px-4 py-3 text-right"><button type="button" onClick={() => onSelectOrder(order.order_id)} className="border border-[#0B2419] px-3 py-2 text-xs font-bold uppercase tracking-wider">Chi tiết</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.meta.total_pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button type="button" disabled={page <= 1 || loading} onClick={() => setPage(Math.max(1, page - 1))} className="border border-[#D9DDD6] bg-white px-4 py-2 disabled:opacity-40">Trang trước</button>
          <span>Trang {data.meta.page} / {data.meta.total_pages}</span>
          <button type="button" disabled={page >= data.meta.total_pages || loading} onClick={() => setPage(page + 1)} className="border border-[#D9DDD6] bg-white px-4 py-2 disabled:opacity-40">Trang sau</button>
        </div>
      )}
    </div>
  );
};
