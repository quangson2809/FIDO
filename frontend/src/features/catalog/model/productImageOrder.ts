import type { ProductImageDto, ProductImageOrderInput } from '../types';

export const sortProductImages = (images: readonly ProductImageDto[]): ProductImageDto[] =>
  [...images].sort((left, right) => left.sort_order - right.sort_order);

export const buildMovedImageOrder = (
  images: readonly ProductImageDto[],
  imageId: number,
  direction: -1 | 1,
): ProductImageOrderInput[] | null => {
  const orderedImages = sortProductImages(images);
  const currentIndex = orderedImages.findIndex((image) => image.image_id === imageId);
  const targetIndex = currentIndex + direction;

  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedImages.length) {
    return null;
  }

  const nextImages = [...orderedImages];
  [nextImages[currentIndex], nextImages[targetIndex]] = [nextImages[targetIndex], nextImages[currentIndex]];

  return nextImages.map((image, index) => ({
    image_id: image.image_id,
    sort_order: index,
  }));
};
