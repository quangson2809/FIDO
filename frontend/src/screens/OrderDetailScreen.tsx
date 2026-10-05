import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { orderService } from '../features/orders/api/service';
import type { OrderCustomerDetailDto } from '../features/orders/types';
import { hasApiAccessToken } from '../services/http/apiClient';
import { resolveImageUrl } from '../services/media/imageUrl';

const recipientEditableStatuses = new Set(['PENDING', 'CONFIRMED', 'PREPARING']);

export const OrderDetailScreen: React.FC = () => {
  const { selectedOrderId, setCurrentScreen } = useApp();
  const [order, setOrder] = useState<OrderCustomerDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    if (!hasApiAccessToken()) {
      setCurrentScreen('auth');
      return () => {
        active = false;
      };
    }

    const loadOrder = async () => {
      setLoading(true);
      try {
        const detail = await orderService.getOrder(selectedOrderId);
        if (active) {
          setOrder(detail);
          setPhone(detail.recipient.phone);
          setAddress(detail.recipient.address);
          setError(null);
        }
      } catch {
        if (active) {
          setOrder(null);
          setError('Không thể tải chi tiết đơn hàng.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadOrder();
    return () => {
      active = false;
    };
  }, [selectedOrderId, setCurrentScreen]);

  const saveRecipient = async () => {
    if (!order || !phone.trim() || !address.trim() || saving) return;

    setSaving(true);
    setError(null);
    try {
      const updated = await orderService.updateRecipient(order.order_id, {
        recipient_phone: phone.trim(),
        recipient_address: address.trim(),
      });
      setOrder(updated);
      setPhone(updated.recipient.phone);
      setAddress(updated.recipient.address);
      setEditing(false);
    } catch {
      setError('Không thể cập nhật người nhận. Đơn hàng có thể đã chuyển sang trạng thái không cho phép chỉnh sửa.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-[50vh] p-12 text-center text-[#687069]">Đang tải đơn hàng...</div>;
  }

  if (!order) {
    return (
      <div className="min-h-[50vh] p-12 text-center">
        <p className="text-red-700">{error ?? 'Không tìm thấy đơn hàng.'}</p>
        <button type="button" onClick={() => setCurrentScreen('my-orders')} className="mt-4 border border-[#0B2419] px-4 py-2 text-sm font-semibold">Quay lại danh sách</button>
      </div>
    );
  }

  const canEditRecipient = recipientEditableStatuses.has(order.order_status);

  return (
    <div className="min-h-screen bg-[#FFFDF5] text-[#0B2419]">
      <div className="border-b border-[#E2E5DE] bg-[#F5F6F2] px-4 py-3 sm:px-8">
        <nav className="mx-auto flex max-w-6xl items-center gap-2 text-sm text-[#606863]">
          <button type="button" onClick={() => setCurrentScreen('my-orders')} className="hover:text-[#0B2419]">Đơn hàng của tôi</button>
          <span>/</span>
          <span className="font-semibold text-[#0B2419]">{order.order_code}</span>
        </nav>
      </div>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-8">
        <section className="border border-[#E8E9E3] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#687069]">Đơn hàng</p>
              <h1 className="mt-1 font-serif text-3xl font-bold">{order.order_code}</h1>
              <p className="mt-2 text-sm text-[#687069]">Tạo lúc {order.created_at}</p>
            </div>
            <span className="inline-flex w-fit bg-[#FAF4DF] px-3 py-2 text-xs font-bold uppercase tracking-wide">{order.order_status}</span>
          </div>
        </section>

        {error && <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        <section className="border border-[#E8E9E3] bg-white p-6 shadow-sm">
          <h2 className="font-serif text-2xl font-bold">Sản phẩm</h2>
          <div className="mt-5 divide-y divide-[#E8E9E3]">
            {order.items.map((item) => {
              const imageUrl = resolveImageUrl(item.image_url);
              return (
                <article key={item.order_item_id} className="flex gap-4 py-5 first:pt-0 last:pb-0">
                  <div className="h-28 w-20 shrink-0 overflow-hidden bg-[#F3F4EF]">
                    {imageUrl ? <img src={imageUrl} alt={item.product_name} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center px-2 text-center text-[10px] text-[#8A918B]">Không có ảnh hiện tại</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{item.product_name}</h3>
                    <p className="mt-1 text-xs text-[#687069]">SKU: {item.sku ?? '—'} · Size: {item.size} · Màu: {item.color}</p>
                    <p className="mt-2 text-sm">{item.quantity} × {item.unit_price.toLocaleString('vi-VN')}₫</p>
                  </div>
                  <strong className="whitespace-nowrap font-mono text-sm">{item.line_total.toLocaleString('vi-VN')}₫</strong>
                </article>
              );
            })}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="border border-[#E8E9E3] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-serif text-xl font-bold">Người nhận</h2>
              {canEditRecipient && !editing && (
                <button type="button" onClick={() => setEditing(true)} className="text-xs font-bold uppercase tracking-wider underline">Chỉnh sửa</button>
              )}
            </div>

            {editing ? (
              <div className="mt-4 space-y-4">
                <label className="block space-y-1"><span className="text-xs font-semibold">Điện thoại</span><input maxLength={20} value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" /></label>
                <label className="block space-y-1"><span className="text-xs font-semibold">Địa chỉ</span><textarea rows={3} maxLength={500} value={address} onChange={(event) => setAddress(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" /></label>
                <div className="flex gap-2">
                  <button type="button" disabled={saving || !phone.trim() || !address.trim()} onClick={() => void saveRecipient()} className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase text-white disabled:opacity-40">{saving ? 'Đang lưu...' : 'Lưu'}</button>
                  <button type="button" disabled={saving} onClick={() => { setPhone(order.recipient.phone); setAddress(order.recipient.address); setEditing(false); }} className="border border-[#0B2419] px-4 py-2 text-xs font-bold uppercase">Hủy</button>
                </div>
              </div>
            ) : (
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-[#687069]">Điện thoại</dt><dd className="text-right font-medium">{order.recipient.phone}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-[#687069]">Email</dt><dd className="text-right font-medium">{order.recipient.email ?? '—'}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-[#687069]">Địa chỉ</dt><dd className="max-w-sm text-right font-medium">{order.recipient.address}</dd></div>
              </dl>
            )}
            {!canEditRecipient && <p className="mt-4 text-xs text-[#687069]">Thông tin người nhận chỉ được sửa khi đơn ở PENDING, CONFIRMED hoặc PREPARING.</p>}
          </section>

          <section className="border border-[#E8E9E3] bg-white p-6 shadow-sm">
            <h2 className="font-serif text-xl font-bold">Thanh toán</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-[#687069]">Tạm tính</dt><dd>{order.subtotal.toLocaleString('vi-VN')}₫</dd></div>
              <div className="flex justify-between"><dt className="text-[#687069]">Giảm giá</dt><dd>-{order.discount.toLocaleString('vi-VN')}₫</dd></div>
              <div className="flex justify-between"><dt className="text-[#687069]">Vận chuyển</dt><dd>{order.shipping_fee.toLocaleString('vi-VN')}₫</dd></div>
              <div className="flex justify-between border-t border-[#E8E9E3] pt-3 text-base font-bold"><dt>Tổng cộng</dt><dd>{order.total.toLocaleString('vi-VN')}₫</dd></div>
              <div className="flex justify-between pt-2"><dt className="text-[#687069]">Thanh toán</dt><dd className="font-semibold">{order.payment.payment_status}</dd></div>
            </dl>
          </section>
        </div>
      </main>
    </div>
  );
};
