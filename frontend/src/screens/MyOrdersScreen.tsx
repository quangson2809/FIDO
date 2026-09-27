import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { OrderStatus } from '../types';

const money = (value: number) => value.toLocaleString('vi-VN') + '₫';

const statusLabel: Record<string,string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PREPARING: 'Đang chuẩn bị',
  SHIPPING: 'Đang giao',
  DELIVERY_FAILED: 'Giao thất bại',
  COMPLETED: 'Hoàn thành',
  RETURNED: 'Đã trả hàng',
  CANCELLED: 'Đã hủy',
};

export const MyOrdersScreen: React.FC = () => {
  const { orders, setCurrentScreen, setSelectedOrderId } = useApp();
  const [status, setStatus] = useState<'ALL' | OrderStatus>('ALL');
  const [query, setQuery] = useState('');

  const contractStatuses = ['PENDING','CONFIRMED','PREPARING','SHIPPING','DELIVERY_FAILED','COMPLETED','RETURNED','CANCELLED'] as const;

  const filtered = useMemo(()=>orders.filter((order)=>{
    const statusMatch = status === 'ALL' || order.status === status;
    const q = query.trim().toLowerCase();
    const queryMatch = !q || order.id.toLowerCase().includes(q) || order.items.some((item)=>item.name.toLowerCase().includes(q));
    return statusMatch && queryMatch;
  }),[orders,status,query]);

  const openOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setCurrentScreen('order-detail');
  };

  return (
    <div className="min-h-screen bg-[#F8FAF4] py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-[#1B5038]">GET /api/v1/me/orders</div>
            <h1 className="font-['Playfair_Display',serif] text-3xl font-bold text-[#0B2419] mt-1">Đơn hàng của tôi</h1>
            <p className="text-sm text-[#687069] mt-1">Danh sách mock dùng OrderSummary/OrderCustomerDetail state hiện tại; baseline không có API timeline riêng.</p>
          </div>
          <button onClick={()=>setCurrentScreen('catalog')} className="px-4 py-2.5 bg-[#0B2419] text-white text-xs font-bold rounded">Tiếp tục mua sắm</button>
        </div>

        <div className="mt-6 bg-white border border-[#E2E5DE] rounded-lg p-4 space-y-3">
          <input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Tìm mã đơn hoặc sản phẩm..." className="w-full px-3 py-2.5 border rounded text-xs"/>
          <div className="flex flex-wrap gap-2">
            <button onClick={()=>setStatus('ALL')} className={`px-3 py-1.5 rounded text-[10px] font-bold ${status==='ALL'?'bg-[#0B2419] text-white':'bg-[#F5F6F2]'}`}>ALL ({orders.length})</button>
            {contractStatuses.map((item)=>(
              <button key={item} onClick={()=>setStatus(item)} className={`px-3 py-1.5 rounded text-[10px] font-bold ${status===item?'bg-[#0B2419] text-white':'bg-[#F5F6F2]'}`}>
                {item} ({orders.filter((order)=>order.status===item).length})
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {filtered.map((order)=>(
            <article key={order.id} className="bg-white border border-[#E2E5DE] rounded-lg overflow-hidden">
              <div className="p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-mono font-bold text-[#0B2419]">{order.id}</div>
                  <div className="text-[10px] text-[#687069] mt-1">{order.createdAt}</div>
                </div>
                <div className="flex gap-2">
                  <span className="px-3 py-1 rounded bg-[#FAF4DF] text-[#725c00] text-[10px] font-bold">{statusLabel[order.status] ?? order.status}</span>
                  <span className="px-3 py-1 rounded bg-[#F5F6F2] text-[#424844] text-[10px] font-bold">{order.paymentStatus}</span>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                <div className="space-y-3">
                  {order.items.slice(0,2).map((item)=>(
                    <div key={item.id} className="flex gap-3 text-xs">
                      <img src={item.imageUrl} alt={item.name} className="w-14 h-16 object-cover bg-[#F3F4EF]"/>
                      <div className="flex-1"><div className="font-bold">{item.name}</div><div className="text-[#687069] mt-1">{item.sku || 'Không SKU'} · {item.size} · {item.color} · x{item.quantity}</div></div>
                      <div className="font-bold">{money(item.price*item.quantity)}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                  <div className="text-xs text-[#687069]">
                    <div>{order.customerPhone}</div>
                    <div className="mt-1">{order.recipientAddress}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-[#687069]">Tổng</div>
                    <div className="text-xl font-bold text-[#0B2419]">{money(order.total)}</div>
                    <button onClick={()=>openOrder(order.id)} className="mt-2 px-4 py-2 border border-[#0B2419] text-[#0B2419] text-xs font-bold rounded">Chi tiết</button>
                  </div>
                </div>
              </div>
            </article>
          ))}
          {!filtered.length && <div className="bg-white border border-[#E2E5DE] rounded-lg p-10 text-center text-sm text-[#687069]">Không có đơn phù hợp filter.</div>}
        </div>
      </div>
    </div>
  );
};
