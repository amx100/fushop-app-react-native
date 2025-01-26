import { create } from 'zustand';

type CartItemType = {
  id: number;
  title: string;
  heroImage: string;
  price: number;
  quantity: number;
  maxQuantity: number;
};

type CartState = {
  items: CartItemType[];
  addItem: (item: CartItemType) => void;
  removeItem: (id: number) => void;
  incrementItem: (id: number) => void;
  decrementItem: (id: number) => void;
  getTotalPrice: () => string;
  getItemCount: () => number;
  resetCart: () => void;
};

// Ensure initialCartItems is always an array
const initialCartItems: CartItemType[] = [];

export const useCartStore = create<CartState>((set, get) => ({
  items: initialCartItems,
  addItem: (item: CartItemType) => {
    if (!item?.id) return; // Guard against invalid items

    const existingItem = get().items?.find(i => i?.id === item.id);
    if (existingItem) {
      set(state => ({
        items: state.items.map(i =>
          i?.id === item.id
            ? {
                ...i,
                quantity: Math.min(i.quantity + (item.quantity || 1), i.maxQuantity),
              }
            : i
        ).filter(Boolean) as CartItemType[], // Filter out any null/undefined items
      }));
    } else {
      set(state => ({ 
        items: [...(state.items || []), { ...item, quantity: item.quantity || 1 }] 
      }));
    }
  },
  removeItem: (id: number) =>
    set(state => ({ 
      items: (state.items || []).filter(item => item?.id !== id) 
    })),
  incrementItem: (id: number) =>
    set(state => {
      if (!state.items) return { items: [] };
      return {
        items: state.items.map(item =>
          item?.id === id && item.quantity < (item.maxQuantity || Infinity)
            ? { ...item, quantity: (item.quantity || 0) + 1 }
            : item
        ).filter(Boolean) as CartItemType[],
      };
    }),
  decrementItem: (id: number) =>
    set(state => {
      if (!state.items) return { items: [] };
      return {
        items: state.items.map(item =>
          item?.id === id && (item.quantity || 0) > 1
            ? { ...item, quantity: (item.quantity || 0) - 1 }
            : item
        ).filter(Boolean) as CartItemType[],
      };
    }),
  getTotalPrice: () => {
    const { items } = get();
    if (!items?.length) return '0.00';

    return items
      .reduce((total, item) => 
        total + (item?.price || 0) * (item?.quantity || 0), 
        0
      )
      .toFixed(2);
  },
  getItemCount: () => {
    const { items } = get();
    if (!items?.length) return 0;

    return items.reduce((count, item) => 
      count + (item?.quantity || 0), 
      0
    );
  },
  resetCart: () => set({ items: [] }),
}));
