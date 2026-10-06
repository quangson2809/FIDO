import React, { useEffect, useState } from 'react';
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
  const [orderCode, setOrderCode] = useState('');
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | ''>('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Awaited<ReturnType<typeof adminOrderService.list>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const result = await adminOrderService.list({
          ...(orderCode.trim() ? { order_code: orderCode.trim() } : {}),
          ...(status ? { order_status: status } : {}),
          ...(paymentStatus ? { payment_status: paymentStatus } : {}),
          page,
          page_size: 20,
        });
        if (active) {
          setData(result);
          setError(null);
        }
      } catch {
        if (active) {
          setData(null);
          setError('Không thể tải đơn hàng quản trị hoặc tài khoản không có quyền ORDER_READ.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [orderCode, page, paymentStatus, status]);

  const resetPage = () => setPage(1);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B5038]">Order management</p>
        <h1 className="mt-1 font-serif text-2xl font-bold text-[#0B2419]">Đơn hàng</h1>
        <p className="mt-1 text-sm text-[#606863]">Lọc và thao tác trên contract `/api/v1/admin/orders`; không có batch action giả lập.</p>
      </div>

      <div className="grid gap-3 rounded-lg border border-[#E2E5DE] bg-white p-4 md:grid-cols-3">
        <label className="space-y-1">
          <span className="text-xs font-semibold">Mã đơn</span>
          <input value={orderCode} onChange={(event) => { setOrderCode(event.target.value); resetPage(); }} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" placeholder="ORD-..." />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold">Trạng thái đơn</span>
          <select value={status} onChange={(event) => { setStatus(event.target.value as OrderStatus | ''); resetPage(); }} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm">
            <option value="">Tất cả</option>
            {orderStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold">Thanh toán</span>
          <select value={paymentStatus} onChange={(event) => { setPaymentStatus(event.target.value as PaymentStatus | ''); resetPage(); }} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm">
            <option value="">Tất cả</option>
            {paymentStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>

      {loading ? (
        <div className="rounded-lg border border-[#E2E5DE] bg-white p-10 text-center text-sm text-[#606863]">Đang tải đơn hàng...</div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
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
                  <td className="px-4 py-3">{order.order_status}</td>
                  <td className="px-4 py-3">{order.payment_status}</td>
                  <td className="px-4 py-3 font-semibold">{order.total.toLocaleString('vi-VN')}₫</td>
                  <td className="px-4 py-3 text-xs text-[#606863]">{order.created_at}</td>
                  <td className="px-4 py-3 text-right"><button type="button" onClick={() => onSelectOrder(order.order_id)} className="border border-[#0B2419] px-3 py-2 text-xs font-bold uppercase tracking-wider">Chi tiết</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.meta.total_pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))} className="border border-[#D9DDD6] bg-white px-4 py-2 disabled:opacity-40">Trang trước</button>
          <span>Trang {data.meta.page} / {data.meta.total_pages}</span>
          <button type="button" disabled={page >= data.meta.total_pages || loading} onClick={() => setPage((value) => value + 1)} className="border border-[#D9DDD6] bg-white px-4 py-2 disabled:opacity-40">Trang sau</button>
        </div>
      )}
    </div>
  );
};
