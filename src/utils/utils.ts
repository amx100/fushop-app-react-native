import { nanoid } from 'nanoid';

export const generateOrderSlug = () => {
  const randomNumber = Math.floor(1000 + Math.random() * 9000); // 4-digit number
  return `order-${randomNumber}`;
};

export const generateSlugFromTitle = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-'); // Replace multiple hyphens with single hyphen
};
