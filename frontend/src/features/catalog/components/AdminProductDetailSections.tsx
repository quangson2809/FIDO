import { VariantPriceEditor } from './VariantPriceEditor';
import { ImageFilePreview } from './ImageFilePreview';
import { statusLabel } from '../../../shared/admin/statusLabels';
import React from 'react';
import type {
  AdminProductDetailDto,
  AdminVariantDto,
  CatalogMetaDto,
  ColorDto,
  ProductImageDto,
  SaleStatus,
  SizeValueDto,
} from '../types';
import { resolveImageUrl } from '../../../services/media/imageUrl';

export const AdminProductInfoSection: React.FC<{
  product: AdminProductDetailDto;
  editing: boolean;
  busy: boolean;
  canWrite: boolean;
  name: string;
  description: string;
  basePrice: string;
  saleStatus: SaleStatus;
  onEditingChange: (editing: boolean) => void;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onBasePriceChange: (value: string) => void;
  onSaleStatusChange: (value: SaleStatus) => void;
  onSave: () => void;
  onCancel: () => void;
}> = ({
  product,
  editing,
  busy,
  canWrite,
  name,
  description,
  basePrice,
  saleStatus,
  onEditingChange,
  onNameChange,
  onDescriptionChange,
  onBasePriceChange,
  onSaleStatusChange,
  onSave,
  onCancel,
}) => (
  <section id="product-info" className="rounded-lg border border-[#E2E5DE] bg-white p-5">
    <div className="flex items-center justify-between">
      <h2 className="font-serif text-xl font-bold">Thông tin sản phẩm</h2>
      {!editing && canWrite && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onEditingChange(true)}
          className="text-xs font-bold uppercase underline"
        >
          Chỉnh sửa
        </button>
      )}
    </div>

    {editing && canWrite ? (
      <fieldset disabled={busy} className="mt-4 space-y-3">
        <label className="block space-y-1">
          <span className="text-xs font-semibold">Tên</span>
          <input
            maxLength={255}
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold">Mô tả</span>
          <textarea
            rows={3}
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-semibold">Giá cơ sở</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={basePrice}
              onChange={(event) => onBasePriceChange(event.target.value)}
              className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold">Trạng thái bán</span>
            <select
              value={saleStatus}
              onChange={(event) => onSaleStatusChange(event.target.value as SaleStatus)}
              className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"
            >
              <option value="ON_SALE">{statusLabel('ON_SALE')}</option>
              <option value="STOPPED">{statusLabel('STOPPED')}</option>
            </select>
          </label>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onSave}
            className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase text-white disabled:opacity-40"
          >
            Lưu
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="border border-[#0B2419] px-4 py-2 text-xs font-bold uppercase"
          >
            Hủy
          </button>
        </div>
      </fieldset>
    ) : (
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4"><dt className="text-[#606863]">Danh mục</dt><dd>{product.category.name}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-[#606863]">Thương hiệu</dt><dd>{product.brand?.name ?? '—'}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-[#606863]">Hệ size</dt><dd>{product.size_system.name}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-[#606863]">Giá</dt><dd className="font-bold">{product.base_price.toLocaleString('vi-VN')}₫</dd></div>
        <div className="border-t border-[#E2E5DE] pt-2">
          <dt className="text-[#606863]">Mô tả</dt>
          <dd className="mt-1 whitespace-pre-wrap">{product.description ?? '—'}</dd>
        </div>
      </dl>
    )}
  </section>
);

