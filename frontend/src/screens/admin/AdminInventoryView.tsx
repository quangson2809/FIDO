import React, { useMemo, useState } from 'react';
import { mockInventoryRows, mockInventoryTransactions, InventoryRowDto } from '../../mocks/apiData';

export const AdminInventoryView: React.FC<{ showToast: (msg: string) => void }> = ({ showToast }) => {
  const [items, setItems] = useState<InventoryRowDto[]>(mockInventoryRows);
  const [query, setQuery] = useState('');
  const [adjusting, setAdjusting] = useState<InventoryRowDto | null>(null);
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState('Kiểm kê mock');

  const filtered = useMemo(()=>items.filter((item)=>
    item.product_name.toLowerCase().includes(query.toLowerCase()) ||
    (item.sku ?? '').toLowerCase().includes(query.toLowerCase()),
  ),[items,query]);

  const adjust=(event:React.FormEvent)=>{
    event.preventDefault();
    if(!adjusting || !delta || !reason.trim()) return;
    if(adjusting.available_quantity + delta < 0){ showToast('Không cho available_quantity âm'); return; }
    setItems((prev)=>prev.map((item)=>item.variant_id===adjusting.variant_id?{...item,available_quantity:item.available_quantity+delta,updated_at:new Date().toISOString()}:item));
    showToast(`Mock POST inventory/adjustments: variant #${adjusting.variant_id}, delta ${delta}`);
    setAdjusting(null); setDelta(0);
  };

  return (
    <div className="space-y-6">
      <div><div className="text-[11px] font-bold text-[#1B5038] uppercase tracking-widest">InventoryRowDto / InventoryTransactionDto</div><h1 className="font-['Playfair_Display',serif] text-3xl font-bold text-[#0B2419]">Tồn kho một kho</h1><p className="text-sm text-[#687069]">Chỉ hiển thị available_quantity; không mock reserved/reorder point/multi-warehouse.</p></div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-5"><div className="text-xs text-[#687069]">Variants</div><div className="text-3xl font-bold">{items.length}</div></div>
        <div className="bg-white border rounded-lg p-5"><div className="text-xs text-[#687069]">Tổng available</div><div className="text-3xl font-bold">{items.reduce((s,i)=>s+i.available_quantity,0)}</div></div>
        <div className="bg-white border rounded-lg p-5"><div className="text-xs text-[#687069]">Ledger entries mock</div><div className="text-3xl font-bold">{mockInventoryTransactions.length}</div></div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="p-4 border-b"><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Tìm SKU / sản phẩm..." className="px-3 py-2 border rounded text-xs min-w-[280px]"/></div>
        <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-[#F5F6F2]"><tr><th className="p-3 text-left">Variant / SKU</th><th>Sản phẩm</th><th>Size</th><th>Màu</th><th>Sale status</th><th>Available</th><th></th></tr></thead><tbody className="divide-y">{filtered.map((item)=>(
          <tr key={item.variant_id}><td className="p-3"><div className="font-bold">#{item.variant_id}</div><div className="font-mono text-[#687069]">{item.sku ?? '—'}</div></td><td className="text-center">{item.product_name}</td><td className="text-center">{item.size}</td><td className="text-center">{item.color}</td><td className="text-center">{item.sale_status}</td><td className="text-center font-bold">{item.available_quantity}</td><td className="p-3 text-right"><button onClick={()=>setAdjusting(item)} className="px-3 py-1 border rounded">Điều chỉnh</button></td></tr>
        ))}</tbody></table></div>
      </div>

      {adjusting && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"><form onSubmit={adjust} className="bg-white w-full max-w-md p-5 rounded-lg space-y-4"><h2 className="font-bold">Điều chỉnh variant #{adjusting.variant_id}</h2><input type="number" value={delta} onChange={(e)=>setDelta(Number(e.target.value))} className="w-full border px-3 py-2 rounded" placeholder="quantity_delta != 0"/><input value={reason} onChange={(e)=>setReason(e.target.value)} className="w-full border px-3 py-2 rounded" placeholder="reason bắt buộc"/><div className="flex gap-2 justify-end"><button type="button" onClick={()=>setAdjusting(null)} className="px-4 py-2 border rounded">Hủy</button><button className="px-4 py-2 bg-[#0B2419] text-white rounded">Lưu mock</button></div></form></div>}
    </div>
  );
};
