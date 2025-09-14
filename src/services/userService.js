import { tokenService } from './tokenService';

export const userService = {
    async getUserInfo() {
        const token = tokenService.getAccessToken();
        console.log('[UserService] Getting user info with token:', token);

        if (!token) {
            throw new Error('User not authenticated');
        }

        const response = await fetch('/api/get-info', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user info');
        }

        return response.json();
    },

    async sendOtpForUpdate(editUserDTO) {
        const token = tokenService.getAccessToken();
        const response = await fetch('/api/user-send-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify(editUserDTO)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'Failed to send OTP');
        }

        return await response.text();
    },

    async updateUserInfo(validateDTO) {
        const token = tokenService.getAccessToken();
        const response = await fetch('/api/user-update', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify(validateDTO)
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'Failed to update user info');
        }

        return await response.json();
    }
};