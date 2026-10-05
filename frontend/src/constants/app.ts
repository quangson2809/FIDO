export type ApiMode = 'real' | 'mock';

export const API_MODE: ApiMode =
  import.meta.env.VITE_API_MODE === 'mock' ? 'mock' : 'real';
