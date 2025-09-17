import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function Cart() {
  const { items, removeItem, incrementQuantity, decrementQuantity, getTotalPrice, clearCart, setItems } = useCartStore();
  const [urlExpiryTimes, setUrlExpiryTimes] = useState({});
  const REFRESH_BUFFER = 300; // Refresh 5 minutes before expiry

  // Log cart items for debugging
  useEffect(() => {
    console.log('Cart items:', items.map(item => ({
      id: item.id,
      name: item.name,
      image: item.image,
      price: item.price,
      weight: item.weight,
      category: item.category,
      quantity: item.quantity
    })));
  }, [items]);

  // Fetch presigned URLs for a product
  const fetchPresignedUrls = async (productId) => {
    const presignedUrlsUrl = `http://localhost:8000/api/products/${productId}/presigned-urls/`;
    try {
      const response = await fetch(presignedUrlsUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch presigned URLs for product ${productId}`);
      }
      const data = await response.json();
      console.log(`Presigned URLs for product ${productId}:`, data);
      return data.image1_url; // Only need image1_url for Cart
    } catch (error) {
      console.error(`Error fetching presigned URLs for product ${productId}:`, error);
      return null;
    }
  };

  // Refresh expired URLs
  useEffect(() => {
    const checkAndRefreshUrls = async () => {
      const now = Date.now();
      const itemsToRefresh = items.filter(item => {
        const expiryTime = urlExpiryTimes[item.id];
        return !expiryTime || now >= (expiryTime - REFRESH_BUFFER * 1000);
      });

      if (itemsToRefresh.length > 0) {
        const updatedItems = await Promise.all(
          itemsToRefresh.map(async (item) => {
            const newImageUrl = await fetchPresignedUrls(item.id);
            if (newImageUrl) {
              setUrlExpiryTimes(prev => ({
                ...prev,
                [item.id]: Date.now() + 3600000 // 1 hour expiry
              }));
              return { ...item, image: newImageUrl };
            }
            return { ...item, image: '/placeholder.png' }; // Fallback if refresh fails
          })
        );

        // Update cart items with new URLs
        setItems(updatedItems);
      }
    };

    const intervalId = setInterval(checkAndRefreshUrls, REFRESH_BUFFER * 1000);
    return () => clearInterval(intervalId);
  }, [items, urlExpiryTimes, setItems]);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-warm">
        <Navbar />
        <div className="pt-24 pb-16 px-4">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-16"
            >
              <div className="w-24 h-24 mx-auto mb-8 gradient-primary rounded-full flex items-center justify-center">
                <ShoppingBag className="h-12 w-12 text-primary-foreground" />
              </div>
              <h1 className="text-4xl font-bold mb-4">Your cart is empty</h1>
              <p className="text-xl text-muted-foreground mb-8">
                Looks like you haven't added any delicious pickles yet!
              </p>
              <Link to="/products">
                <Button size="lg" className="gradient-primary text-primary-foreground">
                  Start Shopping
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Navbar />
      
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl md:text-6xl font-bold text-center mb-4">
              Shopping <span className="gradient-primary bg-clip-text text-transparent">Cart</span>
            </h1>
            <p className="text-center text-muted-foreground">
              Review your selected pickles and proceed to checkout
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Cart Items ({items.length})</h2>
                <Button
                  variant="outline"
                  onClick={clearCart}
                  className="text-destructive hover:text-destructive"
                >
                  Clear Cart
                </Button>
              </div>

              <AnimatePresence>
                {items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                          <img
                            src={item.image || '/placeholder.png'}
                            alt={item.name}
                            className="w-20 h-20 object-cover rounded-lg"
                            onError={e => {
                              console.error(`Image failed to load for ${item.name} (ID: ${item.id}):`, {
                                imageUrl: item.image,
                                error: e.message
                              });
                              e.target.src = '/placeholder.png';
                              e.target.onerror = null;
                            }}
                            loading="lazy"
                          />
                          
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold">{item.name}</h3>
                            <p className="text-muted-foreground">{item.weight ? `${item.weight}g` : item.category}</p>
                            <p className="text-2xl font-bold text-primary">₹{item.price}</p>
                          </div>

                          <div className="flex items-center gap-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => decrementQuantity(item.id)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-12 text-center font-medium">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => incrementQuantity(item.id)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="text-right">
                            <p className="text-lg font-semibold">
                              ₹{item.price * item.quantity}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(item.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Order Summary */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{getTotalPrice()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className="text-green-600">Free</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>₹{Math.round(getTotalPrice() * 0.18)}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>₹{Math.round(getTotalPrice() * 1.18)}</span>
                  </div>
                  
                  <Link to="/checkout" className="block">
                    <Button
                      size="lg"
                      className="w-full gradient-primary text-primary-foreground mt-6"
                    >
                      Proceed to Checkout
                    </Button>
                  </Link>
                  
                  <Link to="/products" className="block">
                    <Button variant="outline" className="w-full">
                      Continue Shopping
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}