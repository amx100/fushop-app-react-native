export type Product = {
  id: number;
  title: string;
  slug: string;
  imagesUrl: string[]; 
  price: number;
  heroImage: string;
  category: number;
  maxQuantity: number;
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