import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CatalogFiltersPanel,
  CatalogProductGrid,
} from '../features/catalog/components/CatalogBrowseSections';
import { useCatalogBrowse } from '../features/catalog/hooks/useCatalogBrowse';

export const CatalogScreen: React.FC = () => {
  const navigate = useNavigate();
  const catalog = useCatalogBrowse();
  const [columnsCount, setColumnsCount] = useState<3 | 4>(4);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  const openProduct = (productId: string) => {
    navigate('/products/' + encodeURIComponent(productId));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const gridClass = columnsCount === 4
    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
    : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3';

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#0B2419]">
      <div className="border-b border-[#E2E5DE] bg-[#F5F6F2] px-4 py-3 sm:px-8">
        <nav className="mx-auto flex max-w-[1440px] items-center gap-2 text-[13px] font-medium text-[#606863]">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="transition-colors hover:text-[#0B2419]"
          >
            Trang chủ
          </button>
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
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#606863]">
                Bộ lọc được lấy từ metadata catalog; giá, hình ảnh và thông tin sản phẩm hiển thị theo dữ liệu backend.
              </p>
            </div>
            <div className="hidden items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#687069] md:flex">
              <span className="h-px w-10 bg-[#E8C75B]" />
              Editorial catalog
            </div>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              catalog.submitSearch();
            }}
            className="mt-6 flex flex-col gap-2 sm:flex-row"
          >
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[20px] text-[#687069]">
                search
              </span>
              <input
                value={catalog.searchInput}
                onChange={(event) => catalog.setSearchInput(event.target.value)}
                placeholder="Tìm theo tên sản phẩm"
                className="w-full border border-[#D9DDD6] bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#0B2419]"
              />
            </div>
            <button
              type="submit"
              className="bg-[#0B2419] px-7 py-3 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-[#1B5038]"
            >
              Tìm kiếm
            </button>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8 lg:px-14">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#E8E9E3] pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSidebarVisible((value) => !value)}
              className="inline-flex items-center gap-2 border border-[#D9DDD6] bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider"
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
              Bộ lọc {catalog.activeFilterCount > 0 ? '(' + catalog.activeFilterCount + ')' : ''}
            </button>
            {catalog.activeFilterCount > 0 && (
              <button
                type="button"
                onClick={catalog.clearFilters}
                className="px-2 py-2 text-xs font-semibold text-[#725c00] underline underline-offset-4"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#687069]">Hiển thị</span>
            <button
              type="button"
              aria-label="Lưới 3 cột"
              onClick={() => setColumnsCount(3)}
              className={'flex h-9 w-9 items-center justify-center border ' + (columnsCount === 3 ? 'border-[#0B2419] bg-[#0B2419] text-white' : 'border-[#D9DDD6]')}
            >
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
            </button>
            <button
              type="button"
              aria-label="Lưới 4 cột"
              onClick={() => setColumnsCount(4)}
              className={'flex h-9 w-9 items-center justify-center border ' + (columnsCount === 4 ? 'border-[#0B2419] bg-[#0B2419] text-white' : 'border-[#D9DDD6]')}
            >
              <span className="material-symbols-outlined text-[18px]">apps</span>
            </button>
          </div>
        </div>

        <div className="flex items-start gap-8">
          {isSidebarVisible && (
            <CatalogFiltersPanel
              meta={catalog.meta}
              metaLoading={catalog.metaLoading}
              activeFilterCount={catalog.activeFilterCount}
              categoryId={catalog.categoryId}
              brandId={catalog.brandId}
              sizeValueId={catalog.sizeValueId}
              colorId={catalog.colorId}
              gender={catalog.gender}
              season={catalog.season}
              style={catalog.style}
              minPriceInput={catalog.minPriceInput}
              maxPriceInput={catalog.maxPriceInput}
              onCategoryChange={catalog.setCategoryId}
              onBrandChange={catalog.setBrandId}
              onSizeChange={catalog.setSizeValueId}
              onColorChange={catalog.setColorId}
              onGenderChange={catalog.setGender}
              onSeasonChange={catalog.setSeason}
              onStyleChange={catalog.setStyle}
              onMinPriceInputChange={catalog.setMinPriceInput}
              onMaxPriceInputChange={catalog.setMaxPriceInput}
              onApplyPriceRange={catalog.applyPriceRange}
              onClear={catalog.clearFilters}
            />
          )}

          <CatalogProductGrid
            products={catalog.products}
            loading={catalog.loading}
            error={catalog.error}
            gridClass={gridClass}
            pagination={catalog.pagination}
            page={catalog.page}
            totalPages={catalog.totalPages}
            onOpenProduct={openProduct}
            onPageChange={catalog.setPage}
          />
        </div>
      </div>
    </div>
  );
};
