import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { mockOrderDetails, OrderAdminDetailDto } from '../../mocks/apiData';

const money = (value: number) => value.toLocaleString('vi-VN') + '₫';

export const AdminOrderDetailView: React.FC<{
  onNavigateTab: (tab: string, breadcrumb: string) => void;
  showToast: (msg: string) => void;
}> = ({ showToast }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const routeValue = decodeURIComponent(location.pathname.split('/').filter(Boolean).at(-1) ?? '');
  const source = useMemo(
    () => mockOrderDetails.find((item)=>item.order_code===routeValue || String(item.order_id)===routeValue) ?? mockOrderDetails[0],
    [routeValue],
  );
  const [order, setOrder] = useState<OrderAdminDetailDto>(source);

  const runAction = (action: string) => {
    const nextStatus: Record<string,string> = {
      CONFIRM: 'CONFIRMED',
      PREPARE: 'PREPARING',
      SHIP: 'SHIPPING',
      DELIVERY_FAILED: 'DELIVERY_FAILED',
      RETRY_DELIVERY: 'SHIPPING',
      CANCEL: 'CANCELLED',
      COMPLETE: 'COMPLETED',
    };
    if (action === 'COMPLETE' && order.payment.payment_status !== 'PAID') {
      showToast('COMPLETE bị chặn: COD phải PAID trước.');
      return;
    }
    setOrder((prev)=>({...prev, order_status: nextStatus[action] ?? prev.order_status}));
    showToast(`Mock POST /api/v1/admin/orders/${order.order_id}/actions { action: "${action}" }`);
  };

  const runPaymentAction = (action: 'COLLECT_COD' | 'REFUND') => {
    setOrder((prev) => {
      if (action === 'COLLECT_COD') {
        if (prev.payment.payment_status !== 'UNPAID') return prev;
        return {
          ...prev,
          payment: {
            ...prev.payment,
            payment_status: 'PAID',
            amount_received: prev.payment.amount_due,
            collected_by_account_id: 2002,
            collected_at: new Date().toISOString(),
          },
          allowed_actions:
            prev.order_status === 'SHIPPING'
              ? Array.from(new Set([...prev.allowed_actions, 'COMPLETE']))
              : prev.allowed_actions,
        };
      }
      if (prev.payment.payment_status !== 'PAID') return prev;
      return {
        ...prev,
        payment: {
          ...prev.payment,
          payment_status: 'REFUNDED',
          amount_refunded: prev.payment.amount_received,
          refunded_by_account_id: 2002,
          refunded_at: new Date().toISOString(),
        },
      };
    });
    showToast(`Mock POST /api/v1/admin/orders/${order.order_id}/payment-actions { action: "${action}" }`);
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="bg-white border rounded-lg p-5 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <button onClick={()=>navigate('/admin/orders')} className="text-xs font-bold text-[#1B5038]">← Danh sách đơn</button>
          <div className="text-[11px] uppercase tracking-widest font-bold text-[#1B5038] mt-3">OrderAdminDetailDto</div>
          <h1 className="font-['Playfair_Display',serif] text-3xl font-bold text-[#0B2419]">{order.order_code}</h1>
          <p className="text-xs text-[#687069]">order_id #{order.order_id} · account {order.customer_account_id ? '#'+order.customer_account_id : 'guest'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {order.payment.payment_status === 'UNPAID' && (
            <button onClick={()=>runPaymentAction('COLLECT_COD')} className="px-3 py-2 bg-[#E8C75B] text-[#071A12] text-xs font-bold rounded">COLLECT_COD</button>
          )}
          {order.order_status === 'RETURNED' && order.payment.payment_status === 'PAID' && (
            <button onClick={()=>runPaymentAction('REFUND')} className="px-3 py-2 bg-[#E8C75B] text-[#071A12] text-xs font-bold rounded">REFUND</button>
          )}
          {order.allowed_actions.length ? order.allowed_actions.map((action)=>(
            <button key={action} onClick={()=>runAction(action)} className="px-3 py-2 bg-[#0B2419] text-white text-xs font-bold rounded">{action}</button>
          )) : <span className="px-3 py-2 bg-[#F5F6F2] text-xs font-bold rounded">Không có state action mock</span>}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 bg-white border rounded-lg overflow-hidden">
          <div className="p-4 border-b flex justify-between"><h2 className="font-bold">Order items</h2><span className="text-xs font-bold">{order.order_status}</span></div>
          <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-[#F5F6F2]"><tr><th className="p-3 text-left">Sản phẩm</th><th>SKU</th><th>Size/Màu</th><th>SL</th><th>Đơn giá</th><th>Line total</th></tr></thead><tbody className="divide-y">{order.items.map((item)=>(
            <tr key={item.order_item_id}><td className="p-3 font-bold">{item.product_name}</td><td className="text-center font-mono">{item.sku ?? '—'}</td><td className="text-center">{item.size} / {item.color}</td><td className="text-center">{item.quantity}</td><td className="text-center">{money(item.unit_price)}</td><td className="text-center font-bold">{money(item.line_total)}</td></tr>
          ))}</tbody></table></div>
          <div className="p-4 border-t ml-auto max-w-sm text-xs space-y-2">
            <div className="flex justify-between"><span>Subtotal</span><strong>{money(order.subtotal)}</strong></div>
            <div className="flex justify-between"><span>Discount</span><strong>-{money(order.discount)}</strong></div>
            <div className="flex justify-between"><span>Shipping</span><strong>{money(order.shipping_fee)}</strong></div>
            <div className="flex justify-between text-base border-t pt-2"><span>Total</span><strong>{money(order.total)}</strong></div>
          </div>
        </section>

        <div className="space-y-5">
          <section className="bg-white border rounded-lg p-5 text-xs">
            <h2 className="font-bold text-[#0B2419]">RecipientDto</h2>
            <div className="mt-3 space-y-2"><div>{order.recipient.phone}</div><div>{order.recipient.email ?? 'Không email'}</div><div>{order.recipient.address}</div></div>
          </section>
          <section className="bg-white border rounded-lg p-5 text-xs">
            <h2 className="font-bold text-[#0B2419]">PaymentAdminDto</h2>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between"><span>Status</span><strong>{order.payment.payment_status}</strong></div>
              <div className="flex justify-between"><span>Due</span><strong>{money(order.payment.amount_due)}</strong></div>
              <div className="flex justify-between"><span>Received</span><strong>{money(order.payment.amount_received)}</strong></div>
              <div className="flex justify-between"><span>Refunded</span><strong>{money(order.payment.amount_refunded)}</strong></div>
              <div className="flex justify-between"><span>Collected by</span><strong>{order.payment.collected_by_account_id ? '#'+order.payment.collected_by_account_id : '—'}</strong></div>
            </div>
          </section>
          <section className="bg-white border rounded-lg p-5 text-xs">
            <h2 className="font-bold text-[#0B2419]">ShippingInfoDto</h2>
            {order.shipping_info ? <div className="mt-3"><div>{order.shipping_info.delivery_mode}</div><div>{order.shipping_info.carrier_name ?? 'Không carrier'}</div></div> : <p className="mt-3 text-[#687069]">Chưa có shipping_info.</p>}
          </section>
        </div>
      </div>

      <section className="bg-white border rounded-lg p-5 text-xs grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div><span className="text-[#687069]">voucher_id</span><div className="font-bold mt-1">{order.voucher_id ?? 'null'}</div></div>
        <div><span className="text-[#687069]">cancel_reason</span><div className="font-bold mt-1">{order.cancel_reason ?? 'null'}</div></div>
        <div><span className="text-[#687069]">completed_at</span><div className="font-bold mt-1">{order.completed_at ?? 'null'}</div></div>
        <div><span className="text-[#687069]">returned_at</span><div className="font-bold mt-1">{order.returned_at ?? 'null'}</div></div>
        <div className="sm:col-span-2 lg:col-span-4"><span className="text-[#687069]">customer_service_note</span><div className="font-bold mt-1">{order.customer_service_note ?? 'null'}</div></div>
      </section>
    </div>
  );
};
