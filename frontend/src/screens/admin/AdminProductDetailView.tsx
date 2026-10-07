import React, { useEffect, useMemo, useState } from 'react';
import { adminCatalogMetaService } from '../../features/catalog/api/adminCatalogMetaService';
import { adminProductService } from '../../features/catalog/api/adminService';
import type { AdminProductDetailDto, CatalogMetaDto, SaleStatus } from '../../features/catalog/types';
import { getApiErrorMessage } from '../../services/http/apiError';
import { resolveImageUrl } from '../../services/media/imageUrl';

interface Props {
  productId: number;
  onNavigateTab: (tab: string, breadcrumb: string) => void;
  showToast: (message: string) => void;
}

export const AdminProductDetailView: React.FC<Props> = ({ productId, onNavigateTab, showToast }) => {
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
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const applyProduct = (detail: AdminProductDetailDto) => {
    setProduct(detail);
    setName(detail.name);
    setDescription(detail.description ?? '');
    setBasePrice(String(detail.base_price));
    setSaleStatus(detail.sale_status);
  };

  const refresh = async () => {
    if (!validId) return;
    const [detail, metadata] = await Promise.all([
      adminProductService.getProduct(productId),
      adminCatalogMetaService.getMeta(),
    ]);
    applyProduct(detail);
    setMeta(metadata);
    setError(null);
  };

  useEffect(() => {
    if (!validId) return undefined;
    let active = true;
    void Promise.all([
      adminProductService.getProduct(productId),
      adminCatalogMetaService.getMeta(),
    ])
      .then(([detail, metadata]) => {
        if (!active) return;
        applyProduct(detail);
        setMeta(metadata);
        setError(null);
      })
      .catch((requestError: unknown) => {
        if (active) setError(getApiErrorMessage(requestError, 'Không thể tải chi tiết sản phẩm quản trị.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [productId, validId]);

  const colorsById = useMemo(
    () => new Map(meta?.colors.map((item) => [item.color_id, item]) ?? []),
    [meta],
  );
  const sizesById = useMemo(
    () => new Map(product?.size_system.size_values.map((item) => [item.size_value_id, item]) ?? []),
    [product],
  );
  const orderedImages = useMemo(
    () => [...(product?.images ?? [])].sort((left, right) => left.sort_order - right.sort_order),
    [product],
  );

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
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể cập nhật sản phẩm.'));
    } finally {
      setBusy(false);
    }
  };

  const addVariant = async () => {
    if (!product || busy) return;
    const sizeId = Number(variantSize);
    const colorId = Number(variantColor);
    const override = variantOverridePrice.trim() ? Number(variantOverridePrice) : null;
    if (
      !sizesById.has(sizeId)
      || !colorsById.has(colorId)
      || (override !== null && (!Number.isFinite(override) || override < 0))
    ) return;
    setBusy(true);
    try {
      await adminProductService.createVariants(product.product_id, [{
        size_value_id: sizeId,
        color_id: colorId,
        sku: variantSku.trim() || null,
        override_price: override,
        sale_status: 'ON_SALE',
      }]);
      setVariantSize('');
      setVariantColor('');
      setVariantSku('');
      setVariantOverridePrice('');
      await refresh();
      showToast('Đã thêm biến thể.');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể thêm biến thể. Kiểm tra tổ hợp size/màu và SKU.'));
    } finally {
      setBusy(false);
    }
  };

  const toggleVariant = async (variantId: number, current: SaleStatus) => {
    if (!product || busy) return;
    setBusy(true);
    try {
      await adminProductService.updateVariant(product.product_id, variantId, {
        sale_status: current === 'ON_SALE' ? 'STOPPED' : 'ON_SALE',
      });
      await refresh();
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể cập nhật trạng thái biến thể.'));
    } finally {
      setBusy(false);
    }
  };

  const uploadProductImages = async () => {
    if (!product || busy || imageFiles.length === 0) return;
    if (imageFiles.length > 10) {
      showToast('Mỗi lần chỉ tải tối đa 10 ảnh.');
      return;
    }

    setBusy(true);
    try {
      applyProduct(await adminProductService.uploadImages(product.product_id, imageFiles));
      setImageFiles([]);
      setError(null);
      showToast('Đã tải ảnh sản phẩm.');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể tải ảnh sản phẩm.'));
    } finally {
      setBusy(false);
    }
  };

  const moveImage = async (imageId: number, direction: -1 | 1) => {
    if (!product || busy) return;
    const currentIndex = orderedImages.findIndex((image) => image.image_id === imageId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedImages.length) return;

    const nextImages = [...orderedImages];
    [nextImages[currentIndex], nextImages[targetIndex]] = [nextImages[targetIndex], nextImages[currentIndex]];

    setBusy(true);
    try {
      applyProduct(await adminProductService.reorderImages(
        product.product_id,
        nextImages.map((image, index) => ({ image_id: image.image_id, sort_order: index })),
      ));
      setError(null);
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể đổi thứ tự ảnh.'));
    } finally {
      setBusy(false);
    }
  };

  const deleteProductImage = async (imageId: number) => {
    if (!product || busy) return;
    if (!window.confirm('Xóa ảnh này khỏi gallery sản phẩm?')) return;

    setBusy(true);
    try {
      await adminProductService.deleteImage(product.product_id, imageId);
      applyProduct(await adminProductService.getProduct(product.product_id));
      setError(null);
      showToast('Đã xóa ảnh sản phẩm.');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể xóa ảnh sản phẩm.'));
    } finally {
      setBusy(false);
    }
  };

  if (!validId) {
    return <div className="border border-red-200 bg-white p-6 text-sm text-red-700">Product ID không hợp lệ.</div>;
  }
  if (loading && !product) {
    return <div className="py-16 text-center text-sm">Đang tải sản phẩm...</div>;
  }
  if (!product) {
    return <div className="space-y-4 border border-red-200 bg-white p-6 text-sm text-red-700">{error ?? 'Không tìm thấy sản phẩm.'}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <button type="button" onClick={() => onNavigateTab('products', 'Sản phẩm')} className="mb-3 text-xs font-bold uppercase underline">← Danh sách</button>
          <p className="font-mono text-xs text-[#606863]">Product #{product.product_id}</p>
          <h1 className="mt-1 font-serif text-3xl font-bold">{product.name}</h1>
        </div>
        <span className="bg-[#FAF4DF] px-3 py-2 text-xs font-bold">{product.sale_status}</span>
      </div>

      {error && <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-[#E2E5DE] bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold">Thông tin sản phẩm</h2>
              {!editing && <button type="button" onClick={() => setEditing(true)} className="text-xs font-bold uppercase underline">Chỉnh sửa</button>}
            </div>
            {editing ? (
              <div className="mt-4 space-y-3">
                <label className="block space-y-1"><span className="text-xs font-semibold">Tên</span><input maxLength={255} value={name} onChange={(event) => setName(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" /></label>
                <label className="block space-y-1"><span className="text-xs font-semibold">Mô tả</span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" /></label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1"><span className="text-xs font-semibold">Giá cơ sở</span><input type="number" min="0" step="0.01" value={basePrice} onChange={(event) => setBasePrice(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" /></label>
                  <label className="space-y-1"><span className="text-xs font-semibold">Sale status</span><select value={saleStatus} onChange={(event) => setSaleStatus(event.target.value as SaleStatus)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"><option value="ON_SALE">ON_SALE</option><option value="STOPPED">STOPPED</option></select></label>
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={busy} onClick={() => void saveProduct()} className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase text-white disabled:opacity-40">Lưu</button>
                  <button type="button" disabled={busy} onClick={() => { applyProduct(product); setEditing(false); }} className="border border-[#0B2419] px-4 py-2 text-xs font-bold uppercase">Hủy</button>
                </div>
              </div>
            ) : (
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-[#606863]">Category</dt><dd>{product.category.name}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-[#606863]">Brand</dt><dd>{product.brand?.name ?? '—'}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-[#606863]">Size system</dt><dd>{product.size_system.name}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-[#606863]">Giá</dt><dd className="font-bold">{product.base_price.toLocaleString('vi-VN')}₫</dd></div>
                <div className="border-t border-[#E2E5DE] pt-2"><dt className="text-[#606863]">Mô tả</dt><dd className="mt-1 whitespace-pre-wrap">{product.description ?? '—'}</dd></div>
              </dl>
            )}
          </section>

          <section className="rounded-lg border border-[#E2E5DE] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-serif text-xl font-bold">Ảnh sản phẩm</h2><p className="mt-1 text-xs text-[#606863]">Ảnh đầu tiên (sort_order = 0) là cover/thumbnail. Upload, reorder và delete đều đi qua API backend.</p></div><span className="text-xs text-[#606863]">{orderedImages.length} ảnh</span></div>
            <div className="mt-4 flex flex-wrap items-center gap-3 border border-dashed border-[#D9DDD6] bg-[#F8FAF4] p-3">
              <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => setImageFiles(Array.from(event.target.files ?? []))} className="min-w-0 flex-1 text-xs" />
              <button type="button" disabled={busy || imageFiles.length === 0} onClick={() => void uploadProductImages()} className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase text-white disabled:opacity-40">Tải {imageFiles.length || ''} ảnh</button>
            </div>
            {orderedImages.length === 0 ? <div className="mt-4 border border-[#E2E5DE] bg-[#F5F6F2] p-8 text-center text-sm text-[#606863]">Gallery đang trống.</div> : <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {orderedImages.map((image, index) => {
                const url = resolveImageUrl(image.image_url);
                return <figure key={image.image_id} className="border border-[#E2E5DE] bg-[#F5F6F2]">{url ? <img src={url} alt={image.alt_text ?? product.name} className="aspect-[3/4] w-full object-cover" /> : <div className="aspect-[3/4]" />}<figcaption className="space-y-2 p-2 text-[10px] text-[#606863]"><div className="flex items-center justify-between gap-2"><span>#{image.image_id} · order {image.sort_order}</span>{index === 0 && <span className="bg-[#0B2419] px-1.5 py-0.5 font-bold text-white">COVER</span>}</div><div className="grid grid-cols-3 gap-1"><button type="button" disabled={busy || index === 0} onClick={() => void moveImage(image.image_id, -1)} className="border border-[#D9DDD6] px-1 py-1 disabled:opacity-30">←</button><button type="button" disabled={busy || index === orderedImages.length - 1} onClick={() => void moveImage(image.image_id, 1)} className="border border-[#D9DDD6] px-1 py-1 disabled:opacity-30">→</button><button type="button" disabled={busy} onClick={() => void deleteProductImage(image.image_id)} className="border border-red-200 px-1 py-1 text-red-700 disabled:opacity-30">Xóa</button></div></figcaption></figure>;
              })}
            </div>}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-lg border border-[#E2E5DE] bg-white p-5">
            <h2 className="font-serif text-xl font-bold">Thêm biến thể</h2>
            <div className="mt-4 space-y-3">
              <select value={variantSize} onChange={(event) => setVariantSize(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"><option value="">Chọn size</option>{product.size_system.size_values.map((item) => <option key={item.size_value_id} value={item.size_value_id}>{item.display_name}</option>)}</select>
              <select value={variantColor} onChange={(event) => setVariantColor(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"><option value="">Chọn màu</option>{meta?.colors.map((item) => <option key={item.color_id} value={item.color_id}>{item.name}</option>)}</select>
              <input maxLength={100} value={variantSku} onChange={(event) => setVariantSku(event.target.value)} placeholder="SKU (optional)" className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" />
              <input type="number" min="0" step="0.01" value={variantOverridePrice} onChange={(event) => setVariantOverridePrice(event.target.value)} placeholder="Override price (optional)" className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" />
              <button type="button" disabled={busy || !variantSize || !variantColor} onClick={() => void addVariant()} className="w-full bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase text-white disabled:opacity-40">Thêm biến thể</button>
            </div>
          </section>

          <section className="rounded-lg border border-[#E2E5DE] bg-white p-5">
            <h2 className="font-serif text-xl font-bold">Biến thể hiện tại</h2>
            <div className="mt-4 space-y-3">
              {product.variants.length === 0 ? <p className="text-sm text-[#606863]">Chưa có biến thể.</p> : product.variants.map((variant) => {
                const size = sizesById.get(variant.size_value_id);
                const color = colorsById.get(variant.color_id);
                return <div key={variant.variant_id} className="border border-[#E2E5DE] p-3 text-sm"><div className="flex justify-between gap-3"><strong>{size?.display_name ?? `Size #${variant.size_value_id}`} · {color?.name ?? `Color #${variant.color_id}`}</strong><span className="text-[10px] font-bold">{variant.sale_status}</span></div><p className="mt-1 text-xs text-[#606863]">{variant.sku ?? `Variant #${variant.variant_id}`} · Available {variant.available_quantity}</p><p className="mt-1 text-xs">Override: {variant.override_price === null ? '—' : `${variant.override_price.toLocaleString('vi-VN')}₫`}</p><button type="button" disabled={busy} onClick={() => void toggleVariant(variant.variant_id, variant.sale_status)} className="mt-2 text-xs font-bold uppercase underline">{variant.sale_status === 'ON_SALE' ? 'Dừng bán' : 'Bán lại'}</button></div>;
              })}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};
