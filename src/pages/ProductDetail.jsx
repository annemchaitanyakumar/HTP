import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Product3D } from '@/components/Product3D';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, ArrowLeft, Star } from 'lucide-react';
import { products } from '@/data/products';
import { useCartStore } from '@/store/cartStore';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

export default function ProductDetail() {
  const { id } = useParams();
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore(state => state.addItem);
  const { toast } = useToast();

  const product = products.find(p => p.id === id);
  console.log('Looking for product with id:', id);

  if (!product) {
    return <Navigate to="/products" replace />;
  }

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem(product);
    }
    toast({
      title: 'Added to cart',
      description: `${quantity} ${product.name}(s) added to your cart.`,
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
              {/* Main Product Image */}
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-96 object-cover"
                  />
                </CardContent>
              </Card>

              {/* 3D Product View */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">3D Product View</h3>
                  <Product3D 
                    productName={product.name} 
                    color={getColorForProduct(product.name)}
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
                  variant={product.category === 'non-veg' ? 'destructive' : 'secondary'}
                  className="mb-4"
                >
                  {product.category === 'non-veg' ? 'Non-Vegetarian' : 'Vegetarian'}
                </Badge>
                
                <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
                
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <span className="text-muted-foreground">(4.8 out of 5)</span>
                </div>

                <p className="text-3xl font-bold text-primary mb-6">
                  ₹{product.price}
                  <span className="text-lg font-normal text-muted-foreground ml-2">
                    / {product.weight}
                  </span>
                </p>

                <p className="text-lg text-muted-foreground mb-6">
                  {product.description}
                </p>
              </div>

              {/* Ingredients */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Ingredients</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.ingredients.map((ingredient, index) => (
                      <Badge key={index} variant="outline">
                        {ingredient}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quantity and Add to Cart */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-6">
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

                  <Button
                    onClick={handleAddToCart}
                    size="lg"
                    className="w-full gradient-primary text-primary-foreground"
                  >
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Add to Cart - ₹{product.price * quantity}
                  </Button>
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