import React, { useEffect, useMemo, useState } from 'react';
import { useDirtyForm } from '../../shared/admin/dirtyFormContext';
import { StatusBadge } from '../../shared/admin/StatusBadge';
import { adminProductService } from '../../features/catalog/api/adminService';
import { AdminProductGallerySection, AdminProductInfoSection } from '../../features/catalog/components/AdminProductDetailSections';
import { buildMovedImageOrder, sortProductImages } from '../../features/catalog/model/productImageOrder';
import type { AdminProductDetailDto, ProductStatus } from '../../features/catalog/types';
import { getApiErrorMessage } from '../../services/http/apiError';

interface Props { productId: number; onNavigateTab: (tab: string, breadcrumb: string) => void; showToast: (message: string) => void; canWrite: boolean; }

export const AdminProductDetailView: React.FC<Props> = ({ productId, onNavigateTab, showToast, canWrite }) => {
  const validId = Number.isInteger(productId) && productId > 0;
  const [product, setProduct] = useState<AdminProductDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [status, setStatus] = useState<ProductStatus>('DRAFT');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const infoDirty = Boolean(product && editing && (name !== (product.name ?? '') || sku !== product.sku || slug !== (product.slug ?? '') || description !== (product.description ?? '') || sellingPrice !== String(product.selling_price) || costPrice !== (product.cost_price === null ? '' : String(product.cost_price)) || status !== product.status));
  const canDiscard = useDirtyForm(infoDirty || imageFiles.length > 0);

  const applyProduct = (detail: AdminProductDetailDto, preserveDraft = true) => {
    setProduct(detail);
    if (editing && preserveDraft) return;
    setName(detail.name ?? ''); setSku(detail.sku); setSlug(detail.slug ?? ''); setDescription(detail.description ?? '');
    setSellingPrice(String(detail.selling_price)); setCostPrice(detail.cost_price === null ? '' : String(detail.cost_price)); setStatus(detail.status);
  };

  useEffect(() => {
    if (!validId) { setLoading(false); setError('Mã sản phẩm không hợp lệ.'); return undefined; }
    let active = true;
    void adminProductService.getProduct(productId).then((detail) => {
      if (!active) return;
      setProduct(detail); setName(detail.name ?? ''); setSku(detail.sku); setSlug(detail.slug ?? '');
      setDescription(detail.description ?? ''); setSellingPrice(String(detail.selling_price));
      setCostPrice(detail.cost_price === null ? '' : String(detail.cost_price)); setStatus(detail.status); setError(null);
    }).catch((requestError: unknown) => {
      if (active) setError(getApiErrorMessage(requestError, 'Không thể tải chi tiết sản phẩm quản trị.'));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [productId, validId, revision]);

  const orderedImages = useMemo(() => sortProductImages(product?.images ?? []), [product]);
  const saveProduct = async () => {
    if (!canWrite || !product || busy) return;
    const price = Number(sellingPrice); const cost = costPrice.trim() ? Number(costPrice) : null;
    if (!sku.trim() || sku.length > 100 || !sellingPrice.trim() || !Number.isSafeInteger(price) || price < 0 ||
      (cost !== null && (!Number.isSafeInteger(cost) || cost < 0)) || name.length > 255 || slug.length > 200) {
      setError('Kiểm tra SKU, tên, slug và giá VND nguyên không âm.'); return;
    }
    setBusy(true);
    try {
      const detail = await adminProductService.updateProduct(product.product_id, { sku: sku.trim(), name: name.trim() || null, slug: slug.trim() || null, description: description.trim() || null, selling_price: price, cost_price: cost, status });
      applyProduct(detail, false); setEditing(false); setError(null); showToast('Đã cập nhật sản phẩm.');
    } catch (requestError: unknown) { setError(getApiErrorMessage(requestError, 'Không thể cập nhật sản phẩm.')); }
    finally { setBusy(false); }
  };

  const cancelProductEdit = () => {
    if (!product || !canDiscard()) return;
    setName(product.name ?? ''); setSku(product.sku); setSlug(product.slug ?? ''); setDescription(product.description ?? '');
    setSellingPrice(String(product.selling_price)); setCostPrice(product.cost_price === null ? '' : String(product.cost_price)); setStatus(product.status); setEditing(false);
  };

  const uploadImages = async () => {
    if (!canWrite || !product || busy || imageFiles.length === 0) return;
    if (imageFiles.length > 10) { setError('Mỗi lần chỉ tải tối đa 10 ảnh.'); return; }
    setBusy(true);
    try { applyProduct(await adminProductService.uploadImages(product.product_id, imageFiles), false); setImageFiles([]); setError(null); showToast('Đã tải ảnh sản phẩm.'); }
    catch (requestError: unknown) { setError(getApiErrorMessage(requestError, 'Không thể tải ảnh sản phẩm.')); }
    finally { setBusy(false); }
  };

  const moveImage = async (imageId: number, direction: -1 | 1) => {
    if (!canWrite || !product || busy) return;
    const nextOrder = buildMovedImageOrder(orderedImages, imageId, direction); if (!nextOrder) return;
    setBusy(true);
    try { applyProduct(await adminProductService.reorderImages(product.product_id, nextOrder), false); setError(null); }
    catch (requestError: unknown) { setError(getApiErrorMessage(requestError, 'Không thể đổi thứ tự ảnh.')); }
    finally { setBusy(false); }
  };

  const deleteImage = async (imageId: number) => {
    if (!canWrite || !product || busy) return;
    setBusy(true);
    try { await adminProductService.deleteImage(product.product_id, imageId); applyProduct(await adminProductService.getProduct(product.product_id), false); setError(null); showToast('Đã xóa ảnh sản phẩm.'); }
    catch (requestError: unknown) { setError(getApiErrorMessage(requestError, 'Không thể xóa ảnh sản phẩm.')); }
    finally { setBusy(false); }
  };

  if (loading) return <div role="status" className="admin-state">Đang tải chi tiết sản phẩm...</div>;
  if (!product) return <div className="admin-state" role="alert"><p>{error ?? 'Không tìm thấy sản phẩm.'}</p><button type="button" onClick={() => setRevision((value) => value + 1)} className="admin-secondary">Thử lại</button></div>;

  return <div className="space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><button type="button" onClick={() => onNavigateTab('products', 'Sản phẩm')} className="text-xs font-bold uppercase underline">← Danh sách sản phẩm</button><h1 className="mt-2 font-serif text-2xl font-bold">{product.name ?? product.sku}</h1><p className="mt-1 font-mono text-xs text-[#606863]">Product #{product.product_id} · {product.sku}</p></div><StatusBadge status={product.status} /></header>
    {error && <div role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
    <AdminProductInfoSection product={product} editing={editing} busy={busy} canWrite={canWrite} name={name} sku={sku} slug={slug} description={description} sellingPrice={sellingPrice} costPrice={costPrice} status={status} onEditingChange={setEditing} onNameChange={setName} onSkuChange={setSku} onSlugChange={setSlug} onDescriptionChange={setDescription} onSellingPriceChange={setSellingPrice} onCostPriceChange={setCostPrice} onStatusChange={setStatus} onSave={() => void saveProduct()} onCancel={cancelProductEdit} />
    <AdminProductGallerySection productName={product.name ?? product.sku} images={orderedImages} imageFiles={imageFiles} busy={busy} canWrite={canWrite} onFilesChange={setImageFiles} onUpload={() => void uploadImages()} onMove={(imageId, direction) => void moveImage(imageId, direction)} onDelete={(imageId) => void deleteImage(imageId)} />
  </div>;
};
