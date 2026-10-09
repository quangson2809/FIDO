import { useCallback, useEffect, useState } from 'react';
import { normalizeApiError } from '../../services/http/apiError';
import type { ApiClientError } from '../../services/http/apiError';

// The loader identity is the request key. Never publish data for an older key.
export function useRemoteQuery<T>(load: () => Promise<T>) {
  const [revision, setRevision] = useState(0);
  const request = useCallback(() => { void revision; return load(); }, [load, revision]);
  const [result, setResult] = useState<{
    request: typeof request;
    data: T | null;
    error: ApiClientError | null;
  } | null>(null);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(request).then(
      (data) => { if (active) setResult({ request, data, error: null }); },
      (error: unknown) => { if (active) setResult({ request, data: null, error: normalizeApiError(error) }); },
    );
    return () => { active = false; };
  }, [request]);
  const current = result?.request === request ? result : null;
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  return { data: current?.data ?? null, error: current?.error ?? null, loading: !current, reload };
}
