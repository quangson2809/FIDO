import { useLocation, useNavigate } from 'react-router-dom';
import { catalogQueryParams } from '../model/catalogQuery';
import { APP_PATHS } from '../../../routes/paths';

export function HeaderSearch({ onSearch }: { onSearch: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  return <form role="search" aria-label="Tìm kiếm toàn cửa hàng" className="header-search"
    onSubmit={event => {
      event.preventDefault();
      const value = new FormData(event.currentTarget).get('q');
      const query = catalogQueryParams({ q: typeof value === 'string' ? value.trim() || undefined : undefined });
      onSearch();
      navigate(`${APP_PATHS.catalog}${query.size ? `?${query}` : ''}`);
    }}>
    <label htmlFor="header-product-search" className="hidden shrink-0 text-sm font-semibold md:block">Tìm toàn cửa hàng</label>
    <input key={location.key} id="header-product-search" name="q" type="search" aria-label="Từ khóa tìm kiếm toàn cửa hàng"
      defaultValue={new URLSearchParams(location.search).get('q') ?? ''} placeholder="Bạn đang tìm sản phẩm nào?" className="min-w-0 flex-1 bg-white px-3 text-sm" />
    <button type="submit" aria-label="Tìm kiếm trong cửa hàng" className="shrink-0 bg-forest-deep px-4 text-sm font-semibold text-white">Tìm</button>
  </form>;
}
