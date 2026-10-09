import { AdminProductTable } from '../../features/catalog/components/AdminProductTable';
import { ImageFilePreview } from '../../features/catalog/components/ImageFilePreview';
import { statusLabel } from '../../shared/admin/statusLabels';
import { useDirtyForm } from '../../shared/admin/dirtyFormContext';
import { useCallback } from 'react';
import { useRemoteQuery } from '../../shared/hooks/useRemoteQuery';
import { QueryFeedback } from '../../shared/admin/QueryFeedback';
import React, { useEffect, useMemo, useState } from 'react';
import { adminCatalogMetaService } from '../../features/catalog/api/adminCatalogMetaService';
import { adminProductService } from '../../features/catalog/api/adminService';
import type {
  CatalogMetaDto,
  ProductCreateInput,
  SaleStatus,
} from '../../features/catalog/types';
import { getApiErrorMessage } from '../../services/http/apiError';
import { resolveImageUrl } from '../../services/media/imageUrl';

interface AdminProductsViewProps {
  onSelectProduct?: (id: string) => void;
  onEditProduct?: (id: string) => void;
  onNavigateTab?: (tab: string, breadcrumb: string) => void;
  showToast: (message: string) => void;
  canWrite: boolean;
}

type FormState = {
  name: string;
  categoryId: string;
  brandId: string;
  sizeSystemId: string;
  basePrice: string;
  description: string;
  gender: string;
  season: string;
  style: string;
  materialCare: string;
  saleStatus: SaleStatus;
};

const initialForm: FormState = {
  name: '', categoryId: '', brandId: '', sizeSystemId: '', basePrice: '',
  description: '', gender: '', season: '', style: '', materialCare: '', saleStatus: 'ON_SALE',
};

