import { nanoid } from 'nanoid';

export const generateOrderSlug = () => {
  const randomString = nanoid(4);
  const timestamp = new Date().getTime();
  return `order-${randomString}-${timestamp}`;
};

export const generateSlugFromTitle = (title: string): string => {
  const randomString = nanoid(6);
  const timestamp = new Date().getTime();
  const baseSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen

  return `${baseSlug}-${randomString}-${timestamp}`;
};
