import { useCallback, useEffect, useState } from 'react';
import { adminCatalogMetaService } from '../api/adminCatalogMetaService';
import type { AdminCatalogMetaDto } from '../types';
import { getApiErrorMessage } from '../../../services/http/apiError';

type Mutation = () => Promise<unknown>;

interface UseAdminAttributesResult {
  meta: AdminCatalogMetaDto | null;
  loading: boolean;
  busy: boolean;
  error: string | null;
  refresh: () => Promise<boolean>;
  runMutation: (mutation: Mutation, fallbackMessage: string, successMessage: string) => Promise<boolean>;
}

export const useAdminAttributes = (showToast: (message: string) => void): UseAdminAttributesResult => {
  const [meta, setMeta] = useState<AdminCatalogMetaDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await adminCatalogMetaService.getMeta();
      setMeta(response);
      setError(null);
      return true;
    } catch (failure: unknown) {
      setError(getApiErrorMessage(failure, 'Không thể tải danh sách thuộc tính.'));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  const runMutation = useCallback(
    async (
      mutation: Mutation,
      fallbackMessage: string,
      successMessage: string,
    ): Promise<boolean> => {
      if (busy) return false;
      setBusy(true);
      setError(null);
      try {
        await mutation();
        showToast(successMessage);
        await refresh();
        return true;
      } catch (failure: unknown) {
        setError(getApiErrorMessage(failure, fallbackMessage));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [busy, refresh, showToast],
  );

  return { meta, loading, busy, error, refresh, runMutation };
};
