export type ProductStatus = 'available' | 'out_of_stock';

export type Product = {
  id: number;
  title: string;
  price: number;
  heroimage: string;
  category: number;
  slug: string;
  imagesurl: string[];
  sizes?: ProductSize[];
  status: ProductStatus;
}

export interface ProductFormData {
  title: string;
  slug?: string;
  price: number;
  heroImage: string;
  category: number | null;
  imagesUrl?: string[];
  sizes?: ProductSize[];
  status?: 'available' | 'out_of_stock';
}

export type OrderStatus = 'Pending' | 'Completed' | 'Shipped' | 'InTransit';

export type Order = {
  id: number;
  created_at: string;
  status: OrderStatus;
  totalPrice: number;
  user: string;
  description: string | null;
  slug: string;
  user_email: { email: string };
  items: {
    quantity: number;
    size: string;
    product: {
      title: string;
      heroImage: string;
    };
  }[];
};

export type OrderItem = {
  product: {
    title: string;
    heroImage: string;
  };
  size: string;
  quantity: number;
};

export type Category = {
  id: number;
  name: string | null;
  slug: string;
  imageurl: string;
  products: number[] | null;
  created_at: string;
};

export type CategoryFormData = Omit<Category, 'id' | 'products' | 'created_at'> & {
  name: string; // Form data should have non-null name
};

export type SizeType = 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL';

interface Size {
  id: string;
  name: string;
  quantity: number;
}


export type ProductSize = {
  id: number;
  product_id: number;
  size_id: number;
  size?: string; // For display purposes
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
  size: string;
  size_id: number;
  maxQuantity: number;
}

export interface Cart {
  items: CartItem[];
}



