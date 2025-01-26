import React, { createContext, useContext, useState } from 'react';
import { Product } from '../types';

interface CartItem {
  product: Product | null;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (product: Product) => void;
  updateQuantity: (product: Product, quantity: number) => void;
}

const CartContext = createContext<CartContextType>({
  cart: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
});

export const useCart = () => useContext(CartContext);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (product: Product) => {
    setCart(currentCart => {
      const existingItem = currentCart.find(item => item.product?.id === product.id);
      if (existingItem) {
        return currentCart.map(item =>
          item.product?.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...currentCart, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (product: Product) => {
    setCart(currentCart => 
      currentCart.filter(item => item.product?.id !== product.id)
    );
  };

  const updateQuantity = (product: Product, quantity: number) => {
    if (quantity === 0) {
      removeFromCart(product);
      return;
    }
    
    setCart(currentCart =>
      currentCart.map(item =>
        item.product?.id === product.id
          ? { ...item, quantity }
          : item
      )
    );
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity }}>
      {children}
    </CartContext.Provider>
  );
} 