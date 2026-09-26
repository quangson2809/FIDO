import React, { useMemo, useState } from 'react';
import { mockProductDetails } from '../../mocks/apiData';

const money = (value: number) => value.toLocaleString('vi-VN') + '₫';

export const AdminProductsView: React.FC<{
  onSelectProduct?: (id: string) => void;
  onEditProduct?: (id: string) => void;
  onNavigateTab?: (tab: string, breadcrumb: string) => void;
  showToast: (msg: string) => void;
}> = ({ onSelectProduct, onEditProduct, onNavigateTab, showToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filtered = useMemo(() => mockProductDetails.filter((product) => {
    const matchText = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(product.product_id).includes(searchTerm);
    return matchText && (statusFilter === 'ALL' || product.sale_status === statusFilter);
  }), [searchTerm, statusFilter]);

  const variantCount = mockProductDetails.reduce((sum, product) => sum + product.variants.length, 0);
  const stock = mockProductDetails.reduce((sum, product) =>
    sum + product.variants.reduce((inner, variant) => inner + variant.available_quantity, 0), 0);

  return (
    <div className="flex flex-col w-full space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-widest font-bold text-[#1B5038]">AdminProductSummaryDto / AdminProductDetailDto</div>
          <h1 className="font-['Playfair_Display',serif] text-3xl font-bold text-[#0B2419] mt-1">Quản lý sản phẩm</h1>
          <p className="text-sm text-[#687069]">Mock catalog gồm category, brand, size system, variants, giá và tồn khả dụng.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onNavigateTab?.('categories','Danh mục')} className="px-4 py-2 border bg-white text-xs font-bold">Catalog meta</button>
          <button onClick={() => onEditProduct?.('new')} className="px-4 py-2 bg-[#0B2419] text-white text-xs font-bold">+ Sản phẩm</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-5"><div className="text-xs text-[#687069]">Sản phẩm mock</div><div className="text-3xl font-bold">{mockProductDetails.length}</div></div>
        <div className="bg-white border rounded-lg p-5"><div className="text-xs text-[#687069]">Variant</div><div className="text-3xl font-bold">{variantCount}</div></div>
        <div className="bg-white border rounded-lg p-5"><div className="text-xs text-[#687069]">Available quantity</div><div className="text-3xl font-bold">{stock}</div></div>
      </div>

      <div className="bg-white border border-[#E8E9E3] rounded-lg overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row gap-3 justify-between border-b">
          <input value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} placeholder="Tìm tên hoặc product_id..." className="px-3 py-2 border rounded text-xs min-w-[260px]" />
          <select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)} className="px-3 py-2 border rounded text-xs">
            <option value="ALL">Tất cả trạng thái</option>
            {[...new Set(mockProductDetails.map((product)=>product.sale_status))].map((status)=><option key={status}>{status}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#F5F6F2] text-[#687069] uppercase">
              <tr><th className="text-left p-3">ID / Sản phẩm</th><th>Danh mục</th><th>Brand</th><th>Giá cơ sở</th><th>Variants</th><th>Tồn</th><th>Trạng thái</th><th></th></tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((product)=>(
                <tr key={product.product_id} className="hover:bg-[#FAF9F5]">
                  <td className="p-3"><div className="font-bold">{product.name}</div><div className="text-[#687069]">#{product.product_id}</div></td>
                  <td className="text-center">{product.category.name}</td>
                  <td className="text-center">{product.brand?.name ?? '—'}</td>
                  <td className="text-center font-bold">{money(product.base_price)}</td>
                  <td className="text-center">{product.variants.length}</td>
                  <td className="text-center">{product.variants.reduce((sum,v)=>sum+v.available_quantity,0)}</td>
                  <td className="text-center">{product.sale_status}</td>
                  <td className="p-3 text-right">
                    <button onClick={()=>onSelectProduct?.(String(product.product_id))} className="px-3 py-1.5 border rounded font-bold">Chi tiết</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-[#687069]">Các trường gender/season/style/sale_status dùng giá trị mock để test; tài liệu chưa khóa toàn bộ enum kỹ thuật.</p>
    </div>
  );
};
