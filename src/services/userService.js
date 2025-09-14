// src/services/userService.js
// Handles user account API calls: get-info, send-otp, update-user

import { tokenService } from './tokenService';

class UserService {
  async getUserInfo() {
    try {
      const token = tokenService.getAccessToken();
      console.log('[UserService] Token:', token); // Debug log

      if (!token) {
        throw new Error('User not authenticated. Please log in.');
      }

      const response = await fetch('/api/get-info', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': token // Token should already include 'Bearer '
        },
        credentials: 'include'
      });

      console.log('[UserService] Response status:', response.status); // Debug log

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[UserService] Error:', errorText);
        throw new Error(errorText || 'Failed to fetch user info');
      }

      const data = await response.json();
      console.log('[UserService] Data received:', data); // Debug log
      return data;
    } catch (error) {
      console.error('[UserService] Error:', error);
      throw error;
    }
  }
}

export const userService = new UserService();