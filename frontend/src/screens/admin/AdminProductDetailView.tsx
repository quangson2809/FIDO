import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDirtyForm } from '../../shared/admin/dirtyFormContext';
import { StatusBadge } from '../../shared/admin/StatusBadge';
import { adminCatalogMetaService } from '../../features/catalog/api/adminCatalogMetaService';
import { adminProductService } from '../../features/catalog/api/adminService';
import { ProductAttributeFields } from '../../features/catalog/components/ProductAttributeFields';
import {
  AdminProductGallerySection,
  AdminProductInfoSection,
} from '../../features/catalog/components/AdminProductDetailSections';
import {
  attributeDraftFromValues,
  buildProductAttributeValueIds,
  preserveUnmanagedProductAttributeValueIds,
  productAttributeValuesToIds,
  sameProductAttributeValueIds,
  type ProductAttributeDraft,
} from '../../features/catalog/model/productAttributeForm';
import { buildMovedImageOrder, sortProductImages } from '../../features/catalog/model/productImageOrder';
import { catalogService } from '../../features/catalog/api/service';
import type {
  AdminCatalogMetaDto,
  AdminProductDetailDto,
  CatalogMetaDto,
  ProductPatchInput,
  ProductStatus,
} from '../../features/catalog/types';
import { getApiErrorMessage } from '../../services/http/apiError';

interface Props {
  productId: number;
  onNavigateTab: (tab: string, breadcrumb: string) => void;
  showToast: (message: string) => void;
  canWrite: boolean;
  startEditing?: boolean;
}

const nullableText = (value: string): string | null => value.trim() || null;

const optionalId = (value: string): number | null | undefined => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
};

