import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { contentService } from '../features/content/api/service';
import type { PublicContentPageDto } from '../features/content/types';
import { getApiErrorMessage } from '../services/http/apiError';

const POLICY_PAGE_CODES = [
  'shipping-policy',
  'return-policy',
  'privacy-policy',
] as const;

export const PolicyScreen: React.FC = () => {
  const navigate = useNavigate();
  const [pages, setPages] = useState<PublicContentPageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadPolicies = async () => {
      try {
        const results = await Promise.allSettled(
          POLICY_PAGE_CODES.map((pageCode) => contentService.getPublicPage(pageCode)),
        );
        if (!active) return;

        const loaded = results.flatMap((result) =>
          result.status === 'fulfilled' ? [result.value] : [],
        );

        setPages(loaded);
        setError(
          loaded.length === 0
            ? 'Không thể tải nội dung chính sách từ backend.'
            : null,
        );
      } catch (requestError: unknown) {
        if (active) {
          setError(getApiErrorMessage(requestError, 'Không thể tải nội dung chính sách.'));
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadPolicies();
    return () => { active = false; };
  }, []);

  return (
    <div className="min-h-[60vh] bg-[#FAF9F5] px-4 py-12 text-[#0B2419]">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="border border-[#E8E9E3] bg-white p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#687069]">FIDO content</p>
          <h1 className="mt-2 font-serif text-3xl">Chính sách</h1>
          <p className="mt-4 text-sm leading-6 text-[#606863]">
            Nội dung bên dưới được tải từ content API của backend.
          </p>
        </div>

        {loading && (
          <div className="border border-[#E8E9E3] bg-white p-8 text-sm text-[#687069]">
            Đang tải chính sách...
          </div>
        )}

        {!loading && error && (
          <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && pages.map((page) => (
          <article key={page.page_code} className="border border-[#E8E9E3] bg-white p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#687069]">
              {page.page_code}
            </p>
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
