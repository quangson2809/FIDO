import { useDirtyForm } from '../../shared/admin/dirtyFormContext';
import React, { useEffect, useState } from 'react';
import { profileService } from '../../features/auth/api/profileService';
import { adminOrderService } from '../../features/orders/api/adminService';
import { getApiErrorMessage } from '../../services/http/apiError';
import type { AdminOrderAction, AdminOrderDetailDto } from '../../features/orders/types';
import { resolveImageUrl } from '../../services/media/imageUrl';

interface Props {
  orderId: number;
  onBack: () => void;
}

const actionLabel: Record<AdminOrderAction, string> = {
  CONFIRM: 'Xác nhận',
  PREPARE: 'Bắt đầu chuẩn bị',
  SHIP: 'Bắt đầu giao',
  DELIVERY_FAILED: 'Giao thất bại',
  RETRY_DELIVERY: 'Giao lại',
  CANCEL: 'Hủy đơn',
  COMPLETE: 'Hoàn tất',
  DELIVERY_RETURN_IN: 'Nhập lại hàng giao thất bại',
};

const recipientEditable = (status: AdminOrderDetailDto['order_status']) =>
  status === 'PENDING' || status === 'CONFIRMED' || status === 'PREPARING';

export const AdminOrderDetailView: React.FC<Props> = ({ orderId, onBack }) => {
  const [order, setOrder] = useState<AdminOrderDetailDto | null>(null);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [superAdmin, setSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');

  const dirty = Boolean(order && editing && (phone !== order.recipient.phone || email !== (order.recipient.email ?? '') || address !== order.recipient.address || note !== (order.customer_service_note ?? '')));
  const canDiscard = useDirtyForm(dirty || Boolean(reason));
  const [revision, setRevision] = useState(0);
  const applyOrder = (detail: AdminOrderDetailDto) => {
    setOrder(detail);
    setPhone(detail.recipient.phone);
    setEmail(detail.recipient.email ?? '');
    setAddress(detail.recipient.address);
    setNote(detail.customer_service_note ?? '');
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setOrder(null);
      try {
        const [detail, me] = await Promise.all([
          adminOrderService.get(orderId),
          profileService.getMe(),
        ]);
        if (!active) return;
        applyOrder(detail);
        setPermissions(new Set(me.permissions.map((permission) => permission.code)));
        setSuperAdmin(me.roles.some((role) => role.code === 'SUPERADMIN'));
        setError(null);
      } catch (requestError: unknown) {
        if (active) setError(getApiErrorMessage(requestError, 'Không thể tải chi tiết đơn hàng quản trị hoặc tài khoản không có quyền phù hợp.'));
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [orderId, revision]);

  const can = (permission: string) => superAdmin || permissions.has(permission);

  const runOrderAction = async (action: AdminOrderAction) => {
    if (!order || busy) return;
    if (dirty) { setError('Lưu hoặc hủy chỉnh sửa thông tin trước khi chuyển trạng thái.'); return; }
    if (!window.confirm(`${actionLabel[action]} đơn ${order.order_code}?\n${action === 'CONFIRM' ? 'Xác nhận sẽ kiểm tra và trừ tồn kho.' : action === 'CANCEL' ? 'Đơn sẽ chuyển sang đã hủy; tồn kho được xử lý theo trạng thái hiện tại.' : action === 'DELIVERY_RETURN_IN' ? 'Chỉ xác nhận khi đã nhận lại hàng. Thao tác sẽ nhập lại tồn kho.' : 'Trạng thái đơn hàng sẽ được cập nhật.'}`)) return;
    setBusy(true);
    setError(null);
    try {
      applyOrder(await adminOrderService.action(order.order_id, {
        action,
        reason: reason.trim() || null,
      }));
      setReason('');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể thực hiện action. Trạng thái, quyền hoặc điều kiện nghiệp vụ có thể đã thay đổi.'));
    } finally {
      setBusy(false);
    }
  };

  const saveOrder = async () => {
    if (!order || busy) return;
    setBusy(true);
    setError(null);
    try {
      const input = recipientEditable(order.order_status)
        ? {
            recipient_phone: phone.trim(),
            recipient_email: email.trim() || null,
            recipient_address: address.trim(),
            customer_service_note: note || null,
          }
        : { customer_service_note: note || null };
      applyOrder(await adminOrderService.update(order.order_id, input));
      setEditing(false);
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể cập nhật đơn hàng. Kiểm tra quyền ORDER_EDIT và trạng thái hiện tại.'));
    } finally {
      setBusy(false);
    }
  };

  const runPaymentAction = async (action: 'COLLECT_COD' | 'REFUND') => {
    if (!order || busy) return;
    if (dirty) { setError('Lưu hoặc hủy chỉnh sửa trước khi cập nhật thanh toán.'); return; }
    if (!window.confirm(`${action === 'COLLECT_COD' ? 'Ghi nhận đã thu COD' : 'Ghi nhận hoàn tiền'} cho đơn ${order.order_code}: ${(action === 'COLLECT_COD' ? order.payment.amount_due : order.payment.amount_received).toLocaleString('vi-VN')}₫? Chỉ xác nhận khi đã thực hiện thanh toán thực tế.`)) return;
    setBusy(true);
    setError(null);
    try {
      const payment = await adminOrderService.paymentAction(order.order_id, action);
      applyOrder({ ...order, payment });
      setRevision((value) => value + 1);
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể cập nhật thanh toán. Kiểm tra ORDER_PAYMENT và điều kiện trạng thái.'));
    } finally {
      setBusy(false);
    }
  };

  const acceptReturn = async () => {
    if (!order || busy || !reason.trim()) return;
    if (dirty) { setError('Lưu hoặc hủy chỉnh sửa trước khi trả hàng.'); return; }
    if (!window.confirm(`Tiếp nhận trả hàng cho đơn ${order.order_code}? Không tự động nhập lại kho hoặc hoàn tiền. Lý do: ${reason.trim()}`)) return;
    setBusy(true);
    setError(null);
    try {
      applyOrder(await adminOrderService.returnOrder(order.order_id, {
        operation: 'RETURN',
        reason: reason.trim(),
      }));
      setReason('');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể tiếp nhận trả hàng. Chỉ đơn COMPLETED và actor có ORDER_AFTER_SALES mới hợp lệ.'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="rounded-lg border border-[#E2E5DE] bg-white p-10 text-center text-sm">Đang tải chi tiết đơn...</div>;
  if (!order) return <div className="space-y-4"><div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error ?? 'Không tìm thấy đơn hàng.'}<button type="button" onClick={() => setRevision((value) => value + 1)}>Thử lại</button></div><button type="button" onClick={onBack} className="border border-[#0B2419] px-4 py-2 text-xs font-bold uppercase">Quay lại</button></div>;

  const showCollectCod = can('ORDER_PAYMENT') && order.payment.payment_status === 'UNPAID' && order.order_status !== 'CANCELLED' && order.order_status !== 'RETURNED';
  const showRefund = can('ORDER_PAYMENT') && order.payment.payment_status === 'PAID' && order.order_status === 'RETURNED';
  const showReturn = can('ORDER_AFTER_SALES') && order.order_status === 'COMPLETED';

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-[#E2E5DE] bg-white p-5">
        <div>
          <button type="button" onClick={onBack} className="mb-3 text-xs font-bold uppercase tracking-wider underline">← Danh sách đơn</button>
          <p className="font-mono text-sm text-[#606863]">{order.order_code}</p>
          <h1 className="mt-1 font-serif text-2xl font-bold text-[#0B2419]">Chi tiết đơn hàng</h1>
          <p className="mt-1 text-xs text-[#606863]">Tạo: {order.created_at} · Cập nhật: {order.updated_at}</p>
        </div>
        <div className="text-right"><span className="inline-block bg-[#FAF4DF] px-3 py-2 text-xs font-bold">{order.order_status}</span><p className="mt-2 text-xs">Payment: {order.payment.payment_status}</p></div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-[#E2E5DE] bg-white p-5">
            <h2 className="font-serif text-xl font-bold">Sản phẩm</h2>
            <div className="mt-4 divide-y divide-[#E2E5DE]">
              {order.items.map((item) => {
                const image = resolveImageUrl(item.image_url);
                return <div key={item.order_item_id} className="flex gap-4 py-4"><div className="h-24 w-16 shrink-0 bg-[#F5F6F2]">{image && <img src={image} alt={item.product_name} className="h-full w-full object-cover" />}</div><div className="min-w-0 flex-1"><p className="font-semibold">{item.product_name}</p><p className="mt-1 text-xs text-[#606863]">{item.sku ?? '—'} · {item.size} · {item.color}</p><p className="mt-2 text-sm">{item.quantity} × {item.unit_price.toLocaleString('vi-VN')}₫</p></div><strong className="text-sm">{item.line_total.toLocaleString('vi-VN')}₫</strong></div>;
              })}
            </div>
          </section>

          <section className="rounded-lg border border-[#E2E5DE] bg-white p-5">
            <div className="flex items-center justify-between gap-3"><h2 className="font-serif text-xl font-bold">Người nhận & ghi chú</h2>{can('ORDER_EDIT') && !editing && <button type="button" onClick={() => setEditing(true)} className="text-xs font-bold uppercase underline">Chỉnh sửa</button>}</div>
            {editing ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="space-y-1"><span className="text-xs font-semibold">Điện thoại</span><input disabled={!recipientEditable(order.order_status)} maxLength={20} value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm disabled:bg-[#F5F6F2]" /></label>
                <label className="space-y-1"><span className="text-xs font-semibold">Email</span><input disabled={!recipientEditable(order.order_status)} maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm disabled:bg-[#F5F6F2]" /></label>
                <label className="space-y-1 md:col-span-2"><span className="text-xs font-semibold">Địa chỉ</span><textarea disabled={!recipientEditable(order.order_status)} rows={3} maxLength={500} value={address} onChange={(event) => setAddress(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm disabled:bg-[#F5F6F2]" /></label>
                <label className="space-y-1 md:col-span-2"><span className="text-xs font-semibold">Ghi chú CSKH</span><textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" /></label>
                <div className="flex gap-2 md:col-span-2"><button type="button" disabled={busy} onClick={() => void saveOrder()} className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase text-white disabled:opacity-40">Lưu</button><button type="button" disabled={busy} onClick={() => { if (!canDiscard()) return; setPhone(order.recipient.phone); setEmail(order.recipient.email ?? ''); setAddress(order.recipient.address); setNote(order.customer_service_note ?? ''); setEditing(false); }} className="border border-[#0B2419] px-4 py-2 text-xs font-bold uppercase">Hủy</button></div>
              </div>
            ) : (
              <dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between gap-4"><dt className="text-[#606863]">Điện thoại</dt><dd>{order.recipient.phone}</dd></div><div className="flex justify-between gap-4"><dt className="text-[#606863]">Email</dt><dd>{order.recipient.email ?? '—'}</dd></div><div className="flex justify-between gap-4"><dt className="text-[#606863]">Địa chỉ</dt><dd className="max-w-lg text-right">{order.recipient.address}</dd></div><div className="border-t border-[#E2E5DE] pt-2"><dt className="text-[#606863]">Ghi chú CSKH</dt><dd className="mt-1 whitespace-pre-wrap">{order.customer_service_note ?? '—'}</dd></div></dl>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-lg border border-[#E2E5DE] bg-white p-5">
            <h2 className="font-serif text-xl font-bold">Tổng tiền</h2>
            <dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><dt>Tạm tính</dt><dd>{order.subtotal.toLocaleString('vi-VN')}₫</dd></div><div className="flex justify-between"><dt>Giảm</dt><dd>-{order.discount.toLocaleString('vi-VN')}₫</dd></div><div className="flex justify-between"><dt>Phí giao</dt><dd>{order.shipping_fee.toLocaleString('vi-VN')}₫</dd></div><div className="flex justify-between border-t border-[#E2E5DE] pt-3 text-base font-bold"><dt>Tổng</dt><dd>{order.total.toLocaleString('vi-VN')}₫</dd></div></dl>
          </section>

          <section className="rounded-lg border border-[#E2E5DE] bg-white p-5">
            <h2 className="font-serif text-xl font-bold">Order actions</h2>
            <label className="mt-4 block space-y-1"><span className="text-xs font-semibold">Lý do / ghi chú action</span><textarea rows={2} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" /></label>
            <div className="mt-4 flex flex-wrap gap-2">
              {order.allowed_actions.map((action) => <button key={action} type="button" disabled={busy} onClick={() => void runOrderAction(action)} className="border border-[#0B2419] px-3 py-2 text-xs font-bold uppercase disabled:opacity-40">{actionLabel[action]}</button>)}
              {order.allowed_actions.length === 0 && <p className="text-xs text-[#606863]">Backend không cấp action trạng thái nào cho actor/order hiện tại.</p>}
            </div>
          </section>

          {(showCollectCod || showRefund || showReturn) && (
            <section className="rounded-lg border border-[#E2E5DE] bg-white p-5">
              <h2 className="font-serif text-xl font-bold">Payment & after-sales</h2>
              <div className="mt-4 space-y-2">
                {showCollectCod && <button type="button" disabled={busy} onClick={() => void runPaymentAction('COLLECT_COD')} className="w-full bg-[#0B2419] px-3 py-2 text-xs font-bold uppercase text-white disabled:opacity-40">Thu COD</button>}
                {showRefund && <button type="button" disabled={busy} onClick={() => void runPaymentAction('REFUND')} className="w-full border border-[#0B2419] px-3 py-2 text-xs font-bold uppercase disabled:opacity-40">Hoàn tiền</button>}
                {showReturn && <button type="button" disabled={busy || !reason.trim()} onClick={() => void acceptReturn()} className="w-full border border-[#0B2419] px-3 py-2 text-xs font-bold uppercase disabled:opacity-40">Tiếp nhận trả hàng</button>}
              </div>
              {showReturn && <p className="mt-2 text-[11px] text-[#606863]">RETURN yêu cầu lý do; EXCHANGE_SIZE chưa được expose vì backend hiện trả NOT_IMPLEMENTED.</p>}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
};
