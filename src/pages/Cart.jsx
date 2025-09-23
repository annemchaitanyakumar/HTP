import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import axios from '@/lib/axios';

export default function Cart() {
  const { items, removeItem, incrementQuantity, decrementQuantity, loadCartItems } = useCartStore();
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStates, setLoadingStates] = useState({});
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const calculateSubtotal = () => {
    return items.reduce((total, item) => {
      const price = parseFloat(item.weightBasedPrice || item.productPrice) || 0;
      const quantity = parseInt(item.quantity) || 0;
      return total + price * quantity;
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const tax = subtotal * 0.18;
  const total = subtotal + tax;

  const setItemLoading = (cartId, isLoading) => {
    setLoadingStates((prev) => ({
      ...prev,
      [cartId]: isLoading,
    }));
  };

  const fetchPresignedUrls = async (productId) => {
    const presignedUrlsUrl = `http://localhost:8000/api/products/${productId}/presigned-urls`;
    try {
      const response = await axios.create().get(presignedUrlsUrl);
      const data = response.data;
      const imageUrl = data?.image1_url || data?.product_image1_url || data?.[0] || '/placeholder.png';
      return imageUrl;
    } catch (error) {
      return '/placeholder.png';
    }
  };

  useEffect(() => {
    async function initializeCart() {
      if (!user) {
        navigate('/login', { state: { from: '/cart' } });
        return;
      }
      try {
        setIsLoading(true);
        await loadCartItems();
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load your cart items. Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
    initializeCart();
  }, [user, loadCartItems, navigate, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-warm">
        <Navbar />
        <div className="pt-24 pb-16 px-4">
          <div className="container mx-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-8 gradient-primary rounded-full flex items-center justify-center animate-pulse">
                <ShoppingBag className="h-12 w-12 text-primary-foreground" />
              </div>
              <h1 className="text-4xl font-bold mb-4">Loading your cart...</h1>
              <p className="text-xl text-muted-foreground mb-8">Please wait while we fetch your cart items</p>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoading && items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-warm">
        <Navbar />
        <div className="pt-24 pb-16 px-4">
          <div className="container mx-auto">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-8 gradient-primary rounded-full flex items-center justify-center">
                <ShoppingBag className="h-12 w-12 text-primary-foreground" />
              </div>
              <h1 className="text-4xl font-bold mb-4">Your cart is empty</h1>
              <p className="text-xl text-muted-foreground mb-8">Looks like you haven't added any delicious pickles yet!</p>
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
  <div className="pt-10 pb-16 px-4">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-center mb-3 sm:mb-4">
              Shopping <span className="gradient-primary bg-clip-text text-transparent">Cart</span>
            </h1>
            <p className="text-center text-sm sm:text-base text-muted-foreground">Review your selected pickles and proceed to checkout</p>
          </motion.div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl sm:text-2xl font-semibold">Cart Items ({items.length})</h2>
              </div>
              <AnimatePresence>
                {items.map((item, index) => (
                  <motion.div
                    key={item.cartId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="w-full px-2 sm:px-0">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex items-center gap-4 w-full">
                          <div className="flex items-start gap-4">
                            <Link
                              to={item.slug ? `/products/${item.slug}` : `/products/${item.productName.toLowerCase().replace(/\s+/g, '-')}`}
                              className="hover:opacity-75 transition-opacity duration-200 shrink-0"
                            >
                              <img
                                src={item.image || '/placeholder.png'}
                                alt={item.productName}
                                className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg cursor-pointer"
                                onError={async (e) => {
                                  try {
                                    const newImageUrl = await fetchPresignedUrls(item.productId);
                                    if (newImageUrl && newImageUrl !== '/placeholder.png') {
                                      e.target.src = newImageUrl;
                                      useCartStore.setState((state) => ({
                                        items: state.items.map((i) =>
                                          i.cartId === item.cartId ? { ...i, image: newImageUrl } : i
                                        ),
                                      }));
                                    }
                                  } catch (error) {
                                    e.target.src = '/placeholder.png';
                                  }
                                }}
                                loading="lazy"
                              />
                            </Link>
                            <div className="flex-1 min-w-0">
                              <Link
                                to={item.slug ? `/products/${item.slug}` : `/products/${item.productName.toLowerCase().replace(/\s+/g, '-')}`}
                                className="hover:text-primary transition-colors duration-200"
                              >
                                <h3 className="font-semibold text-sm sm:text-base md:text-lg cursor-pointer">
                                  {item.productName}
                                </h3>
                              </Link>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                {item.productWeight}g - {item.category}
                              </p>
                              <p className="font-bold text-primary text-sm sm:text-base md:text-lg">
                                ₹{(parseFloat(item.weightBasedPrice || item.productPrice) || 0).toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-auto">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setItemLoading(item.cartId, true);
                                  decrementQuantity(item.cartId)
                                    .catch(() => {
                                      toast({
                                        title: 'Error',
                                        description: 'Failed to update quantity. Please try again.',
                                        variant: 'destructive',
                                      });
                                    })
                                    .finally(() => setItemLoading(item.cartId, false));
                                }}
                                disabled={loadingStates[item.cartId] || item.quantity <= 1}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-8 text-center">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setItemLoading(item.cartId, true);
                                  incrementQuantity(item.cartId)
                                    .catch(() => {
                                      toast({
                                        title: 'Error',
                                        description: 'Failed to update quantity. Please try again.',
                                        variant: 'destructive',
                                      });
                                    })
                                    .finally(() => setItemLoading(item.cartId, false));
                                }}
                                disabled={loadingStates[item.cartId]}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => {
                                setItemLoading(item.cartId, true);
                                removeItem(item.cartId)
                                  .catch(() => {
                                    toast({
                                      title: 'Error',
                                      description: 'Failed to remove item. Please try again.',
                                      variant: 'destructive',
                                    });
                                  })
                                  .finally(() => setItemLoading(item.cartId, false));
                              }}
                              disabled={loadingStates[item.cartId]}
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
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Shipping</span>
                    <span className="text-green-600">Free</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax (18%)</span>
                    <span>₹{tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>₹{total.toFixed(2)}</span>
                    </div>
                  </div>
                  <Link to="/checkout" className="block">
                    <Button size="lg" className="w-full gradient-primary text-primary-foreground mt-6">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}