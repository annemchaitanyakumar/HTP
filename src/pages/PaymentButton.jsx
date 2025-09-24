import React from 'react';
import axios from 'axios';
import { tokenService } from '@/services/tokenService';
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '@/store/cartStore';

const PaymentButton = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { items, getTotalPrice } = useCartStore();
  const total = getTotalPrice();

  const handlePayment = async () => {
    try {
      console.log("=== Payment Flow Debug ===");
      // Debug auth state
      const authToken = tokenService.getAccessToken();
      if (!authToken) {
        toast({
          title: "Authentication Required",
          description: "Please log in to continue with payment",
          variant: "destructive"
        });
        navigate('/login');
        return;
      }

      console.log("Token exists:", !!authToken);
      console.log("Token value:", authToken); // Should be just the token, e.g., "eyJhbGci..."

      // Check cart data
      console.log("Cart data:", {
        items: items.length,
        total: total,
        totalFormatted: `₹${total.toFixed(2)}`,
        hasItems: items.length > 0
      });

      // Validate cart data
      if (!items || items.length === 0) {
        toast({
          title: "Empty Cart",
          description: "Please add items to your cart before proceeding",
          variant: "destructive"
        });
        navigate('/products');
        return;
      }

      if (!total || total <= 0) {
        toast({
          title: "Invalid Amount",
          description: "Total amount must be greater than 0",
          variant: "destructive"
        });
        return;
      }

      // Prepare request body
      const requestBody = {
        paymentOrders: {
          total_amount_paid: Math.round(total),
          discounted_amount: Math.round(total) // Adjust if discounts are applied
        },
        orderedProducts: items.map(item => ({
          product_id: item.productId,
          weight: item.productWeight,
          quantity: item.quantity
        }))
      };

      console.log("Attempting API call with token");
      console.log("Making API request:", {
        url: '/api/create-order',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken, // Remove Bearer prefix as it's already included
          'Accept': 'application/json'
        },
        data: requestBody
      });

      // Make API call using the proxied path
      const response = await axios.post('/api/create-order', requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken, // Remove Bearer prefix as it's already included
          'Accept': 'application/json'
        }
      });

      console.log("Order API response:", response.data);

      const data = response.data;

      if (data.message === 'Order created successfully') {
        // Load Razorpay SDK dynamically
        const loadRazorpay = () => {
          return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
          });
        };

        const res = await loadRazorpay();

        if (!res) {
          toast({
            title: "Razorpay Error",
            description: "Failed to load Razorpay SDK. Please check your internet connection.",
            variant: "destructive"
          });
          return;
        }

        // Fetch user data (replace with actual user data from context or API)
        // Example: You should fetch this from a user service or context
        const user = {
          name: "Customer Name", // Replace with actual user data
          email: "annemck99@gmail.com", // Replace with actual user email
          phone: "1234567890" // Replace with actual user phone
        };

        // Initialize Razorpay options
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: data.amount, // Amount in paise
          currency: "INR",
          name: "Homely Taste Pickles",
          description: "Payment for Pickle Order",
          order_id: data.razorpayOrderId,
          handler: function (response) {
            toast({
              title: "Payment Successful",
              description: `Payment ID: ${response.razorpay_payment_id}`,
              variant: "success"
            });
            // Optionally, verify payment on backend
            navigate('/order-confirmation'); // Redirect to confirmation page
          },
          prefill: {
            name: user.name,
            email: user.email,
            contact: user.phone
          },
          theme: {
            color: '#3399cc'
          },
          method:{
            netbanking: true,
            card: true,
            upi: true,
            wallet: true,
            emi: true,
          },
          modal: {
            ondismiss: function () {
              console.log('Payment modal closed');
              toast({
                title: "Payment Cancelled",
                description: "You closed the payment window. Please try again.",
                variant: "destructive"
              });
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        toast({
          title: "Order Creation Failed",
          description: "Unable to create order. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Payment error:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        url: error.config?.url
      });

      if (error.response?.status === 401 || error.response?.status === 403) {
        tokenService.clearTokens();
        toast({
          title: "Authentication Error",
          description: "Please log in again to continue",
          variant: "destructive"
        });
        navigate('/login');
      } else if (error.message === 'Network Error') {
        toast({
          title: "Connection Error",
          description: "Unable to connect to the payment service. Please try again.",
          variant: "destructive"
        });
        console.error('Network Error. Check if backend is running at http://localhost:4040');
      } else {
        toast({
          title: "Payment Error",
          description: error.response?.data?.message || error.message,
          variant: "destructive"
        });
      }
    }
  };

  return (
    <button
      onClick={handlePayment}
      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
    >
      Pay Now
    </button>
  );
};

export default PaymentButton;