import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { APP_PATHS } from '../routes/paths';
import { supportContact } from '../features/content/model/supportContact';
import { useAuthSession } from '../features/auth/session/useAuthSession';

export const Footer: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthSession();

  return (
    <footer className="border-t border-[#164E35] bg-[#0B2419] text-white/80">
      <div className="mx-auto max-w-7xl px-6 pb-10 pt-14 lg:px-8">
        <div className="grid grid-cols-1 gap-10 border-b border-white/10 pb-12 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-[0.16em] text-white">FIDO</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#E5C358]" />
              <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#E5C358]">
                Fashion
              </span>
            </div>
            <p className="mt-3 text-xs font-medium tracking-wide text-[#E5C358]">
              Fit • Innovate • Devote • Open
            </p>
            <p className="mt-4 max-w-xs text-xs leading-6 text-white/55">
              Khám phá trang phục FIDO với phom dáng, màu sắc và chất liệu phù hợp phong cách của bạn.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-white">Khám phá</h4>
            <div className="mt-4 flex flex-col items-start gap-2.5 text-xs text-white/60">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="transition-colors hover:text-white"
              >
                Trang chủ
              </button>
              <Link
                to={APP_PATHS.about}
                onClick={() => window.scrollTo(0, 0)}
                className="transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4"
              >
                Về FIDO
              </Link>
              <button
                type="button"
                onClick={() => navigate('/products')}
                className="transition-colors hover:text-white"
              >
                Sản phẩm
              </button>
              <button
                type="button"
                onClick={() => navigate('/policies')}
                className="transition-colors hover:text-white"
              >
                Chính sách
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-white">Tài khoản</h4>
            <div className="mt-4 flex flex-col items-start gap-2.5 text-xs text-white/60">
              <button
                type="button"
                onClick={() => navigate('/account')}
                className="transition-colors hover:text-white"
              >
                Hồ sơ
              </button>
              <button
                type="button"
                onClick={() => navigate('/orders')}
                className="transition-colors hover:text-white"
              >
                Đơn hàng của tôi
              </button>
              {!isAuthenticated && (
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="transition-colors hover:text-white"
                >
                  Đăng nhập / đăng ký
                </button>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-white">
              Chăm sóc khách hàng
            </h4>
            {(supportContact.email || supportContact.hotline) && (
              <dl className="mt-4 space-y-4 text-sm text-white/80">
                {supportContact.email && (
                  <div>
                    <dt className="text-xs text-white/60">Email</dt>
                    <dd className="mt-1 break-all">
                      <a
                        className="inline-flex min-h-11 items-center underline"
                        href={`mailto:${supportContact.email}`}
                      >
                        {supportContact.email}
                      </a>
                    </dd>
                  </div>
                )}
                {supportContact.hotline && (
                  <div>
                    <dt className="text-xs text-white/60">Hotline</dt>
                    <dd className="mt-1">
                      <a
                        className="inline-flex min-h-11 items-center underline"
                        href={`tel:${supportContact.hotline.replace(/[\s().-]/g, '')}`}
                      >
                        {supportContact.hotline}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            )}
            <Link
              to="/policies"
              className="mt-4 inline-flex min-h-11 items-center text-sm underline"
            >
              Chính sách mua hàng & sau bán
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-6 text-[11px] text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 FIDO Fashion. All rights reserved.</p>
          <p className="uppercase tracking-[0.16em]">Ready-to-Wear • COD</p>
        </div>
      </div>
    </footer>
  );
};
