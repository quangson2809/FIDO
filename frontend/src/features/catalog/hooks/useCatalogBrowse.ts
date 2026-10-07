import { useEffect, useMemo, useState } from 'react';
import { catalogService } from '../api/service';
import type { CatalogMetaDto, CatalogProductView } from '../types';
import type { PaginationMeta } from '../../../types/api';
import { getApiErrorMessage } from '../../../services/http/apiError';

const PAGE_SIZE = 12;

const toOptionalNumber = (value: string): number | undefined => {
  const normalized = value.trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

export const useCatalogBrowse = (requestedCategoryId?: number) => {
  const [products, setProducts] = useState<CatalogProductView[]>([]);
  const [meta, setMeta] = useState<CatalogMetaDto | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>(requestedCategoryId);
  const [brandId, setBrandId] = useState<number | undefined>();
  const [sizeValueId, setSizeValueId] = useState<number | undefined>();
  const [colorId, setColorId] = useState<number | undefined>();
  const [gender, setGender] = useState<string | undefined>();
  const [season, setSeason] = useState<string | undefined>();
  const [style, setStyle] = useState<string | undefined>();
  const [minPriceInput, setMinPriceInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');
  const [minPrice, setMinPrice] = useState<number | undefined>();
  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [metaLoading, setMetaLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCategoryId(requestedCategoryId);
    setPage(1);
  }, [requestedCategoryId]);

  useEffect(() => {
    let active = true;

    void catalogService.getMeta()
      .then((data) => {
        if (active) setMeta(data);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(getApiErrorMessage(requestError, 'Không thể tải metadata catalog.'));
        }
      })
      .finally(() => {
        if (active) setMetaLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadProducts = async () => {
      setLoading(true);
      try {
        const result = await catalogService.listProducts({
          ...(query ? { q: query } : {}),
          ...(categoryId !== undefined ? { category_id: categoryId } : {}),
          ...(brandId !== undefined ? { brand_id: brandId } : {}),
          ...(sizeValueId !== undefined ? { size_value_id: sizeValueId } : {}),
          ...(colorId !== undefined ? { color_id: colorId } : {}),
          ...(gender ? { gender } : {}),
          ...(season ? { season } : {}),
          ...(style ? { style } : {}),
          ...(minPrice !== undefined ? { min_price: minPrice } : {}),
          ...(maxPrice !== undefined ? { max_price: maxPrice } : {}),
          page,
          page_size: PAGE_SIZE,
        });

        if (!active) return;
        setProducts(result.items);
        setPagination(result.meta);
        setError(null);
      } catch (requestError: unknown) {
        if (active) {
          setError(getApiErrorMessage(requestError, 'Không thể tải danh sách sản phẩm.'));
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadProducts();
    return () => {
      active = false;
    };
  }, [
    brandId,
    categoryId,
    colorId,
    gender,
    maxPrice,
    minPrice,
    page,
    query,
    season,
    sizeValueId,
    style,
  ]);

  const resetPage = () => setPage(1);

  const submitSearch = () => {
    resetPage();
    setQuery(searchInput.trim());
  };

  const applyPriceRange = () => {
    resetPage();
    setMinPrice(toOptionalNumber(minPriceInput));
    setMaxPrice(toOptionalNumber(maxPriceInput));
  };

  const clearFilters = () => {
    setSearchInput('');
    setQuery('');
    setCategoryId(undefined);
    setBrandId(undefined);
    setSizeValueId(undefined);
    setColorId(undefined);
    setGender(undefined);
    setSeason(undefined);
    setStyle(undefined);
    setMinPriceInput('');
    setMaxPriceInput('');
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setPage(1);
  };

  const activeFilterCount = useMemo(
    () => [
      query,
      categoryId,
      brandId,
      sizeValueId,
      colorId,
      gender,
      season,
      style,
      minPrice,
      maxPrice,
    ].filter((value) => value !== undefined && value !== '').length,
    [
      brandId,
      categoryId,
      colorId,
      gender,
      maxPrice,
      minPrice,
      query,
      season,
      sizeValueId,
      style,
    ],
  );

  return {
    products,
    meta,
    pagination,
    searchInput,
    setSearchInput,
    categoryId,
    setCategoryId: (value: number | undefined) => {
      setCategoryId(value);
      resetPage();
    },
    brandId,
    setBrandId: (value: number | undefined) => {
      setBrandId(value);
      resetPage();
    },
    sizeValueId,
    setSizeValueId: (value: number | undefined) => {
      setSizeValueId(value);
      resetPage();
    },
    colorId,
    setColorId: (value: number | undefined) => {
      setColorId(value);
      resetPage();
    },
    gender,
    setGender: (value: string | undefined) => {
      setGender(value);
      resetPage();
    },
    season,
    setSeason: (value: string | undefined) => {
      setSeason(value);
      resetPage();
    },
    style,
    setStyle: (value: string | undefined) => {
      setStyle(value);
      resetPage();
    },
    minPriceInput,
    setMinPriceInput,
    maxPriceInput,
    setMaxPriceInput,
    page,
    setPage,
    loading,
    metaLoading,
    error,
    activeFilterCount,
    totalPages: pagination?.total_pages ?? 0,
    submitSearch,
    applyPriceRange,
    clearFilters,
  };
};
