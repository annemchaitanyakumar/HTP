import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import { ShoppingCart, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/store/cartStore';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

export const ProductCard = ({ product, index = 0 }) => {
  const addItem = useCartStore(state => state.addItem);
  const { toast } = useToast();

  const handleAddToCart = () => {
    addItem(product);
    toast({
      title: 'Added to cart',
      description: `${product.name} has been added to your cart.`,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.6 }}
      whileHover={{ y: -10 }}
      className="group"
    >
      <Card className="overflow-hidden shadow-warm hover:shadow-spice transition-all duration-300">
        <div className="relative overflow-hidden">
          <motion.img
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.3 }}
            src={product.image}
            alt={product.name}
            className="w-full h-64 object-cover"
          />
          
          {/* Category Badge */}
          <Badge
            variant={product.category === 'non-veg' ? 'destructive' : 'secondary'}
            className="absolute top-3 left-3"
          >
            {product.category === 'non-veg' ? 'Non-Veg' : 'Vegetarian'}
          </Badge>

          {/* Overlay with Actions */}
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute inset-0 bg-black/40 flex items-center justify-center gap-3"
          >
            <Link to={`/products/${product.id}`}>
              <Button size="sm" variant="outline" className="bg-white/90 text-foreground">
                <Eye className="h-4 w-4 mr-2" />
                View
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={handleAddToCart}
              className="gradient-primary text-primary-foreground"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add
            </Button>
          </motion.div>
        </div>

        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-1">{product.name}</h3>
          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
            {product.description}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-primary">
              ₹{product.price}
            </span>
            <span className="text-sm text-muted-foreground">
              {product.weight}
            </span>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0">
          <Button
            onClick={handleAddToCart}
            className="w-full gradient-primary text-primary-foreground"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add to Cart
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

ProductCard.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
    image: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired
  }).isRequired,
  index: PropTypes.number
};