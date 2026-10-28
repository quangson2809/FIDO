import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDirtyForm } from '../../shared/admin/dirtyFormContext';
import { QueryFeedback } from '../../shared/admin/QueryFeedback';
import { StatusBadge } from '../../shared/admin/StatusBadge';
import { useRemoteQuery } from '../../shared/hooks/useRemoteQuery';
import { catalogService } from '../../features/catalog/api/service';
import { adminProductService } from '../../features/catalog/api/adminService';
import { AdminProductTable } from '../../features/catalog/components/AdminProductTable';
import { ImageFilePreview } from '../../features/catalog/components/ImageFilePreview';
import type { CatalogMetaDto, ProductCreateInput, ProductStatus } from '../../features/catalog/types';
import { getApiErrorMessage } from '../../services/http/apiError';

interface AdminProductsViewProps { onSelectProduct?: (id: string) => void; onEditProduct?: (id: string) => void; onNavigateTab?: (tab: string, breadcrumb: string) => void; showToast: (message: string) => void; canWrite: boolean; }
type FormState = { sku: string; name: string; categoryId: string; brandId: string; sellingPrice: string; description: string; status: ProductStatus; };
const initialForm: FormState = { sku: '', name: '', categoryId: '', brandId: '', sellingPrice: '', description: '', status: 'ACTIVE' };