export const AdminProductGallerySection: React.FC<{
  productName: string;
  images: readonly ProductImageDto[];
  imageFiles: readonly File[];
  busy: boolean;
  canWrite: boolean;
  onFilesChange: (files: File[]) => void;
  onUpload: () => void;
  onMove: (imageId: number, direction: -1 | 1) => void;
  onDelete: (imageId: number) => void;
}> = ({
  productName,
  images,
  imageFiles,
  busy,
  canWrite,
  onFilesChange,
  onUpload,
  onMove,
  onDelete,
}) => (
  <section id="product-images" className="rounded-lg border border-[#E2E5DE] bg-white p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="font-serif text-xl font-bold">Ảnh sản phẩm</h2>
        <p className="mt-1 text-xs text-[#606863]">
          Ảnh đầu tiên là ảnh bìa. Dùng các nút mũi tên để đổi thứ tự ảnh.
        </p>
      </div>
      <span className="text-xs text-[#606863]">{images.length} ảnh</span>
    </div>

    {canWrite ? (
      <div className="mt-4 flex flex-wrap items-center gap-3 border border-dashed border-[#D9DDD6] bg-[#F8FAF4] p-3">
        <input
          aria-label="Chọn ảnh sản phẩm"
          disabled={busy}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => onFilesChange(Array.from(event.target.files ?? []))}
          className="min-w-0 flex-1 text-xs"
        />
        <button
          type="button"
          disabled={busy || imageFiles.length === 0}
          onClick={onUpload}
          className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase text-white disabled:opacity-40"
        >
          Tải {imageFiles.length || ''} ảnh
        </button>
      </div>
    ) : (
      <p className="mt-4 text-xs text-[#687069]">Chế độ chỉ đọc. Bạn chưa có quyền thay đổi ảnh.</p>
    )}

    <ImageFilePreview files={imageFiles} />
    {images.length === 0 ? (
      <div className="mt-4 border border-[#E2E5DE] bg-[#F5F6F2] p-8 text-center text-sm text-[#606863]">
        Chưa có ảnh sản phẩm.
      </div>
    ) : (
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {images.map((image, index) => {
          const url = resolveImageUrl(image.image_url);
          return (
            <figure key={image.image_id} className="border border-[#E2E5DE] bg-[#F5F6F2]">
              {url ? (
                <img src={url} alt={image.alt_text ?? productName} className="aspect-[3/4] w-full object-cover" />
              ) : (
                <div className="aspect-[3/4]" />
              )}
              <figcaption className="space-y-2 p-2 text-[10px] text-[#606863]">
                <div className="flex items-center justify-between gap-2">
                  <span>#{image.image_id} · order {image.sort_order}</span>
                  {index === 0 && <span className="bg-[#0B2419] px-1.5 py-0.5 font-bold text-white">COVER</span>}
                </div>
                {canWrite && <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    disabled={busy || index === 0}
                    aria-label={`Đưa ảnh ${index + 1} lên trước`}
                    onClick={() => onMove(image.image_id, -1)}
                    className="border border-[#D9DDD6] px-1 py-1 disabled:opacity-30"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    disabled={busy || index === images.length - 1}
                    aria-label={`Đưa ảnh ${index + 1} ra sau`}
                    onClick={() => onMove(image.image_id, 1)}
                    className="border border-[#D9DDD6] px-1 py-1 disabled:opacity-30"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onDelete(image.image_id)}
                    className="border border-red-200 px-1 py-1 text-red-700 disabled:opacity-30"
                  >
                    Xóa
                  </button>
                </div>}
              </figcaption>
            </figure>
          );
        })}
      </div>
    )}
  </section>
);

