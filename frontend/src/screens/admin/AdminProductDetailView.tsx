import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { mockCatalogMeta, mockAdminProductDetails } from '../../mocks/apiData';

export const AdminProductDetailView: React.FC<{
  onNavigateTab: (tab: string, breadcrumb: string) => void;
  showToast: (msg: string) => void;
}> = ({ onNavigateTab, showToast }) => {
  const location = useLocation();
  const routeId = location.pathname.split('/').filter(Boolean).at(-1) ?? '';
  const existing = useMemo(
    () => mockAdminProductDetails.find((item) => String(item.product_id) === routeId),
    [routeId],
  );
  const isNew = routeId === 'new' || !existing;

  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [basePrice, setBasePrice] = useState(existing?.base_price ?? 0);
  const [saleStatus, setSaleStatus] = useState(existing?.sale_status ?? 'ACTIVE');
  const [categoryId, setCategoryId] = useState(existing?.category.category_id ?? mockCatalogMeta.categories.find((c)=>c.parent_category_id !== null)?.category_id ?? 0);
  const [brandId, setBrandId] = useState<number | ''>(existing?.brand?.brand_id ?? '');
  const [sizeSystemId, setSizeSystemId] = useState(existing?.size_system.size_system_id ?? mockCatalogMeta.size_systems[0]?.size_system_id ?? 0);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    showToast(isNew ? 'Mock POST /api/v1/admin/products thành công' : `Mock PATCH /api/v1/admin/products/${existing?.product_id} thành công`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start gap-4">
        <div>
          <button onClick={()=>onNavigateTab('products','Sản phẩm')} className="text-xs font-bold text-[#1B5038]">← Danh sách sản phẩm</button>
          <h1 className="font-['Playfair_Display',serif] text-3xl font-bold text-[#0B2419] mt-2">{isNew ? 'Tạo sản phẩm mock' : existing?.name}</h1>
          <p className="text-sm text-[#687069]">Form chỉ dùng các field đã có trong contract POST/PATCH product.</p>
        </div>
        {!isNew && <span className="text-xs bg-[#FAF4DF] px-3 py-1 rounded font-bold">product_id #{existing?.product_id}</span>}
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <section className="xl:col-span-2 bg-white border rounded-lg p-5 space-y-4">
          <div><label className="text-xs font-bold">Tên sản phẩm *</label><input required value={name} onChange={(e)=>setName(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded" /></div>
          <div><label className="text-xs font-bold">Mô tả</label><textarea value={description ?? ''} onChange={(e)=>setDescription(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded" rows={4}/></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-xs font-bold">Category lá *</label><select value={categoryId} onChange={(e)=>setCategoryId(Number(e.target.value))} className="w-full mt-1 px-3 py-2 border rounded">{mockCatalogMeta.categories.filter(c=>c.parent_category_id!==null).map(c=><option value={c.category_id} key={c.category_id}>{c.name}</option>)}</select></div>
            <div><label className="text-xs font-bold">Brand</label><select value={brandId} onChange={(e)=>setBrandId(e.target.value ? Number(e.target.value) : '')} className="w-full mt-1 px-3 py-2 border rounded"><option value="">Không có</option>{mockCatalogMeta.brands.map(b=><option value={b.brand_id} key={b.brand_id}>{b.name}</option>)}</select></div>
            <div><label className="text-xs font-bold">Size system *</label><select value={sizeSystemId} onChange={(e)=>setSizeSystemId(Number(e.target.value))} className="w-full mt-1 px-3 py-2 border rounded">{mockCatalogMeta.size_systems.map(s=><option value={s.size_system_id} key={s.size_system_id}>{s.name}</option>)}</select></div>
            <div><label className="text-xs font-bold">Base price *</label><input type="number" min={0} value={basePrice} onChange={(e)=>setBasePrice(Number(e.target.value))} className="w-full mt-1 px-3 py-2 border rounded"/></div>
            <div><label className="text-xs font-bold">Sale status *</label><input value={saleStatus} onChange={(e)=>setSaleStatus(e.target.value)} className="w-full mt-1 px-3 py-2 border rounded"/></div>
          </div>
          <button type="submit" className="px-5 py-2.5 bg-[#0B2419] text-white text-xs font-bold rounded">Lưu mock</button>
        </section>

        <section className="bg-white border rounded-lg p-5">
          <h2 className="font-bold text-[#0B2419]">Variants hiện tại</h2>
          <div className="mt-4 space-y-3">
            {existing?.variants.map((variant)=>(
              <div key={variant.variant_id} className="p-3 bg-[#FAF9F5] rounded text-xs">
                <div className="font-bold">{variant.sku ?? 'Không SKU'}</div>
                <div className="text-[#687069]">size_value_id #{variant.size_value_id} · color_id #{variant.color_id}</div>
                <div className="mt-1 flex justify-between"><span>{variant.override_price == null ? 'Dùng base_price' : variant.override_price.toLocaleString('vi-VN') + '₫'}</span><span>Tồn {variant.available_quantity}</span></div>
              </div>
            ))}
            {!existing && <p className="text-xs text-[#687069]">Variant được thêm sau khi tạo Product qua endpoint variants.</p>}
          </div>
        </section>
      </form>
    </div>
  );
};
