import { forwardRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cartStore';
import { Link, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

export const SearchResults = memo(
  forwardRef(({ results, onClose }, ref) => {
    const { addItem, incrementQuantity, decrementQuantity, items } = useCartStore();
    const navigate = useNavigate(); // Add this

    const getItemQuantity = (productId) => {
      const item = items.find((item) => item.id === productId);
      return item ? item.quantity : 0;
    };

    const handleAddToCart = (e, product) => {
      e.stopPropagation(); // Stop both click and mousedown
      e.preventDefault(); // Prevent any default behavior
      addItem(product);
    };

    const handleIncrement = (e, productId) => {
      e.stopPropagation();
      e.preventDefault();
      incrementQuantity(productId);
    };

    const handleDecrement = (e, productId) => {
      e.stopPropagation();
      e.preventDefault();
      decrementQuantity(productId);
    };

    const handleProductClick = (e, productId) => {
      e.preventDefault();
      onClose();
      navigate(`/products/${productId}`);
    };

    if (results.length === 0) return null;

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute left-0 right-0 mt-2 py-2 bg-background rounded-lg border shadow-lg max-h-[70vh] overflow-y-auto z-50 w-[450px]"
      >
        <div className="space-y-2">
          {results.map((product) => (
            <div
              key={product.id}
              className="flex items-center gap-4 p-3 hover:bg-muted/50 transition-colors"
            >
              {/* Replace Link with div and add onClick handler */}
              <div
                className="flex items-center gap-4 flex-1 cursor-pointer"
                onClick={(e) => handleProductClick(e, product.id)}
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
              </div>
              {/* Rest of your cart buttons code remains the same */}
              <div className="flex items-center gap-2 pr-2">
                {getItemQuantity(product.id) > 0 ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 border-secondary/20 hover:bg-secondary/10 hover:text-secondary transition-colors"
                      onClick={(e) => handleDecrement(e, product.id)}
                      aria-label={`Decrease quantity of ${product.name}`}
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
                      onClick={(e) => handleIncrement(e, product.id)}
                      aria-label={`Increase quantity of ${product.name}`}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="hover:bg-secondary/90 transition-colors"
                    onClick={(e) => handleAddToCart(e, product)}
                    aria-label={`Add ${product.name} to cart`}
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
  })
);

SearchResults.propTypes = {
  results: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      price: PropTypes.number.isRequired,
      image: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
    })
  ).isRequired,
  onClose: PropTypes.func.isRequired,
};

SearchResults.displayName = 'SearchResults';