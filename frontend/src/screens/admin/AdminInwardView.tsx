import React from 'react';
import { mockGoodsReceipts, mockSuppliers } from '../../mocks/apiData';

export const AdminInwardView: React.FC<{
  showToast: (msg: string) => void;
  onNavigateTab: (tab: string, breadcrumb: string) => void;
}> = ({ showToast, onNavigateTab }) => {
  const supplierName = (id: number) => mockSuppliers.find((item)=>item.supplier_id===id)?.name ?? `Supplier #${id}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between gap-4">
        <div><div className="text-[11px] font-bold text-[#1B5038] uppercase tracking-widest">GoodsReceiptSummaryDto / DetailDto</div><h1 className="font-['Playfair_Display',serif] text-3xl font-bold text-[#0B2419]">Phiếu nhập kho</h1><p className="text-sm text-[#687069]">DRAFT / CONFIRMED / CANCELLED; không mock giá nhập vì baseline chưa khóa unit_cost.</p></div>
        <button onClick={()=>onNavigateTab('suppliers','Nhà cung cấp')} className="px-4 py-2 bg-white border text-xs font-bold rounded">Nhà cung cấp</button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {(['DRAFT','CONFIRMED','CANCELLED'] as const).map((status)=>(
          <div key={status} className="bg-white border rounded-lg p-5"><div className="text-xs text-[#687069]">{status}</div><div className="text-3xl font-bold">{mockGoodsReceipts.filter(r=>r.receipt_status===status).length}</div></div>
        ))}
      </div>

      <div className="bg-white border rounded-lg overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-xs">
        <thead className="bg-[#F5F6F2]"><tr><th className="p-3 text-left">Phiếu</th><th>NCC</th><th>Ngày</th><th>Items</th><th>Trạng thái</th><th>Người tạo/xác nhận</th><th></th></tr></thead>
        <tbody className="divide-y">{mockGoodsReceipts.map((receipt)=>(
          <tr key={receipt.receipt_id}><td className="p-3"><div className="font-mono font-bold">{receipt.receipt_code}</div><div>#{receipt.receipt_id}</div></td><td className="text-center">{supplierName(receipt.supplier_id)}</td><td className="text-center">{receipt.receipt_date}</td><td className="text-center">{receipt.items.reduce((s,i)=>s+i.quantity,0)}</td><td className="text-center font-bold">{receipt.receipt_status}</td><td className="text-center">#{receipt.created_by_account_id} / {receipt.confirmed_by_account_id ? '#'+receipt.confirmed_by_account_id : '—'}</td><td className="p-3 text-right"><button onClick={()=>showToast(`Mock detail ${receipt.receipt_code}: ${receipt.note ?? 'không ghi chú'}`)} className="px-3 py-1 border rounded">Chi tiết</button></td></tr>
        ))}</tbody>
      </table></div></div>
    </div>
  );
};
