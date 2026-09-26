import React, { useState } from 'react';
import { mockVouchers, VoucherDto } from '../../mocks/apiData';

export const AdminVouchersView: React.FC<{ showToast: (msg: string) => void }> = ({ showToast }) => {
  const [vouchers, setVouchers] = useState<VoucherDto[]>(mockVouchers);
  const [code, setCode] = useState('');

  const createVoucher = (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;
    const nextId = Math.max(0, ...vouchers.map((item) => item.voucher_id)) + 1;
    setVouchers((prev) => [{ voucher_id: nextId, code: normalized }, ...prev]);
    setCode('');
    showToast('Mock POST /api/v1/admin/vouchers: payload chỉ gồm code theo baseline.');
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-widest font-bold text-[#1B5038]">VoucherDto</div>
        <h1 className="font-['Playfair_Display',serif] text-3xl font-bold text-[#0B2419] mt-1">Voucher</h1>
        <p className="text-sm text-[#687069]">Không mock rule giảm giá chưa được khóa. Dữ liệu baseline chỉ dùng mã voucher.</p>
      </div>

      <form onSubmit={createVoucher} className="bg-white border rounded-lg p-4 flex flex-col sm:flex-row gap-3">
        <input value={code} onChange={(e)=>setCode(e.target.value)} placeholder="Mã voucher" className="px-3 py-2 border rounded flex-1 font-mono uppercase" />
        <button className="px-4 py-2 bg-[#0B2419] text-white text-xs font-bold rounded">Tạo mock</button>
      </form>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-[#F5F6F2]"><tr><th className="p-3 text-left">voucher_id</th><th className="text-left">code</th><th className="text-right p-3">Thao tác</th></tr></thead>
          <tbody className="divide-y">{vouchers.map((voucher)=>(
            <tr key={voucher.voucher_id}>
              <td className="p-3">{voucher.voucher_id}</td>
              <td className="font-mono font-bold">{voucher.code}</td>
              <td className="p-3 text-right">
                <button onClick={()=>showToast(`Mock PATCH voucher #${voucher.voucher_id}: chỉ cập nhật code`)} className="px-3 py-1 border rounded">Sửa</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
};
