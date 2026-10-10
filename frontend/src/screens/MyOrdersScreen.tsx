import { StorefrontIcon } from '../components/StorefrontIcon';
import { QueryFeedback } from '../shared/ui/storefront/QueryFeedback';
import { customerOrderLabels, customerPaymentLabels } from '../features/orders/model/orderLabels';
import { formatVietnamDateTime } from '../shared/time/formatVietnamDateTime';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderService } from '../features/orders/api/service';
import type { OrderPage, OrderStatus } from '../features/orders/types';
import { getStorefrontErrorMessage } from '../services/http/storefrontError';

const statuses: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPING', 'COMPLETED', 'DELIVERY_FAILED', 'CANCELLED', 'RETURNED'];
const statusClass: Record<OrderStatus, string> = {
  PENDING: 'bg-[#FAF4DF] text-[#725C00]',
  CONFIRMED: 'bg-[#E8F1EC] text-[#1B5038]',
  PREPARING: 'bg-[#EEF0E9] text-[#424844]',
  SHIPPING: 'bg-[#E6EEF5] text-[#284E68]',
  COMPLETED: 'bg-[#DDEFE5] text-[#1B5038]',
  DELIVERY_FAILED: 'bg-[#FBE6E2] text-[#8C2F27]',
  CANCELLED: 'bg-[#F3E7E5] text-[#8C2F27]',
  RETURNED: 'bg-[#EEE8F4] text-[#5C456B]',
};

export const MyOrdersScreen: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<OrderPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const result = await orderService.getOrders({ ...(status === 'ALL' ? {} : { order_status: status }), page, page_size: 10 });
        if (active) { setOrders(result); setError(null); }
      } catch (requestError: unknown) {
        if (active) { setOrders(null); setError(getStorefrontErrorMessage(requestError, 'Không thể tải danh sách đơn hàng.')); }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [page, status, retry]);

  const changeStatus = (value: OrderStatus | 'ALL') => { setStatus(value); setPage(1); };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#0B2419]">
      <section className="border-b border-[#E8E9E3] bg-[#071A12] text-white">
        <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#E8C75B]">My FIDO</p><h1 className="mt-1 font-serif text-3xl sm:text-4xl">Đơn hàng của tôi</h1><p className="mt-2 text-sm text-white/60">Theo dõi các đơn hàng thuộc tài khoản đang đăng nhập.</p></div>
            <button type="button" onClick={() => navigate('/products')} className="border border-white/25 bg-white/5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white backdrop-blur transition hover:bg-white/10">Tiếp tục mua sắm</button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 overflow-x-auto border-b border-[#D9DDD6]">
          <div className="flex min-w-max gap-1 pb-3">
            <button type="button" aria-pressed={status === 'ALL'} onClick={() => changeStatus('ALL')} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${status === 'ALL' ? 'bg-[#0B2419] text-white' : 'bg-white text-[#606863] hover:text-[#0B2419]'}`}>Tất cả</button>
            {statuses.map((item) => <button key={item} type="button" aria-pressed={status === item} onClick={() => changeStatus(item)} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${status === item ? 'bg-[#0B2419] text-white' : 'bg-white text-[#606863] hover:text-[#0B2419]'}`}>{customerOrderLabels[item]}</button>)}
          </div>
        </div>

        {loading ? (
          <div role="status" className="border border-[#E8E9E3] bg-white p-12 text-center text-sm text-[#687069]">Đang tải đơn hàng...</div>
        ) : error ? (
          <QueryFeedback error={error} onRetry={() => setRetry(value => value + 1)} />
        ) : !orders || orders.items.length === 0 ? (
          <div className="border border-[#E8E9E3] bg-white px-6 py-16 text-center"><StorefrontIcon name="receipt_long" className="h-8 w-8 text-4xl text-[#687069]" /><p className="mt-3 font-serif text-xl">Không có đơn hàng</p><p className="mt-1 text-sm text-[#687069]">Bộ lọc hiện tại chưa có dữ liệu.</p><button type="button" onClick={() => status === 'ALL' ? navigate('/products') : changeStatus('ALL')} className="mt-4 border px-5 py-3 text-sm">{status === 'ALL' ? 'Khám phá sản phẩm' : 'Xem tất cả đơn'}</button></div>
        ) : (
          <div className="grid gap-4">
            {orders.items.map((order) => (
              <article key={order.order_id} className="group overflow-hidden border border-[#E8E9E3] bg-white shadow-sm transition hover:border-[#BFC5BC] hover:shadow-md">
                <div className="flex flex-col gap-4 border-b border-[#E8E9E3] bg-[#FFFDF5] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-3"><span className="font-mono text-sm font-bold">{order.order_code}</span><span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusClass[order.order_status]}`}>{customerOrderLabels[order.order_status]}</span></div>
                  <p className="text-xs text-[#687069]">{formatVietnamDateTime(order.created_at)}</p>
                </div>
                <div className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="grid gap-3 text-sm sm:grid-cols-2 sm:gap-x-10">
                    <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#687069]">Thanh toán</p><p className="mt-1 font-semibold">{customerPaymentLabels[order.payment_status]}</p></div>
                    <div><p className="text-[10px] font-bold uppercase tracking-wider text-[#687069]">Giá trị đơn</p><p className="mt-1 font-serif text-xl font-bold">{order.total.toLocaleString('vi-VN')}₫</p></div>
                  </div>
                  <button type="button" onClick={() => navigate(`/orders/${order.order_id}`)} className="flex items-center justify-center gap-2 border border-[#0B2419] px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition hover:bg-[#0B2419] hover:text-white"><span>Chi tiết</span><StorefrontIcon name="arrow_forward" className="h-5 w-5 text-[18px] transition group-hover:translate-x-0.5" /></button>
                </div>
              </article>
            ))}
          </div>
        )}

        {orders && orders.meta.total_pages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3 border-t border-[#D9DDD6] pt-7 text-sm">
            <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))} className="border border-[#D9DDD6] bg-white px-4 py-2 disabled:opacity-40">Trang trước</button>
            <span className="font-semibold">Trang {orders.meta.page} / {orders.meta.total_pages}</span>
            <button type="button" disabled={page >= orders.meta.total_pages || loading} onClick={() => setPage((value) => value + 1)} className="border border-[#D9DDD6] bg-white px-4 py-2 disabled:opacity-40">Trang sau</button>
          </div>
        )}
      </section>
    </div>
  );
};