export const AdminProductsView: React.FC<AdminProductsViewProps> = ({ onSelectProduct, onEditProduct, onNavigateTab, showToast, canWrite }) => {
  const [meta, setMeta] = useState<CatalogMetaDto | null>(null);
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ProductStatus | ''>('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [view, setView] = useState<'table' | 'cards'>('table');
  const [pendingProductId, setPendingProductId] = useState<number | null>(null);
  const [lastCreatedId, setLastCreatedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const list = useRemoteQuery(useCallback(() => adminProductService.getProducts({ category_id: categoryId ? Number(categoryId) : undefined, brand_id: brandId ? Number(brandId) : undefined, q: query || undefined, status: status || undefined, page, page_size: 20 }), [page, query, status, categoryId, brandId]));
  const products = list.data?.data ?? [];
  const pagination = list.data?.meta ?? null;
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [images, setImages] = useState<File[]>([]);
  const canDiscard = useDirtyForm(JSON.stringify(form) !== JSON.stringify(initialForm) || images.length > 0);

  useEffect(() => {
    let active = true;
    void catalogService.getMeta().then((result) => { if (active) setMeta(result); })
      .catch((requestError: unknown) => { if (active) setError(getApiErrorMessage(requestError, 'Không thể tải metadata catalog.')); });
    return () => { active = false; };
  }, []);

  const leafCategories = useMemo(() => {
    if (!meta) return [];
    const parents = new Set(meta.categories.map((item) => item.parent_category_id).filter((id): id is number => id !== null));
    return meta.categories.filter((item) => !parents.has(item.category_id) && item.status === 'ACTIVE');
  }, [meta]);
  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const createPayload = (): ProductCreateInput | null => {
    const category = Number(form.categoryId); const price = Number(form.sellingPrice); const brand = form.brandId ? Number(form.brandId) : null;
    if (!form.sku.trim() || form.sku.trim().length > 100 || !form.name.trim() || !leafCategories.some((item) => item.category_id === category) ||
      !form.sellingPrice.trim() || !Number.isSafeInteger(price) || price < 0 || (brand !== null && !meta?.brands.some((item) => item.brand_id === brand))) return null;
    return { sku: form.sku.trim(), name: form.name.trim(), category_id: category, brand_id: brand, description: form.description.trim() || null, selling_price: price, status: form.status };
  };
  const finishCreate = (productId: number) => {
    setForm(initialForm); setImages([]); setShowCreate(false); setPendingProductId(null); setLastCreatedId(productId); setError(null); list.reload();
  };
  const create = async (event: React.FormEvent) => {
    event.preventDefault(); if (!canWrite || submitting) return;
    const payload = createPayload();
    if (!payload && pendingProductId === null) { showToast('Dữ liệu sản phẩm chưa hợp lệ. Kiểm tra SKU, tên, danh mục và giá bán.'); return; }
    if (images.length > 10) { showToast('Mỗi lần chỉ tải tối đa 10 ảnh.'); return; }
    setSubmitting(true);
    try {
      const created = pendingProductId !== null ? await adminProductService.getProduct(pendingProductId) : await adminProductService.createProduct(payload as ProductCreateInput);
      setPendingProductId(created.product_id);
      if (images.length > 0) {
        try { await adminProductService.uploadImages(created.product_id, images); }
        catch (uploadError: unknown) {
          setLastCreatedId(created.product_id); setError(getApiErrorMessage(uploadError, 'Tải ảnh thất bại. Sản phẩm đã được tạo; có thể thử tải ảnh lại.'));
          showToast('Sản phẩm đã được tạo nhưng tải ảnh thất bại. Hãy thử lại hoặc mở chi tiết sản phẩm.'); return;
        }
      }
      finishCreate(created.product_id); showToast('Đã tạo sản phẩm ' + created.sku + '.');
    } catch (requestError: unknown) { setError(getApiErrorMessage(requestError, 'Không thể tạo sản phẩm. Kiểm tra quyền và dữ liệu catalog.')); }
    finally { setSubmitting(false); }
  };
  const requestSearch = (event: React.FormEvent) => { event.preventDefault(); setPage(1); setQuery(queryInput.trim()); };
  const cancelCreate = () => { if (!canDiscard()) return; setShowCreate(false); setPendingProductId(null); setForm(initialForm); setImages([]); };
  const openProduct = (id: number, callback?: (id: string) => void) => { if (callback) callback(String(id)); else onNavigateTab?.('product-detail', 'Chi tiết sản phẩm #' + id); };

  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="font-serif text-2xl font-bold">Sản phẩm</h1><p className="mt-1 text-sm text-[#606863]">Danh mục sản phẩm theo contract catalog hiện tại.</p></div>{canWrite && <button type="button" onClick={() => setShowCreate((value) => !value)} className="admin-primary">{showCreate ? 'Đóng form' : 'Thêm sản phẩm'}</button>}</header>
    {error && <div role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
    {showCreate && canWrite && <form onSubmit={create} className="space-y-4 rounded-xl border border-[#E2E5DE] bg-white p-5">
      <h2 className="font-serif text-xl font-bold">Thông tin sản phẩm mới</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm"><span className="block text-xs font-semibold">SKU *</span><input required maxLength={100} value={form.sku} onChange={(event) => updateForm('sku', event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2" /></label>
        <label className="space-y-1 text-sm"><span className="block text-xs font-semibold">Tên sản phẩm</span><input required maxLength={255} value={form.name} onChange={(event) => updateForm('name', event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2" /></label>
        <label className="space-y-1 text-sm"><span className="block text-xs font-semibold">Danh mục *</span><select required value={form.categoryId} onChange={(event) => updateForm('categoryId', event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2"><option value="">Chọn danh mục</option>{leafCategories.map((item) => <option key={item.category_id} value={item.category_id}>{item.name}</option>)}</select></label>
        <label className="space-y-1 text-sm"><span className="block text-xs font-semibold">Thương hiệu</span><select value={form.brandId} onChange={(event) => updateForm('brandId', event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2"><option value="">Không chọn</option>{meta?.brands.filter((item) => item.status === 'ACTIVE').map((item) => <option key={item.brand_id} value={item.brand_id}>{item.name}</option>)}</select></label>
        <label className="space-y-1 text-sm"><span className="block text-xs font-semibold">Giá bán (VND) *</span><input required type="number" min="0" step="1" value={form.sellingPrice} onChange={(event) => updateForm('sellingPrice', event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2" /></label>
        <label className="space-y-1 text-sm"><span className="block text-xs font-semibold">Trạng thái</span><select value={form.status} onChange={(event) => updateForm('status', event.target.value as ProductStatus)} className="w-full border border-[#D9DDD6] px-3 py-2"><option value="DRAFT">DRAFT</option><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option><option value="ARCHIVED">ARCHIVED</option></select></label>
      </div>
      <label className="block space-y-1 text-sm"><span className="block text-xs font-semibold">Mô tả</span><textarea rows={3} value={form.description} onChange={(event) => updateForm('description', event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2" /></label>
      <div className="border border-dashed border-[#D9DDD6] bg-[#F8FAF4] p-3"><label className="block space-y-2 text-sm"><span className="text-xs font-semibold">Ảnh sản phẩm (tùy chọn)</span><input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={submitting} onChange={(event) => setImages(Array.from(event.target.files ?? []))} className="block max-w-full text-xs" /></label><ImageFilePreview files={images} /></div>
      <div className="flex flex-wrap gap-2"><button type="submit" disabled={submitting} className="admin-primary disabled:opacity-40">{submitting ? 'Đang lưu...' : pendingProductId !== null ? 'Thử tải ảnh lại' : 'Tạo sản phẩm'}</button><button type="button" disabled={submitting} onClick={cancelCreate} className="admin-secondary">Hủy</button></div>
    </form>}
    <form onSubmit={requestSearch} className="flex flex-wrap gap-2 rounded-xl border border-[#E2E5DE] bg-white p-3">
      <input aria-label="Tìm sản phẩm" placeholder="Tìm theo tên hoặc SKU" value={queryInput} onChange={(event) => setQueryInput(event.target.value)} className="min-w-48 flex-1 border border-[#D9DDD6] px-3 py-2 text-sm" />
      <select aria-label="Lọc trạng thái" value={status} onChange={(event) => { setStatus(event.target.value as ProductStatus | ''); setPage(1); }} className="border border-[#D9DDD6] px-3 py-2 text-sm"><option value="">Tất cả trạng thái</option><option value="DRAFT">DRAFT</option><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option><option value="ARCHIVED">ARCHIVED</option></select>
      <select aria-label="Lọc danh mục" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(1); }} className="border border-[#D9DDD6] px-3 py-2 text-sm"><option value="">Tất cả danh mục</option>{meta?.categories.map((item) => <option key={item.category_id} value={item.category_id}>{item.name}</option>)}</select>
      <select aria-label="Lọc thương hiệu" value={brandId} onChange={(event) => { setBrandId(event.target.value); setPage(1); }} className="border border-[#D9DDD6] px-3 py-2 text-sm"><option value="">Tất cả thương hiệu</option>{meta?.brands.map((item) => <option key={item.brand_id} value={item.brand_id}>{item.name}</option>)}</select>
      <button type="submit" className="admin-secondary">Tìm kiếm</button>
      <div className="flex gap-1 border-l pl-2"><button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')} className="admin-secondary">Bảng</button><button type="button" aria-pressed={view === 'cards'} onClick={() => setView('cards')} className="admin-secondary">Thẻ</button></div>
    </form>
    <QueryFeedback loading={list.loading} error={list.error ? getApiErrorMessage(list.error, 'Không thể tải danh sách sản phẩm.') : null} onRetry={list.reload} />
    {!list.loading && !list.error && products.length === 0 && <p className="admin-state">Không có sản phẩm phù hợp.</p>}
    {view === 'table' && products.length > 0 && <AdminProductTable products={products} meta={meta} onOpen={(id) => openProduct(id, onSelectProduct)} />}
    {view === 'cards' && products.length > 0 && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{products.map((product) => <article key={product.product_id} className="rounded-xl border border-[#E2E5DE] bg-white p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{product.name ?? product.sku}</h2><p className="mt-1 font-mono text-xs text-[#606863]">{product.sku}</p></div><StatusBadge status={product.status} /></div><p className="mt-3 text-lg font-bold">{product.selling_price.toLocaleString('vi-VN')}₫</p><p className="mt-1 text-xs text-[#606863]">{meta?.categories.find((item) => item.category_id === product.category_id)?.name ?? 'Chưa có danh mục'}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => openProduct(product.product_id, onSelectProduct)} className="admin-secondary">Chi tiết</button><button type="button" onClick={() => openProduct(product.product_id, onEditProduct)} className="admin-secondary">Sửa</button></div></article>)}</div>}
    {pagination && <div className="flex items-center justify-between gap-3 text-sm"><span>Trang {pagination.page} / {pagination.total_pages} · {pagination.total_items} sản phẩm</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="admin-secondary">Trước</button><button type="button" disabled={page >= pagination.total_pages} onClick={() => setPage((current) => current + 1)} className="admin-secondary">Sau</button></div></div>}
    {lastCreatedId !== null && <div className="flex items-center gap-3 border border-[#C8DDCC] bg-[#EEF6EE] p-3 text-sm"><span>Đã tạo sản phẩm #{lastCreatedId}.</span><button type="button" onClick={() => openProduct(lastCreatedId, onEditProduct ?? onSelectProduct)} className="font-bold underline">Mở chi tiết</button></div>}
  </div>;
};
