import { nanoid } from 'nanoid';

export const generateOrderSlug = () => {
  const randomString = nanoid(4);
  const timestamp = new Date().getTime();
  return `order-${randomString}-${timestamp}`;
};

export const generateSlugFromTitle = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/-+/g, '-'); // Replace multiple - with single -
};