export const AdminProductVariantsPanel: React.FC<{
  product: AdminProductDetailDto;
  meta: CatalogMetaDto | null;
  sizesById: ReadonlyMap<number, SizeValueDto>;
  colorsById: ReadonlyMap<number, ColorDto>;
  busy: boolean;
  canWrite: boolean;
  variantSize: string;
  variantColor: string;
  variantSku: string;
  variantOverridePrice: string;
  onVariantSizeChange: (value: string) => void;
  onVariantColorChange: (value: string) => void;
  onVariantSkuChange: (value: string) => void;
  onVariantOverridePriceChange: (value: string) => void;
  onAddVariant: () => void;
  onBusyChange: (busy: boolean) => void;
  onVariantSaved: (variant: AdminVariantDto) => void;
  onToggleVariant: (variantId: number, saleStatus: SaleStatus) => void;
}> = ({
  product,
  meta,
  sizesById,
  colorsById,
  busy,
  canWrite,
  variantSize,
  variantColor,
  variantSku,
  variantOverridePrice,
  onVariantSizeChange,
  onVariantColorChange,
  onVariantSkuChange,
  onVariantOverridePriceChange,
  onAddVariant,
  onToggleVariant,
  onVariantSaved,
  onBusyChange,
}) => (
  <aside id="product-variants" className="space-y-5">
    {canWrite && <section className="rounded-lg border border-[#E2E5DE] bg-white p-5">
      <h2 className="font-serif text-xl font-bold">Thêm biến thể</h2>
      <div className="mt-4 space-y-3">
        <select aria-label="Chọn size"
          disabled={busy}
          value={variantSize}
          onChange={(event) => onVariantSizeChange(event.target.value)}
          className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"
        >
          <option value="">Chọn size</option>
          {product.size_system.size_values.map((item) => (
            <option key={item.size_value_id} value={item.size_value_id}>{item.display_name}</option>
          ))}
        </select>
        <select aria-label="Chọn màu"
          disabled={busy}
          value={variantColor}
          onChange={(event) => onVariantColorChange(event.target.value)}
          className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"
        >
          <option value="">Chọn màu</option>
          {meta?.colors.map((item) => <option key={item.color_id} value={item.color_id} disabled={product.variants.some((variant) => variant.size_value_id === Number(variantSize) && variant.color_id === item.color_id)}>{item.name}{product.variants.some((variant) => variant.size_value_id === Number(variantSize) && variant.color_id === item.color_id) ? " · Đã có" : ""}</option>)}
        </select>
        <input aria-label="SKU (không bắt buộc)"
          maxLength={100}
          disabled={busy}
          value={variantSku}
          onChange={(event) => onVariantSkuChange(event.target.value)}
          placeholder="SKU (không bắt buộc)"
          className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"
        />
        <input aria-label="Giá riêng (không bắt buộc)"
          type="number"
          min="0"
          step="0.01"
          disabled={busy}
          value={variantOverridePrice}
          onChange={(event) => onVariantOverridePriceChange(event.target.value)}
          placeholder="Giá riêng (không bắt buộc)"
          className="w-full border border-[#D9DDD6] px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={busy || !variantSize || !variantColor || product.variants.some((variant) => variant.size_value_id === Number(variantSize) && variant.color_id === Number(variantColor))}
          onClick={onAddVariant}
          className="w-full bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase text-white disabled:opacity-40"
        >
          Thêm biến thể
        </button>
      </div>
    </section>}

    <section className="rounded-lg border border-[#E2E5DE] bg-white p-5">
      <h2 className="font-serif text-xl font-bold">Biến thể hiện tại</h2>
      <div className="mt-4 space-y-3">
        {product.variants.length === 0 ? (
          <p className="text-sm text-[#606863]">Chưa có biến thể.</p>
        ) : product.variants.map((variant) => {
          const size = sizesById.get(variant.size_value_id);
          const color = colorsById.get(variant.color_id);
          return (
            <div key={variant.variant_id} className="border border-[#E2E5DE] p-3 text-sm">
              <div className="flex justify-between gap-3">
                <strong>
                  {size?.display_name ?? `Size #${variant.size_value_id}`} · {color?.name ?? `Color #${variant.color_id}`}
                </strong>
                <span className="text-[10px] font-bold">{statusLabel(variant.sale_status)}</span>
              </div>
              <p className="mt-1 text-xs text-[#606863]">
                {variant.sku ?? `Variant #${variant.variant_id}`} · Tồn {variant.available_quantity}
              </p>
              <p className="mt-1 text-xs">
                Giá riêng: {variant.override_price === null ? '—' : `${variant.override_price.toLocaleString('vi-VN')}₫`}
              </p>
              {canWrite && <VariantPriceEditor key={`${variant.variant_id}-${variant.override_price}`} variant={variant} onSaved={onVariantSaved} busy={busy} onBusyChange={onBusyChange} />}
              {canWrite && <button
                type="button"
                disabled={busy}
                onClick={() => onToggleVariant(variant.variant_id, variant.sale_status)}
                className="mt-2 text-xs font-bold uppercase underline"
              >
                {variant.sale_status === 'ON_SALE' ? 'Dừng bán' : 'Bán lại'}
              </button>}
            </div>
          );
        })}
      </div>
    </section>
  </aside>
);
