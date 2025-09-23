import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { productService } from '@/services/productService';
import { useToast } from '@/hooks/use-toast';
import { Navbar } from '@/components/Navbar';
import { useCartStore } from '@/store/cartStore';
import { useProductStore } from '@/store/productStore';
import axios, { imageInstance } from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';

export default function Products() {
  const [selectedWeights, setSelectedWeights] = useState({});
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { toast } = useToast();
  const { addItem } = useCartStore();
  const { user } = useAuth ? useAuth() : { user: null };
  const setGlobalProducts = useProductStore(state => state.setProducts);
  const [urlExpiryTimes, setUrlExpiryTimes] = useState({});
  const [isHovered, setIsHovered] = useState({});
  const REFRESH_BUFFER = 300; // Refresh 5 minutes before expiry
  const [currentImageIndices, setCurrentImageIndices] = useState({});
  const [addToCartLoading, setAddToCartLoading] = useState({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await productService.getAllProducts();
      console.log('Products data:', response);
      
      // Debug log to check if slugs are being added correctly
      const sampleProduct = response[0];
      console.log('Sample product with slug:', {
        id: sampleProduct.id,
        name: sampleProduct.product_name,
        slug: sampleProduct.slug
      });

      // Debug log for product details
      console.log('Raw product data from API:', response.map(p => ({
        id: p.id,
        name: p.product_name,
        price: p.product_price,
        images: p.product_image1
      })));

      const productsWithPresignedUrls = await Promise.all(
        response.map(async (product) => {
          try {
            const presignedUrlsResponse = await fetchPresignedUrls(product.id);
            
            // Log each product's data transformation
            console.log('Product transformation:', {
              before: {
                id: product.id,
                price: product.product_price,
                image: product.product_image1
              },
              after: {
                id: product.id,
                price: product.product_price,
                image1: presignedUrlsResponse.product_image1_url
              }
            });

            const updatedProduct = {
              ...product,
              product_image1_url: presignedUrlsResponse.product_image1_url,
              product_image2_url: presignedUrlsResponse.product_image2_url,
              product_image3_url: presignedUrlsResponse.product_image3_url,
              product_image4_url: presignedUrlsResponse.product_image4_url,
              product_image5_url: presignedUrlsResponse.product_image5_url,
            };
            
            // Debug log
            console.log('Updated product with URLs:', {
              id: updatedProduct.id,
              name: updatedProduct.product_name,
              image1: updatedProduct.product_image1_url
            });
            
            return updatedProduct;
          } catch (error) {
            console.error(`Error fetching presigned URLs for product ${product.id}:`, error);
            return product;
          }
        })
      );

      setProducts(productsWithPresignedUrls);
      setGlobalProducts(productsWithPresignedUrls);
      setCurrentImageIndices(
        productsWithPresignedUrls.reduce((acc, product) => ({
          ...acc,
          [product.id]: 0,
        }), {})
      );
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch products"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPresignedUrls = async (productId) => {
    const presignedUrlsUrl = `http://localhost:8000/api/products/${productId}/presigned-urls/`;
    try {
      const response = await axios.get(presignedUrlsUrl);
      const data = response.data;
      console.log(`Presigned URLs for product ${productId}:`, data);
      console.log('Response from presigned URLs:', data); // Debug log
      return data;
    } catch (error) {
      console.error(`Failed to fetch presigned URLs for product ${productId}:`, error);
      throw error;
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesFilter = filter === 'all' || product.category === filter.toUpperCase();
    return matchesFilter;
  });

  const handleWeightSelect = (productId, weight, price) => {
    setSelectedWeights(prev => {
      if (prev[productId]?.weight === weight) {
        return { ...prev, [productId]: undefined };
      }
      return { ...prev, [productId]: { weight, price } };
    });
  };

  const handleAddToCart = async (product) => {
    const weightSelection = selectedWeights[product.id];
    if (!user) {
      toast({
        variant: "destructive",
        title: "Login required",
        description: "Login first to add to cart",
      });
      return;
    }
    if (!weightSelection) {
      toast({
        variant: "destructive",
        title: "Please select weight",
        description: "You need to select a weight before adding to cart",
      });
      return;
    }
    setAddToCartLoading(prev => ({ ...prev, [product.id]: true }));
    try {
      await addItem({
        ...product,
        selectedWeight: weightSelection.weight,
        selectedPrice: weightSelection.price,
      });
      toast({
        title: 'Added to cart',
        description: `${product.product_name} (${weightSelection.weight}g) added to cart.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add to cart',
      });
    } finally {
      setAddToCartLoading(prev => ({ ...prev, [product.id]: false }));
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

  const checkAndRefreshUrls = async () => {
    const now = Date.now();
    const productsToRefresh = products.filter(product => {
      const expiryTime = urlExpiryTimes[product.id];
      return !expiryTime || now >= (expiryTime - REFRESH_BUFFER * 1000);
    });

    if (productsToRefresh.length > 0) {
      const updatedProducts = await Promise.all(
        productsToRefresh.map(async (product) => {
          try {
            const presignedUrlsResponse = await fetchPresignedUrls(product.id);
            setUrlExpiryTimes(prev => ({
              ...prev,
              [product.id]: Date.now() + 3600000
            }));
            return {
              ...product,
              product_image1_url: presignedUrlsResponse.image1_url,
              product_image2_url: presignedUrlsResponse.image2_url,
              product_image3_url: presignedUrlsResponse.image3_url,
              product_image4_url: presignedUrlsResponse.image4_url,
              product_image5_url: presignedUrlsResponse.image5_url,
            };
          } catch (error) {
            console.error(`Error refreshing URLs for product ${product.id}:`, error);
            return product;
          }
        })
      );

      setProducts(prevProducts => {
        const productMap = new Map(prevProducts.map(p => [p.id, p]));
        updatedProducts.forEach(p => productMap.set(p.id, p));
        return Array.from(productMap.values());
      });
    }
  };

  // Auto-scroll images only for hovered product
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentImageIndices(prev => {
        const newIndices = { ...prev };
        products.forEach(product => {
          if (isHovered[product.id]) { // Only update if product is hovered
            const images = [
              product.product_image1_url,
              product.product_image2_url,
              product.product_image3_url,
              product.product_image4_url,
              product.product_image5_url
            ].filter(url => url).length > 0
              ? [
                  product.product_image1_url,
                  product.product_image2_url,
                  product.product_image3_url,
                  product.product_image4_url,
                  product.product_image5_url
                ].filter(url => url)
              : ['/placeholder.png'];
            const currentIndex = prev[product.id] || 0;
            newIndices[product.id] = (currentIndex + 1) % images.length;
          }
        });
        return newIndices;
      });
    }, 3000);
    return () => clearInterval(intervalId);
  }, [products, isHovered]);

  useEffect(() => {
    const intervalId = setInterval(checkAndRefreshUrls, REFRESH_BUFFER * 1000);
    return () => clearInterval(intervalId);
  }, [products, urlExpiryTimes]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Navbar />

  <section className="pt-10 pb-16 px-3 sm:px-4">
        <div className="max-w-[1400px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8 sm:mb-12"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Our <span className="gradient-primary bg-clip-text text-transparent">Products</span>
            </h1>
            <p className="text-xl font-bold max-w-2xl mx-auto" style={{ fontFamily: 'Pacifico, cursive' }}>
              Discover our handcrafted collection of traditional Indian pickles,
              made with authentic recipes and premium ingredients.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center mb-12"
          >
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
                className={filter === 'all' ? 'gradient-primary text-primary-foreground' : ''}
              >
                <span className="sm:hidden">All</span>
                <span className="hidden sm:inline">All Products</span>
              </Button>
              <Button
                variant={filter === 'VEG' ? 'default' : 'outline'}
                onClick={() => setFilter('VEG')}
                className={filter === 'VEG' ? 'gradient-primary text-primary-foreground' : ''}
              >
                <span className="sm:hidden">Veg</span>
                <span className="hidden sm:inline">Vegetarian</span>
              </Button>
              <Button
                variant={filter === 'NONVEG' ? 'default' : 'outline'}
                onClick={() => setFilter('NONVEG')}
                className={filter === 'NONVEG' ? 'gradient-primary text-primary-foreground' : ''}
              >
                <span className="sm:hidden">Non - Veg</span>
                <span className="hidden sm:inline">Non-Vegetarian</span>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6"
          >
            {filteredProducts.map((product, index) => {
              const images = [
                product.product_image1_url,
                product.product_image2_url,
                product.product_image3_url,
                product.product_image4_url,
                product.product_image5_url
              ].filter(url => url).length > 0
                ? [
                    product.product_image1_url,
                    product.product_image2_url,
                    product.product_image3_url,
                    product.product_image4_url,
                    product.product_image5_url
                  ].filter(url => url)
                : ['/placeholder.png'];
              const currentImageIndex = currentImageIndices[product.id] || 0;

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 max-w-md mx-auto w-full"
                  onMouseEnter={() => setIsHovered(prev => ({ ...prev, [product.id]: true }))}
                  onMouseLeave={() => {
                    setIsHovered(prev => ({ ...prev, [product.id]: false }));
                    setCurrentImageIndices(prev => ({ ...prev, [product.id]: 0 }));
                  }}
                >
                  <div className="relative w-full h-52 xs:h-44 sm:h-48 group">
                    <div 
                      className="block w-full h-full"
                      onTouchStart={(e) => {
                        const touch = e.touches[0];
                        e.currentTarget.dataset.touchStartX = touch.clientX;
                      }}
                      onTouchMove={(e) => {
                        e.preventDefault(); // Prevent scrolling while swiping
                      }}
                      onTouchEnd={(e) => {
                        const touchEndX = e.changedTouches[0].clientX;
                        const touchStartX = parseFloat(e.currentTarget.dataset.touchStartX);
                        const difference = touchEndX - touchStartX;
                        
                        if (Math.abs(difference) > 50) { // Minimum swipe distance
                          if (difference > 0) {
                            // Swipe right - show previous image
                            setCurrentImageIndices(prev => ({
                              ...prev,
                              [product.id]: (currentImageIndex - 1 + images.length) % images.length
                            }));
                          } else {
                            // Swipe left - show next image
                            setCurrentImageIndices(prev => ({
                              ...prev,
                              [product.id]: (currentImageIndex + 1) % images.length
                            }));
                          }
                        }
                      }}
                    >
                      <Link to={`/products/${product.slug}`} onClick={(e) => {
                        // Only navigate if it's a tap/click, not a swipe
                        if (e.currentTarget.dataset.isSwipe) {
                          e.preventDefault();
                          delete e.currentTarget.dataset.isSwipe;
                        }
                      }}>
                        <motion.img
                          key={currentImageIndex}
                          src={images[currentImageIndex]}
                          alt={`${product.product_name} view ${currentImageIndex + 1}`}
                          className="w-full h-full object-cover rounded"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.4, ease: 'easeInOut' }}
                          onError={(e) => {
                            e.target.src = '/placeholder.png';
                            e.target.onerror = null;
                          }}
                        />
                      </Link>
                    </div>
                    {/* Arrow controls on hover */}
                    {images.length > 1 && (
                      <>
                        <button
                          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity p-0 bg-transparent border-none"
                          style={{ outline: 'none' }}
                          onClick={e => {
                            e.stopPropagation();
                            setCurrentImageIndices(prev => ({
                              ...prev,
                              [product.id]: (currentImageIndex - 1 + images.length) % images.length
                            }));
                          }}
                          aria-label="Previous image"
                        >
                          <svg className="w-7 h-7 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity p-0 bg-transparent border-none"
                          style={{ outline: 'none' }}
                          onClick={e => {
                            e.stopPropagation();
                            setCurrentImageIndices(prev => ({
                              ...prev,
                              [product.id]: (currentImageIndex + 1) % images.length
                            }));
                          }}
                          aria-label="Next image"
                        >
                          <svg className="w-7 h-7 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
                          {images.map((_, imgIndex) => (
                            <div
                              key={imgIndex}
                              className={`w-2 h-2 rounded-full ${imgIndex === currentImageIndex ? 'bg-primary' : 'bg-gray-300'}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
                        product.category === 'VEG' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {product.category}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 sm:p-4">
                    <Link to={`/products/${product.slug}`}>
                      <h3 className="text-sm sm:text-base font-semibold mb-1 text-gray-800 hover:text-primary transition-colors line-clamp-2">{product.product_name}</h3>
                    </Link>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        {(() => {
                          let priceByWeight = product.price_by_weight;
                          if (typeof priceByWeight === 'string') {
                            try {
                              priceByWeight = JSON.parse(priceByWeight);
                            } catch {
                              priceByWeight = {};
                            }
                          }
                          const weights = Object.keys(priceByWeight).filter(w => priceByWeight[w] > 0);
                          const prices = weights.map(w => priceByWeight[w]);
                          const minPrice = Math.min(...prices);
                          const maxPrice = Math.max(...prices);
                          const selected = selectedWeights[product.id];
                          return (
                            <div className="flex flex-col">
                              {selected && selected.weight ? (
                                <>
                                  <span className="text-base sm:text-lg font-bold text-primary">
                                    ₹{selected.price} <span className="text-black font-normal">/ {selected.weight}g</span>
                                  </span>
                                </>
                              ) : (
                                <span className="text-base sm:text-lg font-bold text-primary">
                                  <span className="text-black font-normal">From</span> ₹{minPrice} - ₹{maxPrice}
                                  
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Weight selection visible on sm and up */}
                      <div className="hidden sm:block">
                        <label className="text-sm font-medium text-gray-700">Select Weight:</label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          {Object.entries(
                            typeof product.price_by_weight === 'string'
                              ? JSON.parse(product.price_by_weight)
                              : product.price_by_weight
                          ).map(([weight, price]) =>
                            price > 0 && (
                              <Button
                                key={weight}
                                variant={
                                  selectedWeights[product.id]?.weight === weight
                                    ? "default"
                                    : "outline"
                                }
                                className={`text-sm py-1 px-2 h-auto ${
                                  selectedWeights[product.id]?.weight === weight
                                    ? "ring-2 ring-primary"
                                    : ""
                                }`}
                                onClick={() => handleWeightSelect(product.id, weight, price)}
                              >
                                {weight}g - ₹{price}
                              </Button>
                            )
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <Link
                          to={`/products/${product.slug}`}
                          className="w-full"
                        >
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-full text-xs sm:text-sm h-8"
                          >
                            <span className="hidden sm:inline">View Details</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Button>
                        </Link>
                        <Button
                          variant="default"
                          size="sm"
                          className="gradient-primary text-primary-foreground w-full text-xs sm:text-sm h-8"
                          onClick={() => {
                            const { price, weight } = getMainPrice(product);
                            handleWeightSelect(product.id, weight, price);
                            handleAddToCart(product);
                          }}
                          disabled={addToCartLoading[product.id]}
                        >
                          {addToCartLoading[product.id] ? (
                            <span className="flex items-center justify-center gap-1">
                              <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                              </svg>
                              <span className="hidden sm:inline">Adding...</span>
                            </span>
                          ) : (
                            <>
                              <span className="hidden sm:inline">Add to Cart</span>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {filteredProducts.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <p className="text-xl text-muted-foreground">
                No products found for the selected filter.
              </p>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}