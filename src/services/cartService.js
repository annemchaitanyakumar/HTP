const CART_ROUTES = {
  GET_ALL: `/api/all`,
  ADD: `/api/add`,
  UPDATE: `/api/edit`,
  DELETE: `/api/delete`, // Updated to match backend endpoint
  CLEAR: `/api/cart/clear`,
};

const headers = {
  'Content-Type': 'application/json',
};

export const cartService = {
  // Get all cart items for logged-in user
  async getCartItems() {
    try {
      const token = localStorage.getItem('auth_token') || document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];
      console.log('Getting cart items with token:', token);

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
        console.error('Error response:', response.status, errorText);
        if (response.status === 403) {
          throw new Error('Please login to access your cart');
        }
        throw new Error('Failed to fetch cart items');
      }

      const data = await response.json();
      console.log('Received cart items:', data);
      // Debug log for product details comparison
      console.log('Cart items details:', data.map(item => ({
        cartId: item.cartId,
        productId: item.productId,
        productName: item.productName,
        productPrice: item.productPrice,
        productWeight: item.productWeight,
        quantity: item.quantity,
        images: {
          image1: item.productImage1,
          image2: item.productImage2,
          image3: item.productImage3
        }
      })));
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
      
      // Debug log for cart addition
      console.log('Adding to cart with params:', {
        url: CART_ROUTES.ADD,
        productId: parseInt(productId),
        quantity: parseInt(quantity),
        productWeight,
        price,
        token: token ? 'Token exists' : 'No token'
      });

      if (!token) {
        throw new Error('Please login to add items to cart');
      }

      // Prepare request body
      const requestBody = {
        productId: parseInt(productId),
        quantity: parseInt(quantity),
        productWeight: productWeight,
        productPrice: parseFloat(price) // Ensure price is a number
      };

      console.log('Sending request to backend:', {
        url: CART_ROUTES.ADD,
        body: requestBody
      });

      const response = await fetch(CART_ROUTES.ADD, {
        method: 'POST',
        headers: {
          ...headers,
          Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.text();
      console.log('Raw response:', responseData);

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Please login to add items to cart');
        }
        throw new Error(responseData || 'Failed to add item to cart');
      }

      try {
        const parsedData = JSON.parse(responseData);
        console.log('Successfully added to cart:', parsedData);
        return parsedData;
      } catch (e) {
        console.error('Failed to parse response:', e);
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

      console.log('Removing item from cart:', {
        url: CART_ROUTES.DELETE,
        cartId: parseInt(cartId),
        token,
      });

      const response = await fetch(CART_ROUTES.DELETE, {
        method: 'DELETE',
        headers: {
          ...headers,
          Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
        },
        body: JSON.stringify({
          cartId: parseInt(cartId),
        }),
      });

      const rawResponse = await response.text();
      console.log('Raw delete response:', rawResponse);

      if (!response.ok) {
        console.error('Delete error response:', response.status, rawResponse);
        if (response.status === 403) {
          throw new Error('Please login to remove items from cart');
        }
        throw new Error(rawResponse || 'Failed to remove item from cart');
      }

      console.log('Item successfully removed from cart');
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
        console.error('Clear cart error response:', response.status, errorText);
        throw new Error(errorText || 'Failed to clear cart');
      }

      console.log('Cart successfully cleared');
      return true;
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  },
};