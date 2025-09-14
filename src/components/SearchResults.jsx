import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cartStore';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

export const SearchResults = ({ results, onClose }) => {
  const { addItem, incrementQuantity, decrementQuantity, items } = useCartStore();

  const getItemQuantity = (productId) => {
    const item = items.find(item => item.id === productId);
    return item ? item.quantity : 0;
  };

  const handleAddToCart = (product) => {
    addItem(product);
  };

  if (results.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute left-0 right-0 mt-2 py-2 bg-background rounded-lg border shadow-lg max-h-[70vh] overflow-y-auto z-50 w-[450px]"
    >
      <div className="space-y-2">
        {results.map(product => (
          <div
            key={product.id}
            className="flex items-center gap-4 p-3 hover:bg-muted/50 transition-colors"
          >
            <Link 
              to={`/products/${product.id}`} 
              className="flex items-center gap-4 flex-1"
              onClick={onClose}
            >
              <img
                src={product.image}
                alt={product.name}
                className="w-16 h-16 object-cover rounded-md"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">{product.name}</h4>
                <p className="text-primary text-base font-semibold">₹{product.price}</p>
                <p className="text-muted-foreground text-xs line-clamp-2 mt-1">
                  {product.description}
                </p>
              </div>
            </Link>
            <div className="flex items-center gap-2 pr-2">
              {getItemQuantity(product.id) > 0 ? (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 border-secondary/20 hover:bg-secondary/10 hover:text-secondary transition-colors"
                    onClick={() => decrementQuantity(product.id)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center text-sm font-medium">
                    {getItemQuantity(product.id)}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7 border-secondary/20 hover:bg-secondary/10 hover:text-secondary transition-colors"
                    onClick={() => incrementQuantity(product.id)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  className="hover:bg-secondary/90 transition-colors"
                  onClick={() => handleAddToCart(product)}
                >
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  Add
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

SearchResults.propTypes = {
  results: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    price: PropTypes.number.isRequired,
    image: PropTypes.string.isRequired,
  })).isRequired,
  onClose: PropTypes.func.isRequired,
};
