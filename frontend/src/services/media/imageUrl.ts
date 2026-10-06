const configuredBaseUrl = (import.meta.env.VITE_IMAGE_BASE_URL ?? '').trim().replace(/\/+$/, '');

const isAbsoluteHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value);

export function resolveImageUrl(value?: string | null): string | undefined {
  const normalized = value?.trim();
  if (!normalized) {
    return undefined;
  }

  if (isAbsoluteHttpUrl(normalized) || !configuredBaseUrl) {
    return normalized;
  }

  return `${configuredBaseUrl}/${normalized.replace(/^\/+/, '')}`;
}
