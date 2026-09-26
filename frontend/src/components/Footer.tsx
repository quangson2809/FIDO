import React from 'react';
import { useApp } from '../context/AppContext';

export const Footer: React.FC = () => {
  const { setCurrentScreen } = useApp();

  return (
    <footer className="bg-[#0B2419] text-white/80 font-['Plus_Jakarta_Sans',sans-serif] pt-14 pb-8 border-t border-[#164E35]">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-white/10">
          {/* Brand Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl font-black tracking-widest text-white">FIDO</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#E5C358]"></span>
              <span className="text-[10px] font-semibold tracking-wider text-[#E5C358] uppercase">Fashion</span>
            </div>
            <p className="text-xs text-[#E5C358] font-medium tracking-wide mb-3">Fit - Innovate - Devote - Open</p>
            <p className="text-xs text-white/60 leading-relaxed mb-4">
              Thương hiệu thời trang nam may sẵn chất lượng cao, định hình phong cách phái mạnh hiện đại và lịch lãm.
            </p>
            <div className="text-xs text-white/80 space-y-1">
              <p className="font-medium text-white">Hotline CSKH (24/7):</p>
              <p className="text-sm font-bold text-[#E5C358]">
                1800 6828 <span className="text-[11px] font-normal text-white/60">(Miễn cước)</span>
              </p>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Danh Mục Mua Sắm</h4>
            <ul className="space-y-2.5 text-xs text-white/60">
              <li>
                <button
                  type="button"
                  onClick={() => setCurrentScreen('catalog')}
                  className="hover:text-white transition-colors text-left"
                >
                  Quần Jean Nam RTW
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setCurrentScreen('catalog')}
                  className="hover:text-white transition-colors text-left"
                >
                  Áo Sơ Mi May Sẵn Cao Cấp
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setCurrentScreen('catalog')}
                  className="hover:text-white transition-colors text-left"
                >
                  Quần Tây & Khaki Công Sở
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setCurrentScreen('catalog')}
                  className="hover:text-white transition-colors text-left"
                >
                  Áo Blazer & Áo Khoác Nam
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setCurrentScreen('catalog')}
                  className="hover:text-white transition-colors text-left"
                >
                  Phụ Kiện Da Thảo Mộc
                </button>
              </li>
            </ul>
          </div>

          {/* Services & Policies */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Chính Sách & Dịch Vụ</h4>
            <ul className="space-y-2.5 text-xs text-white/60">
              <li>
                <button
                  type="button"
                  onClick={() => setCurrentScreen('policy')}
                  className="hover:text-white transition-colors text-left"
                >
                  Chính sách đổi / hoàn trong 02 ngày
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setCurrentScreen('checkout')}
                  className="hover:text-white transition-colors text-left"
                >
                  Giao hàng COD toàn quốc
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setCurrentScreen('showrooms')}
                  className="hover:text-white transition-colors text-left"
                >
                  Thông tin chăm sóc sản phẩm
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setCurrentScreen('policy')}
                  className="hover:text-white transition-colors text-left"
                >
                  Chính sách bảo mật thông tin
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setCurrentScreen('policy')}
                  className="hover:text-white transition-colors text-left"
                >
                  Quy định bảo hành đường may
                </button>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Kết Nối & Đăng Ký Tin</h4>
            <p className="text-xs text-white/60 mb-3 leading-relaxed">
              Đăng ký để nhận thông tin bộ sưu tập mới và ưu đãi đặc quyền 10% cho đơn hàng đầu tiên.
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="flex gap-2 mb-4">
              <input
                type="email"
                placeholder="Nhập email của bạn..."
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#E5C358] w-full"
              />
              <button
                type="submit"
                className="bg-[#E5C358] hover:bg-[#d8b74f] text-[#0B2419] font-bold text-xs px-4 py-2 rounded-lg whitespace-nowrap transition-colors"
              >
                ĐĂNG KÝ
              </button>
            </form>
            <div className="flex items-center gap-3 text-white/60 text-xs">
              <span className="inline-flex items-center gap-1 border border-white/20 rounded px-2 py-1 text-[10px] text-white/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> ĐÃ THÔNG BÁO BỘ CÔNG THƯƠNG
              </span>
              <span className="border border-white/20 rounded px-2 py-1 text-[10px] text-white/80">
                COD VERIFIED
              </span>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-white/50 gap-4">
          <div className="flex items-center gap-3">
            <p>© 2026 FIDO Fashion. All rights reserved. Slogan: Fit - Innovate - Devote - Open</p>
          </div>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <span>Phương thức thanh toán:</span>
            <span className="font-semibold text-white/80 tracking-wider">COD</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
