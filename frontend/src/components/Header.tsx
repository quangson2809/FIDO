import React, { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../features/cart/hooks/useCart';
import { useToast } from '../shared/ui/toast/useToast';
import { useAuthSession } from '../features/auth/session/useAuthSession';

import { StorefrontIcon } from './StorefrontIcon';
import { APP_PATHS } from '../routes/paths';
import { CategoryNavigation } from '../features/catalog/components/CategoryNavigation';
import { LogoutButton } from '../shared/ui/storefront/LogoutButton';

const navItems = [
  {
    path: '/',
    label: 'Trang chủ',
    active: (pathname: string) => pathname === '/',
  },
  {
    path: '/products',
    label: 'Sản phẩm',
    active: (pathname: string) => pathname.startsWith('/products'),
  },
  {
    path: APP_PATHS.about,
    label: 'Giới thiệu',
    active: (pathname: string) => pathname === APP_PATHS.about,
  },
  {
    path: '/policies',
    label: 'Chính sách',
    active: (pathname: string) => pathname === '/policies',
  },
  {
    path: '/orders',
    label: 'Đơn hàng',
    active: (pathname: string) => pathname.startsWith('/orders'),
  },
] as const;

export const Header: React.FC = () => {
  const { setIsCartOpen, cartItems } = useCart();
  const { showToast } = useToast();
  const { isAuthenticated } = useAuthSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [menu, setMenu] = useState<{ routeKey: string; kind: 'primary' | 'catalog' | null }>({ routeKey: location.key, kind: null });
  // Discard route-owned disclosure state permanently, including on Back/Forward.
  if (menu.routeKey !== location.key) setMenu({ routeKey: location.key, kind: null });
  const activeMenu = menu.routeKey === location.key ? menu.kind : null;
  const isMenuOpen = activeMenu === 'primary';
  const setActiveMenu = (kind: typeof menu.kind) => setMenu({ routeKey: location.key, kind });
  const setCategoriesOpen = (open: boolean) => {
    if (open) setActiveMenu('catalog');
    else if (activeMenu === 'catalog') setActiveMenu(null);
  };
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const totalCartCount = cartItems.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  const navigateTo = (path: string) => {
    setActiveMenu(null);
    navigate(path);
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  };

  const closeNavigation = () => {
    setActiveMenu(null);
    window.scrollTo(0, 0);
  };

  const openAccount = () => navigateTo(isAuthenticated ? '/account' : '/login');

  const openCart = () => {
    setActiveMenu(null);
    if (!isAuthenticated) {
      showToast('Vui lòng đăng nhập để sử dụng giỏ hàng và đặt hàng.');
      navigateTo('/login');
      return;
    }
    setIsCartOpen(true);
  };

  return (
    <>
      <div className="w-full bg-[#0B2419] px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FFFDF5] sm:text-[11px]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <span>FIDO Ready-to-Wear</span>
          <span className="hidden opacity-35 sm:inline">•</span>
          <span>Thanh toán COD</span>
          <span className="hidden opacity-35 md:inline">•</span>
          <span className="hidden md:inline">
            Đăng nhập để dùng giỏ hàng và đặt hàng
          </span>
        </div>
      </div>

      <header className="sticky top-0 z-40 h-[72px] w-full border-b border-[#E2E5DE] bg-white/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-4 sm:px-8 xl:px-12">
          <div className="flex h-full items-center gap-3 sm:gap-6 xl:gap-9">
            <button
              type="button"
              onClick={() => navigateTo('/')}
              className="group flex items-baseline gap-1.5 text-left focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              <span className="flex items-baseline text-2xl font-black tracking-[0.16em] text-[#0B2419]">
                FIDO
                <span className="ml-0.5 inline-block h-2 w-2 rounded-full bg-[#E8C75B] transition-transform group-hover:scale-125" />
              </span>
              <span className="hidden text-[9px] font-bold uppercase tracking-[0.18em] text-[#1B5038] xl:inline">
                Fashion
              </span>
            </button>

            <nav
              aria-label="Điều hướng chính"
              className="flex h-full items-center gap-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#606863] xl:gap-6"
            >
              {navItems.map((item) => {
                const active = item.active(location.pathname);
                if (item.path === APP_PATHS.catalog) return <CategoryNavigation key={item.path}
                  open={activeMenu === 'catalog'} active={active || location.pathname.startsWith('/categories/')}
                  onOpenChange={setCategoriesOpen} onNavigate={closeNavigation} />;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-current={active ? 'page' : undefined}
                    onClick={closeNavigation}
                    onPointerEnter={event => { if (event.pointerType === 'mouse') setCategoriesOpen(false); }}
                    className={`relative hidden py-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 hover:text-[#0B2419] lg:inline-flex ${active ? 'text-[#0B2419]' : ''}`}
                  >
                    {item.label}
                    {active && (
                      <span className="absolute inset-x-0 -bottom-1 h-0.5 bg-[#0B2419]" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <LogoutButton className="hidden lg:inline-flex lg:items-center" />
            <button
              ref={menuButtonRef}
              type="button"
              aria-label={isMenuOpen ? 'Đóng menu' : 'Mở menu'}
              aria-expanded={isMenuOpen}
              aria-controls="storefront-mobile-menu"
              onClick={() => setActiveMenu(isMenuOpen ? null : 'primary')}
              onKeyDown={event => { if (event.key === 'Escape') setActiveMenu(null); }}
              className="flex h-10 w-10 items-center justify-center text-[#0B2419] focus-visible:outline-2 focus-visible:outline-offset-2 lg:hidden"
            >
              <StorefrontIcon name={isMenuOpen ? 'close' : 'menu'} />
            </button>
            <button
              type="button"
              aria-label={isAuthenticated ? 'Tài khoản' : 'Đăng nhập'}
              onClick={openAccount}
              className="flex h-10 items-center gap-1.5 px-2 text-[13px] font-medium text-[#0B2419] transition-colors hover:bg-[#F5F6F2] sm:px-3"
            >
              <StorefrontIcon name="person" className="h-5 w-5" />
              <span className="hidden sm:inline">
                {isAuthenticated ? 'Tài khoản' : 'Đăng nhập'}
              </span>
            </button>

            <button
              type="button"
              aria-label={`Giỏ hàng (${totalCartCount} sản phẩm)`}
              onClick={openCart}
              className="flex h-10 items-center gap-2 bg-[#0B2419] px-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#123A29] sm:px-4"
            >
              <StorefrontIcon name="shopping_bag" className="h-5 w-5" />
              <span className="hidden sm:inline">Giỏ hàng</span>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#E8C75B] px-1 text-[10px] font-black text-[#071A12]">
                {totalCartCount}
              </span>
            </button>
          </div>
        </div>
        {isMenuOpen && (
          <nav
            id="storefront-mobile-menu"
            aria-label="Điều hướng mobile"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setActiveMenu(null);
                menuButtonRef.current?.focus();
              }
            }}
            className="absolute inset-x-0 top-full border-b border-[#E2E5DE] bg-white p-4 shadow-lg lg:hidden"
          >
            <LogoutButton className="w-full text-left" />
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                aria-current={
                  item.active(location.pathname) ? 'page' : undefined
                }
                onClick={closeNavigation}
                className={`block px-4 py-3 text-sm focus-visible:outline-2 ${item.active(location.pathname) ? 'border-l-2 border-[#1B5038] bg-[#FAF9F5] font-bold' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
    </>
  );
};
