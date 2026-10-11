import { useCallback } from 'react';
import { catalogService } from '../api/service';
import { useRemoteQuery } from '../../../shared/hooks/useRemoteQuery';
import { getStorefrontErrorMessage } from '../../../services/http/storefrontError';

export function useCatalogMetadata() {
  const query = useRemoteQuery(useCallback(() => catalogService.getMeta(), []));
  return { ...query, error: query.error ? getStorefrontErrorMessage(query.error, 'Không thể tải danh mục và bộ lọc. Vui lòng thử lại.') : null };
}
