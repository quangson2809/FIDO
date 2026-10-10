import { useCallback } from 'react';
import { catalogService } from '../api/service';
import { buildCategoryTree } from '../model/categoryTree';
import { useRemoteQuery } from '../../../shared/hooks/useRemoteQuery';
import { getStorefrontErrorMessage } from '../../../services/http/storefrontError';

export function useCatalogCategories() {
  const metadata = useRemoteQuery(useCallback(() => catalogService.getMeta(), []));
  return {
    nodes: buildCategoryTree(metadata.data?.categories ?? []),
    loading: metadata.loading,
    error: metadata.error ? getStorefrontErrorMessage(metadata.error, 'Không thể tải danh mục.') : null,
    reload: metadata.reload,
  };
}
