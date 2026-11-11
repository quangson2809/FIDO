import { StatusBadge } from '../../shared/admin/StatusBadge';
import { OrderProgress } from '../../features/orders/components/OrderProgress';
import { useToast } from '../../shared/ui/toast/useToast';
import { formatVietnamDateTime } from '../../shared/time/formatVietnamDateTime';
import { statusLabel } from '../../shared/admin/statusLabels';
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
  START_PREPARING: 'Bắt đầu chuẩn bị',
  DISPATCH: 'Bắt đầu giao',
  MARK_DELIVERY_FAILED: 'Giao thất bại',
  RETRY_DELIVERY: 'Giao lại',
  CANCEL: 'Hủy đơn',
};

export const AdminOrderDetailView: React.FC<Props> = ({ orderId, onBack }) => {
  const { showToast } = useToast();
  const [order, setOrder] = useState<AdminOrderDetailDto | null>(null);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [superAdmin, setSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  useDirtyForm(Boolean(reason));
  const [revision, setRevision] = useState(0);
  const applyOrder = (detail: AdminOrderDetailDto) => setOrder(detail);

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
        if (active)
          setError(
            getApiErrorMessage(
              requestError,
              'Không thể tải chi tiết đơn hàng quản trị hoặc tài khoản không có quyền phù hợp.',
            ),
          );
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [orderId, revision]);

  const can = (permission: string) => superAdmin || permissions.has(permission);

  const runOrderAction = async (action: AdminOrderAction) => {
    if (!order || busy) return;
    if (
      !window.confirm(
        `${actionLabel[action]} đơn ${order.order_code}?\n${action === 'CONFIRM' ? 'Xác nhận sẽ kiểm tra và trừ tồn kho.' : action === 'CANCEL' ? 'Đơn sẽ chuyển sang đã hủy; tồn kho được xử lý theo trạng thái hiện tại.' : 'Trạng thái đơn hàng sẽ được cập nhật.'}`,
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      applyOrder(
        await adminOrderService.action(order.order_id, {
          action,
          reason: reason.trim() || null,
        }),
      );
      setReason('');
      showToast('Đã cập nhật đơn hàng.');
    } catch (requestError: unknown) {
      setError(
        getApiErrorMessage(
          requestError,
          'Không thể thực hiện action. Trạng thái, quyền hoặc điều kiện nghiệp vụ có thể đã thay đổi.',
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  const collectCod = async () => {
    if (!order || busy) return;
    if (!window.confirm(`Xác nhận đã giao hàng và thu đủ ${order.payment.amount_due.toLocaleString('vi-VN')}₫ COD cho đơn ${order.order_code}?`)) return;
    setBusy(true);
    setError(null);
    try {
      applyOrder(await adminOrderService.paymentAction(order.order_id, 'COMPLETE_DELIVERY_AND_COLLECT_COD'));
      showToast('Đã hoàn tất giao hàng và ghi nhận thu COD.');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể hoàn tất giao hàng và thu COD.'));
    } finally { setBusy(false); }
  };

  const acceptReturn = async () => {
    if (!order || busy || !reason.trim()) return;
    if (
      !window.confirm(
        `Tiếp nhận trả hàng cho đơn ${order.order_code}? Thao tác đồng thời ghi nhận hoàn tiền toàn bộ, không tự động nhập lại kho. Lý do: ${reason.trim()}`,
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      applyOrder(
        await adminOrderService.returnOrder(order.order_id, {
          action: 'RETURN_AND_REFUND_FULL',
          reason: reason.trim(),
        }),
      );
      setReason('');
      showToast('Đã cập nhật đơn hàng.');
    } catch (requestError: unknown) {
      setError(
        getApiErrorMessage(
          requestError,
          'Không thể tiếp nhận trả hàng. Cần đơn đã hoàn tất và quyền ORDER_AFTER_SALES cùng ORDER_PAYMENT.',
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading)
    return (
      <div className="rounded-lg border border-[#E2E5DE] bg-white p-10 text-center text-sm">
        Đang tải chi tiết đơn...
      </div>
    );
  if (!order)
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error ?? 'Không tìm thấy đơn hàng.'}
          <button type="button" onClick={() => setRevision((value) => value + 1)}>
            Thử lại
          </button>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="border border-[#0B2419] px-4 py-2 text-xs font-bold uppercase"
        >
          Quay lại
        </button>
      </div>
    );

  const showCollectCod = can('ORDER_PAYMENT') && order.order_status === 'SHIPPING' &&
    order.payment.payment_status === 'UNPAID';
  const showReturn = can('ORDER_AFTER_SALES') && can('ORDER_PAYMENT') &&
    order.order_status === 'COMPLETED' && order.payment.payment_status === 'PAID';

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-[#E2E5DE] bg-white p-5">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-3 text-xs font-bold uppercase tracking-wider underline"
          >
            ← Danh sách đơn
          </button>
          <p className="font-mono text-sm text-[#606863]">{order.order_code}</p>
          <h1 className="mt-1 font-serif text-2xl font-bold text-[#0B2419]">Chi tiết đơn hàng</h1>
          <p className="mt-1 text-xs text-[#606863]">
            Tạo: {formatVietnamDateTime(order.created_at)} · Cập nhật:{' '}
            {formatVietnamDateTime(order.updated_at)}
          </p>
        </div>
        <div className="text-right">
          <span className="inline-block bg-[#FAF4DF] px-3 py-2 text-xs font-bold">
            <StatusBadge status={order.order_status} />
          </span>
          <p className="mt-2 text-xs">Thanh toán: {statusLabel(order.payment.payment_status)}</p>
        </div>
      </div>

      <OrderProgress status={order.order_status} />
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-[#E2E5DE] bg-white p-5">
            <h2 className="font-serif text-xl font-bold">Sản phẩm</h2>
            <div className="mt-4 divide-y divide-[#E2E5DE]">
              {order.items.map((item) => {
                const image = resolveImageUrl(item.image_url);
                return (
                  <div key={item.order_item_id} className="flex gap-4 py-4">
                    <div className="h-24 w-16 shrink-0 bg-[#F5F6F2]">
                      {image && (
                        <img
                          src={image}
                          alt={item.product_name}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{item.product_name}</p>
                      <p className="mt-1 text-xs text-[#606863]">
                        SKU {item.sku ?? '—'}
                      </p>
                      <p className="mt-2 text-sm">
                        {item.quantity} × {item.unit_price.toLocaleString('vi-VN')}₫
                      </p>
                    </div>
                    <strong className="text-sm">{item.line_total.toLocaleString('vi-VN')}₫</strong>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-[#E2E5DE] bg-white p-5">
            <h2 className="font-serif text-xl font-bold">Người nhận</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-[#606863]">Họ tên</dt><dd>{order.shipping_info?.recipient_name ?? '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#606863]">Điện thoại</dt><dd>{order.recipient.phone}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#606863]">Email</dt><dd>{order.recipient.email ?? '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#606863]">Địa chỉ</dt><dd className="max-w-lg text-right">{order.recipient.address}</dd></div>
            </dl>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-lg border border-[#E2E5DE] bg-white p-5">
            <h2 className="font-serif text-xl font-bold">Tổng tiền</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt>Tạm tính</dt>
                <dd>{order.subtotal.toLocaleString('vi-VN')}₫</dd>
              </div>
              <div className="flex justify-between">
                <dt>Giảm</dt>
                <dd>-{order.discount.toLocaleString('vi-VN')}₫</dd>
              </div>
              <div className="flex justify-between">
                <dt>Phí giao</dt>
                <dd>{order.shipping_fee.toLocaleString('vi-VN')}₫</dd>
              </div>
              <div className="flex justify-between border-t border-[#E2E5DE] pt-3 text-base font-bold">
                <dt>Tổng</dt>
                <dd>{order.total.toLocaleString('vi-VN')}₫</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border border-[#E2E5DE] bg-white p-5">
            <h2 className="font-serif text-xl font-bold">Xử lý đơn hàng</h2>
            <label className="mt-4 block space-y-1">
              <span className="text-xs font-semibold">Lý do / ghi chú action</span>
              <textarea
                disabled={busy}
                rows={2}
                maxLength={500}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"
              />
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              {order.allowed_actions.map((action) => (
                <button
                  key={action}
                  type="button"
                  disabled={busy}
                  onClick={() => void runOrderAction(action)}
                  className={
                    action === 'CANCEL' ||
                    action === 'MARK_DELIVERY_FAILED'
                      ? 'admin-danger'
                      : 'admin-primary'
                  }
                >
                  {actionLabel[action]}
                </button>
              ))}
              {order.allowed_actions.length === 0 && (
                <p className="text-xs text-[#606863]">
                  Hiện không có thao tác chuyển trạng thái phù hợp với đơn hàng và quyền của bạn.
                </p>
              )}
            </div>
          </section>

          {(showCollectCod || showReturn) && (
            <section className="rounded-lg border border-[#E2E5DE] bg-white p-5">
              <h2 className="font-serif text-xl font-bold">Thanh toán & trả hàng</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div>Phải thu: {order.payment.amount_due.toLocaleString('vi-VN')}₫</div>
                <div>Đã thu: {order.payment.amount_received.toLocaleString('vi-VN')}₫</div>
                <div>Đã hoàn: {order.payment.amount_refunded.toLocaleString('vi-VN')}₫</div>
              </dl>
              <div className="mt-4 space-y-2">
                {showCollectCod && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void collectCod()}
                    className="w-full bg-[#0B2419] px-3 py-2 text-xs font-bold uppercase text-white disabled:opacity-40"
                  >
                    Hoàn tất giao hàng & thu COD
                  </button>
                )}
                {showReturn && (
                  <button
                    type="button"
                    disabled={busy || !reason.trim()}
                    onClick={() => void acceptReturn()}
                    className="w-full border border-[#0B2419] px-3 py-2 text-xs font-bold uppercase disabled:opacity-40"
                  >
                    Tiếp nhận trả hàng
                  </button>
                )}
              </div>
              {showReturn && (
                <p className="mt-2 text-[11px] text-[#606863]">
                  Nhập lý do trả hàng và chỉ xác nhận khi đã hoàn tiền toàn bộ. Hệ thống kiểm tra thời hạn 2 ngày kể từ khi giao hàng; không tự động nhập lại kho.
                </p>
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
};
