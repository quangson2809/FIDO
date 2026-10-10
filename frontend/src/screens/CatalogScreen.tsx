import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CatalogFiltersPanel, CatalogProductGrid } from '../features/catalog/components/CatalogBrowseSections';
import { useCatalogBrowse } from '../features/catalog/hooks/useCatalogBrowse';
import { filterKeys, filterLabels, catalogFilterLabel } from '../features/catalog/model/catalogQuery';
import { StorefrontDialog } from '../shared/ui/storefront/StorefrontDialog';
import { StorefrontIcon } from '../components/StorefrontIcon';

export const CatalogScreen = () => {
  const navigate = useNavigate();
  const catalog = useCatalogBrowse();
  const [columnsCount, setColumnsCount] = useState<3 | 4>(4);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filters = (mobile = false) => <>
    {catalog.metaError && <p role="alert" className="p-4 text-sm text-red-700">{catalog.metaError}<button type="button" onClick={catalog.reload} className="ml-2 underline">Thử lại</button></p>}
    {catalog.metaLoading && <p role="status" className="p-4 text-sm">Đang tải bộ lọc...</p>}
    <CatalogFiltersPanel priceErrorId={catalog.priceError ? mobile ? 'mobile-catalog-price-error' : 'catalog-price-error' : undefined} priceInvalid={Boolean(catalog.priceError)} meta={catalog.meta} metaLoading={catalog.metaLoading || !catalog.meta} activeFilterCount={catalog.activeFilterCount}
      categoryId={catalog.draft.filters.category_id} brandId={catalog.draft.filters.brand_id}
      sizeValueId={catalog.draft.filters.size_value_id} colorId={catalog.draft.filters.color_id}
      gender={catalog.draft.filters.gender} season={catalog.draft.filters.season} style={catalog.draft.filters.style}
      minPriceInput={catalog.draft.min} maxPriceInput={catalog.draft.max}
      onCategoryChange={value => catalog.updateFilter('category_id', value)} onBrandChange={value => catalog.updateFilter('brand_id', value)}
      onSizeChange={value => catalog.updateFilter('size_value_id', value)} onColorChange={value => catalog.updateFilter('color_id', value)}
      onGenderChange={value => catalog.updateFilter('gender', value)} onSeasonChange={value => catalog.updateFilter('season', value)} onStyleChange={value => catalog.updateFilter('style', value)}
      onMinPriceInputChange={catalog.setMinPriceInput} onMaxPriceInputChange={catalog.setMaxPriceInput}
      onApplyPriceRange={() => { if (catalog.applyFilters() && mobile) setFiltersOpen(false); }} onClear={catalog.clearFilters} />
    {catalog.priceError && <p id={mobile ? 'mobile-catalog-price-error' : 'catalog-price-error'} role="alert" className="p-4 text-sm text-red-700">{catalog.priceError}</p>}
  </>;
  return <div className="min-h-screen bg-white text-forest-deep">
    <section className="border-b border-border-subtle bg-surface-ivory px-4 py-8 sm:px-8 lg:px-14">
      <div className="mx-auto max-w-[1440px]">
        <p className="text-xs font-bold uppercase tracking-widest text-forest-light">Bộ sưu tập FIDO</p>
        <h1 className="mt-2 font-serif text-4xl sm:text-5xl">Khám phá sản phẩm</h1>
        <p className="mt-3 text-sm leading-6 text-muted-grey">Tìm thiết kế phù hợp với bạn theo danh mục, kích cỡ, màu sắc và khoảng giá.</p>
        <form onSubmit={event => { event.preventDefault(); catalog.submitSearch(); }} className="mt-6 flex gap-2">
          <label className="min-w-0 flex-1"><span className="sr-only">Tìm sản phẩm</span><input value={catalog.draft.search} onChange={event => catalog.setSearchInput(event.target.value)} placeholder="Tìm theo tên sản phẩm" className="field-input bg-white" type="search" /></label>
          <button type="submit" className="bg-forest-deep px-5 text-sm font-semibold text-white">Tìm kiếm</button>
        </form>
      </div>
    </section>
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-8 lg:px-14">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <button type="button" aria-haspopup="dialog" onClick={() => setFiltersOpen(true)} className="inline-flex min-h-11 items-center gap-2 border border-forest-deep px-4 text-sm font-semibold lg:hidden"><StorefrontIcon name="tune" className="h-5 w-5" />Bộ lọc {catalog.activeFilterCount > 0 ? `(${catalog.activeFilterCount})` : ''}</button>
        <p role="status" className="text-sm text-muted-grey">{catalog.loading ? 'Đang tìm sản phẩm...' : catalog.error ? 'Chưa tải được kết quả' : `${catalog.pagination?.total ?? 0} sản phẩm`}</p>
        <div className="hidden items-center gap-2 lg:flex"><span className="text-sm">Hiển thị</span>{([3, 4] as const).map(count => <button key={count} type="button" aria-label={`Lưới ${count} cột`} aria-pressed={columnsCount === count} onClick={() => setColumnsCount(count)} className={`h-11 w-11 border ${columnsCount === count ? 'bg-forest-deep text-white' : 'border-border-subtle'}`}>{count}</button>)}</div>
      </div>
      {catalog.activeFilterCount > 0 && <div aria-label="Bộ lọc đang áp dụng" className="mb-5 flex flex-wrap gap-2">
        {catalog.query.q && <button type="button" onClick={() => catalog.removeFilter('q')} className="filter-chip">Tìm: {catalog.query.q} <span aria-hidden="true">×</span><span className="sr-only">Xóa tìm kiếm</span></button>}
        {filterKeys.map(key => catalog.query[key] !== undefined ? <button key={key} type="button" onClick={() => catalog.removeFilter(key)} className="filter-chip">{filterLabels[key]}: {catalogFilterLabel(key, catalog.query[key], catalog.meta)} <span aria-hidden="true">×</span><span className="sr-only">Xóa {filterLabels[key]}</span></button> : null)}
        <button type="button" onClick={catalog.clearFilters} className="min-h-11 px-3 text-sm underline">Xóa tất cả</button>
      </div>}
      <div className="flex items-start gap-8">
        <div className="hidden w-[286px] shrink-0 lg:block">{filters()}</div>
        <CatalogProductGrid products={catalog.products} loading={catalog.loading} error={catalog.error} gridClass={columnsCount === 4 ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-2 xl:grid-cols-3'} pagination={catalog.pagination} page={catalog.query.page ?? 1} totalPages={catalog.totalPages}
          onOpenProduct={id => navigate(`/products/${encodeURIComponent(id)}`)} onPageChange={catalog.setPage} onRetry={catalog.reload} onClear={catalog.clearFilters} />
      </div>
    </div>
    {filtersOpen && <StorefrontDialog name="Bộ lọc sản phẩm" onClose={() => setFiltersOpen(false)} className="filter-dialog">
      <div className="flex items-center justify-between p-4"><h2 className="font-serif text-2xl">Bộ lọc sản phẩm</h2><button autoFocus type="button" aria-label="Đóng bộ lọc" onClick={() => setFiltersOpen(false)} className="h-11 w-11">×</button></div>
      {filters(true)}
      <p className="p-4 text-sm text-muted-grey">Lựa chọn chưa áp dụng sẽ được giữ khi đóng bộ lọc.</p>
    </StorefrontDialog>}
  </div>;
};
