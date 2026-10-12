import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { catalogService } from '../../features/catalog/api/service';
import { ProductSummaryCard } from '../../features/catalog/components/ProductSummaryCard';
import type { CategoryDto } from '../../features/catalog/types';
import { useRemoteQuery } from '../../shared/hooks/useRemoteQuery';
import { QueryFeedback } from '../../shared/ui/storefront/QueryFeedback';
import { getStorefrontErrorMessage } from '../../services/http/storefrontError';
import { categoryProductsPath } from '../../routes/paths';
import { StorefrontIcon } from '../../components/StorefrontIcon';
import { CategoryCardIllustration } from './HomeCardIllustrations';

interface ShowcaseProps {
  category: CategoryDto;
  index: number;
  onOpenProduct: (productId: string) => void;
}

/** The public catalog API already includes descendants when filtering by a parent category. */
export function HomeCategoryShowcase({ category, index, onOpenProduct }: ShowcaseProps) {
  const result = useRemoteQuery(useCallback(() => catalogService.listProducts({
    category_id: category.category_id,
    page: 1,
    page_size: 4,
  }), [category.category_id]));
  const items = result.data?.items ?? [];
  const dark = index % 2 === 1;
  const categoryUrl = categoryProductsPath(category.category_id);

  return (
    <section aria-label={`Bộ sưu tập ${category.name}`} data-home-parent-category={category.category_id} className="min-w-0">
      <Link to={categoryUrl} className={`group flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#DFE3DA] sm:min-h-52 sm:flex-row ${dark ? 'bg-[#0B2419] text-white sm:flex-row-reverse' : 'bg-[#F2F1E9] text-[#0B2419]'}`}>
        <div className={`flex min-w-0 flex-1 flex-col justify-center gap-3 px-5 py-6 sm:px-8 lg:px-10 ${dark ? 'sm:text-right' : ''}`}>
          <span className={`text-xs font-bold uppercase tracking-[0.18em] ${dark ? 'text-[#E8C75B]' : 'text-[#1B5038]'}`}>
            Bộ sưu tập FIDO · {String(index + 1).padStart(2, '0')}
          </span>
          <h3 className="font-serif text-3xl leading-tight sm:text-4xl">{category.name}</h3>
          <p className={`max-w-lg text-sm leading-6 ${dark ? 'text-white/80 sm:ml-auto' : 'text-[#4C5950]'}`}>
            Khám phá trang phục thuộc danh mục {category.name}.
          </p>
          <span className={`inline-flex min-h-11 items-center gap-2 self-start text-sm font-semibold underline underline-offset-4 transition-colors group-hover:no-underline ${dark ? 'sm:self-end' : ''}`}>
            Xem danh mục <StorefrontIcon name="arrow_forward" className="h-5 w-5" />
          </span>
        </div>
        <div className={`flex h-36 shrink-0 items-center justify-center overflow-hidden px-6 sm:h-auto sm:w-[36%] lg:w-[33%] ${dark ? 'bg-[#173C2A]' : 'bg-[#E4E9DE]'}`}>
          <div className="h-full max-h-60 w-full max-w-xs">
            <CategoryCardIllustration name={category.name} />
          </div>
        </div>
      </Link>
      <div className="mb-4 mt-5 flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-serif text-xl sm:text-2xl">Sản phẩm thuộc {category.name}</h4>
        <Link to={categoryUrl} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold underline underline-offset-4">
          Xem tất cả <StorefrontIcon name="arrow_forward" className="h-4 w-4" />
        </Link>
      </div>
      <QueryFeedback loading={result.loading} error={result.error ? getStorefrontErrorMessage(result.error, 'Không thể tải sản phẩm trong danh mục này.') : null} onRetry={result.reload} />
      {!result.loading && !result.error && items.length === 0 && (
        <p className="rounded-lg border border-[#DFE3DA] bg-white px-4 py-8 text-sm text-[#606863]">
          Danh mục này chưa có sản phẩm đang bán. Bạn có thể xem những danh mục khác.
        </p>
      )}
      {!result.loading && !result.error && items.length > 0 && (
        <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-5 md:grid-cols-4">
          {items.map(product => (
            <ProductSummaryCard key={product.product_id} product={product} onOpenProduct={onOpenProduct} />
          ))}
        </div>
      )}
    </section>
  );
}

/** Keep a useful all-products entrypoint if metadata fails or has no parent categories. */
export function HomeProductsFallback({ onOpenProduct }: { onOpenProduct: (productId: string) => void }) {
  const result = useRemoteQuery(useCallback(() => catalogService.listProducts({ page: 1, page_size: 4 }), []));
  const items = result.data?.items ?? [];
  return <section aria-label="Khám phá sản phẩm" className="min-w-0">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h3 className="font-serif text-2xl">Khám phá sản phẩm</h3>
      <Link to="/products" className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">Xem tất cả sản phẩm</Link>
    </div>
    <QueryFeedback loading={result.loading} error={result.error ? getStorefrontErrorMessage(result.error, 'Không thể tải sản phẩm. Vui lòng thử lại.') : null} onRetry={result.reload} />
    {!result.loading && !result.error && items.length === 0 && (
      <p className="py-8 text-sm text-[#606863]">Chưa có sản phẩm đang bán để hiển thị.</p>
    )}
    {!result.loading && !result.error && items.length > 0 && (
      <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-5 md:grid-cols-4">
        {items.map(product => <ProductSummaryCard key={product.product_id} product={product} onOpenProduct={onOpenProduct} />)}
      </div>
    )}
  </section>;
}
