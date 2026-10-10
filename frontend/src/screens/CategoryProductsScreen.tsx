import { useCallback } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { catalogService } from '../features/catalog/api/service';
import { CatalogProductGrid } from '../features/catalog/components/CatalogBrowseSections';
import type { CategoryDto } from '../features/catalog/types';
import { categoryProductsPath } from '../routes/paths';
import { useRemoteQuery } from '../shared/hooks/useRemoteQuery';
import { QueryFeedback } from '../shared/ui/storefront/QueryFeedback';
import { getStorefrontErrorMessage } from '../services/http/storefrontError';
import { readCatalogQuery } from '../features/catalog/model/catalogQuery';

function CategoryProducts({ category }: { category: CategoryDto }) {
  const [params, setParams] = useSearchParams();
  const page = readCatalogQuery(params).page ?? 1;
  const navigate = useNavigate();
  const results = useRemoteQuery(useCallback(() => catalogService.listProducts({ category_id: category.category_id, page, page_size: 12 }), [category.category_id, page]));
  return <CatalogProductGrid products={results.data?.items ?? []} loading={results.loading}
    error={results.error ? getStorefrontErrorMessage(results.error, 'Không thể tải sản phẩm trong danh mục.') : null}
    gridClass="grid-cols-2 md:grid-cols-3 xl:grid-cols-4" pagination={results.data?.meta ?? null}
    page={page} totalPages={results.data?.meta.total_pages ?? 0} onOpenProduct={id => navigate(`/products/${encodeURIComponent(id)}`)}
    onPageChange={next => setParams(next === 1 ? {} : { page: String(next) })} onRetry={results.reload}
    emptyMessage="Chưa có sản phẩm đang bán trong danh mục này." />;
}

export function CategoryProductsScreen() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const metadata = useRemoteQuery(useCallback(() => catalogService.getMeta(), []));
  const id = categoryId && /^\d+$/.test(categoryId) ? Number(categoryId) : NaN;
  const category = Number.isSafeInteger(id) && id > 0 ? metadata.data?.categories.find(item => item.category_id === id) : undefined;
  const parent = metadata.data?.categories.find(item => item.category_id === category?.parent_category_id);
  const children = metadata.data?.categories.filter(item => item.parent_category_id === id) ?? [];
  return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
    <nav aria-label="Đường dẫn danh mục" className="mb-6 flex flex-wrap items-center gap-2 text-sm">
      <Link to="/">Trang chủ</Link><span aria-hidden="true">/</span><Link to="/products">Sản phẩm</Link>
      {parent && <><span aria-hidden="true">/</span><Link to={categoryProductsPath(parent.category_id)}>{parent.name}</Link></>}
      {category && <><span aria-hidden="true">/</span><span aria-current="page">{category.name}</span></>}
    </nav>
    <QueryFeedback loading={metadata.loading} error={metadata.error ? getStorefrontErrorMessage(metadata.error, 'Không thể tải danh mục.') : null} onRetry={metadata.reload} />
    {!metadata.loading && !metadata.error && !category && <section role="alert" className="border border-border-subtle p-8"><h1 className="font-serif text-3xl">Không tìm thấy danh mục</h1><Link to="/products" className="mt-4 inline-flex min-h-11 items-center underline">Xem tất cả sản phẩm</Link></section>}
    {category && <>
      <h1 className="font-serif text-4xl">{category.name}</h1>
      <p className="mb-6 mt-3 text-sm text-muted-grey">Khám phá các sản phẩm đang bán{children.length > 0 ? ' trong danh mục và các danh mục con' : ' trong danh mục'} {category.name}.</p>
      {children.length > 0 && <nav aria-label="Danh mục con" className="mb-8 flex flex-wrap gap-3">{children.map(child => <Link key={child.category_id} to={categoryProductsPath(child.category_id)} className="inline-flex min-h-11 items-center border border-border-subtle bg-white px-4 text-sm font-semibold">{child.name}</Link>)}</nav>}
      <CategoryProducts key={id} category={category} />
    </>}
  </div>;
}
