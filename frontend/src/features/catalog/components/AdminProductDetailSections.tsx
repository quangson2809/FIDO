import React from 'react';
import { ImageFilePreview } from './ImageFilePreview';
import { StatusBadge } from '../../../shared/admin/StatusBadge';
import type { AdminProductDetailDto, ProductImageDto, ProductStatus } from '../types';
import { resolveImageUrl } from '../../../services/media/imageUrl';

const attributeDisplayValue = (value: AdminProductDetailDto['attribute_values'][number]): string => {
  switch (value.data_type) {
    case 'OPTION': return value.option_label ?? value.option_value ?? '—';
    case 'TEXT': return value.text_value ?? '—';
    case 'NUMBER': return value.number_value === null ? '—' : String(value.number_value);
    case 'BOOLEAN': return value.boolean_value === null ? '—' : value.boolean_value ? 'Có' : 'Không';
    default: return '—';
  }
};

export const AdminProductInfoSection: React.FC<{
  product: AdminProductDetailDto; editing: boolean; busy: boolean; canWrite: boolean;
  name: string; sku: string; slug: string; description: string; sellingPrice: string; costPrice: string; status: ProductStatus;
  onEditingChange: (editing: boolean) => void; onNameChange: (value: string) => void; onSkuChange: (value: string) => void;
  onSlugChange: (value: string) => void; onDescriptionChange: (value: string) => void; onSellingPriceChange: (value: string) => void;
  onCostPriceChange: (value: string) => void; onStatusChange: (value: ProductStatus) => void; onSave: () => void; onCancel: () => void;
}> = (props) => {
  const { product, editing, busy, canWrite, name, sku, slug, description, sellingPrice, costPrice, status,
    onEditingChange, onNameChange, onSkuChange, onSlugChange, onDescriptionChange, onSellingPriceChange,
    onCostPriceChange, onStatusChange, onSave, onCancel } = props;
  return <section id="product-info" className="rounded-lg border border-[#E2E5DE] bg-white p-5">
    <div className="flex items-center justify-between gap-3"><h2 className="font-serif text-xl font-bold">Thông tin sản phẩm</h2>{!editing && canWrite && <button type="button" disabled={busy} onClick={() => onEditingChange(true)} className="text-xs font-bold uppercase underline">Chỉnh sửa</button>}</div>
    {editing && canWrite ? <fieldset disabled={busy} className="mt-4 space-y-3">
      <label className="block space-y-1"><span className="text-xs font-semibold">SKU</span><input required maxLength={100} value={sku} onChange={(event) => onSkuChange(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" /></label>
      <label className="block space-y-1"><span className="text-xs font-semibold">Tên</span><input maxLength={255} value={name} onChange={(event) => onNameChange(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" /></label>
      <label className="block space-y-1"><span className="text-xs font-semibold">Slug</span><input maxLength={200} value={slug} onChange={(event) => onSlugChange(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" /></label>
      <label className="block space-y-1"><span className="text-xs font-semibold">Mô tả</span><textarea rows={3} value={description} onChange={(event) => onDescriptionChange(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1"><span className="text-xs font-semibold">Giá bán (VND)</span><input required type="number" min="0" step="1" value={sellingPrice} onChange={(event) => onSellingPriceChange(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" /></label>
        <label className="space-y-1"><span className="text-xs font-semibold">Giá vốn (VND, tùy chọn)</span><input type="number" min="0" step="1" value={costPrice} onChange={(event) => onCostPriceChange(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" /></label>
      </div>
      <label className="block space-y-1"><span className="text-xs font-semibold">Trạng thái</span><select value={status} onChange={(event) => onStatusChange(event.target.value as ProductStatus)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"><option value="DRAFT">DRAFT</option><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option><option value="ARCHIVED">ARCHIVED</option></select></label>
      <div className="flex gap-2"><button type="button" disabled={busy} onClick={onSave} className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase text-white disabled:opacity-40">Lưu</button><button type="button" disabled={busy} onClick={onCancel} className="border border-[#0B2419] px-4 py-2 text-xs font-bold uppercase">Hủy</button></div>
    </fieldset> : <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
      <div><dt className="text-xs text-[#606863]">SKU</dt><dd className="font-mono">{product.sku}</dd></div>
      <div><dt className="text-xs text-[#606863]">Trạng thái</dt><dd className="mt-1"><StatusBadge status={product.status} /></dd></div>
      <div><dt className="text-xs text-[#606863]">Danh mục</dt><dd>{product.category?.name ?? '—'}</dd></div>
      <div><dt className="text-xs text-[#606863]">Thương hiệu</dt><dd>{product.brand?.name ?? '—'}</dd></div>
      <div><dt className="text-xs text-[#606863]">Giá bán</dt><dd className="font-bold">{product.selling_price.toLocaleString('vi-VN')}₫</dd></div>
      <div><dt className="text-xs text-[#606863]">Giá vốn</dt><dd>{product.cost_price === null ? '—' : product.cost_price.toLocaleString('vi-VN') + '₫'}</dd></div>
      <div><dt className="text-xs text-[#606863]">Product cha</dt><dd>{product.parent_product === null ? '—' : '#' + product.parent_product.product_id + ' · ' + product.parent_product.sku}</dd></div>
      <div><dt className="text-xs text-[#606863]">Slug</dt><dd>{product.slug ?? '—'}</dd></div>
      <div className="sm:col-span-2"><dt className="text-xs text-[#606863]">Mô tả</dt><dd className="whitespace-pre-line">{product.description ?? '—'}</dd></div>
    </dl>}
    {product.children.length > 0 && <div className="mt-5 border-t border-[#E2E5DE] pt-4"><h3 className="text-xs font-bold uppercase tracking-wider">Sản phẩm con</h3><ul className="mt-2 space-y-1 text-sm">{product.children.map((child) => <li key={child.product_id}>#{child.product_id} · {child.sku} · {child.name ?? 'Chưa đặt tên'} · {child.status}</li>)}</ul></div>}
    {product.attribute_values.length > 0 && <div className="mt-5 border-t border-[#E2E5DE] pt-4"><h3 className="text-xs font-bold uppercase tracking-wider">Thuộc tính sản phẩm</h3><dl className="mt-2 divide-y divide-[#E2E5DE]">{product.attribute_values.map((value) => <div key={value.attribute_id} className="flex justify-between gap-4 py-2 text-sm"><dt className="text-[#606863]">{value.attribute_name} <span className="text-xs">({value.data_type})</span></dt><dd className="text-right font-medium">{attributeDisplayValue(value)}</dd></div>)}</dl></div>}
  </section>;
};

export const AdminProductGallerySection: React.FC<{
  productName: string; images: readonly ProductImageDto[]; imageFiles: readonly File[]; busy: boolean; canWrite: boolean;
  onFilesChange: (files: File[]) => void; onUpload: () => void; onMove: (imageId: number, direction: -1 | 1) => void; onDelete: (imageId: number) => void;
}> = ({ productName, images, imageFiles, busy, canWrite, onFilesChange, onUpload, onMove, onDelete }) => (
  <section id="product-images" className="rounded-lg border border-[#E2E5DE] bg-white p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-serif text-xl font-bold">Ảnh sản phẩm</h2><p className="mt-1 text-xs text-[#606863]">Ảnh đầu tiên là ảnh bìa. Dùng các nút mũi tên để đổi thứ tự ảnh.</p></div><span className="text-xs text-[#606863]">{images.length} ảnh</span></div>
    {canWrite ? <div className="mt-4 flex flex-wrap items-center gap-3 border border-dashed border-[#D9DDD6] bg-[#F8FAF4] p-3"><input aria-label="Chọn ảnh sản phẩm" disabled={busy} type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => onFilesChange(Array.from(event.target.files ?? []))} className="min-w-0 flex-1 text-xs" /><button type="button" disabled={busy || imageFiles.length === 0} onClick={onUpload} className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase text-white disabled:opacity-40">Tải {imageFiles.length || ''} ảnh</button></div> : <p className="mt-4 text-xs text-[#687069]">Chế độ chỉ đọc. Bạn chưa có quyền thay đổi ảnh.</p>}
    <ImageFilePreview files={imageFiles} />
    {images.length === 0 ? <div className="mt-4 border border-[#E2E5DE] bg-[#F5F6F2] p-8 text-center text-sm text-[#606863]">Chưa có ảnh sản phẩm.</div> : <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
      {images.map((image, index) => { const url = resolveImageUrl(image.image_url); return <figure key={image.id} className="border border-[#E2E5DE] bg-[#F5F6F2]">
        {url ? <img src={url} alt={productName} className="aspect-[3/4] w-full object-cover" /> : <div className="aspect-[3/4]" />}
        <figcaption className="space-y-2 p-2 text-[10px] text-[#606863]"><div className="flex items-center justify-between gap-2"><span>#{image.id} · order {image.sort_order}</span>{image.is_primary && <span className="bg-[#0B2419] px-1.5 py-0.5 font-bold text-white">ẢNH CHÍNH</span>}</div>
          {canWrite && <div className="grid grid-cols-3 gap-1"><button type="button" disabled={busy || index === 0} aria-label={'Đưa ảnh ' + (index + 1) + ' lên trước'} onClick={() => onMove(image.id, -1)} className="border border-[#D9DDD6] px-1 py-1 disabled:opacity-30">←</button><button type="button" disabled={busy || index === images.length - 1} aria-label={'Đưa ảnh ' + (index + 1) + ' ra sau'} onClick={() => onMove(image.id, 1)} className="border border-[#D9DDD6] px-1 py-1 disabled:opacity-30">→</button><button type="button" aria-label={'Xóa ảnh ' + image.id} disabled={busy} onClick={() => onDelete(image.id)} className="border border-red-200 px-1 py-1 text-red-700 disabled:opacity-30">Xóa</button></div>}
        </figcaption></figure>; })}
    </div>}
  </section>
);
