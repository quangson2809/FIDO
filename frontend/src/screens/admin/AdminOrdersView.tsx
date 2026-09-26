import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockOrderDetails } from '../../mocks/apiData';

const money = (value: number) => value.toLocaleString('vi-VN') + '₫';

export const AdminOrdersView: React.FC<{ showToast: (msg: string) => void }> = ({ showToast }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [payment, setPayment] = useState('ALL');

  const statuses = [...new Set(mockOrderDetails.map((order)=>order.order_status))];
  const payments = [...new Set(mockOrderDetails.map((order)=>order.payment.payment_status))];

  const filtered = useMemo(()=>mockOrderDetails.filter((order)=>{
    const matchesQuery = [order.order_code, String(order.order_id), order.recipient.phone]
      .some((value)=>value.toLowerCase().includes(query.toLowerCase()));
    const matchesStatus = status === 'ALL' || order.order_status === status;
    const matchesPayment = payment === 'ALL' || order.payment.payment_status === payment;
    return matchesQuery && matchesStatus && matchesPayment;
  }),[query,status,payment]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-widest font-bold text-[#1B5038]">OrderSummaryDto / OrderAdminDetailDto</div>
          <h1 className="font-['Playfair_Display',serif] text-3xl font-bold text-[#0B2419] mt-1">Vận hành đơn hàng COD</h1>
          <p className="text-sm text-[#687069] mt-1">Bộ mock có PENDING, CONFIRMED, PREPARING, SHIPPING, DELIVERY_FAILED, COMPLETED, RETURNED và CANCELLED để test state UI.</p>
        </div>
        <button onClick={()=>showToast('Mock GET /api/v1/admin/orders')} className="px-4 py-2 bg-white border text-xs font-bold rounded self-start">Làm mới mock</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['PENDING','SHIPPING','DELIVERY_FAILED','COMPLETED'].map((key)=>(
          <button key={key} onClick={()=>setStatus(key)} className="bg-white border rounded-lg p-4 text-left hover:border-[#0B2419]">
            <div className="text-[10px] text-[#687069] font-bold">{key}</div>
            <div className="text-2xl font-bold mt-1">{mockOrderDetails.filter((order)=>order.order_status===key).length}</div>
          </button>
        ))}
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="p-4 border-b grid sm:grid-cols-3 gap-3">
          <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Mã đơn / order_id / SĐT..." className="px-3 py-2 border rounded text-xs"/>
          <select value={status} onChange={(e)=>setStatus(e.target.value)} className="px-3 py-2 border rounded text-xs"><option value="ALL">Tất cả OrderStatus</option>{statuses.map((item)=><option key={item}>{item}</option>)}</select>
          <select value={payment} onChange={(e)=>setPayment(e.target.value)} className="px-3 py-2 border rounded text-xs"><option value="ALL">Tất cả PaymentStatus</option>{payments.map((item)=><option key={item}>{item}</option>)}</select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#F5F6F2]"><tr><th className="p-3 text-left">Đơn</th><th>Account</th><th>OrderStatus</th><th>PaymentStatus</th><th>Total</th><th>Created</th><th>Allowed actions</th><th></th></tr></thead>
            <tbody className="divide-y">{filtered.map((order)=>(
              <tr key={order.order_id} className="hover:bg-[#FAF9F5]">
                <td className="p-3"><div className="font-mono font-bold">{order.order_code}</div><div className="text-[#687069]">#{order.order_id}</div></td>
                <td className="text-center">{order.customer_account_id ? '#'+order.customer_account_id : 'Guest'}</td>
                <td className="text-center font-bold">{order.order_status}</td>
                <td className="text-center">{order.payment.payment_status}</td>
                <td className="text-center font-bold">{money(order.total)}</td>
                <td className="text-center whitespace-nowrap">{order.created_at}</td>
                <td className="text-center">{order.allowed_actions.length ? order.allowed_actions.join(', ') : '—'}</td>
                <td className="p-3 text-right"><button onClick={()=>navigate(`/admin/orders/${encodeURIComponent(order.order_code)}`)} className="px-3 py-1.5 border rounded font-bold">Chi tiết</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
