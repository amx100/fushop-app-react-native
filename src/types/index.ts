export type Product = {
  id: number;
  title: string;
  price: number;
  maxQuantity: number;
  heroImage: string;
  category: number;
  slug: string;
  imagesUrl: string[]; // Dodajem iz grane 'main'
};

export type ProductFormData = Omit<Product, 'id'>;

export type OrderStatus = 'Pending' | 'Completed' | 'Shipped' | 'InTransit';

export type Order = {
  id: number;
  created_at: string;
  status: OrderStatus;
  totalPrice: number;
  user: string;
  description: string | null;
  slug: string;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  imageUrl: string;
  products: number[] | null;
};

export type CategoryFormData = Omit<Category, 'id' | 'products'>;
