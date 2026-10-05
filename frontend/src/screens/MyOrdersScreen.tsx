import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { orderService } from '../features/orders/api/service';
import type { OrderPage, OrderStatus } from '../features/orders/types';
import { hasApiAccessToken } from '../services/http/apiClient';

const statuses: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'SHIPPING',
  'COMPLETED',
  'DELIVERY_FAILED',
  'CANCELLED',
  'RETURNED',
];

const statusLabel: Record<OrderStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PREPARING: 'Đang chuẩn bị',
  SHIPPING: 'Đang giao',
  COMPLETED: 'Hoàn tất',
  DELIVERY_FAILED: 'Giao thất bại',
  CANCELLED: 'Đã hủy',
  RETURNED: 'Đã trả hàng',
};

export const MyOrdersScreen: React.FC = () => {
  const { setCurrentScreen, setSelectedOrderId } = useApp();
  const [status, setStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<OrderPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!hasApiAccessToken()) {
      setCurrentScreen('auth');
      return () => {
        active = false;
      };
    }

    const load = async () => {
      setLoading(true);
      try {
        const result = await orderService.getOrders({
          ...(status === 'ALL' ? {} : { order_status: status }),
          page,
          page_size: 10,
        });
        if (active) {
          setOrders(result);
          setError(null);
        }
      } catch {
        if (active) {
          setOrders(null);
          setError('Không thể tải danh sách đơn hàng.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [page, setCurrentScreen, status]);

  const changeStatus = (value: OrderStatus | 'ALL') => {
    setStatus(value);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] py-8 text-[#0B2419] lg:py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-[#0B2419]/10 pb-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B5038]">Tài khoản</p>
            <h1 className="mt-1 font-serif text-3xl font-bold">Đơn hàng của tôi</h1>
            <p className="mt-1 text-sm text-[#0B2419]/65">Danh sách lấy trực tiếp từ tài khoản đang đăng nhập.</p>
          </div>
          <button
            type="button"
            onClick={() => setCurrentScreen('catalog')}
            className="bg-[#0B2419] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white"
          >
            Tiếp tục mua sắm
          </button>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => changeStatus('ALL')}
            className={`px-3 py-2 text-xs font-semibold ${status === 'ALL' ? 'bg-[#0B2419] text-white' : 'border border-[#D9DDD6] bg-white'}`}
          >
            Tất cả
          </button>
          {statuses.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => changeStatus(item)}
              className={`px-3 py-2 text-xs font-semibold ${status === item ? 'bg-[#0B2419] text-white' : 'border border-[#D9DDD6] bg-white'}`}
            >
              {statusLabel[item]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="border border-[#E8E9E3] bg-white p-10 text-center text-sm text-[#687069]">Đang tải đơn hàng...</div>
        ) : error ? (
          <div className="border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
        ) : !orders || orders.items.length === 0 ? (
          <div className="border border-[#E8E9E3] bg-white p-10 text-center">
            <p className="font-semibold">Không có đơn hàng trong bộ lọc này.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.items.map((order) => (
              <article key={order.order_id} className="border border-[#E8E9E3] bg-white p-5 shadow-sm">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="font-mono text-sm">{order.order_code}</strong>
                      <span className="bg-[#FAF4DF] px-2 py-1 text-[10px] font-bold uppercase tracking-wide">{statusLabel[order.order_status]}</span>
                    </div>
                    <p className="mt-2 text-xs text-[#687069]">Tạo lúc {order.created_at}</p>
                    <p className="mt-1 text-xs text-[#687069]">Thanh toán: {order.payment_status}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <strong className="text-lg">{order.total.toLocaleString('vi-VN')}₫</strong>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrderId(String(order.order_id));
                        setCurrentScreen('order-detail');
                      }}
                      className="border border-[#0B2419] px-3 py-2 text-xs font-bold uppercase tracking-wider"
                    >
                      Chi tiết
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {orders && orders.meta.total_pages > 1 && (
          <div className="mt-7 flex items-center justify-center gap-3 text-sm">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="border border-[#D9DDD6] bg-white px-4 py-2 disabled:opacity-40"
            >
              Trang trước
            </button>
            <span>Trang {orders.meta.page} / {orders.meta.total_pages}</span>
            <button
              type="button"
              disabled={page >= orders.meta.total_pages || loading}
              onClick={() => setPage((value) => value + 1)}
              className="border border-[#D9DDD6] bg-white px-4 py-2 disabled:opacity-40"
            >
              Trang sau
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
