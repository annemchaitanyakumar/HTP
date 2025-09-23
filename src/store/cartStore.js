import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { cartService } from '@/services/cartService';
import { toast } from '@/hooks/use-toast';
import axios from '@/lib/axios';

/**
 * @typedef {Object} CartItem
 * @property {number} cartId
 * @property {number} productId
 * @property {string} productName
 * @property {string} productDescription
 * @property {number} productPrice
 * @property {string} category
 * @property {number} productStockQuantity
 * @property {string} productWeight
 * @property {number} quantity
 * @property {string} addedAt
 * @property {string} productImage1
 * @property {string} productImage2
 * @property {string} productImage3
 * @property {number} [weightBasedPrice]
 * @property {string} [image] // Add image property for rendering
 */

export const useCartStore = create()(
  persist(
    (set, get) => ({
      items: [],
      loading: false,
      error: null,

      // Helper function to fetch presigned URLs
      fetchPresignedUrls: async (productId) => {
        const presignedUrlsUrl = `http://localhost:8000/api/products/${productId}/presigned-urls`;
        try {
          const response = await axios.create().get(presignedUrlsUrl);
          const data = response.data;
          console.log(`Presigned URLs for product ${productId}:`, data);
          
          const imageUrl = data?.image1_url || data?.product_image1_url || data?.[0] || '/placeholder.png';
          return imageUrl;
        } catch (error) {
          console.error('Error fetching presigned URLs:', error);
          return '/placeholder.png';
        }
      },

      loadCartItems: async () => {
        set({ loading: true, error: null });
        try {
          console.log('Fetching cart items from service...');
          const cartItems = await cartService.getCartItems();
          console.log('Received cart items:', cartItems);

          // Fetch presigned URLs for each item
          const itemsWithImages = await Promise.all(
            cartItems.map(async (item) => {
              const imageUrl = await get().fetchPresignedUrls(item.productId);
              return { ...item, image: imageUrl };
            })
          );

          set({ items: itemsWithImages, loading: false });
        } catch (error) {
          console.error('Error loading cart items:', error);
          set({ error: error.message, loading: false });
          toast({
            variant: 'destructive',
            title: 'Error',
            description: error.message || 'Failed to load cart items',
          });
        }
      },

      addItem: async (product, quantity = 1) => {
        set({ loading: true, error: null });
        try {
          // Check if item with same weight already exists in cart
          const existingItem = get().items.find(
            (item) => item.productId === product.id && item.productWeight === product.weight
          );

          if (existingItem) {
            if (existingItem.quantity + quantity > 10) {
              throw new Error('Maximum quantity limit (10) reached for this item');
            }
            return await get().updateQuantity(
              existingItem.cartId,
              existingItem.quantity + quantity,
              existingItem.productWeight
            );
          }

          if (!product.id) {
            throw new Error('Product ID is required');
          }

          // Get price and weight from the product's price_by_weight if available
          let price = product.price;
          let weight = product.weight;
          
          if (product.price_by_weight) {
            if (typeof product.price_by_weight === 'string') {
              try {
                const priceByWeight = JSON.parse(product.price_by_weight);
                const weights = Object.keys(priceByWeight).sort((a, b) => Number(a) - Number(b));
                if (weights.length > 0) {
                  weight = weights[0];
                  price = priceByWeight[weight];
                }
              } catch (e) {
                console.error('Error parsing price_by_weight:', e);
              }
            } else {
              const weights = Object.keys(product.price_by_weight).sort((a, b) => Number(a) - Number(b));
              if (weights.length > 0) {
                weight = weights[0];
                price = product.price_by_weight[weight];
              }
            }
          }

          console.log('CartStore: Adding item with details:', {
            productId: product.id,
            productName: product.product_name,
            quantity,
            price,
            weight,
            slug: product.slug,
          });

          // Fetch cart item first
          const cartItem = await cartService.addToCart(
            product.id,
            quantity,
            weight,
            price
          );
          
          // Add the slug to the cart item
          cartItem.slug = product.slug;

          // Fetch presigned URL for the new item
          const imageUrl = await get().fetchPresignedUrls(product.id);

          const cartItemWithCorrectPrice = {
            ...cartItem,
            weightBasedPrice: parseFloat(product.price),
            image: imageUrl // Add image property
          };

          set((state) => ({
            items: [cartItemWithCorrectPrice, ...state.items],
            loading: false,
          }));
          toast({
            title: 'Success',
            description: 'Item added to cart',
          });
        } catch (error) {
          set({ error: error.message, loading: false });
          toast({
            variant: 'destructive',
            title: 'Error',
            description: error.message || 'Failed to add item to cart',
          });
        }
      },

      removeItem: async (cartId) => {
        set({ loading: true, error: null });
        try {
          console.log('Removing item with cartId:', cartId);
          await cartService.removeFromCart(cartId);
          set((state) => ({
            items: state.items.filter((item) => item.cartId !== cartId),
            loading: false,
          }));
          toast({
            title: 'Success',
            description: 'Item removed from cart',
          });
        } catch (error) {
          console.error('Error removing item:', error);
          set({ error: error.message, loading: false });
          toast({
            variant: 'destructive',
            title: 'Error',
            description: error.message || 'Failed to remove item from cart',
          });
        }
      },

      updateQuantity: async (cartId, newQuantity, weight) => {
        set({ loading: true, error: null });
        try {
          const updatedItem = await cartService.updateCartItem(cartId, newQuantity, weight);
          // Ensure the updated item retains the image URL
          const existingItem = get().items.find((item) => item.cartId === cartId);
          set((state) => ({
            items: state.items.map((item) =>
              item.cartId === cartId ? { ...updatedItem, image: existingItem.image } : item
            ),
            loading: false,
          }));
          toast({
            title: 'Success',
            description: 'Cart updated successfully',
          });
        } catch (error) {
          set({ error: error.message, loading: false });
          toast({
            variant: 'destructive',
            title: 'Error',
            description: error.message || 'Failed to update cart',
          });
        }
      },

      incrementQuantity: async (cartId) => {
        const item = get().items.find((item) => item.cartId === cartId);
        if (item && item.quantity < 10) {
          await get().updateQuantity(cartId, item.quantity + 1, item.productWeight);
        }
      },

      decrementQuantity: async (cartId) => {
        const item = get().items.find((item) => item.cartId === cartId);
        if (item && item.quantity > 1) {
          await get().updateQuantity(cartId, item.quantity - 1, item.productWeight);
        } else if (item && item.quantity === 1) {
          await get().removeItem(cartId);
        }
      },

      clearCart: async () => {
        set({ loading: true, error: null });
        try {
          await cartService.clearCart();
          set({ items: [], loading: false });
          toast({
            title: 'Success',
            description: 'Cart cleared successfully',
          });
        } catch (error) {
          console.error('Error clearing cart:', error);
          set({ error: error.message, loading: false });
          toast({
            variant: 'destructive',
            title: 'Error',
            description: error.message || 'Failed to clear cart',
          });
        }
      },

      getTotalItems: () => {
        const state = get();
        return state.items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        const state = get();
        return state.items.reduce(
          (total, item) => total + (item.weightBasedPrice || item.productPrice) * item.quantity,
          0
        );
      },
    }),
    {
      name: 'cart-storage',
      skipHydration: true,
    }
  )
);