import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, Link } from 'react-router-dom';
import * as HoverCard from '@radix-ui/react-hover-card';
import { cn } from "@/lib/utils";
import { productService } from '@/services/productService';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cartStore';
import { toast } from '@/hooks/use-toast';
import axios from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';

export default function ProductDetail() {
  const { user } = useAuth();
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedWeight, setSelectedWeight] = useState(null);
  const { addItem } = useCartStore();
  const imageRef = useRef(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [urlExpiryTime, setUrlExpiryTime] = useState(null);
  const REFRESH_BUFFER = 300; // Refresh 5 minutes before expiry

  const fetchProduct = async () => {
    try {
      console.log('Fetching product data for slug:', slug);
      const allProducts = await productService.getAllProducts();
      console.log('All products:', allProducts);
      
      const selectedProduct = allProducts.find(p => p.slug === slug);
      
      if (!selectedProduct) {
        console.error('Product not found for slug:', slug);
        setLoading(false);
        return;
      }

      console.log('Found product:', selectedProduct);
      
      // Fetch presigned URLs for the product's images
      const presignedUrls = await fetchPresignedUrls(selectedProduct.id);
      
      const productWithUrls = {
        ...selectedProduct,
        product_image1_url: presignedUrls.product_image1_url,
        product_image2_url: presignedUrls.product_image2_url,
        product_image3_url: presignedUrls.product_image3_url,
        product_image4_url: presignedUrls.product_image4_url,
        product_image5_url: presignedUrls.product_image5_url,
      };

      console.log('Setting product with URLs:', productWithUrls);
      setProduct(productWithUrls);
      
      // Set initial weight selection
      const { weight, price } = getMainPrice(productWithUrls);
      if (weight && price) {
        setSelectedWeight({ weight, price });
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch product details',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPresignedUrls = async (productId) => {
    const presignedUrlsUrl = `http://localhost:8000/api/products/${productId}/presigned-urls`;
    try {
      // Use a fresh axios instance to avoid interceptors
      const response = await axios.create().get(presignedUrlsUrl);
      const data = response.data;
      console.log(`Presigned URLs for product ${productId}:`, data);
      
      const transformedUrls = {
        product_image1_url: data?.image1_url || data?.product_image1_url || data?.[0] || '/placeholder.png',
        product_image2_url: data?.image2_url || data?.product_image2_url || data?.[1] || '/placeholder.png',
        product_image3_url: data?.image3_url || data?.product_image3_url || data?.[2] || '/placeholder.png',
        product_image4_url: data?.image4_url || data?.product_image4_url || data?.[3] || '/placeholder.png',
        product_image5_url: data?.image5_url || data?.product_image5_url || data?.[4] || '/placeholder.png',
      };

      console.log('Transformed URLs:', transformedUrls);
      setUrlExpiryTime(Date.now() + 3600000); // Set expiry time to 1 hour from now
      return transformedUrls;
    } catch (error) {
      console.error('Error fetching presigned URLs:', error);
      return {
        product_image1_url: '/placeholder.png',
        product_image2_url: '/placeholder.png',
        product_image3_url: '/placeholder.png',
        product_image4_url: '/placeholder.png',
        product_image5_url: '/placeholder.png',
      };
    }
  };

  const getMainPrice = (product) => {
    let priceByWeight = product.price_by_weight;
    if (typeof priceByWeight === 'string') {
      try {
        priceByWeight = JSON.parse(priceByWeight);
      } catch {
        priceByWeight = {};
      }
    }
    if (priceByWeight['500'] > 0) return { price: priceByWeight['500'], weight: 500 };
    if (priceByWeight['1000'] > 0) return { price: priceByWeight['1000'], weight: 1000 };
    const available = Object.entries(priceByWeight)
      .filter(([w, p]) => Number(p) > 0)
      .sort((a, b) => Number(b[0]) - Number(a[0]));
    if (available.length > 0) {
      return { price: available[0][1], weight: available[0][0] };
    }
    return { price: 0, weight: null };
  };

  useEffect(() => {
    fetchProduct();
  }, [slug]);

  // Initialize cart on mount
  useEffect(() => {
    const loadCart = async () => {
      if (!user) return;
      try {
        await useCartStore.getState().loadCartItems();
      } catch (error) {
        console.error('Error loading cart:', error);
      }
    };
    loadCart();
  }, [user]);

  // Get only valid images (no placeholders or empty strings)
  const images = product ? [
    product.product_image1_url,
    product.product_image2_url,
    product.product_image3_url,
    product.product_image4_url,
    product.product_image5_url
  ].filter(url => url && url !== '/placeholder.png' && url !== '') : [];

  // For display, use actual images or fallback to placeholder
  const displayImages = images.length > 0 ? images : ['/placeholder.png'];

  // Update current image index if it's out of bounds
  const handleWeightSelect = (weight, price) => {
    console.log('Selected weight:', { weight, price });
    setSelectedWeight({ weight, price });
  };

  const handleAddToCart = async () => {
    if (!selectedWeight) {
      toast({
        variant: "destructive",
        title: "Please select weight",
        description: "You need to select a weight before adding to cart",
      });
      return;
    }

    if (product.product_stock_quantity <= 0) {
      toast({
        variant: "destructive",
        title: "Out of stock",
        description: "This product is currently out of stock",
      });
      return;
    }

    setAddingToCart(true);
    try {
      const cartItem = {
        id: product.id,
        name: product.product_name, // Match the expected property name
        price: selectedWeight.price,
        product_image1_url: product.product_image1_url || '/placeholder.png',
        weight: selectedWeight.weight, // Match the expected property name
        category: product.category,
        quantity: 1,
        selectedWeight: selectedWeight.weight // Keep this for backward compatibility
      };

      console.log('Adding to cart:', cartItem);
      await addItem(cartItem); // Wait for the cart update to complete
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
      });
    } finally {
      setAddingToCart(false);
    }
  };

  useEffect(() => {
    if (currentImageIndex >= images.length) {
      setCurrentImageIndex(0);
    }
  }, [images.length, currentImageIndex]);

  // Auto-scroll images when hovered
  useEffect(() => {
    if (!isHovered || !product || images.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % images.length);
    }, 3000);

    return () => clearInterval(timer);
  }, [isHovered, product, images.length]);

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="aspect-square bg-gray-200 rounded-xl"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold text-gray-800">Product Not Found</h2>
          <p className="text-gray-600 mt-2">The product you're looking for doesn't exist.</p>
          <Link to="/products" className="mt-4 inline-flex items-center text-primary hover:text-primary/80">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Back to Products
          </Link>
        </div>
      </div>
    );
  }

  // Rest of your rendering code

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back button */}
      <div className="mb-6">
        <Link to="/products" className="inline-flex items-center text-primary hover:text-primary/80">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          Back to Products
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          {/* Main image container */}
          <div
            className="relative aspect-square w-full max-w-[400px] mx-auto overflow-hidden rounded-xl bg-gray-100 group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
              setIsHovered(false);
              setCurrentImageIndex(0);
            }}
          >
            {/* Main image */}
            <AnimatePresence mode="wait">
              <motion.img
                key={currentImageIndex}
                src={displayImages[currentImageIndex]}
                alt={`${product.product_name} view ${currentImageIndex + 1}`}
                className="w-full h-full object-contain bg-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                ref={imageRef}
                onError={(e) => {
                  e.target.src = '/placeholder.png';
                  e.target.onerror = null;
                }}
                onLoad={() => {
                  console.log('Image loaded successfully:', {
                    src: displayImages[currentImageIndex],
                    index: currentImageIndex,
                    totalValidImages: images.length
                  });
                }}
              />
            </AnimatePresence>
            {/* Navigation arrows - only show if multiple images exist */}
            {images.length > 1 && (
              <div
                className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none"
                style={{ opacity: isHovered ? 1 : 0, transition: 'opacity 0.2s' }}
              >
                <button
                  className="pointer-events-auto p-0 bg-transparent border-none"
                  style={{ outline: 'none' }}
                  onClick={e => {
                    e.stopPropagation();
                    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
                  }}
                  aria-label="Previous image"
                >
                  <svg className="w-8 h-8 text-black/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  className="pointer-events-auto p-0 bg-transparent border-none"
                  style={{ outline: 'none' }}
                  onClick={e => {
                    e.stopPropagation();
                    setCurrentImageIndex((prev) => (prev + 1) % images.length);
                  }}
                  aria-label="Next image"
                >
                  <svg className="w-8 h-8 text-black/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Thumbnail grid - only show if there are actual images */}
          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-2 max-w-[400px] mx-auto">
              {images.map((imageUrl, imgIndex) => (
                <HoverCard.Root key={imgIndex}>
                  <HoverCard.Trigger asChild>
                    <button
                      onClick={() => {
                        console.log('Switching to image:', {
                          from: currentImageIndex,
                          to: imgIndex,
                          url: imageUrl,
                          totalValidImages: images.length
                        });
                        setCurrentImageIndex(imgIndex);
                      }}
                      className={cn(
                        "group relative aspect-square overflow-hidden rounded-lg transition-all duration-200 bg-white",
                        currentImageIndex === imgIndex 
                          ? "ring-2 ring-primary ring-offset-2 scale-105" 
                          : "opacity-70 hover:opacity-100 hover:scale-105"
                      )}
                    >
                      <img
                        src={imageUrl}
                        alt={`${product.product_name} thumbnail ${imgIndex + 1}`}
                        className="w-full h-full object-contain transform transition-transform duration-200 group-hover:scale-110"
                        onError={(e) => {
                          console.error('Thumbnail load failed:', {
                            src: e.target.src,
                            index: imgIndex
                          });
                          e.target.src = '/placeholder.png';
                          e.target.onerror = null;
                        }}
                      />
                      <div className={cn(
                        "absolute inset-0 transition-colors duration-200",
                        currentImageIndex === imgIndex 
                          ? "group-hover:bg-black/10" 
                          : "group-hover:bg-black/20"
                      )} />
                    </button>
                  </HoverCard.Trigger>
                  <HoverCard.Portal>
                    <HoverCard.Content side="top" className="bg-white rounded-md shadow-lg p-2 text-sm">
                      View Image {imgIndex + 1}
                    </HoverCard.Content>
                  </HoverCard.Portal>
                </HoverCard.Root>
              ))}
            </div>
          )}
        </div>

        {/* Product details section */}
        <div>
          <span className="text-sm uppercase tracking-wider text-gray-500 font-medium mb-2 block">
            Homely Taste Pickles
          </span>

          <h1 className="text-3xl font-bold mb-4">{product.product_name}</h1>
          <p className="text-gray-600 mb-4">{product.product_description}</p>

          <div className="flex items-center gap-2 mb-6">
            <div className="flex text-yellow-500">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-gray-500 text-sm">(4.8 / 5)</span>
          </div>

          <div className="flex flex-col gap-2 mb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary">
                ₹{selectedWeight?.price || product.product_price}
              </span>
              {selectedWeight && (
                <span className="text-gray-500">
                  / {selectedWeight.weight}g
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{
                  duration: 1.5,
                  repeat: product.product_stock_quantity > 0 && product.product_stock_quantity < 10 ? Infinity : 0,
                  ease: "easeInOut"
                }}
                className={cn(
                  "w-2 h-2 rounded-full",
                  product.product_stock_quantity > 10 && "bg-green-500",
                  product.product_stock_quantity > 0 && product.product_stock_quantity <= 10 && "bg-red-500",
                  product.product_stock_quantity <= 0 && "bg-gray-500"
                )}
              />
              <span className={cn(
                "text-sm font-medium",
                product.product_stock_quantity > 10 && "text-green-600",
                product.product_stock_quantity > 0 && product.product_stock_quantity <= 10 && "text-red-600",
                product.product_stock_quantity <= 0 && "text-gray-600"
              )}>
                {product.product_stock_quantity > 10 
                  ? `In Stock (${product.product_stock_quantity} available)`
                  : product.product_stock_quantity > 0
                    ? `Low Stock (${product.product_stock_quantity} left)`
                    : 'Out of Stock'}
              </span>
            </div>
          </div>

          <div className="relative space-y-4 mb-6 max-w-xs">
            <label className="text-sm font-medium text-gray-700">Select Weight:</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(
                typeof product.price_by_weight === 'string'
                  ? JSON.parse(product.price_by_weight)
                  : product.price_by_weight
              ).map(([weight, price]) =>
                price > 0 && (
                  <Button
                    key={weight}
                    variant={selectedWeight?.weight === Number(weight) ? 'default' : 'outline'}
                    className={cn(
                      "text-sm py-1 px-2 h-auto relative",
                      selectedWeight?.weight === Number(weight) && "ring-2 ring-primary",
                      product.product_stock_quantity <= 0 && "opacity-50 cursor-not-allowed pointer-events-none"
                    )}
                    onClick={() => handleWeightSelect(Number(weight), price)}
                    disabled={product.product_stock_quantity <= 0}
                  >
                    {weight}g - ₹{price}
                  </Button>
                )
              )}
            </div>
            
            {product.product_stock_quantity <= 0 && (
              <motion.div 
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                initial={{ opacity: 0, scale: 1.2 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="transform rotate-[-20deg]">
                  <span className="text-3xl font-bold text-red-500/30 border-4 border-red-500/30 px-4 py-2 uppercase">
                    Sold Out
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          <div className="max-w-xs">
            <Button
              onClick={handleAddToCart}
              disabled={product.product_stock_quantity <= 0 || !selectedWeight || addingToCart}
              className={cn(
                "w-full gradient-primary text-primary-foreground relative",
                (product.product_stock_quantity <= 0 || !selectedWeight || addingToCart) && 
                  "opacity-50 cursor-not-allowed pointer-events-none"
              )}
            >
              {addingToCart ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Adding to Cart...
                </>
              ) : product.product_stock_quantity <= 0 ? (
                "Out of Stock"
              ) : (
                "Add to Cart"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}