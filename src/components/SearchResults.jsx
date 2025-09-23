import { forwardRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cartStore';
import { Link, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

// Helper to get main price and weight
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

export const SearchResults = memo(
  forwardRef(({ results, onClose }, ref) => {
    const { addItem, incrementQuantity, decrementQuantity, items } = useCartStore();
    const navigate = useNavigate();

    const getItemQuantity = (productId) => {
      const item = items.find((item) => item.productId === productId);
      return item ? item.quantity : 0;
    };

    const handleAddToCart = async (e, product) => {
      e.stopPropagation();
      e.preventDefault();
      try {
        const { price, weight } = getMainPrice(product);
        
        // Debug the values before sending
        console.log('Adding product:', {
          id: product.id,
          name: product.product_name,
          price,
          weight,
          category: product.category
        });

        if (!product.id) {
          console.error('Product ID is missing:', product);
          return;
        }

        await addItem({
          id: product.id,
          product_name: product.product_name,
          price_by_weight: { [weight]: price },
          category: product.category,
          product_image1_url: product.product_image1_url || '/placeholder.png',
          slug: product.slug || product.product_name.toLowerCase().replace(/\s+/g, '-'),
          quantity: 1,
          weight: weight
        });
      } catch (error) {
        console.error('Error adding item to cart:', error);
      }
    };

    const handleIncrement = async (e, productId) => {
      e.stopPropagation();
      e.preventDefault();
      const item = items.find(item => item.productId === productId);
      if (item) {
        await incrementQuantity(item.cartId);
      }
    };

    const handleDecrement = async (e, productId) => {
      e.stopPropagation();
      e.preventDefault();
      const item = items.find(item => item.productId === productId);
      if (item) {
        await decrementQuantity(item.cartId);
      }
    };

    const handleProductClick = (e, product) => {
      e.preventDefault();
      onClose();
      const slug = product.slug || product.product_name.toLowerCase().replace(/\s+/g, '-');
      navigate(`/products/${slug}`);
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
          {results.map((product) => {
            const { price, weight } = getMainPrice(product);
            return (
              <div
                key={product.id}
                className="flex items-center gap-4 p-3 hover:bg-muted/50 transition-colors"
              >
                {/* Clickable area for navigation */}
                <div
                  className="flex items-center gap-4 flex-1 cursor-pointer group"
                  onClick={(e) => handleProductClick(e, product)}
                >
                  <img
                    src={product.product_image1_url || '/placeholder.png'}
                    alt={product.product_name}
                    className="w-16 h-16 object-cover rounded-md hover:opacity-75 transition-opacity"
                    onError={(e) => {
                      console.error('Image failed to load:', product.id, e.target.src);
                      e.target.src = '/placeholder.png';
                      e.target.onerror = null;
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm group-hover:text-primary transition-colors">{product.product_name}</h4>
                    <p className="text-primary text-base font-semibold">
                      ₹{price}
                      {weight && (
                        <span className="text-xs text-gray-500"> / {weight}g</span>
                      )}
                    </p>
                    <p className="text-muted-foreground text-xs line-clamp-2 mt-1">
                      {product.product_description}
                    </p>
                  </div>
                </div>
                {/* Add to cart controls */}
                <div className="flex items-center gap-2 pr-2">
                  {getItemQuantity(product.id) > 0 ? (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 border-secondary/20 hover:bg-secondary/10 hover:text-secondary transition-colors"
                        onClick={(e) => handleDecrement(e, product.id)}
                        aria-label={`Decrease quantity of ${product.product_name}`}
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
                        aria-label={`Increase quantity of ${product.product_name}`}
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
                      aria-label={`Add ${product.product_name} to cart`}
                    >
                      <ShoppingCart className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    );
  })
);

SearchResults.propTypes = {
  results: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      product_name: PropTypes.string.isRequired,
      product_price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      price_by_weight: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
      product_image1_url: PropTypes.string,
      product_description: PropTypes.string.isRequired,
      category: PropTypes.string.isRequired,
    })
  ).isRequired,
  onClose: PropTypes.func.isRequired,
};

SearchResults.displayName = 'SearchResults';