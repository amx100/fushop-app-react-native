export type Product = {
  id: number;
  title: string;
  price: number;
  heroImage: string;
  category: number;
  slug: string;
  imagesUrl: string[];
  sizes?: ProductSize[];
};

export type ProductFormData = Omit<Product, 'id'> & {
  sizes?: {
    size: SizeType;
    quantity: number;
  }[];
};

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

export type SizeType = 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL';

export type ProductSize = {
  id: number;
  product_id: number;
  size: SizeType;
  quantity: number;
  created_at: string;
};

export interface CartItem {
  id: string | number;
  title: string;
  heroImage: string;
  name: string;
  price: number;
  quantity: number;
  size: SizeType;
  maxQuantity: number;
}

export interface Cart {
  items: CartItem[];
}
