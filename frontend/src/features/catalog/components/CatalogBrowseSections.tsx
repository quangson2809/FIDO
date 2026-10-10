import { StorefrontIcon } from '../../../components/StorefrontIcon';
import { StorefrontImage } from '../../../shared/ui/storefront/StorefrontImage';
import React from 'react';
import type { CatalogMetaDto, CatalogProductView } from '../types';
import type { PaginationMeta } from '../../../types/api';

interface FilterOption {
  value: string;
  label: string;
}

const FilterSelect: React.FC<{
  label: string;
  value: string | number;
  options: FilterOption[];
  disabled: boolean;
  onChange: (value: string) => void;
}> = ({ label, value, options, disabled, onChange }) => (
  <label className="block">
    <span className="mb-2 block text-[11px] font-bold uppercase tracking-wider">{label}</span>
    <select
      aria-label={label}
      disabled={disabled}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full border border-[#D9DDD6] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0B2419] disabled:opacity-50"
    >
      <option value="">Tất cả</option>
      {options.map((option) => (
        <option key={label + '-' + option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  </label>
);

export const CatalogFiltersPanel: React.FC<{
  meta: CatalogMetaDto | null;
  metaLoading: boolean;
  activeFilterCount: number;
  categoryId: number | undefined;
  brandId: number | undefined;
  sizeValueId: number | undefined;
  colorId: number | undefined;
  gender: string | undefined;
  season: string | undefined;
  style: string | undefined;
  minPriceInput: string;
  maxPriceInput: string;
  onCategoryChange: (value: number | undefined) => void;
  onBrandChange: (value: number | undefined) => void;
  onSizeChange: (value: number | undefined) => void;
  onColorChange: (value: number | undefined) => void;
  onGenderChange: (value: string | undefined) => void;
  onSeasonChange: (value: string | undefined) => void;
  onStyleChange: (value: string | undefined) => void;
  onMinPriceInputChange: (value: string) => void;
  onMaxPriceInputChange: (value: string) => void;
  onApplyPriceRange: () => void;
  onClear: () => void;
  priceErrorId?: string;
  priceInvalid?: boolean;
}> = ({
  meta,
  metaLoading,
  activeFilterCount,
  categoryId,
  brandId,
  sizeValueId,
  colorId,
  gender,
  season,
  style,
  minPriceInput,
  maxPriceInput,
  onCategoryChange,
  onBrandChange,
  onSizeChange,
  onColorChange,
  onGenderChange,
  onSeasonChange,
  onStyleChange,
  onMinPriceInputChange,
  onMaxPriceInputChange,
  onApplyPriceRange,
  onClear,
  priceErrorId, priceInvalid,
}) => (
  <section aria-label="Lọc sản phẩm" className="w-full border border-[#E8E9E3] bg-[#FFFDF5] p-5">
    <div className="flex items-center justify-between border-b border-[#E8E9E3] pb-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#687069]">Lựa chọn của bạn</p>
        <h2 className="font-serif text-xl">Bộ lọc{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}</h2>
      </div>
        <button
          type="button"
          onClick={onClear}
          className="text-[11px] font-bold uppercase text-[#725c00]"
        >
          Đặt lại
        </button>
    </div>

    <div className="space-y-5 pt-5">
      <FilterSelect
        label="Danh mục"
        value={categoryId ?? ''}
        disabled={metaLoading}
        onChange={(value) => onCategoryChange(value ? Number(value) : undefined)}
        options={(meta?.categories ?? []).map((item) => ({
          value: String(item.category_id),
          label: item.name,
        }))}
      />
      <FilterSelect
        label="Thương hiệu"
        value={brandId ?? ''}
        disabled={metaLoading}
        onChange={(value) => onBrandChange(value ? Number(value) : undefined)}
        options={(meta?.brands ?? []).map((item) => ({
          value: String(item.brand_id),
          label: item.name,
        }))}
      />
      <FilterSelect
        label="Size"
        value={sizeValueId ?? ''}
        disabled={metaLoading}
        onChange={(value) => onSizeChange(value ? Number(value) : undefined)}
        options={(meta?.size_systems ?? []).flatMap((system) =>
          system.size_values.map((size) => ({
            value: String(size.size_value_id),
            label: system.name + ' · ' + size.display_name,
          })),
        )}
      />
      <FilterSelect
        label="Màu sắc"
        value={colorId ?? ''}
        disabled={metaLoading}
        onChange={(value) => onColorChange(value ? Number(value) : undefined)}
        options={(meta?.colors ?? []).map((item) => ({
          value: String(item.color_id),
          label: item.name,
        }))}
      />
      <FilterSelect
        label="Giới tính"
        value={gender ?? ''}
        disabled={metaLoading}
        onChange={(value) => onGenderChange(value || undefined)}
        options={(meta?.genders ?? []).map((item) => ({ value: item, label: item }))}
      />
      <FilterSelect
        label="Mùa"
        value={season ?? ''}
        disabled={metaLoading}
        onChange={(value) => onSeasonChange(value || undefined)}
        options={(meta?.seasons ?? []).map((item) => ({ value: item, label: item }))}
      />
      <FilterSelect
        label="Phong cách"
        value={style ?? ''}
        disabled={metaLoading}
        onChange={(value) => onStyleChange(value || undefined)}
        options={(meta?.styles ?? []).map((item) => ({ value: item, label: item }))}
      />

      <div className="border-t border-[#E8E9E3] pt-4">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider">Khoảng giá</p>
        <div className="grid grid-cols-2 gap-2">
          <input
            inputMode="decimal"
            value={minPriceInput}
            onChange={(event) => onMinPriceInputChange(event.target.value)}
            aria-label="Giá từ" aria-describedby={priceErrorId} aria-invalid={priceInvalid} placeholder="Từ"
            className="min-w-0 border border-[#D9DDD6] bg-white px-3 py-2 text-sm outline-none focus:border-[#0B2419]"
          />
          <input
            inputMode="decimal"
            value={maxPriceInput}
            onChange={(event) => onMaxPriceInputChange(event.target.value)}
            aria-label="Giá đến" aria-describedby={priceErrorId} aria-invalid={priceInvalid} placeholder="Đến"
            className="min-w-0 border border-[#D9DDD6] bg-white px-3 py-2 text-sm outline-none focus:border-[#0B2419]"
          />
        </div>
        <button
          type="button"
          onClick={onApplyPriceRange}
          className="mt-2 w-full border border-[#0B2419] bg-white py-2 text-[11px] font-bold uppercase tracking-wider transition hover:bg-[#0B2419] hover:text-white"
        >
          Áp dụng bộ lọc
        </button>
      </div>
    </div>
  </section>
);

export const CatalogProductGrid: React.FC<{
  products: readonly CatalogProductView[];
  loading: boolean;
  error: string | null;
  gridClass: string;
  pagination: PaginationMeta | null;
  page: number;
  totalPages: number;
  onOpenProduct: (productId: string) => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onClear: () => void;
}> = ({
  products,
  loading,
  error,
  gridClass,
  pagination,
  page,
  totalPages,
  onOpenProduct,
  onPageChange,
  onRetry,
  onClear,
}) => (
  <section aria-label="Kết quả sản phẩm" aria-busy={loading} className="min-w-0 flex-1">
    {loading && <div role="status" className="py-24 text-center text-sm text-[#687069]">Đang tải sản phẩm...</div>}
    {!loading && error && (
      <div role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}<button type="button" onClick={onRetry} className="ml-3 min-h-11 underline">Thử lại</button></div>
    )}
    {!loading && !error && products.length === 0 && (
      <div className="border border-[#E8E9E3] bg-[#FFFDF5] py-20 text-center text-sm text-[#687069]">
        Không có sản phẩm phù hợp với bộ lọc hiện tại.
        <button type="button" onClick={onClear} className="mx-auto mt-4 block min-h-11 border border-[#0B2419] px-5">Xóa tất cả bộ lọc</button>
      </div>
    )}

    {!loading && !error && products.length > 0 && (
      <>
        <div className={'grid gap-x-4 gap-y-8 ' + gridClass}>
          {products.map((product) => (
            <article key={product.id} className="group">
              <button
                type="button"
                onClick={() => onOpenProduct(product.id)}
                className="block w-full text-left"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-[#F3F4EF] ring-1 ring-[#E8E9E3]">
                  {product.imageUrl ? (
                    <StorefrontImage
                      loading="lazy" src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-sm text-[#606863]">Chưa có ảnh</span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 translate-y-full bg-[#071A12]/90 px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur transition duration-300 group-hover:translate-y-0">
                    Xem chi tiết
                  </div>
                </div>
                <div className="pt-4">
                  <div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-wider text-[#687069]">
                    <span className="truncate">{product.category}</span>
                    {product.brand && <span className="truncate text-[#1B5038]">{product.brand}</span>}
                  </div>
                  <h2 className="mt-1 line-clamp-2 min-h-12 font-serif text-[17px] leading-6 text-[#0B2419]">
                    {product.name}
                  </h2>
                  <div className="mt-2 flex items-center justify-between border-t border-[#E8E9E3] pt-2">
                    <p className="font-mono text-sm font-bold">{product.base_price.toLocaleString('vi-VN')}₫</p>
                    <StorefrontIcon name="arrow_forward" className="h-5 w-5 text-[18px] text-[#687069] transition group-hover:translate-x-1 group-hover:text-[#0B2419]" />
                  </div>
                </div>
              </button>
            </article>
          ))}
        </div>

        {pagination && totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-3 border-t border-[#E8E9E3] pt-8 text-sm">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => onPageChange(Math.max(1, page - 1))}
              className="border border-[#D9DDD6] px-4 py-2 transition hover:border-[#0B2419] disabled:opacity-40"
            >
              Trang trước
            </button>
            <span className="px-2 font-semibold">{page} / {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => onPageChange(page + 1)}
              className="border border-[#D9DDD6] px-4 py-2 transition hover:border-[#0B2419] disabled:opacity-40"
            >
              Trang sau
            </button>
          </div>
        )}
      </>
    )}
  </section>
);
