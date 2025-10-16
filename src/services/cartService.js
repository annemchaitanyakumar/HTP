// src/services/cartService.js
const CART_ROUTES = {
  GET_ALL: `/api/all`,
  ADD: `/api/add`,
  UPDATE: `/api/edit`,
  DELETE: `/api/delete`,
  CLEAR: `/api/cart/clear`,
  PACKAGING: `/api/packaging` // new
};

const headers = {
  'Content-Type': 'application/json',
};

export const cartService = {
  // Get all cart items for logged-in user
  async getCartItems() {
    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];

      if (!token) {
        throw new Error('Please login to view your cart');
      }

      const response = await fetch(CART_ROUTES.GET_ALL, {
        method: 'GET',
        headers: {
          ...headers,
          Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 403) {
          throw new Error('Please login to access your cart');
        }
        throw new Error(errorText || 'Failed to fetch cart items');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching cart items:', error);
      throw error;
    }
  },

  // Add product to cart
  async addToCart(productId, quantity, productWeight, price) {
    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];

      if (!token) {
        throw new Error('Please login to add items to cart');
      }

      const requestBody = {
        productId: parseInt(productId),
        quantity: parseInt(quantity),
        productWeight: productWeight,
        productPrice: parseFloat(price)
      };

      const response = await fetch(CART_ROUTES.ADD, {
        method: 'POST',
        headers: {
          ...headers,
          Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.text();

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Please login to add items to cart');
        }
        throw new Error(responseData || 'Failed to add item to cart');
      }

      try {
        return JSON.parse(responseData);
      } catch (e) {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  },

  // Remove item from cart
  async removeFromCart(cartId) {
    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];
      if (!token) {
        throw new Error('Please login to remove items from cart');
      }

      const response = await fetch(CART_ROUTES.DELETE, {
        method: 'DELETE',
        headers: {
          ...headers,
          Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
        },
        body: JSON.stringify({ cartId: parseInt(cartId) }),
      });

      const rawResponse = await response.text();

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Please login to remove items from cart');
        }
        throw new Error(rawResponse || 'Failed to remove item from cart');
      }

      return true;
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  },

  // Edit cart item quantity or weight
  async updateCartItem(cartId, newQuantity, productWeight) {
    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];
      if (!token) {
        throw new Error('Please login to update cart');
      }

      const response = await fetch(CART_ROUTES.UPDATE, {
        method: 'PUT',
        headers: {
          ...headers,
          Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
        },
        body: JSON.stringify({
          cartId: parseInt(cartId),
          newQuantity: parseInt(newQuantity),
          productWeight: productWeight,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update cart item');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating cart item:', error);
      throw error;
    }
  },

  // Update packaging (persist isContainer boolean)
  async updatePackaging(cartId, isContainer) {
    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];
      if (!token) throw new Error('Please login to update packaging');

      // using controller: PUT /api/packaging/{cartId}?isContainer=true
      const url = `${CART_ROUTES.PACKAGING}/${encodeURIComponent(cartId)}?isContainer=${isContainer}`;
      const resp = await fetch(url, {
        method: 'PUT',
        headers: {
          ...headers,
          Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
        },
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(errText || 'Failed to update packaging');
      }

      return await resp.json(); // CartProductDTO
    } catch (err) {
      console.error('updatePackaging error', err);
      throw err;
    }
  },

  // Clear entire cart
  async clearCart() {
    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];
      if (!token) {
        throw new Error('Please login to clear cart');
      }

      const response = await fetch(CART_ROUTES.CLEAR, {
        method: 'DELETE',
        headers: {
          ...headers,
          Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to clear cart');
      }

      return true;
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  },
};