import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { catalogService } from '../features/catalog/api/service';
import type { CatalogMetaDto, CatalogProductView } from '../features/catalog/types';
import type { PaginationMeta } from '../types/api';
import { getApiErrorMessage } from '../services/http/apiError';

const PAGE_SIZE = 12;

const toOptionalNumber = (value: string): number | undefined => {
  const normalized = value.trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

export const CatalogScreen: React.FC = () => {
  const { setCurrentScreen, setSelectedProductId } = useApp();
  const [products, setProducts] = useState<CatalogProductView[]>([]);
  const [meta, setMeta] = useState<CatalogMetaDto | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [brandId, setBrandId] = useState<number | undefined>();
  const [sizeValueId, setSizeValueId] = useState<number | undefined>();
  const [colorId, setColorId] = useState<number | undefined>();
  const [gender, setGender] = useState<string | undefined>();
  const [season, setSeason] = useState<string | undefined>();
  const [style, setStyle] = useState<string | undefined>();
  const [minPriceInput, setMinPriceInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');
  const [minPrice, setMinPrice] = useState<number | undefined>();
  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [columnsCount, setColumnsCount] = useState<3 | 4>(4);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [metaLoading, setMetaLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadMeta = async () => {
      try {
        const data = await catalogService.getMeta();
        if (active) setMeta(data);
      } catch (requestError: unknown) {
        if (active) setError(getApiErrorMessage(requestError, 'Không thể tải metadata catalog.'));
      } finally {
        if (active) setMetaLoading(false);
      }
    };
    void loadMeta();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const loadProducts = async () => {
      setLoading(true);
      try {
        const result = await catalogService.listProducts({
          ...(query ? { q: query } : {}),
          ...(categoryId !== undefined ? { category_id: categoryId } : {}),
          ...(brandId !== undefined ? { brand_id: brandId } : {}),
          ...(sizeValueId !== undefined ? { size_value_id: sizeValueId } : {}),
          ...(colorId !== undefined ? { color_id: colorId } : {}),
          ...(gender ? { gender } : {}),
          ...(season ? { season } : {}),
          ...(style ? { style } : {}),
          ...(minPrice !== undefined ? { min_price: minPrice } : {}),
          ...(maxPrice !== undefined ? { max_price: maxPrice } : {}),
          page,
          page_size: PAGE_SIZE,
        });
        if (!active) return;
        setProducts(result.items);
        setPagination(result.meta);
        setError(null);
      } catch (requestError: unknown) {
        if (active) setError(getApiErrorMessage(requestError, 'Không thể tải danh sách sản phẩm.'));
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadProducts();
    return () => { active = false; };
  }, [brandId, categoryId, colorId, gender, maxPrice, minPrice, page, query, season, sizeValueId, style]);

  const openProduct = (productId: string) => {
    setSelectedProductId(productId);
    setCurrentScreen('product-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
  };

  const applyPriceRange = () => {
    setPage(1);
    setMinPrice(toOptionalNumber(minPriceInput));
    setMaxPrice(toOptionalNumber(maxPriceInput));
  };

  const clearFilters = () => {
    setSearchInput('');
    setQuery('');
    setCategoryId(undefined);
    setBrandId(undefined);
    setSizeValueId(undefined);
    setColorId(undefined);
    setGender(undefined);
    setSeason(undefined);
    setStyle(undefined);
    setMinPriceInput('');
    setMaxPriceInput('');
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setPage(1);
  };

  const activeFilterCount = [
    query,
    categoryId,
    brandId,
    sizeValueId,
    colorId,
    gender,
    season,
    style,
    minPrice,
    maxPrice,
  ].filter((value) => value !== undefined && value !== '').length;

  const totalPages = pagination?.total_pages ?? 0;
  const gridClass = columnsCount === 4
    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
    : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3';

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0B2419]">
      <div className="border-b border-[#E2E5DE] bg-[#F5F6F2] px-4 py-3 sm:px-8">
        <nav className="mx-auto flex max-w-[1440px] items-center gap-2 text-[13px] font-medium text-[#606863]">
          <button type="button" onClick={() => setCurrentScreen('home')} className="transition-colors hover:text-[#0B2419]">Trang chủ</button>
          <span className="text-[#A0A69F]">/</span>
          <span className="font-semibold text-[#0B2419]">Catalog</span>
        </nav>
      </div>

      <section className="border-b border-[#E8E9E3] bg-[#FFFDF5] px-4 py-7 sm:px-8 lg:px-14">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#1B5038]">FIDO Collection</p>
              <h1 className="mt-1 font-serif text-4xl tracking-tight sm:text-5xl">Khám phá sản phẩm</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#606863]">Bộ lọc được lấy từ metadata catalog; giá, hình ảnh và thông tin sản phẩm hiển thị theo dữ liệu backend.</p>
            </div>
            <div className="hidden items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#687069] md:flex">
              <span className="h-px w-10 bg-[#E8C75B]" />
              Editorial catalog
            </div>
          </div>

          <form onSubmit={submitSearch} className="mt-6 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-[#687069]">search</span>
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Tìm theo tên sản phẩm"
                className="w-full border border-[#D9DDD6] bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#0B2419]"
              />
            </div>
            <button type="submit" className="bg-[#0B2419] px-7 py-3 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-[#1B5038]">Tìm kiếm</button>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8 lg:px-14">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#E8E9E3] pb-4">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setIsSidebarVisible((value) => !value)} className="inline-flex items-center gap-2 border border-[#D9DDD6] bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-[18px]">tune</span>
              Bộ lọc {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
            </button>
            {activeFilterCount > 0 && <button type="button" onClick={clearFilters} className="px-2 py-2 text-xs font-semibold text-[#725c00] underline underline-offset-4">Xóa bộ lọc</button>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#687069]">Hiển thị</span>
            <button type="button" aria-label="Lưới 3 cột" onClick={() => setColumnsCount(3)} className={`flex h-9 w-9 items-center justify-center border ${columnsCount === 3 ? 'border-[#0B2419] bg-[#0B2419] text-white' : 'border-[#D9DDD6]'}`}><span className="material-symbols-outlined text-[18px]">grid_view</span></button>
            <button type="button" aria-label="Lưới 4 cột" onClick={() => setColumnsCount(4)} className={`flex h-9 w-9 items-center justify-center border ${columnsCount === 4 ? 'border-[#0B2419] bg-[#0B2419] text-white' : 'border-[#D9DDD6]'}`}><span className="material-symbols-outlined text-[18px]">apps</span></button>
          </div>
        </div>

        <div className="flex items-start gap-8">
          {isSidebarVisible && (
            <aside className="hidden w-[286px] shrink-0 border border-[#E8E9E3] bg-[#FFFDF5] p-5 lg:block">
              <div className="flex items-center justify-between border-b border-[#E8E9E3] pb-3">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#687069]">Refine</p><h2 className="font-serif text-xl">Bộ lọc</h2></div>
                {activeFilterCount > 0 && <button type="button" onClick={clearFilters} className="text-[11px] font-bold uppercase text-[#725c00]">Đặt lại</button>}
              </div>

              <div className="space-y-5 pt-5">
                <FilterSelect label="Danh mục" value={categoryId ?? ''} disabled={metaLoading} onChange={(value) => { setCategoryId(value ? Number(value) : undefined); setPage(1); }} options={(meta?.categories ?? []).map((item) => ({ value: String(item.category_id), label: item.name }))} />
                <FilterSelect label="Thương hiệu" value={brandId ?? ''} disabled={metaLoading} onChange={(value) => { setBrandId(value ? Number(value) : undefined); setPage(1); }} options={(meta?.brands ?? []).map((item) => ({ value: String(item.brand_id), label: item.name }))} />
                <FilterSelect label="Size" value={sizeValueId ?? ''} disabled={metaLoading} onChange={(value) => { setSizeValueId(value ? Number(value) : undefined); setPage(1); }} options={(meta?.size_systems ?? []).flatMap((system) => system.size_values.map((size) => ({ value: String(size.size_value_id), label: `${system.name} · ${size.display_name}` })))} />
                <FilterSelect label="Màu sắc" value={colorId ?? ''} disabled={metaLoading} onChange={(value) => { setColorId(value ? Number(value) : undefined); setPage(1); }} options={(meta?.colors ?? []).map((item) => ({ value: String(item.color_id), label: item.name }))} />
                <FilterSelect label="Giới tính" value={gender ?? ''} disabled={metaLoading} onChange={(value) => { setGender(value || undefined); setPage(1); }} options={(meta?.genders ?? []).map((item) => ({ value: item, label: item }))} />
                <FilterSelect label="Mùa" value={season ?? ''} disabled={metaLoading} onChange={(value) => { setSeason(value || undefined); setPage(1); }} options={(meta?.seasons ?? []).map((item) => ({ value: item, label: item }))} />
                <FilterSelect label="Phong cách" value={style ?? ''} disabled={metaLoading} onChange={(value) => { setStyle(value || undefined); setPage(1); }} options={(meta?.styles ?? []).map((item) => ({ value: item, label: item }))} />

                <div className="border-t border-[#E8E9E3] pt-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider">Khoảng giá</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input inputMode="numeric" value={minPriceInput} onChange={(event) => setMinPriceInput(event.target.value)} placeholder="Từ" className="min-w-0 border border-[#D9DDD6] bg-white px-3 py-2 text-sm outline-none focus:border-[#0B2419]" />
                    <input inputMode="numeric" value={maxPriceInput} onChange={(event) => setMaxPriceInput(event.target.value)} placeholder="Đến" className="min-w-0 border border-[#D9DDD6] bg-white px-3 py-2 text-sm outline-none focus:border-[#0B2419]" />
                  </div>
                  <button type="button" onClick={applyPriceRange} className="mt-2 w-full border border-[#0B2419] bg-white py-2 text-[11px] font-bold uppercase tracking-wider transition hover:bg-[#0B2419] hover:text-white">Áp dụng giá</button>
                </div>
              </div>
            </aside>
          )}

          <main className="min-w-0 flex-1">
            {loading && <div className="py-24 text-center text-sm text-[#687069]">Đang tải sản phẩm...</div>}
            {!loading && error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {!loading && !error && products.length === 0 && <div className="border border-[#E8E9E3] bg-[#FFFDF5] py-20 text-center text-sm text-[#687069]">Không có sản phẩm phù hợp với bộ lọc hiện tại.</div>}

            {!loading && !error && products.length > 0 && (
              <>
                <div className={`grid gap-x-4 gap-y-8 ${gridClass}`}>
                  {products.map((product) => (
                    <article key={product.id} className="group">
                      <button type="button" onClick={() => openProduct(product.id)} className="block w-full text-left">
                        <div className="relative aspect-[3/4] overflow-hidden bg-[#F3F4EF] ring-1 ring-[#E8E9E3]">
                          {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.035]" /> : <span className="flex h-full items-center justify-center text-sm text-[#8A918B]">Chưa có ảnh</span>}
                          <div className="absolute inset-x-0 bottom-0 translate-y-full bg-[#071A12]/90 px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur transition duration-300 group-hover:translate-y-0">Xem chi tiết</div>
                        </div>
                        <div className="pt-4">
                          <div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-wider text-[#687069]">
                            <span className="truncate">{product.category}</span>
                            {product.brand && <span className="truncate text-[#1B5038]">{product.brand}</span>}
                          </div>
                          <h2 className="mt-1 line-clamp-2 min-h-12 font-serif text-[17px] leading-6 text-[#0B2419]">{product.name}</h2>
                          <div className="mt-2 flex items-center justify-between border-t border-[#E8E9E3] pt-2">
                            <p className="font-mono text-sm font-bold">{product.base_price.toLocaleString('vi-VN')}₫</p>
                            <span className="material-symbols-outlined text-[18px] text-[#687069] transition group-hover:translate-x-1 group-hover:text-[#0B2419]">arrow_forward</span>
                          </div>
                        </div>
                      </button>
                    </article>
                  ))}
                </div>

                {pagination && totalPages > 1 && (
                  <div className="mt-12 flex items-center justify-center gap-3 border-t border-[#E8E9E3] pt-8 text-sm">
                    <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} className="border border-[#D9DDD6] px-4 py-2 transition hover:border-[#0B2419] disabled:opacity-40">Trang trước</button>
                    <span className="px-2 font-semibold">{page} / {totalPages}</span>
                    <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((current) => current + 1)} className="border border-[#D9DDD6] px-4 py-2 transition hover:border-[#0B2419] disabled:opacity-40">Trang sau</button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

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
    <select disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} className="w-full border border-[#D9DDD6] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0B2419] disabled:opacity-50">
      <option value="">Tất cả</option>
      {options.map((option) => <option key={`${label}-${option.value}`} value={option.value}>{option.label}</option>)}
    </select>
  </label>
);