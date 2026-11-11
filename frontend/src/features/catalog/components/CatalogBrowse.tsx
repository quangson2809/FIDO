import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CatalogFiltersPanel, CatalogProductGrid } from './CatalogBrowseSections';
import { useCatalogBrowse } from '../hooks/useCatalogBrowse';
import { catalogFilterLabel, filterKeys, filterLabels } from '../model/catalogQuery';
import type { useCatalogMetadata } from '../hooks/useCatalogMetadata';
import { StorefrontDialog } from '../../../shared/ui/storefront/StorefrontDialog';
import { StorefrontIcon } from '../../../components/StorefrontIcon';
import { productDetailPath } from '../../../routes/paths';

// Catalog and category routes share one URL/filter owner and the same result UI.
export function CatalogBrowse({
  categoryId,
  metadata,
}: {
  categoryId?: number;
  metadata: ReturnType<typeof useCatalogMetadata>;
}) {
  const navigate = useNavigate();
  const catalog = useCatalogBrowse(metadata.data, categoryId);
  const [columnsCount, setColumnsCount] = useState<3 | 4>(4);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const apply = (mobile = false) => {
    if (catalog.applyFilters() && mobile) setFiltersOpen(false);
  };
  const filters = (mobile = false) => (
    <>
      {metadata.error && (
        <p role="alert" className="p-4 text-sm text-red-700">
          {metadata.error}
          <button type="button" onClick={metadata.reload} className="ml-2 underline">
            Thử lại
          </button>
        </p>
      )}
      {metadata.loading && (
        <p role="status" className="p-4 text-sm">
          Đang tải bộ lọc...
        </p>
      )}
      <CatalogFiltersPanel
        categoryLocked={categoryId !== undefined}
        hideActions={mobile}
        priceErrorId={
          catalog.priceError
            ? mobile
              ? 'mobile-catalog-price-error'
              : 'catalog-price-error'
            : undefined
        }
        priceInvalid={Boolean(catalog.priceError)}
        meta={catalog.meta}
        metaLoading={metadata.loading || !catalog.meta}
        activeFilterCount={catalog.activeFilterCount}
        categoryId={catalog.draft.filters.category_id}
        brandId={catalog.draft.filters.brand_id}
        minPriceInput={catalog.draft.min}
        maxPriceInput={catalog.draft.max}
        onCategoryChange={(value) => catalog.updateFilter('category_id', value)}
        onBrandChange={(value) => catalog.updateFilter('brand_id', value)}
        onMinPriceInputChange={catalog.setMinPriceInput}
        onMaxPriceInputChange={catalog.setMaxPriceInput}
        onApplyPriceRange={() => apply()}
        onClear={catalog.clearFilters}
      />
      {!mobile && catalog.priceError && (
        <p id="catalog-price-error" role="alert" className="p-4 text-sm text-red-700">
          {catalog.priceError}
        </p>
      )}
      {!mobile && (
        <p role="status" className="mt-3 text-sm text-muted-grey">
          {catalog.hasDraftChanges
            ? 'Lựa chọn chưa áp dụng. Bấm áp dụng để cập nhật kết quả.'
            : 'Kết quả phản ánh bộ lọc đang áp dụng.'}
        </p>
      )}
    </>
  );
  return (
    <section aria-label="Khám phá và lọc sản phẩm" className="catalog-browse">
      {categoryId !== undefined && (
        <form
          role="search"
          aria-label="Tìm trong kết quả sản phẩm"
          onSubmit={(event) => {
            event.preventDefault();
            catalog.submitSearch();
          }}
          className="mb-6 flex gap-2"
        >
          <label className="min-w-0 flex-1">
            <span className="sr-only">Tìm sản phẩm</span>
            <input
              value={catalog.draft.search}
              onChange={(event) => catalog.setSearchInput(event.target.value)}
              placeholder={
                categoryId === undefined ? 'Tìm theo tên sản phẩm' : 'Tìm trong danh mục này'
              }
              className="field-input bg-white"
              type="search"
            />
          </label>
          <button type="submit" className="bg-forest-deep px-4 text-sm font-semibold text-white">
            Tìm kiếm
          </button>
        </form>
      )}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => setFiltersOpen(true)}
          className="inline-flex min-h-11 items-center gap-2 border border-forest-deep px-4 text-sm font-semibold lg:hidden"
        >
          <StorefrontIcon name="tune" className="h-5 w-5" />
          Bộ lọc {catalog.activeFilterCount > 0 ? `(${catalog.activeFilterCount})` : ''}
        </button>
        <p role="status" className="text-sm text-muted-grey">
          {catalog.loading
            ? 'Đang tìm sản phẩm...'
            : catalog.error
              ? 'Chưa tải được kết quả'
              : `${catalog.pagination?.total ?? 0} sản phẩm`}
        </p>
        <div className="hidden items-center gap-2 lg:flex">
          <span className="text-sm">Hiển thị</span>
          {([3, 4] as const).map((count) => (
            <button
              key={count}
              type="button"
              aria-label={`Lưới ${count} cột`}
              aria-pressed={columnsCount === count}
              onClick={() => setColumnsCount(count)}
              className={`h-11 w-11 border ${columnsCount === count ? 'bg-forest-deep text-white' : 'border-border-subtle'}`}
            >
              {count}
            </button>
          ))}
        </div>
      </div>
      {catalog.activeFilterCount > 0 && (
        <div aria-label="Bộ lọc đang áp dụng" className="mb-5 flex flex-wrap gap-2">
          {catalog.query.q && (
            <button type="button" onClick={() => catalog.removeFilter('q')} className="filter-chip">
              Tìm: {catalog.query.q} <span aria-hidden="true">×</span>
              <span className="sr-only">Xóa tìm kiếm</span>
            </button>
          )}
          {filterKeys.map((key) =>
            !(categoryId !== undefined && key === 'category_id') &&
            catalog.query[key] !== undefined ? (
              <button
                key={key}
                type="button"
                onClick={() => catalog.removeFilter(key)}
                className="filter-chip"
              >
                {filterLabels[key]}: {catalogFilterLabel(key, catalog.query[key], catalog.meta)}{' '}
                <span aria-hidden="true">×</span>
                <span className="sr-only">Xóa {filterLabels[key]}</span>
              </button>
            ) : null,
          )}
          <button
            type="button"
            onClick={catalog.clearFilters}
            className="min-h-11 px-3 text-sm underline"
          >
            Xóa tất cả
          </button>
        </div>
      )}
      <div className="flex items-start gap-6">
        <div className="hidden w-[248px] shrink-0 lg:block">{filters()}</div>
        <CatalogProductGrid
          products={catalog.products}
          loading={catalog.loading}
          error={catalog.error}
          gridClass={
            columnsCount === 4
              ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'grid-cols-2 xl:grid-cols-3'
          }
          pagination={catalog.pagination}
          page={catalog.query.page ?? 1}
          totalPages={catalog.totalPages}
          emptyMessage={
            categoryId !== undefined && catalog.activeFilterCount === 0
              ? 'Chưa có sản phẩm đang bán trong danh mục này.'
              : undefined
          }
          onOpenProduct={(id) => navigate(productDetailPath(id))}
          onPageChange={catalog.setPage}
          onRetry={catalog.reload}
          onClear={catalog.activeFilterCount > 0 ? catalog.clearFilters : undefined}
        />
      </div>
      {filtersOpen && (
        <StorefrontDialog
          name="Bộ lọc sản phẩm"
          onClose={() => setFiltersOpen(false)}
          className="filter-dialog"
        >
          <header className="flex shrink-0 items-center justify-between border-b border-border-subtle p-4">
            <h2 className="font-serif text-2xl">Bộ lọc sản phẩm</h2>
            <button
              autoFocus
              type="button"
              aria-label="Đóng bộ lọc"
              onClick={() => setFiltersOpen(false)}
              className="h-11 w-11"
            >
              ×
            </button>
          </header>
          <div className="filter-dialog-body">{filters(true)}</div>
          <footer className="filter-dialog-actions">
            {catalog.priceError && (
              <p id="mobile-catalog-price-error" role="alert" className="mb-2 text-sm text-red-700">
                {catalog.priceError}
              </p>
            )}
            <p role="status" className="mb-3 text-sm text-muted-grey">
              {catalog.hasDraftChanges
                ? 'Lựa chọn chưa áp dụng.'
                : 'Đang hiển thị các bộ lọc đã áp dụng.'}{' '}
              Lựa chọn chưa áp dụng sẽ được giữ khi đóng bộ lọc.
            </p>
            <button
              type="button"
              onClick={() => apply(true)}
              className="min-h-11 w-full bg-forest-deep px-4 text-sm font-semibold text-white"
            >
              Áp dụng bộ lọc
            </button>
          </footer>
        </StorefrontDialog>
      )}
    </section>
  );
}
