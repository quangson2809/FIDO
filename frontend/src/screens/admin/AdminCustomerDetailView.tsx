import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { mockCustomerDetails } from '../../mocks/apiData';

const money = (value: number) => value.toLocaleString('vi-VN') + '₫';

export const AdminCustomerDetailView: React.FC<{
  onNavigateTab: (tab: string, breadcrumb: string) => void;
  showToast: (msg: string) => void;
}> = ({ showToast }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const accountId = Number(location.pathname.split('/').filter(Boolean).at(-1));
  const customer = mockCustomerDetails.find((item)=>item.account.account_id===accountId) ?? mockCustomerDetails[0];

  if (!customer) return <div className="p-6">Không có dữ liệu customer mock.</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-lg p-5">
        <button onClick={()=>navigate('/admin/customers')} className="text-xs font-bold text-[#1B5038]">← Danh sách khách hàng</button>
        <div className="mt-3 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div><div className="text-[11px] uppercase tracking-widest font-bold text-[#1B5038]">CustomerDetailDto</div><h1 className="font-['Playfair_Display',serif] text-3xl font-bold text-[#0B2419]">Tài khoản #{customer.account.account_id}</h1></div>
          <button onClick={()=>showToast('Customer detail mock là read-only theo GET /api/v1/admin/customers/{customerId}')} className="px-3 py-2 border text-xs font-bold rounded">Contract info</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <section className="bg-white border rounded-lg p-5">
          <h2 className="font-bold text-[#0B2419]">AccountDto</h2>
          <dl className="mt-4 text-xs space-y-3">
            <div className="flex justify-between"><dt className="text-[#687069]">account_id</dt><dd className="font-bold">{customer.account.account_id}</dd></div>
            <div className="flex justify-between"><dt className="text-[#687069]">phone</dt><dd className="font-mono">{customer.account.phone ?? 'null'}</dd></div>
            <div className="flex justify-between"><dt className="text-[#687069]">email</dt><dd>{customer.account.email ?? 'null'}</dd></div>
            <div className="flex justify-between"><dt className="text-[#687069]">created_at</dt><dd>{customer.account.created_at}</dd></div>
            <div className="flex justify-between"><dt className="text-[#687069]">updated_at</dt><dd>{customer.account.updated_at}</dd></div>
          </dl>
        </section>

        <section className="bg-white border rounded-lg p-5">
          <h2 className="font-bold text-[#0B2419]">AddressDto[]</h2>
          <div className="mt-4 space-y-3">
            {customer.addresses.length ? customer.addresses.map((address)=>(
              <div key={address.address_id} className="p-3 bg-[#FAF9F5] rounded text-xs">
                <div className="font-bold">#{address.address_id}</div>
                <div className="mt-1">{address.address_text}</div>
                <div className="text-[10px] text-[#687069] mt-1">{address.created_at}</div>
              </div>
            )) : <p className="text-xs text-[#687069]">Không có địa chỉ đã lưu.</p>}
          </div>
        </section>
      </div>

      <section className="bg-white border rounded-lg overflow-hidden">
        <div className="p-4 border-b"><h2 className="font-bold text-[#0B2419]">OrderSummaryDto[]</h2></div>
        <div className="overflow-x-auto"><table className="w-full text-xs">
          <thead className="bg-[#F5F6F2]"><tr><th className="p-3 text-left">order_code</th><th>Status</th><th>Payment</th><th>Total</th><th>Created</th><th></th></tr></thead>
          <tbody className="divide-y">{customer.orders.map((order)=>(
            <tr key={order.order_id}><td className="p-3 font-mono font-bold">{order.order_code}</td><td className="text-center">{order.order_status}</td><td className="text-center">{order.payment_status}</td><td className="text-center font-bold">{money(order.total)}</td><td className="text-center">{order.created_at}</td><td className="p-3 text-right"><button onClick={()=>navigate(`/admin/orders/${encodeURIComponent(order.order_code)}`)} className="px-3 py-1 border rounded">Xem đơn</button></td></tr>
          ))}</tbody>
        </table></div>
      </section>
    </div>
  );
};
