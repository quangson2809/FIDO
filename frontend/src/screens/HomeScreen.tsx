import { BenefitCardIllustration } from './home/HomeCardIllustrations';
import { HomeHero } from './home/HomeHero';
import { selectHomepageParentCategories } from '../features/catalog/model/categoryTree';
import { HomeCategoryShowcase, HomeProductsFallback } from './home/HomeCategoryShowcase';
import { StorefrontIcon } from '../components/StorefrontIcon';
import { Link } from 'react-router-dom';
import { StorefrontImage } from '../shared/ui/storefront/StorefrontImage';
import { QueryFeedback } from '../shared/ui/storefront/QueryFeedback';
import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { catalogService } from '../features/catalog/api/service';
import { useRemoteQuery } from '../shared/hooks/useRemoteQuery';
import { getStorefrontErrorMessage } from '../services/http/storefrontError';

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const metaQuery = useRemoteQuery(useCallback(() => catalogService.getMeta(), []));
  const meta = metaQuery.data;
  const metaError = metaQuery.error ? getStorefrontErrorMessage(metaQuery.error, 'Không thể tải danh mục. Vui lòng thử lại.') : null;

  const openProduct = (productId: string) => {
    navigate(`/products/${encodeURIComponent(productId)}`);
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };

  const parentCategories = selectHomepageParentCategories(meta?.categories ?? []);

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

      <section className="w-full bg-white pt-8 pb-4 sm:pt-10" id="danh-muc">
        <div className="mx-auto w-full max-w-[1600px] px-3 sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#1B5038]">Khám phá theo danh mục</span>
              <h2 className="mt-2 font-serif text-2xl sm:text-3xl">DANH MỤC SẢN PHẨM</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#606863]">Mỗi bộ sưu tập có những lựa chọn riêng để bạn khám phá.</p>
            </div>
            <Link to="/products" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4">
              Tất cả sản phẩm <StorefrontIcon name="arrow_forward" className="h-5 w-5" />
            </Link>
          </div>
          {metaQuery.loading && <p role="status" className="py-6 text-sm text-[#687069]">Đang tải danh mục...</p>}
          {!metaQuery.loading && metaError && <QueryFeedback error={metaError} onRetry={metaQuery.reload} />}
        </div>
      </section>

      <section className="w-full bg-[#FAF9F5] pb-10 pt-2 sm:pb-12" id="san-pham-noi-bat" aria-label="Bộ sưu tập theo danh mục">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-10 px-3 sm:gap-14 sm:px-6 lg:px-10">
          {!metaQuery.loading && !metaError && parentCategories.map((category, index) => (
            <HomeCategoryShowcase key={category.category_id} category={category} index={index} onOpenProduct={openProduct} />
          ))}
          {!metaQuery.loading && (metaError !== null || parentCategories.length === 0) && (
            <HomeProductsFallback onOpenProduct={openProduct} />
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
