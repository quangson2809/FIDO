import { StorefrontIcon } from '../components/StorefrontIcon';
import { customerOrderLabels, customerPaymentLabels } from '../features/orders/model/orderLabels';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { orderService } from '../features/orders/api/service';
import type { OrderCustomerDetailDto } from '../features/orders/types';
import { getStorefrontErrorMessage } from '../services/http/storefrontError';

type VerificationState =
  | {
      orderId: number;
      status: 'success';
      order: OrderCustomerDetailDto;
    }
  | {
      orderId: number;
      status: 'error';
      error: string;
    };

export const OrderSuccessScreen: React.FC = () => {
  const navigate = useNavigate();
  const { orderId = '' } = useParams<{ orderId: string }>();
  const parsedOrderId = /^\d+$/.test(orderId) && Number(orderId) > 0 ? Number(orderId) : null;
  const [retry, setRetry] = useState(0);
  const [verification, setVerification] = useState<VerificationState | null>(null);

  useEffect(() => {
    if (parsedOrderId === null) return undefined;

    let active = true;
    void orderService.getOrder(parsedOrderId)
      .then((order) => {
        if (active) {
          setVerification({
            orderId: parsedOrderId,
            status: 'success',
            order,
          });
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setVerification({
            orderId: parsedOrderId,
            status: 'error',
            error: getStorefrontErrorMessage(
              requestError,
              'Không thể xác minh đơn hàng này. Đơn có thể không tồn tại hoặc không thuộc tài khoản hiện tại.',
            ),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [parsedOrderId, retry]);

  const currentVerification = verification?.orderId === parsedOrderId ? verification : null;
  const loading = parsedOrderId !== null && currentVerification === null;
  const order = currentVerification?.status === 'success' ? currentVerification.order : null;
  const error = parsedOrderId === null
    ? 'Mã đơn hàng trên đường dẫn không hợp lệ.'
    : currentVerification?.status === 'error'
      ? currentVerification.error
      : null;

  if (loading) {
    return <div className="min-h-[70vh] bg-[#FFFDF5] px-4 py-14 text-[#0B2419] sm:px-8"><div role="status" className="mx-auto max-w-4xl border border-[#E8E9E3] bg-white p-12 text-center text-sm text-[#606863]">Đang xác minh đơn hàng...</div></div>;
  }

  if (!order) {
    return (
      <div className="min-h-[70vh] bg-[#FFFDF5] px-4 py-14 text-[#0B2419] sm:px-8">
        <section className="mx-auto max-w-4xl border border-red-200 bg-white px-6 py-12 text-center shadow-sm sm:px-12">
          <StorefrontIcon name="error" className="h-8 w-8 text-[40px] text-red-700" />
          <h1 className="mt-4 font-serif text-3xl">Không thể xác minh đơn hàng</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#606863]">{error ?? 'Không tìm thấy thông tin đơn hàng.'}</p>
          {parsedOrderId !== null && <button type="button" onClick={() => { setVerification(null); setRetry(value => value + 1); }} className="mt-5 border px-5 py-3 text-sm">Thử lại</button>}
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <button type="button" onClick={() => navigate('/orders')} className="bg-[#0B2419] px-6 py-3 text-xs font-bold uppercase tracking-widest text-white">Đơn hàng của tôi</button>
            <button type="button" onClick={() => navigate('/products')} className="border border-[#D9DDD6] px-6 py-3 text-xs font-bold uppercase tracking-widest text-[#606863]">Tiếp tục mua sắm</button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] bg-[#FFFDF5] px-4 py-14 text-[#0B2419] sm:px-8">
      <section className="relative mx-auto max-w-4xl overflow-hidden border border-[#E8E9E3] bg-white px-6 py-12 text-center shadow-sm sm:px-12 sm:py-16">
        <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full border border-[#E8C75B]/35" />
        <div className="pointer-events-none absolute -bottom-28 -right-16 h-72 w-72 rounded-full border border-[#0B2419]/10" />
        <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#0B2419] text-[#E8C75B] shadow-lg"><StorefrontIcon name="check_circle" className="h-8 w-8 text-[34px]" /></div>
        <p className="relative mt-6 text-[11px] font-bold uppercase tracking-[0.24em] text-[#1B5038]">Đặt hàng FIDO</p>
        <h1 className="relative mt-2 font-serif text-4xl">Đơn hàng đã được ghi nhận</h1>
        <p className="relative mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#606863]">Đơn <strong className="font-mono">{order.order_code}</strong> đã được ghi nhận cho tài khoản của bạn. Trạng thái hiện tại: <strong>{customerOrderLabels[order.order_status]}</strong>.</p>
        <div className="relative mx-auto mt-7 w-fit border border-[#E8E9E3] bg-[#FAF9F5] px-5 py-3 text-sm"><span className="text-[#687069]">Mã đơn: </span><strong className="font-mono">#{order.order_id}</strong></div>
        <p className="relative mt-4 text-sm">COD · {customerPaymentLabels[order.payment.payment_status]} · Tổng tiền {order.total.toLocaleString('vi-VN')}₫</p>
        <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={() => navigate(`/orders/${order.order_id}`)} className="bg-[#0B2419] px-6 py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-[#1B5038]">Xem chi tiết đơn</button>
          <button type="button" onClick={() => navigate('/orders')} className="border border-[#0B2419] px-6 py-3 text-xs font-bold uppercase tracking-widest">Đơn hàng của tôi</button>
          <button type="button" onClick={() => navigate('/products')} className="border border-[#D9DDD6] px-6 py-3 text-xs font-bold uppercase tracking-widest text-[#606863]">Tiếp tục mua sắm</button>
        </div>
      </section>
    </div>
  );
};
