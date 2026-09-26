import React, { useMemo, useState } from 'react';
import { mockSuppliers, SupplierDto } from '../../mocks/apiData';

export const AdminSuppliersView: React.FC<{
  showToast: (msg: string) => void;
  onNavigateTab?: (tab: string, breadcrumb: string) => void;
}> = ({ showToast, onNavigateTab }) => {
  const [suppliers, setSuppliers] = useState<SupplierDto[]>(mockSuppliers);
  const [query, setQuery] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [usageStatus, setUsageStatus] = useState('ACTIVE');
  const [note, setNote] = useState('');

  const filtered = useMemo(() => suppliers.filter((supplier) =>
    [supplier.name, supplier.phone ?? '', supplier.email ?? '', supplier.address ?? '']
      .some((value) => value.toLowerCase().includes(query.toLowerCase())),
  ), [query, suppliers]);

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    const supplier: SupplierDto = {
      supplier_id: Math.max(0, ...suppliers.map((item)=>item.supplier_id)) + 1,
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      usage_status: usageStatus,
      note: note.trim() || null,
    };
    setSuppliers((prev)=>[supplier,...prev]);
    setName(''); setPhone(''); setEmail(''); setAddress(''); setNote('');
    showToast('Mock POST /api/v1/admin/suppliers thành công');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between gap-4">
        <div><div className="text-[11px] font-bold text-[#1B5038] uppercase tracking-widest">SupplierDto</div><h1 className="font-['Playfair_Display',serif] text-3xl font-bold text-[#0B2419]">Nhà cung cấp</h1><p className="text-sm text-[#687069]">Chỉ sử dụng các field name/phone/email/address/usage_status/note.</p></div>
        <button onClick={()=>onNavigateTab?.('inward','Phiếu nhập kho')} className="px-4 py-2 bg-white border text-xs font-bold rounded">Xem phiếu nhập</button>
      </div>

      <form onSubmit={save} className="bg-white border rounded-lg p-5 grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
        <input required value={name} onChange={(e)=>setName(e.target.value)} placeholder="Tên NCC *" className="px-3 py-2 border rounded text-xs"/>
        <input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="Điện thoại" className="px-3 py-2 border rounded text-xs"/>
        <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" className="px-3 py-2 border rounded text-xs"/>
        <input value={address} onChange={(e)=>setAddress(e.target.value)} placeholder="Địa chỉ" className="px-3 py-2 border rounded text-xs"/>
        <select value={usageStatus} onChange={(e)=>setUsageStatus(e.target.value)} className="px-3 py-2 border rounded text-xs"><option>ACTIVE</option><option>INACTIVE</option></select>
        <input value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Ghi chú" className="px-3 py-2 border rounded text-xs"/>
        <button className="px-4 py-2 bg-[#0B2419] text-white text-xs font-bold rounded">Thêm mock</button>
      </form>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="p-4 border-b"><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Tìm nhà cung cấp..." className="px-3 py-2 border rounded text-xs min-w-[280px]"/></div>
        <div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-[#F5F6F2]"><tr><th className="p-3 text-left">ID / Tên</th><th>Liên hệ</th><th>Địa chỉ</th><th>Status</th><th>Ghi chú</th></tr></thead><tbody className="divide-y">{filtered.map((supplier)=>(
          <tr key={supplier.supplier_id}><td className="p-3"><div className="font-bold">{supplier.name}</div><div>#{supplier.supplier_id}</div></td><td className="text-center">{supplier.phone ?? '—'}<br/>{supplier.email ?? '—'}</td><td className="text-center">{supplier.address ?? '—'}</td><td className="text-center font-bold">{supplier.usage_status}</td><td className="p-3">{supplier.note ?? '—'}</td></tr>
        ))}</tbody></table></div>
      </div>
    </div>
  );
};
