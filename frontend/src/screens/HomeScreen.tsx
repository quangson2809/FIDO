import { ProductSummaryCard } from '../features/catalog/components/ProductSummaryCard';
import { BenefitCardIllustration, CategoryCardIllustration } from './home/HomeCardIllustrations';
import { HomeHero } from './home/HomeHero';
import { selectHomepageCategories } from '../features/catalog/model/categoryTree';
import { StorefrontIcon } from '../components/StorefrontIcon';
import { Link } from 'react-router-dom';
import { StorefrontImage } from '../shared/ui/storefront/StorefrontImage';
import { QueryFeedback } from '../shared/ui/storefront/QueryFeedback';
import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoryProductsPath } from '../routes/paths';
import { catalogService } from '../features/catalog/api/service';
import { useRemoteQuery } from '../shared/hooks/useRemoteQuery';
import { getStorefrontErrorMessage } from '../services/http/storefrontError';

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const productQuery = useRemoteQuery(useCallback(() => catalogService.listProducts({ page: 1, page_size: 8 }), []));
  const metaQuery = useRemoteQuery(useCallback(() => catalogService.getMeta(), []));
  const products = productQuery.data?.items ?? [];
  const meta = metaQuery.data;
  const productError = productQuery.error ? getStorefrontErrorMessage(productQuery.error, 'Không thể tải sản phẩm. Vui lòng thử lại.') : null;
  const metaError = metaQuery.error ? getStorefrontErrorMessage(metaQuery.error, 'Không thể tải danh mục. Vui lòng thử lại.') : null;

  const openProduct = (productId: string) => {
    navigate(`/products/${encodeURIComponent(productId)}`);
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };

  const homepageCategories = selectHomepageCategories(meta?.categories ?? []);

  return (
    <div className="w-full bg-white text-[#0B2419]" id="trang-chu">
      <div className="hidden h-10 sm:flex w-full items-center border-b border-[#E2E5DE] bg-[#F5F6F2] px-4 text-[13px] font-medium text-[#606863] sm:px-8">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#0B2419]">FIDO</span>
          <span className="text-[#9CA3AF]">/</span>
          <span>Ready-to-Wear</span>
        </div>
      </div>

      <HomeHero />

      <section className="w-full bg-white py-7 sm:py-10" id="danh-muc">
        <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-8 lg:px-14">
          <div className="flex flex-col gap-3 border-b border-[#E8E9E3] pb-4 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-[#1B5038]">Khám phá theo nhóm</span>
              <h2 className="font-serif text-2xl text-[#0B2419] sm:text-3xl">DANH MỤC SẢN PHẨM</h2>
              <p className="mt-2 text-[13px] text-[#606863]">Chọn nhóm sản phẩm phù hợp với phong cách của bạn.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0B2419]"
            >
              Xem toàn bộ
              <StorefrontIcon name="arrow_forward" className="h-5 w-5 text-[16px]" />
            </button>
          </div>

          {metaQuery.loading && <div role="status" className="py-8 text-sm text-[#687069]">Đang tải danh mục...</div>}
          {!metaQuery.loading && metaError && <QueryFeedback error={metaError} onRetry={metaQuery.reload} />}
          {!metaQuery.loading && !metaError && homepageCategories.length === 0 && (
            <div className="py-8 text-sm text-[#687069]">Chưa có danh mục gốc để hiển thị.</div>
          )}
          {!metaQuery.loading && !metaError && homepageCategories.length > 0 && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
              {homepageCategories.map((category) => (
                <Link
                  key={category.category_id}
                  to={categoryProductsPath(category.category_id)}
                  className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#E2E5DE] bg-[#FAF9F5] transition-all duration-300 hover:-translate-y-1 hover:border-[#1B5038] hover:shadow-lg"
                >
                  <div className="h-20 overflow-hidden sm:h-32 bg-[#F1F0E8] px-3 pt-2">
                    <CategoryCardIllustration name={category.name} />
                  </div>
                  <div className="flex min-h-20 flex-1 items-center justify-between gap-3 border-t border-[#E8E9E3] bg-white p-3 sm:p-4">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 font-serif text-lg font-bold leading-6 sm:text-xl text-[#0B2419]">{category.name}</h3>
                      <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-[#687069]">Khám phá danh mục</span>
                    </div>
                    <StorefrontIcon name="arrow_outward" className="h-5 w-5 shrink-0 self-center text-[#1B5038] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="w-full bg-[#FAF9F5] py-7 sm:py-10" id="san-pham-noi-bat">
        <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-14">
          <div className="flex flex-col gap-3 border-b border-[#D9DDD6] pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-[#1B5038]">Bộ sưu tập FIDO</span>
              <h2 className="font-serif text-2xl text-[#0B2419] sm:text-3xl">KHÁM PHÁ SẢN PHẨM</h2>
              <p className="mt-2 text-[13px] text-[#606863]">Một số thiết kế đang có trong bộ sưu tập FIDO.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="border border-[#0B2419] px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors hover:bg-[#0B2419] hover:text-white"
            >
              Xem sản phẩm
            </button>
          </div>

          <QueryFeedback loading={productQuery.loading} error={productError} onRetry={productQuery.reload} />
          {!productQuery.loading && !productError && products.length === 0 && (
            <div className="py-12 text-center text-sm text-[#687069]">Chưa có sản phẩm để hiển thị. Bạn có thể xem bộ sưu tập để khám phá thêm.</div>
          )}

          {!productQuery.loading && !productError && products.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-5 lg:grid-cols-4">
              {products.map(product => <ProductSummaryCard key={product.product_id} product={product} onOpenProduct={openProduct} />)}
            </div>
          )}
        </div>
      </section>

      <section className="w-full border-y border-[#E8E9E3]/80 bg-[#FFFDF5] py-6 sm:py-8" aria-label="Điểm nổi bật khi mua sắm tại FIDO">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:gap-5 lg:px-14">
          {([
            {
              kind: 'categories',
              icon: 'account_tree',
              title: 'Danh mục dễ khám phá',
              description: 'Tìm nhóm trang phục và xem những sản phẩm phù hợp với lựa chọn của bạn.',
            },
            {
              kind: 'fit',
              icon: 'straighten',
              title: 'Chọn size và màu',
              description: 'Xem các biến thể size, màu và tình trạng khả dụng của từng sản phẩm.',
            },
            {
              kind: 'details',
              icon: 'price_check',
              title: 'Thông tin rõ ràng',
              description: 'Tham khảo giá và thông tin sản phẩm trước khi quyết định mua.',
            },
            {
              kind: 'cod',
              icon: 'payments',
              title: 'Thanh toán COD',
              description: 'Đặt hàng theo quy trình mua sắm và thanh toán khi nhận hàng.',
            },
          ] as const).map(({ kind, icon, title, description }) => (
            <article key={kind} className="group overflow-hidden rounded-xl border border-[#E2E5DE] bg-white shadow-sm transition-shadow hover:shadow-md">
              <div className="hidden h-24 overflow-hidden sm:block border-b border-[#E8E9E3] bg-[#F4F3EB] px-4 pt-1">
                <BenefitCardIllustration kind={kind} />
              </div>
              <div className="flex items-start gap-3 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E7EDE6] text-[#0B2419]">
                  <StorefrontIcon name={icon} className="h-5 w-5" />
                </span>
                <div className="min-w-0 space-y-2">
                  <h3 className="text-[14px] font-bold leading-5 text-[#0B2419]">{title}</h3>
                  <p className="text-[12px] leading-5 text-[#606863]">{description}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#071A12] text-white">
        <div className="pointer-events-none absolute inset-0 opacity-20" aria-hidden="true">
          <div className="absolute -left-20 -top-24 h-80 w-80 rounded-full border border-[#E8C75B]/40" />
          <div className="absolute -bottom-40 right-10 h-[520px] w-[520px] rounded-full border border-white/10" />
        </div>
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-6 px-4 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,440px)] lg:gap-14 lg:px-14 lg:py-12">
          <div className="max-w-2xl">
            <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#E8C75B]">FIDO Editorial</span>
            <h2 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">Tối giản trong hình thức. Rõ ràng trong từng lựa chọn.</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/80">
              Khám phá những thiết kế FIDO trong một không gian tinh gọn, nơi hình ảnh, phom dáng, màu sắc và trải nghiệm lựa chọn sản phẩm được đặt ở trung tâm.
            </p>
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="mt-7 shrink-0 bg-[#E8C75B] px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#071A12] transition-transform hover:-translate-y-0.5"
            >
              Mở bộ sưu tập
            </button>
          </div>
          <figure className="min-w-0 overflow-hidden rounded-xl border border-white/15 bg-[#F2EBDD] shadow-xl">
            <StorefrontImage
              src="/images/about/palette.svg"
              alt="Minh họa phối trang phục xanh, trung tính và vàng theo phong cách FIDO"
              className="aspect-[9/6.5] h-auto w-full object-cover"
            />
            <figcaption className="bg-[#123A29] px-4 py-3 text-[11px] leading-5 text-white/85">
              Minh họa phong cách, không phải hình ảnh sản phẩm đang bán.
            </figcaption>
          </figure>
        </div>
      </section>

      <nav aria-label="Tìm hiểu FIDO" className="mx-auto flex max-w-7xl flex-wrap gap-4 px-4 py-8 text-sm sm:px-8"><Link className="min-h-11 p-3 underline" to="/about">Về FIDO</Link><Link className="min-h-11 p-3 underline" to="/policies">Chính sách mua hàng và sau bán</Link></nav>
    </div>
  );
};
