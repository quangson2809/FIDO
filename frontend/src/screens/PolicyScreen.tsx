import { QueryFeedback } from '../shared/ui/storefront/QueryFeedback';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { contentService } from '../features/content/api/service';
import type { PublicContentPageDto } from '../features/content/types';
import { getStorefrontErrorMessage } from '../services/http/storefrontError';
import { normalizeApiError } from '../services/http/apiError';

const POLICY_PAGE_CODES = [
  'shipping-policy',
  'return-policy',
  'privacy-policy',
] as const;

export const PolicyScreen: React.FC = () => {
  const navigate = useNavigate();
  const [pages, setPages] = useState<PublicContentPageDto[]>([]);
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadPolicies = async () => {
      setLoading(true);
      try {
        const results = await Promise.allSettled(
          POLICY_PAGE_CODES.map((pageCode) => contentService.getPublicPage(pageCode)),
        );
        if (!active) return;

        setPages(current => results.flatMap((result, index) => {
          if (result.status === 'fulfilled') return [result.value];
          const { status } = normalizeApiError(result.reason);
          // Keep a successfully loaded policy on temporary read failures, but respect removal/access denial.
          if (status === 401 || status === 403 || status === 404) return [];
          return current.filter(page => page.page_code === POLICY_PAGE_CODES[index]);
        }));
        setError(
          results.some(result => result.status === 'rejected')
            ? 'Một số chính sách chưa tải được. Vui lòng thử lại để xem đầy đủ nội dung.'
            : null,
        );
      } catch (requestError: unknown) {
        if (active) {
          setError(getStorefrontErrorMessage(requestError, 'Không thể tải nội dung chính sách.'));
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadPolicies();
    return () => { active = false; };
  }, [retry]);

  return (
    <div className="min-h-[60vh] bg-[#FAF9F5] px-4 py-12 text-[#0B2419]">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="border border-[#E8E9E3] bg-white p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#687069]">Thông tin mua hàng</p>
          <h1 className="mt-2 font-serif text-3xl">Chính sách</h1>
          <p className="mt-4 text-sm leading-6 text-[#606863]">
            Tìm hiểu chính sách giao hàng, trả hàng và quyền riêng tư trước khi đặt hàng.
          </p>
        </div>

        <QueryFeedback loading={loading} error={error} onRetry={() => setRetry(value => value + 1)} />

        {pages.length > 0 && <nav aria-label="Mục lục chính sách" className="flex flex-wrap gap-3 text-sm">{pages.map(page => <a key={page.page_code} className="min-h-11 border bg-white px-4 py-3 underline" href={`#${page.page_code}`}>{page.title}</a>)}</nav>}
        {pages.map((page) => (
          <article id={page.page_code} key={page.page_code} className="scroll-mt-24 border border-[#E8E9E3] bg-white p-5 sm:p-8">
            <h2 className="mt-2 font-serif text-2xl">{page.title}</h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#424844]">
              {page.content}
            </p>
          </article>
        ))}

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/')} className="border border-[#0B2419] px-4 py-2 text-xs font-bold uppercase">
            Trang chủ
          </button>
          <button type="button" onClick={() => navigate('/orders')} className="bg-[#0B2419] px-4 py-2 text-xs font-bold uppercase text-white">
            Đơn hàng của tôi
          </button>
        </div>
      </div>
    </div>
  );
};
