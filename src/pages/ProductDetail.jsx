import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Product3D } from '@/components/Product3D';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Carousel } from "@/components/ui/carousel-simple";
import { ShoppingCart, ArrowLeft, Star } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import axios from '../lib/axios';
import { productService } from '@/services/productService';

export default function ProductDetail() {
  const { slug } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeight, setSelectedWeight] = useState(null);
  const [selectedPrice, setSelectedPrice] = useState(null);
  const addItem = useCartStore(state => state.addItem);
  const { toast } = useToast();

  // Debug log the received slug parameter
  console.log('URL parameter:', useParams());

  const fetchPresignedUrls = async (productId) => {
    const presignedUrlsUrl = `http://localhost:8000/api/products/${productId}/presigned-urls/`;
    try {
      const response = await axios.get(presignedUrlsUrl);
      console.log(`Presigned URLs for product ${productId}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch presigned URLs for product ${productId}:`, error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchProduct = async () => {
      console.log('Fetching product with slug:', slug);
      try {
        // Get product data using the slug
        const productData = await productService.getProduct(slug);
        console.log('Found product:', productData);
        
        if (productData) {
          console.log('Found product by slug:', productData);
          try {
            // Get presigned URLs using the product's ID
            const presignedUrlsResponse = await fetchPresignedUrls(productData.id);
            
            setProduct({
              ...productData,
              product_image1_url: presignedUrlsResponse.image1_url,
              product_image2_url: presignedUrlsResponse.image2_url,
              product_image3_url: presignedUrlsResponse.image3_url,
              product_image4_url: presignedUrlsResponse.image4_url,
              product_image5_url: presignedUrlsResponse.image5_url,
            });
          } catch (imageError) {
            console.error('Failed to fetch image URLs:', imageError);
            // If image fetching fails, still show the product with original URLs
            setProduct(productData);
          }
        } else {
          toast({
            variant: "destructive",
            title: "Product not found",
            description: "The requested product could not be found.",
          });
          setProduct(null);
        }
      } catch (error) {
        console.error('Error fetching product detail:', error);
        if (error.response) {
          console.error('Backend response:', error.response.data);
          console.error('Status code:', error.response.status);
          console.error('Headers:', error.response.headers);
        }
        toast({
          variant: "destructive",
          title: "Error loading product",
          description: "There was an error loading the product details. Please try again.",
        });
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-lg font-medium">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product && !loading) {
    return <Navigate to="/products" replace />;
  }

  const handleAddToCart = () => {
    if (product.price_by_weight && !selectedWeight) {
      toast({
        variant: "destructive",
        title: "Please select weight",
        description: "You must select a weight option before adding to cart.",
      });
      return;
    }

    const itemToAdd = {
      ...product,
      selectedWeight,
      selectedPrice,
      finalPrice: product.price_by_weight ? selectedPrice : product.product_price
    };

    for (let i = 0; i < quantity; i++) {
      addItem(itemToAdd);
    }
    
    toast({
      title: 'Added to cart',
      description: `${quantity} ${product.product_name}${selectedWeight ? ` (${selectedWeight}g)` : ''} added to your cart.`,
    });
  };

  const getColorForProduct = (productName) => {
    if (productName.toLowerCase().includes('chicken')) return '#ff6b35';
    if (productName.toLowerCase().includes('mutton')) return '#8b1538';
    if (productName.toLowerCase().includes('fish')) return '#ffa500';
    if (productName.toLowerCase().includes('prawn')) return '#ff4500';
    if (productName.toLowerCase().includes('mango')) return '#ffb347';
    return '#228b22';
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Navbar />
      
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8"
          >
            <Link to="/products">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Products
              </Button>
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Product Images and 3D View */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              {/* Main Product Images Carousel */}
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <Carousel 
                    images={[
                      product.product_image1_url,
                      product.product_image2_url,
                      product.product_image3_url,
                      product.product_image4_url,
                      product.product_image5_url
                    ].filter(Boolean)}
                    className="rounded-lg"
                    autoPlayInterval={5000} // Changes image every 5 seconds
                  />
                </CardContent>
              </Card>

              {/* 3D Product View */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">3D Product View</h3>
                  <Product3D 
                    productName={product.product_name || product.name} 
                    color={getColorForProduct(product.product_name || product.name)}
                  />
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    Drag to rotate • Scroll to zoom
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Product Details */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-6"
            >
              <div>
                <Badge
                  variant={product.category && product.category.toUpperCase() === 'NON-VEG' ? 'destructive' : 'secondary'}
                  className="mb-4"
                >
                  {product.category && product.category.toUpperCase() === 'NON-VEG' ? 'Non-Vegetarian' : 'Vegetarian'}
                </Badge>
                
                <h1 className="text-4xl font-bold mb-4">{product.product_name || product.name}</h1>
                
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <span className="text-muted-foreground">(4.8 out of 5)</span>
                </div>

                <p className="text-3xl font-bold text-primary mb-6">
                  ₹{product.product_price || product.price}
                  {product.product_stock_quantity && (
                    <span className="text-lg font-normal text-muted-foreground ml-2">
                      • Stock: {product.product_stock_quantity}
                    </span>
                  )}
                </p>

                <p className="text-lg text-muted-foreground mb-6">
                  {product.product_description || product.description}
                </p>
              </div>

              {/* Ingredients (if available) */}
              {(product.ingredients || product.product_ingredients) && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Ingredients</h3>
                    <div className="flex flex-wrap gap-2">
                      {(product.ingredients || product.product_ingredients).map((ingredient, index) => (
                        <Badge key={index} variant="outline">
                          {ingredient}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Weight Selection and Add to Cart */}
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Weight Selection */}
                    {product.price_by_weight && (
                      <div>
                        <label className="text-sm font-medium block mb-3">Select Weight:</label>
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(product.price_by_weight).map(([weight, price]) => (
                            <Button
                              key={weight}
                              variant={selectedWeight === weight ? "default" : "outline"}
                              className="w-full"
                              onClick={() => {
                                setSelectedWeight(weight);
                                setSelectedPrice(price);
                              }}
                            >
                              {weight}g - ₹{price}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quantity Selection */}
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium">Quantity:</label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        >
                          -
                        </Button>
                        <span className="w-12 text-center font-medium">{quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQuantity(quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    {/* Add to Cart Button */}
                    <Button
                      onClick={handleAddToCart}
                      size="lg"
                      className="w-full gradient-primary text-primary-foreground"
                      disabled={product.price_by_weight && !selectedWeight}
                    >
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      {product.price_by_weight ? (
                        `Add to Cart - ₹${selectedPrice * quantity} (${selectedWeight}g)`
                      ) : (
                        `Add to Cart - ₹${product.product_price * quantity}`
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Product Features */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Product Features</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Made with traditional recipes</li>
                    <li>• Premium quality ingredients</li>
                    <li>• No artificial preservatives</li>
                    <li>• Handcrafted with care</li>
                    <li>• Authentic taste guaranteed</li>
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}