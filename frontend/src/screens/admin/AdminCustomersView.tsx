import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockCustomerSummaries } from '../../mocks/apiData';

export const AdminCustomersView: React.FC<{
  onNavigateTab?: (tab: string, breadcrumb: string) => void;
  showToast: (msg: string) => void;
}> = ({ showToast }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => mockCustomerSummaries.filter((customer) =>
    [String(customer.account_id), customer.phone ?? '', customer.email ?? '']
      .some((value) => value.toLowerCase().includes(query.toLowerCase())),
  ), [query]);

  const totalOrders = mockCustomerSummaries.reduce((sum, customer) => sum + customer.order_count, 0);
  const withEmail = mockCustomerSummaries.filter((customer) => customer.email).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-widest font-bold text-[#1B5038]">CustomerSummaryDto</div>
          <h1 className="font-['Playfair_Display',serif] text-3xl font-bold text-[#0B2419] mt-1">Khách hàng back-office</h1>
          <p className="text-sm text-[#687069] mt-1">Guest order không được biến thành Customer account. Danh sách chỉ có account_id, phone, email, order_count và last_order_at.</p>
        </div>
        <button onClick={()=>showToast('Danh sách customer mock được đọc từ GET /api/v1/admin/customers')} className="px-4 py-2 bg-white border text-xs font-bold rounded self-start">
          Làm mới mock
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-5"><div className="text-xs text-[#687069]">Customer accounts</div><div className="text-3xl font-bold">{mockCustomerSummaries.length}</div></div>
        <div className="bg-white border rounded-lg p-5"><div className="text-xs text-[#687069]">Tổng order_count</div><div className="text-3xl font-bold">{totalOrders}</div></div>
        <div className="bg-white border rounded-lg p-5"><div className="text-xs text-[#687069]">Có email</div><div className="text-3xl font-bold">{withEmail}</div></div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="p-4 border-b">
          <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Tìm account_id / SĐT / email..." className="px-3 py-2 border rounded text-xs w-full max-w-md"/>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#F5F6F2]"><tr><th className="p-3 text-left">account_id</th><th>Số điện thoại</th><th>Email</th><th>order_count</th><th>last_order_at</th><th></th></tr></thead>
            <tbody className="divide-y">
              {filtered.map((customer)=>(
                <tr key={customer.account_id} className="hover:bg-[#FAF9F5]">
                  <td className="p-3 font-bold">#{customer.account_id}</td>
                  <td className="text-center font-mono">{customer.phone ?? '—'}</td>
                  <td className="text-center">{customer.email ?? '—'}</td>
                  <td className="text-center font-bold">{customer.order_count}</td>
                  <td className="text-center whitespace-nowrap">{customer.last_order_at ?? '—'}</td>
                  <td className="p-3 text-right"><button onClick={()=>navigate(`/admin/customers/${customer.account_id}`)} className="px-3 py-1.5 border rounded font-bold">Chi tiết</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
