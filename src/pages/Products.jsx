import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { productService } from '@/services/productService';
import { useToast } from '@/hooks/use-toast';
import { Navbar } from '@/components/Navbar';
import { useCartStore } from '@/store/cartStore';
import { useProductStore } from '@/store/productStore';
import axios from '../lib/axios';

export default function Products() {
  const [selectedWeights, setSelectedWeights] = useState({});
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { toast } = useToast();
  const { addItem } = useCartStore();
  const setGlobalProducts = useProductStore(state => state.setProducts);
  const [urlExpiryTimes, setUrlExpiryTimes] = useState({});
  const [isHovered, setIsHovered] = useState({});
  const REFRESH_BUFFER = 300; // Refresh 5 minutes before expiry
  const [currentImageIndices, setCurrentImageIndices] = useState({});

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

      const productsWithPresignedUrls = await Promise.all(
        response.map(async (product) => {
          try {
            const presignedUrlsResponse = await fetchPresignedUrls(product.id);
            return {
              ...product,
              product_image1_url: presignedUrlsResponse.image1_url,
              product_image2_url: presignedUrlsResponse.image2_url,
              product_image3_url: presignedUrlsResponse.image3_url,
              product_image4_url: presignedUrlsResponse.image4_url,
              product_image5_url: presignedUrlsResponse.image5_url,
            };
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

  const handleAddToCart = (product) => {
    const weightSelection = selectedWeights[product.id];

    if (product.category === 'VEG' && !weightSelection) {
      toast({
        variant: "destructive",
        title: "Please select weight",
        description: "You need to select a weight before adding to cart",
      });
      return;
    }

    addItem({
      id: product.id,
      name: product.product_name,
      price: product.category === 'VEG'
        ? weightSelection.price
        : parseFloat(product.product_price),
      image: product.product_image1_url || '/placeholder.png',
      weight: product.category === 'VEG' ? weightSelection.weight : null,
      category: product.category,
      quantity: 1
    });

    toast({
      title: "Added to cart",
      description: `Added ${product.product_name} to cart`,
    });
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

      <section className="pt-24 pb-16 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Our <span className="gradient-primary bg-clip-text text-transparent">Products</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
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
                All Products
              </Button>
              <Button
                variant={filter === 'VEG' ? 'default' : 'outline'}
                onClick={() => setFilter('VEG')}
                className={filter === 'VEG' ? 'gradient-primary text-primary-foreground' : ''}
              >
                Vegetarian
              </Button>
              <Button
                variant={filter === 'NONVEG' ? 'default' : 'outline'}
                onClick={() => setFilter('NONVEG')}
                className={filter === 'NONVEG' ? 'gradient-primary text-primary-foreground' : ''}
              >
                Non-Vegetarian
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
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
                  className="bg-white rounded-xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300"
                  onMouseEnter={() => setIsHovered(prev => ({ ...prev, [product.id]: true }))}
                  onMouseLeave={() => {
                    setIsHovered(prev => ({ ...prev, [product.id]: false }));
                    setCurrentImageIndices(prev => ({ ...prev, [product.id]: 0 }));
                  }}
                >
                  <div className="relative w-full h-64 overflow-hidden">
                    <div
                      className={`flex h-full ${images.length > 1 ? 'transition-transform duration-500 ease-in-out' : ''}`}
                      style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
                    >
                      {images.map((imageUrl, imgIndex) => (
                        <Link key={imgIndex} to={`/products/${product.slug}`} className="flex-shrink-0">
                          <img
                            src={imageUrl}
                            alt={`${product.product_name} view ${imgIndex + 1}`}
                            className="w-full h-64 object-cover"
                            onError={(e) => {
                              e.target.src = '/placeholder.png';
                              e.target.onerror = null;
                            }}
                          />
                        </Link>
                      ))}
                    </div>
                    {images.length > 1 && (
                      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
                        {images.map((_, imgIndex) => (
                          <div
                            key={imgIndex}
                            className={`w-2 h-2 rounded-full ${
                              imgIndex === currentImageIndex ? 'bg-primary' : 'bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                    <div className="absolute top-4 right-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        product.category === 'VEG' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {product.category}
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2 text-gray-800">{product.product_name}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.product_description}</p>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        {(() => {
                          const { price, weight } = getMainPrice(product);
                          return (
                            <span className="text-2xl font-bold text-primary">
                              ₹{price} <span className="text-base font-medium text-gray-500">/ {weight}g</span>
                            </span>
                          );
                        })()}
                        <span className="text-sm text-gray-500">Stock: {product.product_stock_quantity}</span>
                      </div>

                      {product.category === 'VEG' && (
                        <div className="space-y-2">
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
                      )}

                      <div className="flex gap-2">
                        <Link
                          to={`/products/${product.slug}`}
                          className="flex-1"
                        >
                          <Button
                            variant="secondary"
                            className="w-full"
                          >
                            View Details
                          </Button>
                        </Link>
                        <Button
                          variant="default"
                          className="gradient-primary text-primary-foreground"
                          onClick={() => handleAddToCart(product)}
                        >
                          Add to Cart
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