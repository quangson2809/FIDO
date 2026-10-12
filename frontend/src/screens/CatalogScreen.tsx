import { CatalogBrowse } from '../features/catalog/components/CatalogBrowse';
import { useCatalogMetadata } from '../features/catalog/hooks/useCatalogMetadata';

export const CatalogScreen = () => {
  const metadata = useCatalogMetadata();
  return (
    <div className="min-h-screen bg-white text-forest-deep">
      <section className="border-b border-border-subtle bg-surface-ivory px-4 py-6 sm:px-8 lg:px-14">
        <div className="mx-auto max-w-[1440px]">
          <p className="text-xs font-bold uppercase tracking-widest text-forest-light">
            Bộ sưu tập FIDO
          </p>
          <h1 className="mt-2 font-serif text-3xl sm:text-5xl">Khám phá sản phẩm</h1>
          <p className="mt-3 text-sm leading-6 text-muted-grey">
            Tìm thiết kế phù hợp với bạn theo danh mục, kích cỡ, màu sắc và khoảng giá.
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-8 lg:px-14">
        <CatalogBrowse metadata={metadata} />
      </div>
    </div>
  );
};
