export type CategoryArtworkKind =
  | 'tops'
  | 'bottoms'
  | 'dresses'
  | 'accessories'
  | 'shoes'
  | 'menswear'
  | 'womenswear'
  | 'essentials';

const normalizeCategoryName = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

export const resolveCategoryArtwork = (name: string): CategoryArtworkKind => {
  const value = normalizeCategoryName(name);
  if (/\b(vay|dam|dress|skirt)\b/.test(value)) return 'dresses';
  if (/\b(phu kien|tui|non|mu|accessor|bag|hat)\b/.test(value)) return 'accessories';
  if (/\b(giay|dep|shoe|sneaker)\b/.test(value)) return 'shoes';
  if (/\b(quan|pants|jeans|trouser|shorts)\b/.test(value)) return 'bottoms';
  if (/\b(ao|shirt|tee|top|hoodie|jacket|blazer)\b/.test(value)) return 'tops';
  if (/\b(nam|men|menswear)\b/.test(value)) return 'menswear';
  if (/\b(nu|women|womenswear)\b/.test(value)) return 'womenswear';
  return 'essentials';
};
