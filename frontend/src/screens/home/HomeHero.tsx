import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StorefrontIcon } from '../../components/StorefrontIcon';
import { StorefrontImage } from '../../shared/ui/storefront/StorefrontImage';

const slides = [
  {
    src: '/images/about/wardrobe.svg',
    alt: 'Minh họa áo khoác xanh và trang phục trung tính của FIDO',
    label: 'Phom dáng tối giản',
  },
  {
    src: '/images/about/palette.svg',
    alt: 'Minh họa phối màu và trang phục trong bộ sưu tập FIDO',
    label: 'Bảng màu có chủ đích',
  },
  {
    src: '/images/about/details.svg',
    alt: 'Minh họa chi tiết trang phục và cách phối phụ kiện FIDO',
    label: 'Chú trọng từng chi tiết',
  },
] as const;

const ROTATION_INTERVAL_MS = 6000;

export function HomeHero() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener('change', updatePreference);
    return () => preference.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    if (hovered || focused || reducedMotion) return;
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, ROTATION_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [hovered, focused, reducedMotion]);

  const moveSlide = (direction: -1 | 1) => {
    setActiveIndex((current) => (current + direction + slides.length) % slides.length);
  };

  return (
    <section className="w-full overflow-hidden bg-[#FFFDF5]" aria-label="Giới thiệu bộ sưu tập FIDO">
      <div className="grid w-full grid-cols-1 lg:h-[min(640px,calc(100svh-150px))] lg:min-h-[500px] lg:grid-cols-12">
        <div className="relative z-10 flex flex-col justify-between gap-8 px-6 py-10 sm:px-10 sm:py-12 lg:col-span-5 lg:px-12 lg:py-12 xl:px-16">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#E8C75B]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#0B2419]">FIDO • READY-TO-WEAR</span>
            </div>
            <h1 className="font-serif text-5xl font-normal leading-[1.02] tracking-tight text-[#0B2419] sm:text-6xl xl:text-[68px]">
              BẢN THỂ
              <br />
              <span className="italic text-[#123A29]">TỐI GIẢN.</span>
            </h1>
            <p className="max-w-md pt-2 text-[15px] font-light leading-7 text-[#424844] sm:text-[16px]">
              Khám phá thiết kế tối giản, chọn phom dáng và màu sắc thể hiện phong cách của bạn.
            </p>
            <div className="flex flex-col items-stretch gap-3 pt-4 sm:flex-row sm:items-center">
              <Link
                to="/products"
                className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#0B2419] px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-white shadow-md transition-colors hover:bg-[#1B5038]"
              >
                Khám phá bộ sưu tập
                <StorefrontIcon name="arrow_forward" className="h-5 w-5" />
              </Link>
              <a
                href="#san-pham-noi-bat"
                className="inline-flex min-h-12 items-center justify-center border border-[#0B2419]/30 px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-[#0B2419] transition-colors hover:bg-[#FAF4DF]"
              >
                Xem sản phẩm nổi bật
              </a>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 border-t border-[#E8E9E3]/80 pt-5 text-[#0B2419]">
            <div><span className="block font-serif text-lg font-bold sm:text-xl">SẢN PHẨM</span><span className="text-[9px] font-semibold uppercase tracking-wider text-[#606863]">Bộ sưu tập FIDO</span></div>
            <div><span className="block font-serif text-lg font-bold sm:text-xl">SIZE + MÀU</span><span className="text-[9px] font-semibold uppercase tracking-wider text-[#606863]">Chọn kích cỡ và màu</span></div>
            <div><span className="block font-serif text-lg font-bold sm:text-xl">COD</span><span className="text-[9px] font-semibold uppercase tracking-wider text-[#606863]">Thanh toán khi nhận</span></div>
          </div>
        </div>

        <div
          role="region"
          aria-roledescription="carousel"
          aria-label="Bộ ảnh thời trang FIDO"
          className="relative min-h-[290px] overflow-hidden bg-[#E8E6DC] sm:min-h-[410px] lg:col-span-7 lg:min-h-0"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocusCapture={() => setFocused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
          }}
        >
          <div className="pointer-events-none absolute -right-14 top-0 h-64 w-64 rounded-full bg-[#E8C75B]/25 blur-2xl" aria-hidden="true" />
          {slides.map((slide, index) => {
            const active = index === activeIndex;
            return (
              <div
                key={slide.src}
                data-slide-active={active}
                aria-hidden={!active}
                className={active
                  ? 'absolute inset-0 opacity-100 transition-opacity duration-700 ease-in-out motion-reduce:transition-none'
                  : 'pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 ease-in-out motion-reduce:transition-none'}
              >
                <StorefrontImage
                  src={slide.src}
                  alt={slide.alt}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  className="h-full w-full object-contain"
                />
              </div>
            );
          })}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#071A12]/65 to-transparent" aria-hidden="true" />
          <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 text-white sm:inset-x-7 sm:bottom-7">
            <div aria-live="polite" aria-atomic="true" className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#E8C75B]">FIDO EDITORIAL</span>
              <p className="mt-1 text-sm font-semibold sm:text-base">{slides[activeIndex].label}</p>
              <span className="mt-1 block text-[10px] text-white/80">Minh họa phong cách · {activeIndex + 1} / {slides.length}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" aria-label="Ảnh trước" onClick={() => moveSlide(-1)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/50 bg-[#071A12]/60 text-white transition-colors hover:bg-[#071A12]">
                <StorefrontIcon name="chevron_left" className="h-5 w-5" />
              </button>
              <button type="button" aria-label="Ảnh tiếp theo" onClick={() => moveSlide(1)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/50 bg-[#071A12]/60 text-white transition-colors hover:bg-[#071A12]">
                <StorefrontIcon name="chevron_right" className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="absolute right-4 top-4 flex gap-2 sm:right-7 sm:top-7" aria-label="Chọn ảnh banner">
            {slides.map((slide, index) => (
              <button key={slide.src} type="button" aria-label={'Hiển thị ảnh ' + (index + 1) + ': ' + slide.label}
                aria-pressed={index === activeIndex} onClick={() => setActiveIndex(index)}
                className="flex h-11 w-11 items-center justify-center rounded-full"
              >
                <span aria-hidden="true" className={index === activeIndex
                  ? 'h-2.5 w-7 rounded-full bg-[#0B2419] shadow-sm'
                  : 'h-2.5 w-4 rounded-full bg-white/80 shadow-sm transition-colors hover:bg-white'} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
