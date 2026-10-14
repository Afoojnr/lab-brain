import { previewImage } from '@/lib/brand-image';

export const alt = 'Lab Brain';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return previewImage();
}
