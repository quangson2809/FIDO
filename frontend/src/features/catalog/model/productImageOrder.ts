import type { ProductFamilyDto, ProductImageDto, ProductImageOrderInput } from '../types';

export const sortProductImages = (images: readonly ProductImageDto[]): ProductImageDto[] =>
  [...images].sort((left, right) => left.sort_order - right.sort_order);

export const buildFamilyGallery = (family: ProductFamilyDto): string[] => {
  const members = [...family.members].sort((left, right) =>
    Number(right.product_id === family.root_product_id)
      - Number(left.product_id === family.root_product_id)
      || left.product_id - right.product_id);
  const urls = new Set<string>();
  for (const member of members) {
    const images = [...member.images].sort((left, right) =>
      left.sort_order - right.sort_order || left.id - right.id);
    for (const image of images) urls.add(image.image_url);
  }
  return [...urls];
};

export const buildMovedImageOrder = (
  images: readonly ProductImageDto[],
  imageId: number,
  direction: -1 | 1,
): ProductImageOrderInput[] | null => {
  const orderedImages = sortProductImages(images);
  const currentIndex = orderedImages.findIndex((image) => image.id === imageId);
  const targetIndex = currentIndex + direction;

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedImages.length) {
    return null;
  }

  const nextImages = [...orderedImages];
  [nextImages[currentIndex], nextImages[targetIndex]] = [
    nextImages[targetIndex],
    nextImages[currentIndex],
  ];

  return nextImages.map((image, index) => ({
    image_id: image.id,
    sort_order: index,
  }));
};
