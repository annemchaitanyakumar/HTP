import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { productService } from '@/services/productService';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { toast } from '@/hooks/use-toast';
import axios from '@/lib/axios';

export default function ProductDetails() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeight, setSelectedWeight] = useState(null);
  const { addToCart } = useCart();
  const imageRef = useRef(null);

  const fetchPresignedUrls = async (productId) => {
    const presignedUrlsUrl = `http://localhost:8000/api/products/${productId}/presigned-urls/`;
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching presigned URLs for product:', productId, 'with token:', token);
      const response = await axios.get(presignedUrlsUrl, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      });
      console.log('Presigned URLs before assignment:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      return {
        product_image1_url: '/placeholder.png',
        product_image2_url: '/placeholder.png',
        product_image3_url: '/placeholder.png',
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
    const fetchProduct = async () => {
      try {
        console.log('URL parameter:', { slug });
        console.log('Fetching product with slug:', slug);
        const allProducts = await productService.getAllProducts();
        console.log('All products:', allProducts);
        const selectedProduct = allProducts.find((p) => {
          const productSlug = productService.createSlug(p.product_name);
          return productSlug === slug;
        });

        if (selectedProduct) {
          console.log('Found product by slug:', selectedProduct);
          const presignedUrls = await fetchPresignedUrls(selectedProduct.id);
          console.log('Response from presigned URLs:', presignedUrls);

          const productWithUrls = {
            ...selectedProduct,
            product_image1_url: presignedUrls?.product_image1_url || '/placeholder.png',
            product_image2_url: presignedUrls?.product_image2_url || '/placeholder.png',
            product_image3_url: presignedUrls?.product_image3_url || '/placeholder.png',
          };

          console.log('Final product with URLs:', {
            id: productWithUrls.id,
            name: productWithUrls.product_name,
            image1: productWithUrls.product_image1_url,
          });

          setProduct(productWithUrls);
          const { weight, price } = getMainPrice(productWithUrls);
          if (weight && price) {
            setSelectedWeight({ weight, price });
          }
        } else {
          console.error('Product not found for slug:', slug);
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

    fetchProduct();
  }, [slug]);

  // Refresh presigned URLs every 5 minutes
  useEffect(() => {
    const intervalId = setInterval(async () => {
      if (product) {
        console.log('Refreshing presigned URLs for product:', product.id);
        const presignedUrls = await fetchPresignedUrls(product.id);
        setProduct((prev) => ({
          ...prev,
          product_image1_url: presignedUrls.product_image1_url || '/placeholder.png',
          product_image2_url: presignedUrls.product_image2_url || '/placeholder.png',
          product_image3_url: presignedUrls.product_image3_url || '/placeholder.png',
        }));
      }
    }, 300000); // Refresh every 5 minutes
    return () => clearInterval(intervalId);
  }, [product]);

  // Log image element state
  useEffect(() => {
    if (imageRef.current) {
      console.log('Image element state:', {
        src: imageRef.current.src,
        display: window.getComputedStyle(imageRef.current).display,
        opacity: window.getComputedStyle(imageRef.current).opacity,
        zIndex: window.getComputedStyle(imageRef.current).zIndex,
      });
    }
  }, [product]);

  const handleWeightSelect = (weight, price) => {
    setSelectedWeight({ weight, price });
  };

  const handleAddToCart = () => {
    if (!selectedWeight) {
      toast({
        variant: 'destructive',
        title: 'Please select weight',
        description: 'You need to select a weight before adding to cart',
      });
      return;
    }

    const cartItem = {
      ...product,
      price: parseFloat(selectedWeight.price),
      weight: selectedWeight.weight,
    };

    addToCart(cartItem);
    toast({
      title: 'Added to cart',
      description: `${product.product_name} has been added to your cart`,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
          <p className="text-gray-600">Sorry, the product you are looking for could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="relative z-10">
          {console.log('Rendering image, available URLs:', {
            product_image1_url: product?.product_image1_url,
            allProps: { ...product },
          })}
          <img
            ref={imageRef}
            src={product?.product_image1_url || '/placeholder.png'}
            alt={`${product?.product_name} view 1`}
            className="w-full h-64 object-cover rounded-lg"
            style={{ zIndex: 100, position: 'relative' }}
            onError={(e) => {
              console.error('Image load failed:', {
                attemptedUrl: e.target.src,
                product: product,
              });
              e.target.src = '/placeholder.png';
              e.target.onerror = null;
            }}
            onLoad={() => console.log('Image loaded successfully:', product?.product_image1_url)}
          />
          {/* Test placeholder image */}
          <img
            src="/placeholder.png"
            alt="Placeholder test"
            className="mt-4 w-full h-64 object-cover rounded-lg"
            style={{ zIndex: 100, position: 'relative' }}
            onError={(e) => {
              console.error('Placeholder image load failed:', e);
            }}
            onLoad={() => console.log('Placeholder image loaded successfully')}
          />
          {/* Test external image */}
          <img
            src="https://via.placeholder.com/150"
            alt="External test image"
            className="mt-4 w-full h-64 object-cover rounded-lg"
            style={{ zIndex: 100, position: 'relative' }}
            onError={(e) => {
              console.error('External test image load failed:', e);
            }}
            onLoad={() => console.log('External test image loaded successfully')}
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-4">{product.product_name}</h1>
          <p className="text-gray-600 mb-6">{product.product_description}</p>
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl font-bold text-primary">
              ₹{selectedWeight?.price || product.product_price}
            </span>
            <span className="text-gray-500">Stock: {product.product_stock_quantity}</span>
          </div>
          <div className="space-y-4 mb-6">
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
                    variant={selectedWeight?.weight === weight ? 'default' : 'outline'}
                    className={`text-sm py-1 px-2 h-auto ${
                      selectedWeight?.weight === weight ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleWeightSelect(weight, price)}
                  >
                    {weight}g - ₹{price}
                  </Button>
                )
              )}
            </div>
          </div>
          <Button
            onClick={handleAddToCart}
            className="w-full gradient-primary text-primary-foreground"
          >
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
}