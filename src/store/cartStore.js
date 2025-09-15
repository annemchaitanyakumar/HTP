import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import PropTypes from 'prop-types';

/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} name
 * @property {number} price
 * @property {string} image
 * @property {'non-veg' | 'veg'} category
 * @property {string} description
 * @property {string[]} ingredients
 * @property {string} weight
 */

/**
 * @typedef {Object} CartItem
 * @property {string} id
 * @property {string} name
 * @property {number} price
 * @property {string} image
 * @property {'non-veg' | 'veg'} category
 * @property {string} description
 * @property {string[]} ingredients
 * @property {string} weight
 * @property {number} quantity
 */

/**
 * @typedef {Object} CartStore
 * @property {CartItem[]} items
 * @property {function(Product): void} addItem
 * @property {function(string): void} removeItem
 * @property {function(string): void} incrementQuantity
 * @property {function(string): void} decrementQuantity
 * @property {function(): void} clearCart
 * @property {function(): number} getTotalItems
 * @property {function(): number} getTotalPrice
 */

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (item) => {
        set((state) => {
          // Find if an item with the same id AND weight exists
          const existingIndex = state.items.findIndex(
            (cartItem) =>
              cartItem.id === item.id &&
              (cartItem.weight || null) === (item.weight || null)
          );
          if (existingIndex !== -1) {
            // If found, increase quantity
            const updatedItems = [...state.items];
            updatedItems[existingIndex].quantity += 1;
            // Move the updated item to the top
            const [updatedItem] = updatedItems.splice(existingIndex, 1);
            return { items: [updatedItem, ...updatedItems] };
          } else {
            // Add new item at the top
            return { items: [item, ...state.items] };
          }
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter(item => item.id !== productId),
        }));
      },

      incrementQuantity: (productId) => {
        set((state) => ({
          items: state.items.map(item =>
            item.id === productId
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        }));
      },

      decrementQuantity: (productId) => {
        set((state) => {
          const item = state.items.find(item => item.id === productId);
          if (item && item.quantity === 1) {
            return {
              items: state.items.filter(item => item.id !== productId)
            };
          }
          return {
            items: state.items.map(item =>
              item.id === productId
                ? { ...item, quantity: item.quantity - 1 }
                : item
            ),
          };
        });
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotalItems: () => {
        const state = get();
        return state.items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        const state = get();
        return state.items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);
