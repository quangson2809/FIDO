import { statusLabel } from '../../shared/admin/statusLabels';
import { useDirtyForm } from '../../shared/admin/dirtyFormContext';
import React, { useEffect, useMemo, useState } from 'react';
import { adminCatalogMetaService } from '../../features/catalog/api/adminCatalogMetaService';
import { adminProductService } from '../../features/catalog/api/adminService';
import {
  AdminProductGallerySection,
  AdminProductInfoSection,
  AdminProductVariantsPanel,
} from '../../features/catalog/components/AdminProductDetailSections';
import {
  buildMovedImageOrder,
  sortProductImages,
} from '../../features/catalog/model/productImageOrder';
import type { AdminProductDetailDto, CatalogMetaDto, SaleStatus } from '../../features/catalog/types';
import { getApiErrorMessage } from '../../services/http/apiError';

interface Props {
  productId: number;
  onNavigateTab: (tab: string, breadcrumb: string) => void;
  showToast: (message: string) => void;
  canWrite: boolean;
}

export const AdminProductDetailView: React.FC<Props> = ({ productId, onNavigateTab, showToast, canWrite }) => {
  const validId = Number.isInteger(productId) && productId > 0;
  const [product, setProduct] = useState<AdminProductDetailDto | null>(null);
  const [meta, setMeta] = useState<CatalogMetaDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
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

  const infoDirty = Boolean(product && editing && (name !== product.name || description !== (product.description ?? '') || basePrice !== String(product.base_price) || saleStatus !== product.sale_status));
  const canDiscard = useDirtyForm(infoDirty || Boolean(variantSize || variantColor || variantSku || variantOverridePrice || imageFiles.length));

  const applyProduct = (detail: AdminProductDetailDto, preserveDraft = true) => {
    setProduct(detail);
    if (editing && preserveDraft) return;
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
        setProduct(detail); setName(detail.name); setDescription(detail.description ?? ''); setBasePrice(String(detail.base_price)); setSaleStatus(detail.sale_status);
        setMeta(metadata);
        setError(null);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(getApiErrorMessage(requestError, 'Không thể tải chi tiết sản phẩm quản trị.'));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [productId, validId, revision]);

  const colorsById = useMemo(
    () => new Map(meta?.colors.map((item) => [item.color_id, item]) ?? []),
    [meta],
  );
  const sizesById = useMemo(
    () => new Map(product?.size_system.size_values.map((item) => [item.size_value_id, item]) ?? []),
    [product],
  );
  const orderedImages = useMemo(
    () => sortProductImages(product?.images ?? []),
    [product],
  );

  const saveProduct = async () => {
    if (!canWrite || !product || busy) return;

    const price = Number(basePrice);
    if (!name.trim() || !basePrice.trim() || !Number.isFinite(price) || price < 0) { setError('Nhập tên sản phẩm và giá hợp lệ (không âm).'); return; }

    setBusy(true);
    try {
      applyProduct(await adminProductService.updateProduct(product.product_id, {
        name: name.trim(),
        description: description.trim() || null,
        base_price: price,
        sale_status: saleStatus,
      }), false);
      setEditing(false);
      setError(null);
      showToast('Đã cập nhật sản phẩm.');
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể cập nhật sản phẩm.'));
    } finally {
      setBusy(false);
    }
  };

  const cancelProductEdit = () => {
    if (!product) return;
    if (!canDiscard()) return;
    setName(product.name); setDescription(product.description ?? ''); setBasePrice(String(product.base_price)); setSaleStatus(product.sale_status);
    setEditing(false);
  };

  const addVariant = async () => {
    if (!canWrite || !product || busy) return;

    const sizeId = Number(variantSize);
    const colorId = Number(variantColor);
    const override = variantOverridePrice.trim() ? Number(variantOverridePrice) : null;

    if (
      !sizesById.has(sizeId)
      || !colorsById.has(colorId)
      || (override !== null && (!Number.isFinite(override) || override < 0))
    ) { setError('Chọn size, màu và giá hợp lệ.'); return; }
    if (product.variants.some((item) => item.size_value_id === sizeId && item.color_id === colorId)) { setError('Tổ hợp size và màu này đã tồn tại.'); return; }

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
    if (!canWrite || !product || busy) return;

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
    if (!canWrite || !product || busy || imageFiles.length === 0) return;
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
    if (!canWrite || !product || busy) return;

    const nextOrder = buildMovedImageOrder(product.images, imageId, direction);
    if (!nextOrder) return;

    setBusy(true);
    try {
      applyProduct(await adminProductService.reorderImages(product.product_id, nextOrder));
      setError(null);
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'Không thể đổi thứ tự ảnh.'));
    } finally {
      setBusy(false);
    }
  };

  const deleteProductImage = async (imageId: number) => {
    if (!canWrite || !product || busy) return;
    if (!window.confirm(`Xóa ảnh #${imageId} của ${product.name}? Nếu là ảnh bìa, ảnh tiếp theo sẽ thay thế.`)) return;

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
    return (
      <div className="space-y-4 border border-red-200 bg-white p-6 text-sm text-red-700">
        {error ?? 'Không tìm thấy sản phẩm.'}<button type="button" onClick={() => { setLoading(true); setRevision((value) => value + 1); }}>Thử lại</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => onNavigateTab('products', 'Sản phẩm')}
            className="mb-3 text-xs font-bold uppercase underline"
          >
            ← Danh sách
          </button>
          <p className="font-mono text-xs text-[#606863]">Product #{product.product_id}</p>
          <h1 className="mt-1 font-serif text-3xl font-bold">{product.name}</h1>
        </div>
        <span className="bg-[#FAF4DF] px-3 py-2 text-xs font-bold">{statusLabel(product.sale_status)}</span>
      </div>

      {error && <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <nav aria-label="Các bước quản lý sản phẩm" className="admin-steps"><a href="#product-info">1. Thông tin</a><a href="#product-images">2. Hình ảnh</a><a href="#product-variants">3. Biến thể</a></nav>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <AdminProductInfoSection
            product={product}
            editing={editing}
            busy={busy}
            canWrite={canWrite}
            name={name}
            description={description}
            basePrice={basePrice}
            saleStatus={saleStatus}
            onEditingChange={setEditing}
            onNameChange={setName}
            onDescriptionChange={setDescription}
            onBasePriceChange={setBasePrice}
            onSaleStatusChange={setSaleStatus}
            onSave={() => void saveProduct()}
            onCancel={cancelProductEdit}
          />

          <AdminProductGallerySection
            productName={product.name}
            images={orderedImages}
            imageFiles={imageFiles}
            busy={busy}
            canWrite={canWrite}
            onFilesChange={setImageFiles}
            onUpload={() => void uploadProductImages()}
            onMove={(imageId, direction) => void moveImage(imageId, direction)}
            onDelete={(imageId) => void deleteProductImage(imageId)}
          />
        </div>

        <AdminProductVariantsPanel
          product={product}
          meta={meta}
          sizesById={sizesById}
          colorsById={colorsById}
          busy={busy}
          canWrite={canWrite}
          variantSize={variantSize}
          variantColor={variantColor}
          variantSku={variantSku}
          variantOverridePrice={variantOverridePrice}
          onVariantSizeChange={setVariantSize}
          onVariantColorChange={setVariantColor}
          onVariantSkuChange={setVariantSku}
          onVariantOverridePriceChange={setVariantOverridePrice}
          onAddVariant={() => void addVariant()}
          onVariantSaved={(updated) => setProduct((current) => current ? { ...current, variants: current.variants.map((variant) => variant.variant_id === updated.variant_id ? updated : variant) } : current)}
          onToggleVariant={(variantId, current) => void toggleVariant(variantId, current)}
        />
      </div>
    </div>
  );
};
