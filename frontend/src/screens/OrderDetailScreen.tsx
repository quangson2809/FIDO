import { StorefrontImage } from '../shared/ui/storefront/StorefrontImage';
import { formatVietnamDateTime } from '../shared/time/formatVietnamDateTime';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { orderService } from '../features/orders/api/service';
import type { OrderCustomerDetailDto } from '../features/orders/types';
import { getStorefrontErrorMessage } from '../services/http/storefrontError';
import { resolveImageUrl } from '../services/media/imageUrl';

export const OrderDetailScreen: React.FC = () => {
  const navigate = useNavigate();
  const { orderId = '' } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<OrderCustomerDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!orderId) return undefined;

    let active = true;
    const loadOrder = async () => {
      setLoading(true);
      try {
        const detail = await orderService.getOrder(orderId);
        if (active) {
          setOrder(detail);
          setError(null);
        }
      } catch (requestError: unknown) {
        if (active) {
          setOrder(null);
          setError(getStorefrontErrorMessage(requestError, 'Không thể tải chi tiết đơn hàng.'));
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadOrder();
    return () => {
      active = false;
    };
  }, [orderId, retry]);

  if (!orderId) {
    return (
      <div className="min-h-[60vh] bg-[#FFFDF5] p-14 text-center text-sm text-red-700">
        Thiếu mã đơn hàng.
      </div>
    );
  }
  if (loading)
    return (
      <div
        role="status"
        className="min-h-[60vh] bg-[#FFFDF5] p-14 text-center text-sm text-[#687069]"
      >
        Đang tải đơn hàng...
      </div>
    );
  if (!order) {
    return (
      <div className="min-h-[60vh] bg-[#FFFDF5] p-14 text-center">
        <p role="alert" className="text-sm text-red-700">
          {error ?? 'Không tìm thấy đơn hàng.'}
        </p>
        <button
          type="button"
          onClick={() => setRetry((value) => value + 1)}
          className="mt-5 mr-3 border px-4 py-3 text-sm"
        >
          Thử lại
        </button>
        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="mt-5 border border-[#0B2419] bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDF5] text-[#0B2419]">
      <div className="border-b border-[#E2E5DE] bg-[#F5F6F2] px-4 py-3 sm:px-8">
        <nav className="mx-auto flex max-w-6xl items-center gap-2 text-[13px] text-[#606863]">
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="hover:text-[#0B2419]"
          >
            Đơn hàng của tôi
          </button>
          <span>/</span>
          <span className="font-semibold text-[#0B2419]">{order.order_code}</span>
        </nav>
      </div>

      <section className="bg-[#071A12] text-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#E8C75B]">
                Chi tiết đơn
              </p>
              <h1 className="mt-1 font-serif text-3xl sm:text-4xl">{order.order_code}</h1>
              <p className="mt-2 text-sm text-white/55">
                Tạo lúc {formatVietnamDateTime(order.created_at)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-8">
        {error && (
          <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        <section className="overflow-hidden border border-[#E8E9E3] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E8E9E3] bg-[#FAF9F5] px-5 py-4 sm:px-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#687069]">
                Sản phẩm
              </p>
              <h2 className="font-serif text-xl">Sản phẩm trong đơn</h2>
            </div>
            <span className="text-xs font-semibold text-[#687069]">{order.items.length} dòng</span>
          </div>
          <div className="divide-y divide-[#E8E9E3] px-5 sm:px-6">
            {order.items.map((item) => {
              const imageUrl = resolveImageUrl(item.image_url);
              return (
                <article key={item.order_item_id} className="flex gap-4 py-5">
                  <div className="h-32 w-24 shrink-0 overflow-hidden bg-[#F3F4EF] ring-1 ring-[#E8E9E3]">
                    {imageUrl ? (
                      <StorefrontImage
                        src={imageUrl}
                        alt={item.product_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center px-2 text-center text-[10px] text-[#606863]">
                        Không có ảnh hiện tại
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <h3 className="font-serif text-lg">{item.product_name}</h3>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#687069]">
                          SKU {item.sku ?? '—'} · Số lượng {item.quantity}
                        </p>
                      </div>
                      <strong className="whitespace-nowrap font-serif text-lg">
                        {item.line_total.toLocaleString('vi-VN')}₫
                      </strong>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-[#E8E9E3]/70 pt-3 text-sm">
                      <span className="text-[#687069]">Số lượng {item.quantity}</span>
                      <span>{item.unit_price.toLocaleString('vi-VN')}₫ / sản phẩm</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="border border-[#E8E9E3] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-[#E8E9E3] pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#687069]">
                  Nhận hàng
                </p>
                <h2 className="font-serif text-xl">Thông tin người nhận</h2>
              </div>
            </div>

            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <div className="border border-[#E8E9E3] bg-[#FFFDF5] p-4">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-[#687069]">
                  Điện thoại
                </dt>
                <dd className="mt-1 font-semibold">{order.recipient.phone}</dd>
              </div>
              <div className="border border-[#E8E9E3] bg-[#FFFDF5] p-4">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-[#687069]">
                  Email
                </dt>
                <dd className="mt-1 break-all font-semibold">{order.recipient.email ?? '—'}</dd>
              </div>
              <div className="border border-[#E8E9E3] bg-[#FFFDF5] p-4 sm:col-span-2">
                <dt className="text-[10px] font-bold uppercase tracking-wider text-[#687069]">
                  Địa chỉ
                </dt>
                <dd className="mt-1 leading-6 font-semibold">{order.recipient.address}</dd>
              </div>
            </dl>
          </section>

          <aside className="border border-[#E8E9E3] bg-[#071A12] p-6 text-white shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#E8C75B]">
              Thanh toán COD
            </p>
            <h2 className="mt-1 font-serif text-xl">Thanh toán</h2>
            <dl className="mt-5 space-y-3 text-sm text-white/75">
              <div className="flex justify-between">
                <dt>Tạm tính</dt>
                <dd className="text-white">{order.subtotal.toLocaleString('vi-VN')}₫</dd>
              </div>
              <div className="flex justify-between">
                <dt>Giảm giá</dt>
                <dd className="text-white">-{order.discount.toLocaleString('vi-VN')}₫</dd>
              </div>
              <div className="flex justify-between">
                <dt>Vận chuyển</dt>
                <dd className="text-white">{order.shipping_fee.toLocaleString('vi-VN')}₫</dd>
              </div>
              <div className="flex justify-between border-t border-white/15 pt-4">
                <dt className="font-bold text-white">Tổng cộng</dt>
                <dd className="font-serif text-xl font-bold text-[#E8C75B]">
                  {order.total.toLocaleString('vi-VN')}₫
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>
    </div>
  );
};
