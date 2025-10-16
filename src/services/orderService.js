import { tokenService } from './tokenService';

const API_BASE = import.meta.env.VITE_API_URL;

export async function getUserOrders() {
  try {
    const token = tokenService.getAccessToken();
    if (!token) {
      throw new Error('User not authenticated');
    }

    // The endpoint gets the user ID from the JWT token, no need to pass it
    const response = await fetch(`${API_BASE}/user-orders`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch orders');
    }

    const orders = await response.json();
    return orders;
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
}