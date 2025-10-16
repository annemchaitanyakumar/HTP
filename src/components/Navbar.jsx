import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Menu, X, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/store/cartStore';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SearchBar } from '@/components/SearchBar';
import { useAuth } from '@/context/AuthContext';
import { useProductStore } from '@/store/productStore';
import axiosInstance from '@/lib/axios';  // Use configured axios instance
import axios from 'axios';  // Import axios for utilities like isCancel
import { tokenService } from '@/services/tokenService';

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const products = useProductStore(state => state.products);
  
  // Get cart data and functions
  const cartStore = useCartStore();
  const { items, initializeCart, userId, getTotalItems } = cartStore;
  const totalItemsLocal = getTotalItems();  // Get initial count
  
  // Keep local count updated
  useEffect(() => {
    const unsubscribe = useCartStore.subscribe(
      state => state.items,
      (items) => {
        const newCount = cartStore.getTotalItems();
        console.log('Cart items changed, new count:', newCount);
        setBackendCount(newCount);
      }
    );
    return () => unsubscribe();
  }, []);

  // Backend count state (preferred when available)
  const [backendCount, setBackendCount] = useState(null);
  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Control whether badge is shown. Hide on logout immediately.
  const [showBadge, setShowBadge] = useState(true);

  // Initialize cart count when user changes
  useEffect(() => {
    const loadCartData = async () => {
      if (user?.userid && isAuthenticated) {
        try {
          console.log('Initializing cart for user:', user.userid);
          await initializeCart(user.userid);
          
          // Cancel any existing request
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
          
          // Create new abort controller
          abortControllerRef.current = new AbortController();
          
          // Fetch cart count immediately
          await fetchCartCount(abortControllerRef.current.signal);
          
          // Show badge for authenticated users
          setShowBadge(true);
        } catch (error) {
          console.error('Error loading cart data:', error);
          setBackendCount(null);
        }
      } else {
        setBackendCount(null);
        setShowBadge(false);
      }
    };

    loadCartData();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user, isAuthenticated]);

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Products', path: '/products' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' }
  ];

  // Fetch cart-count helper
  const fetchCartCount = async (signal) => {
    try {
      const token = localStorage.getItem('auth_token') || 
                    document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1];
      
      if (!token) {
        console.warn('No auth token available for cart count fetch');
        return;
      }

      // Use the raw response from the items array length as a fallback
      const items = useCartStore.getState().items;
      const localCount = items?.length || 0;
      
      console.log('Fetching cart count with token:', token);
      const resp = await axiosInstance.get('/cart-count', {
        headers: {
          Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal
      });

      console.log('Cart count response:', resp.data);
      
      // Try to get count from various response formats
      const d = resp?.data ?? {};
      let count = null;
      
      if (typeof d === 'number') {
        count = d;
      } else if (typeof d.count === 'number') {
        count = d.count;
      } else if (typeof d.total === 'number') {
        count = d.total;
      } else if (typeof d.totalItems === 'number') {
        count = d.totalItems;
      } else if (typeof d.data?.count === 'number') {
        count = d.data.count;
      }

      // If we couldn't get a count from the response, use the local count
      if (count === null || typeof count === 'undefined') {
        console.log('Using local cart count:', localCount);
        count = localCount;
      }

      console.log('Setting backend count to:', count);
      setBackendCount(Number(count));
      
      // If we have items and user is authenticated, show the badge
      if (count > 0 && isAuthenticated) {
        setShowBadge(true);
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        // aborted - ignore
      } else {
        console.warn('fetchCartCount error:', err?.response?.data ?? err.message);
        // keep previous backendCount (or null)
      }
    }
  };

  // Run once on mount to prime the count
  useEffect(() => {
    abortControllerRef.current = new AbortController();
    fetchCartCount(abortControllerRef.current.signal);

    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when user logs in -> get fresh count & show badge
  useEffect(() => {
    if (isAuthenticated) {
      // re-enable badge
      setShowBadge(true);
      // fetch fresh count
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
      fetchCartCount(abortControllerRef.current.signal);
    } else {
      // user logged out: hide badge and clear backendCount
      setShowBadge(false);
      setBackendCount(null);
      // abort any inflight request
      if (abortControllerRef.current) {
        try { abortControllerRef.current.abort(); } catch (e) {}
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Subscribe to cart store's items and trigger fetch when items change.
  useEffect(() => {
    // selector for items array (shallow compare handled by Zustand)
    const unsub = useCartStore.subscribe(
      (items) => items,
      (currentItems, previousItems) => {
        // If items changed (add/update/remove/clear), debounce and fetch backend count once.
        // Debounce for 250ms to coalesce rapid updates.
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          // If user is not authenticated, don't call backend
          if (!isAuthenticated) {
            // ensure badge hidden for logged-out users
            setShowBadge(false);
            setBackendCount(null);
            return;
          }

          // abort any pending request
          if (abortControllerRef.current) abortControllerRef.current.abort();
          abortControllerRef.current = new AbortController();
          fetchCartCount(abortControllerRef.current.signal);
        }, 250);
      }
    );

    return () => {
      try {
        unsub();
      } catch (e) {
        // If unsubscribe shape differs, ignore silently
      }
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Decide which count to display: prefer backendCount when available, otherwise local store count
  const displayedCount = typeof backendCount === 'number' && !Number.isNaN(backendCount)
    ? backendCount
    : (totalItemsLocal || 0);

  // Handler wrapper to ensure badge is hidden on logout and requests aborted
  const handleLogout = () => {
    try {
      // hide badge immediately
      setShowBadge(false);
      setBackendCount(null);
      // abort requests
      if (abortControllerRef.current) {
        try { abortControllerRef.current.abort(); } catch (e) {}
      }
    } finally {
      logout();
      navigate('/');
    }
  };

  useEffect(() => {
    // Initialize cart when user changes
    if (user?.userid !== userId) {
      initializeCart(user?.userid);
    }
  }, [user, initializeCart, userId]);

  // Listen for cart count updates
  const handleCartCountUpdate = (event) => {
    console.log('Cart count updated:', event.detail);
    setBackendCount(event.detail);
    if (isAuthenticated) setShowBadge(true);
  };

  useEffect(() => {
    window.addEventListener('cart-count-updated', handleCartCountUpdate);

    return () => {
      window.removeEventListener('cart-count-updated', handleCartCountUpdate);
    };
  }, [isAuthenticated]);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b"
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center space-x-2"
            >
              <img src="/HT_Pickles_gif.gif" alt="Logo" className="h-16 w-auto" />
              <div className="flex flex-col">
                <span className="sm:hidden text-lg font-bold gradient-primary bg-clip-text text-transparent">
                  HT Pickles
                </span>
                <span className="hidden sm:block text-xl font-bold gradient-primary bg-clip-text text-transparent">
                  Homely Taste Pickles
                </span>
              </div>
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === item.path ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {item.name}
              </Link>
            ))}
            <SearchBar className="w-60" />
          </div>

          {/* Cart, Auth, and Mobile Menu */}
          <div className="flex items-center space-x-4">
            {/* Auth Buttons */}
            <div className="hidden md:flex items-center space-x-2">
              {isAuthenticated ? (
                <>
                  <Link to="/profile">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:bg-secondary/10 hover:text-secondary transition-colors"
                    >
                      <User className="h-4 w-4 mr-2" />
                      {user?.firstname || user?.emailid || 'Account'}
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <Link to="/login">
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-secondary to-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-warm"
                  >
                    Login
                  </Button>
                </Link>
              )}
            </div>

            {/* Cart */}
            <Link
              to="/cart"
              onClick={() => {
                window.scrollTo(0, 0);
                setIsMenuOpen(false);
              }}
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                <Button variant="outline" size="icon" className="relative">
                  <ShoppingCart className="h-4 w-4" />
                  {showBadge && displayedCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {displayedCount}
                    </Badge>
                  )}
                </Button>
              </motion.div>
            </Link>

            {/* Mobile Menu Button */}
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden"
            >
              <div className="py-4 space-y-4">
                <SearchBar className="w-full mx-2 mb-4" />
                {navItems.map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`block text-sm font-medium transition-colors hover:text-primary ${
                      location.pathname === item.path ? 'text-primary' : 'text-muted-foreground'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
                <div className="flex flex-col space-y-2 pt-4 border-t border-border">
                  {isAuthenticated ? (
                    <>
                      <Link to="/profile" className="w-full" onClick={() => setIsMenuOpen(false)}>
                        <Button
                          variant="ghost"
                          className="w-full text-muted-foreground hover:bg-secondary/10 hover:text-secondary transition-colors"
                        >
                          <User className="h-4 w-4 mr-2" />
                          {user?.firstname || user?.emailid || 'Account'}
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        className="w-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        onClick={() => {
                          // mobile logout should behave the same as desktop
                          setIsMenuOpen(false);
                          handleLogout();
                        }}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </Button>
                    </>
                  ) : (
                    <Link to="/login" className="w-full" onClick={() => setIsMenuOpen(false)}>
                      <Button className="w-full bg-gradient-to-r from-secondary to-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-warm">
                        <User className="w-4 h-4 mr-2" />
                        Login
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};