export const AdminProductDetailView: React.FC<Props> = ({
  productId,
  onNavigateTab,
  showToast,
  canWrite,
  startEditing = false,
}) => {
  const validId = Number.isInteger(productId) && productId > 0;
  const [product, setProduct] = useState<AdminProductDetailDto | null>(null);
  const [catalogMeta, setCatalogMeta] = useState<CatalogMetaDto | null>(null);
  const [adminMeta, setAdminMeta] = useState<AdminCatalogMetaDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [editing, setEditing] = useState(startEditing);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [parentProductId, setParentProductId] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [status, setStatus] = useState<ProductStatus>('DRAFT');
  const [attributeDraft, setAttributeDraft] = useState<ProductAttributeDraft>({});
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const infoDirty = Boolean(
    product &&
      editing &&
      (name !== (product.name ?? '') ||
        sku !== product.sku ||
        slug !== (product.slug ?? '') ||
        description !== (product.description ?? '') ||
        categoryId !== (product.category_id === null ? '' : String(product.category_id)) ||
        brandId !== (product.brand_id === null ? '' : String(product.brand_id)) ||
        parentProductId !==
          (product.parent_product_id === null ? '' : String(product.parent_product_id)) ||
        sellingPrice !== String(product.selling_price) ||
        costPrice !== (product.cost_price === null ? '' : String(product.cost_price)) ||
        status !== product.status ||
        !sameProductAttributeValueIds(
          preserveUnmanagedProductAttributeValueIds(
            product.attribute_values,
            adminMeta?.attributes ?? [],
            buildProductAttributeValueIds(
              adminMeta?.attributes ?? [],
              attributeDraft,
              status,
            ).values,
          ),
          productAttributeValuesToIds(product.attribute_values),
        )),
  );
  const canDiscard = useDirtyForm(infoDirty || imageFiles.length > 0);

  const populateForm = useCallback((
    detail: AdminProductDetailDto,
    attributes: AdminCatalogMetaDto | null,
  ) => {
    setName(detail.name ?? '');
    setSku(detail.sku);
    setSlug(detail.slug ?? '');
    setDescription(detail.description ?? '');
    setCategoryId(detail.category_id === null ? '' : String(detail.category_id));
    setBrandId(detail.brand_id === null ? '' : String(detail.brand_id));
    setParentProductId(
      detail.parent_product_id === null ? '' : String(detail.parent_product_id),
    );
    setSellingPrice(String(detail.selling_price));
    setCostPrice(detail.cost_price === null ? '' : String(detail.cost_price));
    setStatus(detail.status);
    setAttributeDraft(
      attributeDraftFromValues(attributes?.attributes ?? [], detail.attribute_values),
    );
  }, []);

  useEffect(() => {
    if (!validId) return undefined;
    let active = true;
    void Promise.resolve()
      .then(() => {
        if (active) setLoading(true);
        return Promise.allSettled([
          adminProductService.getProduct(productId),
          catalogService.getMeta(),
          adminCatalogMetaService.getMeta(),
        ]);
      })
      .then(([detailResult, catalogResult, adminResult]) => {
        if (!active) return;

        if (detailResult.status === 'fulfilled') {
          setProduct(detailResult.value);
          setError(null);
          const attributes =
            adminResult.status === 'fulfilled' ? adminResult.value : null;
          populateForm(detailResult.value, attributes);
        } else {
          setError(
            getApiErrorMessage(
              detailResult.reason,
              'Không thể tải chi tiết Product quản trị.',
            ),
          );
        }

        const metadataIssues: string[] = [];
        if (catalogResult.status === 'fulfilled') {
          setCatalogMeta(catalogResult.value);
        } else {
          setCatalogMeta(null);
          metadataIssues.push(
            getApiErrorMessage(
              catalogResult.reason,
              'Không thể tải metadata Category/Brand.',
            ),
          );
        }

        if (adminResult.status === 'fulfilled') {
          setAdminMeta(adminResult.value);
        } else {
          setAdminMeta(null);
          metadataIssues.push(
            getApiErrorMessage(
              adminResult.reason,
              'Không thể tải metadata Attribute.',
            ),
          );
        }
        setMetaError(metadataIssues.join(' '));
        if (metadataIssues.length > 0) setEditing(false);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [productId, validId, revision, populateForm]);

  const orderedImages = useMemo(() => sortProductImages(product?.images ?? []), [product]);
  if (!validId) return <div className="admin-state" role="alert">Mã Product không hợp lệ.</div>;

  const saveProduct = async () => {
    if (!canWrite || !product || busy) return;
    if (!catalogMeta || !adminMeta) {
      setError('Không thể sửa Product khi metadata Category/Brand/Attribute chưa tải đầy đủ.');
      return;
    }

    const parent = optionalId(parentProductId);
    const category = optionalId(categoryId);
    const brand = optionalId(brandId);
    const price = Number(sellingPrice);
    const cost = costPrice.trim() ? Number(costPrice) : null;
    if (parent === undefined) {
      setError('Product cha ID phải là số nguyên dương hoặc để trống.');
      return;
    }
    if (
      category === undefined ||
      (category !== null &&
        !catalogMeta.categories.some(
          (item) => item.category_id === category && item.status === 'ACTIVE',
        ))
    ) {
      setError('Danh mục không hợp lệ hoặc không còn ACTIVE.');
      return;
    }
    if (
      brand === undefined ||
      (brand !== null &&
        !catalogMeta.brands.some(
          (item) => item.brand_id === brand && item.status === 'ACTIVE',
        ))
    ) {
      setError('Thương hiệu không hợp lệ hoặc không còn ACTIVE.');
      return;
    }
    if (
      !sku.trim() ||
      sku.trim().length > 100 ||
      name.length > 255 ||
      slug.length > 200 ||
      !sellingPrice.trim() ||
      !Number.isSafeInteger(price) ||
      price < 0 ||
      (cost !== null && (!Number.isSafeInteger(cost) || cost < 0))
    ) {
      setError('Kiểm tra SKU, tên, slug và giá VND nguyên không âm.');
      return;
    }

    const attributesResult = buildProductAttributeValueIds(adminMeta.attributes, attributeDraft, status);
    if (attributesResult.errors.length > 0) {
      setError(attributesResult.errors.join(' '));
      return;
    }

    const fullAttributeValues = preserveUnmanagedProductAttributeValueIds(
      product.attribute_values,
      adminMeta.attributes,
      attributesResult.attributeValueIds,
    );
    const patch: ProductPatchInput = {};
    if (sku.trim() !== product.sku) patch.sku = sku.trim();
    const nextName = nullableText(name);
    if (nextName !== product.name) patch.name = nextName;
    const nextSlug = nullableText(slug);
    if (nextSlug !== product.slug) patch.slug = nextSlug;
    const nextDescription = nullableText(description);
    if (nextDescription !== product.description) patch.description = nextDescription;
    if (category !== product.category_id) patch.category_id = category;
    if (brand !== product.brand_id) patch.brand_id = brand;
    if (parent !== product.parent_product_id) patch.parent_product_id = parent;
    if (price !== product.selling_price) patch.selling_price = price;
    if (cost !== product.cost_price) patch.cost_price = cost;
    if (status !== product.status) patch.status = status;
    if (
      !sameProductAttributeValueIds(
        fullAttributeValues,
        productAttributeValuesToIds(product.attribute_values),
      )
    ) {
      patch.attribute_value_ids = fullAttributeValues;
    }

    if (Object.keys(patch).length === 0) {
      setEditing(false);
      setError(null);
      showToast('Không có trường nào thay đổi.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const detail = await adminProductService.updateProduct(product.product_id, patch);
      setProduct(detail);
      populateForm(detail, adminMeta);
      setEditing(false);
      setImageFiles([]);
      showToast('Đã cập nhật Product.');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể cập nhật Product.'));
    } finally {
      setBusy(false);
    }
  };

  const cancelProductEdit = () => {
    if (!product || !canDiscard()) return;
    populateForm(product, adminMeta);
    setEditing(false);
    setError(null);
  };

  const uploadImages = async () => {
    if (!canWrite || !product || busy || editing || imageFiles.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const detail = await adminProductService.uploadImages(product.product_id, imageFiles);
      setProduct(detail);
      setImageFiles([]);
      showToast('Đã tải ảnh Product.');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể tải ảnh Product.'));
    } finally {
      setBusy(false);
    }
  };

  const moveImage = async (imageId: number, direction: -1 | 1) => {
    if (!canWrite || !product || busy || editing) return;
    const nextOrder = buildMovedImageOrder(orderedImages, imageId, direction);
    if (!nextOrder) return;
    setBusy(true);
    setError(null);
    try {
      const detail = await adminProductService.reorderImages(product.product_id, nextOrder);
      setProduct(detail);
      showToast('Đã cập nhật thứ tự ảnh.');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể đổi thứ tự ảnh.'));
    } finally {
      setBusy(false);
    }
  };

  const deleteImage = async (imageId: number) => {
    if (!canWrite || !product || busy || editing) return;
    if (!window.confirm('Xóa ảnh #' + imageId + ' khỏi Product?')) return;
    setBusy(true);
    setError(null);
    try {
      await adminProductService.deleteImage(product.product_id, imageId);
      const detail = await adminProductService.getProduct(product.product_id);
      setProduct(detail);
      populateForm(detail, adminMeta);
      showToast('Đã xóa ảnh Product.');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể xóa ảnh Product.'));
    } finally {
      setBusy(false);
    }
  };

  const deleteProduct = async () => {
    if (!canWrite || !product || busy) return;
    if (!window.confirm('Xóa Product ' + product.sku + '? Thao tác có thể bị từ chối nếu Product có sản phẩm con.')) return;
    setBusy(true);
    setError(null);
    try {
      await adminProductService.deleteProduct(product.product_id);
      showToast('Đã xóa Product ' + product.sku + '.');
      onNavigateTab('products', 'Sản phẩm');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể xóa Product.'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div role="status" className="admin-state">Đang tải chi tiết Product...</div>;
  }
  if (!product) {
    return (
      <div className="admin-state" role="alert">
        <p>{error ?? 'Không tìm thấy Product.'}</p>
        <button type="button" onClick={() => setRevision((value) => value + 1)} className="admin-secondary">
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button type="button" onClick={() => onNavigateTab('products', 'Sản phẩm')} className="text-xs font-bold uppercase underline">
            ← Danh sách Product
          </button>
          <h1 className="mt-2 font-serif text-2xl font-bold">{product.name ?? product.sku}</h1>
          <p className="mt-1 font-mono text-xs text-[#606863]">Product #{product.product_id} · {product.sku}</p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={product.status} />
          {canWrite && !editing && (
            <button
              type="button"
              disabled={busy || !catalogMeta || !adminMeta}
              onClick={() => setEditing(true)}
              className="admin-secondary disabled:opacity-40"
            >
              Chỉnh sửa
            </button>
          )}
          {canWrite && !editing && (
            <button type="button" disabled={busy} onClick={() => void deleteProduct()} className="admin-secondary text-red-700">
              Xóa Product
            </button>
          )}
        </div>
      </header>
      {error && <div role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {metaError && <div role="alert" className="border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{metaError} Việc sửa Product cần metadata đầy đủ; phần chi tiết vẫn có thể xem.</div>}

      {editing && canWrite ? (
        <section className="rounded-lg border border-[#E2E5DE] bg-white p-5">
          <h2 className="font-serif text-xl font-bold">Chỉnh sửa Product</h2>
          <fieldset disabled={busy} className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-xs font-semibold">SKU</span>
                <input required maxLength={100} value={sku} onChange={(event) => setSku(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold">Tên Product</span>
                <input maxLength={255} value={name} onChange={(event) => setName(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold">Slug</span>
                <input maxLength={200} value={slug} onChange={(event) => setSlug(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold">Product cha ID</span>
                <input type="number" min="1" step="1" value={parentProductId} onChange={(event) => setParentProductId(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" />
                <span className="block text-xs text-[#606863]">Để trống nếu Product độc lập. Product con không phải Variant legacy.</span>
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold">Danh mục</span>
                <select aria-label="Danh mục Product" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="w-full border border-[#D9DDD6] bg-white px-3 py-2 text-sm">
                  <option value="">Không chọn danh mục</option>
                  {catalogMeta?.categories.filter((item) => item.status === 'ACTIVE' || item.category_id === product.category_id).map((item) => (
                    <option key={item.category_id} value={item.category_id}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold">Thương hiệu</span>
                <select aria-label="Thương hiệu Product" value={brandId} onChange={(event) => setBrandId(event.target.value)} className="w-full border border-[#D9DDD6] bg-white px-3 py-2 text-sm">
                  <option value="">Không chọn thương hiệu</option>
                  {catalogMeta?.brands.filter((item) => item.status === 'ACTIVE' || item.brand_id === product.brand_id).map((item) => (
                    <option key={item.brand_id} value={item.brand_id}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold">Giá bán (VND)</span>
                <input required aria-label="Giá bán (VND)" type="number" min="0" step="1" value={sellingPrice} onChange={(event) => setSellingPrice(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold">Giá vốn (VND, tùy chọn)</span>
                <input type="number" min="0" step="1" value={costPrice} onChange={(event) => setCostPrice(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold">Trạng thái Product</span>
                <select aria-label="Trạng thái Product" value={status} onChange={(event) => setStatus(event.target.value as ProductStatus)} className="w-full border border-[#D9DDD6] bg-white px-3 py-2 text-sm">
                  <option value="DRAFT">DRAFT</option><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option><option value="ARCHIVED">ARCHIVED</option>
                </select>
              </label>
            </div>
            <label className="block space-y-1">
              <span className="text-xs font-semibold">Mô tả</span>
              <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="w-full border border-[#D9DDD6] px-3 py-2 text-sm" />
            </label>
            <div className="space-y-3 border-t border-[#E2E5DE] pt-4">
              <h3 className="font-semibold">Typed Attribute values</h3>
              <ProductAttributeFields
                attributes={adminMeta?.attributes ?? []}
                draft={attributeDraft}
                status={status}
                disabled={busy}
                onChange={(attributeId, value) => setAttributeDraft((current) => ({ ...current, [String(attributeId)]: value }))}
              />
              <p className="text-xs text-[#606863]">Khi thay đổi Attribute, API nhận tập thay thế đầy đủ; nếu không thay đổi thì trường này được bỏ khỏi PATCH.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => void saveProduct()} className="admin-primary disabled:opacity-40">{busy ? 'Đang lưu...' : 'Lưu'}</button>
              <button type="button" disabled={busy} onClick={cancelProductEdit} className="admin-secondary">Hủy</button>
            </div>
          </fieldset>
        </section>
      ) : (
        <AdminProductInfoSection
          product={product}
          editing={false}
          busy={busy}
          canWrite={false}
          name={name}
          sku={sku}
          slug={slug}
          description={description}
          sellingPrice={sellingPrice}
          costPrice={costPrice}
          status={status}
          onEditingChange={setEditing}
          onNameChange={setName}
          onSkuChange={setSku}
          onSlugChange={setSlug}
          onDescriptionChange={setDescription}
          onSellingPriceChange={setSellingPrice}
          onCostPriceChange={setCostPrice}
          onStatusChange={setStatus}
          onSave={() => void saveProduct()}
          onCancel={cancelProductEdit}
        />
      )}
      <AdminProductGallerySection
        productName={product.name ?? product.sku}
        images={orderedImages}
        imageFiles={imageFiles}
        busy={busy || editing}
        canWrite={canWrite && !editing}
        onFilesChange={setImageFiles}
        onUpload={() => void uploadImages()}
        onMove={(imageId, direction) => void moveImage(imageId, direction)}
        onDelete={(imageId) => void deleteImage(imageId)}
      />
    </div>
  );
};
