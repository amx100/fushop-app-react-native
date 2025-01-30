import { create } from 'zustand';
import { CartItem, SizeType } from '../types';
import { Toast } from 'react-native-toast-notifications';

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: number | string, size: SizeType) => void;
  clearCart: () => void;
  incrementItem: (id: number | string, size: SizeType) => void;
  decrementItem: (id: number | string, size: SizeType) => void;
  getTotalPrice: () => string;
  getItemCount: () => number;
  resetCart: () => void;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  addItem: (item) =>
    set((state) => {
      const existingItemIndex = state.items.findIndex(
        i => i.id === item.id && i.size === item.size
      );

      if (existingItemIndex !== -1) {
        const existingItem = state.items[existingItemIndex];
        const newQuantity = existingItem.quantity + item.quantity;

        if (newQuantity > existingItem.maxQuantity) {
          Toast.show(
            `Cannot add more items. Maximum available quantity is ${existingItem.maxQuantity}`, 
            {
              type: 'warning',
              placement: 'top',
              duration: 3000,
            }
          );
          return state;
        }

        const updatedItems = [...state.items];
        updatedItems[existingItemIndex] = {
          ...existingItem,
          quantity: newQuantity,
        };
        return { items: updatedItems };
      }

      if (item.quantity > item.maxQuantity) {
        Toast.show(
          `Cannot add ${item.quantity} items. Maximum available quantity is ${item.maxQuantity}`,
          {
            type: 'warning',
            placement: 'top',
            duration: 3000,
          }
        );
        return state;
      }

      return { items: [...state.items, item] };
    }),
  removeItem: (id, size) =>
    set((state) => ({
      items: state.items.filter(i => !(i.id === id && i.size === size)),
    })),
  clearCart: () => set({ items: [] }),
  incrementItem: (id, size) =>
    set((state) => {
      const itemIndex = state.items.findIndex(
        i => i.id === id && i.size === size
      );
      
      if (itemIndex === -1) return state;

      const item = state.items[itemIndex];
      if (item.quantity >= item.maxQuantity) {
        Toast.show(
          `Maximum available quantity (${item.maxQuantity}) reached for this item`,
          {
            type: 'warning',
            placement: 'top',
            duration: 3000,
          }
        );
        return state;
      }

      const updatedItems = [...state.items];
      updatedItems[itemIndex] = {
        ...item,
        quantity: item.quantity + 1,
      };

      return { items: updatedItems };
    }),
  decrementItem: (id, size) =>
    set((state) => {
      const itemIndex = state.items.findIndex(
        i => i.id === id && i.size === size
      );
      
      if (itemIndex === -1) return state;

      const item = state.items[itemIndex];
      if (item.quantity <= 1) {
        // Remove item if quantity would go below 1
        return {
          items: state.items.filter((_, index) => index !== itemIndex),
        };
      }

      const updatedItems = [...state.items];
      updatedItems[itemIndex] = {
        ...item,
        quantity: item.quantity - 1,
      };

      return { items: updatedItems };
    }),
  getTotalPrice: () => {
    const { items } = get();
    return items
      .reduce((total, item) => total + item.price * item.quantity, 0)
      .toFixed(2);
  },
  getItemCount: () => {
    const { items } = get();
    return items.reduce((count, item) => count + item.quantity, 0);
  },
  resetCart: () => set({ items: [] }),
}));