export const AdminProductsView: React.FC<AdminProductsViewProps> = ({
  onSelectProduct,
  onEditProduct,
  onNavigateTab,
  showToast,
  canWrite,
}) => {
  const [meta, setMeta] = useState<CatalogMetaDto | null>(null);
  const [queryInput, setQueryInput] = useState('');
  const [query, setQuery] = useState('');
  const [saleStatus, setSaleStatus] = useState<SaleStatus | ''>('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [view, setView] = useState<'table' | 'cards'>('table');
  const [pendingProductId, setPendingProductId] = useState<number | null>(null);
  const [lastCreatedId, setLastCreatedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const list = useRemoteQuery(useCallback(() => adminProductService.getProducts({ category_id: categoryId ? Number(categoryId) : undefined, brand_id: brandId ? Number(brandId) : undefined, ...(query ? { q: query } : {}), ...(saleStatus ? { sale_status: saleStatus } : {}), page, page_size: 20 }), [page, query, saleStatus, categoryId, brandId]));
  const products = list.data?.data ?? [];
  const pagination = list.data?.meta ?? null;
  const loading = list.loading;
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [images, setImages] = useState<File[]>([]);

  const canDiscard = useDirtyForm(JSON.stringify(form) !== JSON.stringify(initialForm) || images.length > 0);

  useEffect(() => {
    let active = true;
    void adminCatalogMetaService.getMeta()
      .then((result) => { if (active) setMeta(result); })
      .catch((requestError: unknown) => {
        if (active) setError(getApiErrorMessage(requestError, 'Không thể tải metadata catalog.'));
      });
    return () => { active = false; };
  }, []);



  const leafCategories = useMemo(() => {
    if (!meta) return [];
    const parents = new Set(
      meta.categories
        .map((item) => item.parent_category_id)
        .filter((id): id is number => id !== null),
    );
    return meta.categories.filter((item) => !parents.has(item.category_id));
  }, [meta]);

  const openProduct = (id: number, callback?: (id: string) => void) => {
    callback?.(String(id));
  };

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const createPayload = (): ProductCreateInput | null => {
    const categoryId = Number(form.categoryId);
    const sizeSystemId = Number(form.sizeSystemId);
    const basePrice = Number(form.basePrice);
    const brandId = form.brandId ? Number(form.brandId) : null;
    if (
      !meta
      || !form.name.trim()
      || !leafCategories.some((item) => item.category_id === categoryId)
      || !meta.size_systems.some((item) => item.size_system_id === sizeSystemId)
      || !Number.isFinite(basePrice)
      || basePrice < 0
      || (brandId !== null && !meta.brands.some((item) => item.brand_id === brandId))
    ) return null;
    return {
      category_id: categoryId,
      brand_id: brandId,
      size_system_id: sizeSystemId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      gender: form.gender || null,
      season: form.season || null,
      style: form.style || null,
      material_care: form.materialCare.trim() || null,
      base_price: basePrice,
      sale_status: form.saleStatus,
      variants: [],
    };
  };

  const finishCreate = (productId: number) => {
    setForm(initialForm);
    setImages([]);
    setShowCreate(false);
    setPendingProductId(null); setLastCreatedId(productId); list.reload();
  };

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canWrite || submitting) return;
    const payload = createPayload();
    if (!payload) {
      showToast('Dữ liệu sản phẩm chưa hợp lệ.');
      return;
    }
    if (images.length > 10) {
      showToast('Mỗi lần chỉ tải tối đa 10 ảnh.');
      return;
    }

    setSubmitting(true);
    try {
      const created = pendingProductId ? { product_id: pendingProductId, name: form.name } : await adminProductService.createProduct(payload);
      setPendingProductId(created.product_id);

      if (images.length > 0) {
        try {
          await adminProductService.uploadImages(created.product_id, images);
        } catch (uploadError: unknown) {
          setLastCreatedId(created.product_id);
          showToast(`Đã tạo ${created.name}, nhưng tải ảnh thất bại. Hãy bổ sung ảnh trong chi tiết sản phẩm.`);
          setError(getApiErrorMessage(uploadError, 'Tải ảnh sản phẩm thất bại.'));
          return;
        }
      }

      finishCreate(created.product_id);
      showToast(`Đã tạo ${created.name}.`);
    } catch (requestError: unknown) {
      showToast(getApiErrorMessage(requestError, 'Không thể tạo sản phẩm. Kiểm tra quyền và dữ liệu catalog.'));
    } finally {
      setSubmitting(false);
    }
  };

  const requestSearch = (nextQuery: string, nextStatus: SaleStatus | '') => {
    list.reload();
    setPage(1);
    setQuery(nextQuery);
    setSaleStatus(nextStatus);
  };

  const changePage = (nextPage: number) => {
    list.reload();
    setPage(nextPage);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B5038]">Catalog admin</p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-[#0B2419]">Sản phẩm</h1>
          <p className="mt-2 text-sm text-[#606863]">Danh sách tìm kiếm/lọc/phân trang trên backend; ảnh upload đi qua backend.</p>
        </div>
        <div className="flex gap-2">
          {onNavigateTab && <button type="button" onClick={() => onNavigateTab('categories', 'Danh mục')} className="border border-[#D9DDD6] bg-white px-4 py-2 text-sm font-semibold">Metadata</button>}
          {canWrite && <button type="button" onClick={() => { if (!showCreate || canDiscard()) setShowCreate((value) => !value); }} className="bg-[#0B2419] px-4 py-2 text-sm font-bold uppercase text-white">{showCreate ? 'Đóng' : 'Thêm sản phẩm'}</button>}
        </div>
      </div>

      <form onSubmit={(event) => { event.preventDefault(); requestSearch(queryInput.trim(), saleStatus); }} className="flex flex-wrap gap-3 rounded-lg border border-[#E2E5DE] bg-white p-4">
        <input value={queryInput} onChange={(event) => setQueryInput(event.target.value)} placeholder="Tên sản phẩm" className="min-w-64 flex-1 border border-[#D9DDD6] px-3 py-2 text-sm" />
        <select value={saleStatus} onChange={(event) => requestSearch(query, event.target.value as SaleStatus | '')} className="border border-[#D9DDD6] px-3 py-2 text-sm"><option value="">Mọi trạng thái</option><option value="ON_SALE">{statusLabel('ON_SALE')}</option><option value="STOPPED">{statusLabel('STOPPED')}</option></select>
        <select aria-label="Lọc danh mục" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(1); }}><option value="">Tất cả danh mục</option>{meta?.categories.map((item) => <option key={item.category_id} value={item.category_id}>{item.name}</option>)}</select>
        <select aria-label="Lọc thương hiệu" value={brandId} onChange={(event) => { setBrandId(event.target.value); setPage(1); }}><option value="">Tất cả thương hiệu</option>{meta?.brands.map((item) => <option key={item.brand_id} value={item.brand_id}>{item.name}</option>)}</select>
        <button className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase text-white">Tìm</button>
        <button type="button" aria-pressed={view === 'table'} className="admin-secondary" onClick={() => setView(view === 'table' ? 'cards' : 'table')}>{view === 'table' ? 'Xem dạng thẻ' : 'Xem dạng bảng'}</button>
      </form>

      {lastCreatedId && <div role="status" className="admin-state">Đã tạo sản phẩm #{lastCreatedId}. {pendingProductId && 'Ảnh chưa được tải lên. Các tệp vẫn được giữ để thử lại.'}<button type="button" className="admin-secondary" onClick={() => openProduct(lastCreatedId, onSelectProduct)}>Mở sản phẩm đã tạo</button></div>}
      {canWrite && showCreate && (
        <form onSubmit={create} className="space-y-4 rounded-lg border border-[#E2E5DE] bg-white p-5"><fieldset disabled={submitting} className="contents">
          <fieldset disabled={pendingProductId !== null} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1"><span className="text-xs font-semibold">Tên *</span><input required maxLength={255} value={form.name} onChange={(event) => updateForm('name', event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" /></label>
            <label className="space-y-1"><span className="text-xs font-semibold">Danh mục lá *</span><select required value={form.categoryId} onChange={(event) => updateForm('categoryId', event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"><option value="">Chọn</option>{leafCategories.map((item) => <option key={item.category_id} value={item.category_id}>{item.name}</option>)}</select></label>
            <label className="space-y-1"><span className="text-xs font-semibold">Hệ size *</span><select required value={form.sizeSystemId} onChange={(event) => updateForm('sizeSystemId', event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"><option value="">Chọn</option>{meta?.size_systems.map((item) => <option key={item.size_system_id} value={item.size_system_id}>{item.name}</option>)}</select></label>
            <label className="space-y-1"><span className="text-xs font-semibold">Brand</span><select value={form.brandId} onChange={(event) => updateForm('brandId', event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"><option value="">Không gán</option>{meta?.brands.map((item) => <option key={item.brand_id} value={item.brand_id}>{item.name}</option>)}</select></label>
            <label className="space-y-1"><span className="text-xs font-semibold">Giá *</span><input required type="number" min="0" step="0.01" value={form.basePrice} onChange={(event) => updateForm('basePrice', event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" /></label>
            <label className="space-y-1"><span className="text-xs font-semibold">Trạng thái</span><select value={form.saleStatus} onChange={(event) => updateForm('saleStatus', event.target.value as SaleStatus)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"><option value="ON_SALE">{statusLabel('ON_SALE')}</option><option value="STOPPED">{statusLabel('STOPPED')}</option></select></label>
            <label className="space-y-1"><span className="text-xs font-semibold">Gender</span><select value={form.gender} onChange={(event) => updateForm('gender', event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"><option value="">—</option>{meta?.genders.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="space-y-1"><span className="text-xs font-semibold">Ảnh local</span><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => setImages(Array.from(event.target.files ?? []))} className="w-full text-xs" /></label>
          </fieldset>
          <ImageFilePreview files={images} />
          <label className="block space-y-1"><span className="text-xs font-semibold">Mô tả</span><textarea rows={3} disabled={pendingProductId !== null} value={form.description} onChange={(event) => updateForm('description', event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" /></label>
          <button disabled={submitting || !meta} className="bg-[#0B2419] px-5 py-2.5 text-xs font-bold uppercase text-white disabled:opacity-40">{submitting ? 'Đang lưu...' : pendingProductId ? 'Thử tải ảnh lại' : 'Tạo sản phẩm'}</button>
        </fieldset></form>
      )}

      <QueryFeedback error={list.error} onRetry={list.reload} />
      {error && <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading ? (
        <div className="rounded-lg border border-[#E2E5DE] bg-white p-10 text-center text-sm">Đang tải...</div>
      ) : list.error ? null : products.length === 0 ? (
        <div className="rounded-lg border border-[#E2E5DE] bg-white p-10 text-center text-sm">Không có sản phẩm phù hợp.</div>
      ) : view === 'table' ? <AdminProductTable products={products} meta={meta} onOpen={(id) => openProduct(id, onSelectProduct)} /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const image = resolveImageUrl(product.thumbnail);
            return <article key={product.product_id} className="overflow-hidden rounded-lg border border-[#E2E5DE] bg-white"><div className="aspect-[3/2] bg-[#F5F6F2]">{image ? <img src={image} alt={product.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-[#606863]">Chưa có ảnh</div>}</div><div className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{product.name}</p><p className="mt-1 text-xs text-[#606863]">Product #{product.product_id} · Category #{product.category_id}</p></div><span className="text-[10px] font-bold">{statusLabel(product.sale_status)}</span></div><p className="mt-3 font-bold">{product.base_price.toLocaleString('vi-VN')}₫</p><div className="mt-4 flex gap-2"><button type="button" onClick={() => openProduct(product.product_id, onSelectProduct)} className="border border-[#0B2419] px-3 py-2 text-xs font-bold uppercase">Chi tiết</button>{canWrite && onEditProduct && <button type="button" onClick={() => openProduct(product.product_id, onEditProduct)} className="bg-[#0B2419] px-3 py-2 text-xs font-bold uppercase text-white">Chỉnh sửa</button>}</div></div></article>;
          })}
        </div>
      )}

      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button type="button" disabled={page <= 1 || loading} onClick={() => changePage(Math.max(1, page - 1))} className="border border-[#D9DDD6] bg-white px-4 py-2 disabled:opacity-40">Trang trước</button>
          <span>Trang {pagination.page} / {pagination.total_pages}</span>
          <button type="button" disabled={page >= pagination.total_pages || loading} onClick={() => changePage(page + 1)} className="border border-[#D9DDD6] bg-white px-4 py-2 disabled:opacity-40">Trang sau</button>
        </div>
      )}
    </div>
  );
};
