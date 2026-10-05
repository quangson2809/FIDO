import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { adminCatalogMetaService } from '../../features/catalog/api/adminCatalogMetaService';
import { adminProductService } from '../../features/catalog/api/adminService';
import type { AdminProductDetailDto, CatalogMetaDto, SaleStatus } from '../../features/catalog/types';
import { resolveImageUrl } from '../../services/media/imageUrl';

interface Props {
  onNavigateTab: (tab: string, breadcrumb: string) => void;
  showToast: (message: string) => void;
}

export const AdminProductDetailView: React.FC<Props> = ({ onNavigateTab, showToast }) => {
  const { selectedProductId } = useApp();
  const productId = Number(selectedProductId);
  const validId = Number.isInteger(productId) && productId > 0;
  const [product, setProduct] = useState<AdminProductDetailDto | null>(null);
  const [meta, setMeta] = useState<CatalogMetaDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [saleStatus, setSaleStatus] = useState<SaleStatus>('ON_SALE');
  const [variantSize, setVariantSize] = useState('');
  const [variantColor, setVariantColor] = useState('');
  const [variantSku, setVariantSku] = useState('');
  const [variantOverridePrice, setVariantOverridePrice] = useState('');

  const applyProduct = (detail: AdminProductDetailDto) => {
    setProduct(detail);
    setName(detail.name);
    setDescription(detail.description ?? '');
    setBasePrice(String(detail.base_price));
    setSaleStatus(detail.sale_status);
  };

  const load = async () => {
    if (!validId) return;
    setLoading(true);
    try {
      const [detail, metadata] = await Promise.all([adminProductService.getProduct(productId), adminCatalogMetaService.getMeta()]);
      applyProduct(detail);
      setMeta(metadata);
      setError(null);
    } catch {
      setError('Không thể tải chi tiết sản phẩm quản trị.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [productId, validId]);

  const colorsById = useMemo(() => new Map(meta?.colors.map((item) => [item.color_id, item]) ?? []), [meta]);
  const sizesById = useMemo(() => new Map(product?.size_system.size_values.map((item) => [item.size_value_id, item]) ?? []), [product]);

  const saveProduct = async () => {
    if (!product || busy) return;
    const price = Number(basePrice);
    if (!name.trim() || !Number.isFinite(price) || price < 0) return;
    setBusy(true);
    try {
      applyProduct(await adminProductService.updateProduct(product.product_id, {
        name: name.trim(),
        description: description.trim() || null,
        base_price: price,
        sale_status: saleStatus,
      }));
      setEditing(false);
      showToast('Đã cập nhật sản phẩm.');
    } catch { setError('Không thể cập nhật sản phẩm.'); }
    finally { setBusy(false); }
  };

  const addVariant = async () => {
    if (!product || busy) return;
    const sizeId = Number(variantSize);
    const colorId = Number(variantColor);
    const override = variantOverridePrice.trim() ? Number(variantOverridePrice) : null;
    if (!sizesById.has(sizeId) || !colorsById.has(colorId) || (override !== null && (!Number.isFinite(override) || override < 0))) return;
    setBusy(true);
    try {
      await adminProductService.createVariants(product.product_id, [{ size_value_id: sizeId, color_id: colorId, sku: variantSku.trim() || null, override_price: override, sale_status: 'ON_SALE' }]);
      setVariantSize(''); setVariantColor(''); setVariantSku(''); setVariantOverridePrice('');
      await load();
      showToast('Đã thêm biến thể.');
    } catch { setError('Không thể thêm biến thể. Kiểm tra tổ hợp size/màu và SKU.'); }
    finally { setBusy(false); }
  };

  const toggleVariant = async (variantId: number, current: SaleStatus) => {
    if (!product || busy) return;
    setBusy(true);
    try {
      await adminProductService.updateVariant(product.product_id, variantId, { sale_status: current === 'ON_SALE' ? 'STOPPED' : 'ON_SALE' });
      await load();
    } catch { setError('Không thể cập nhật trạng thái biến thể.'); }
    finally { setBusy(false); }
  };

  if (!validId) return <div className="border border-red-200 bg-white p-6 text-sm text-red-700">Product ID không hợp lệ.</div>;
  if (loading && !product) return <div className="py-16 text-center text-sm">Đang tải sản phẩm...</div>;
  if (!product) return <div className="space-y-4 border border-red-200 bg-white p-6 text-sm text-red-700">{error ?? 'Không tìm thấy sản phẩm.'}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><button type="button" onClick={() => onNavigateTab('products', 'Sản phẩm')} className="mb-3 text-xs font-bold uppercase underline">← Danh sách</button><p className="font-mono text-xs text-[#606863]">Product #{product.product_id}</p><h1 className="mt-1 font-serif text-3xl font-bold">{product.name}</h1></div><span className="bg-[#FAF4DF] px-3 py-2 text-xs font-bold">{product.sale_status}</span></div>
      {error && <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-[#E2E5DE] bg-white p-5">
            <div className="flex items-center justify-between"><h2 className="font-serif text-xl font-bold">Thông tin sản phẩm</h2>{!editing && <button type="button" onClick={() => setEditing(true)} className="text-xs font-bold uppercase underline">Chỉnh sửa</button>}</div>
            {editing ? <div className="mt-4 space-y-3"><label className="block space-y-1"><span className="text-xs font-semibold">Tên</span><input maxLength={255} value={name} onChange={(event) => setName(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" /></label><label className="block space-y-1"><span className="text-xs font-semibold">Mô tả</span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1"><span className="text-xs font-semibold">Giá cơ sở</span><input type="number" min="0" step="0.01" value={basePrice} onChange={(event) => setBasePrice(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-semibold">Sale status</span><select value={saleStatus} onChange={(event) => setSaleStatus(event.target.value as SaleStatus)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"><option value="ON_SALE">ON_SALE</option><option value="STOPPED">STOPPED</option></select></label></div><div className="flex gap-2"><button type="button" disabled={busy} onClick={() => void saveProduct()} className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase text-white disabled:opacity-40">Lưu</button><button type="button" disabled={busy} onClick={() => { applyProduct(product); setEditing(false); }} className="border border-[#0B2419] px-4 py-2 text-xs font-bold uppercase">Hủy</button></div></div> : <dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between gap-4"><dt className="text-[#606863]">Category</dt><dd>{product.category.name}</dd></div><div className="flex justify-between gap-4"><dt className="text-[#606863]">Brand</dt><dd>{product.brand?.name ?? '—'}</dd></div><div className="flex justify-between gap-4"><dt className="text-[#606863]">Size system</dt><dd>{product.size_system.name}</dd></div><div className="flex justify-between gap-4"><dt className="text-[#606863]">Giá</dt><dd className="font-bold">{product.base_price.toLocaleString('vi-VN')}₫</dd></div><div className="border-t border-[#E2E5DE] pt-2"><dt className="text-[#606863]">Mô tả</dt><dd className="mt-1 whitespace-pre-wrap">{product.description ?? '—'}</dd></div></dl>}
          </section>

          <section className="rounded-lg border border-[#E2E5DE] bg-white p-5"><div className="flex items-center justify-between"><h2 className="font-serif text-xl font-bold">Ảnh sản phẩm</h2><span className="text-xs text-[#606863]">{product.images.length} ảnh</span></div><p className="mt-1 text-xs text-[#606863]">PATCH hiện nhận danh sách URL; upload file mới chỉ có trên create multipart, nên màn hình không giả lập upload khi sửa.</p><div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">{product.images.map((image) => { const url = resolveImageUrl(image.image_url); return <figure key={image.image_id} className="border border-[#E2E5DE] bg-[#F5F6F2]">{url ? <img src={url} alt={image.alt_text ?? product.name} className="aspect-[3/4] w-full object-cover" /> : <div className="aspect-[3/4]" />}<figcaption className="p-2 text-[10px] text-[#606863]">Image #{image.image_id}</figcaption></figure>; })}</div></section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-lg border border-[#E2E5DE] bg-white p-5"><h2 className="font-serif text-xl font-bold">Thêm biến thể</h2><div className="mt-4 space-y-3"><select value={variantSize} onChange={(event) => setVariantSize(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"><option value="">Chọn size</option>{product.size_system.size_values.map((item) => <option key={item.size_value_id} value={item.size_value_id}>{item.display_name}</option>)}</select><select value={variantColor} onChange={(event) => setVariantColor(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"><option value="">Chọn màu</option>{meta?.colors.map((item) => <option key={item.color_id} value={item.color_id}>{item.name}</option>)}</select><input maxLength={100} value={variantSku} onChange={(event) => setVariantSku(event.target.value)} placeholder="SKU (optional)" className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" /><input type="number" min="0" step="0.01" value={variantOverridePrice} onChange={(event) => setVariantOverridePrice(event.target.value)} placeholder="Override price (optional)" className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" /><button type="button" disabled={busy || !variantSize || !variantColor} onClick={() => void addVariant()} className="w-full bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase text-white disabled:opacity-40">Thêm biến thể</button></div></section>

          <section className="rounded-lg border border-[#E2E5DE] bg-white p-5"><h2 className="font-serif text-xl font-bold">Biến thể hiện tại</h2><div className="mt-4 space-y-3">{product.variants.length === 0 ? <p className="text-sm text-[#606863]">Chưa có biến thể.</p> : product.variants.map((variant) => { const size = sizesById.get(variant.size_value_id); const color = colorsById.get(variant.color_id); return <div key={variant.variant_id} className="border border-[#E2E5DE] p-3 text-sm"><div className="flex justify-between gap-3"><strong>{size?.display_name ?? `Size #${variant.size_value_id}`} · {color?.name ?? `Color #${variant.color_id}`}</strong><span className="text-[10px] font-bold">{variant.sale_status}</span></div><p className="mt-1 text-xs text-[#606863]">{variant.sku ?? `Variant #${variant.variant_id}`} · Available {variant.available_quantity}</p><p className="mt-1 text-xs">Override: {variant.override_price === null ? '—' : `${variant.override_price.toLocaleString('vi-VN')}₫`}</p><button type="button" disabled={busy} onClick={() => void toggleVariant(variant.variant_id, variant.sale_status)} className="mt-2 text-xs font-bold uppercase underline">{variant.sale_status === 'ON_SALE' ? 'Dừng bán' : 'Bán lại'}</button></div>; })}</div></section>
        </aside>
      </div>
    </div>
  );
};
