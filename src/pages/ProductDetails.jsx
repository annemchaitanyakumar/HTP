import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { productService } from '@/services/productService';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { toast } from '@/hooks/use-toast';

export default function ProductDetails() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const allProducts = await productService.getAllProducts();
        const selectedProduct = allProducts.find(p => p.id === parseInt(productId));
        setProduct(selectedProduct);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch product details"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

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

  const handleAddToCart = () => {
    addToCart(product);
    toast({
      title: "Added to cart",
      description: `${product.product_name} has been added to your cart`,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <img
            src={product.product_image1 ? product.product_image1.replace('https%3A/', 'https:/') : '/placeholder.png'}
            alt={product.product_name}
            className="w-full h-96 object-cover rounded-lg"
            onError={(e) => {
              e.target.src = '/placeholder.png';
              e.target.onerror = null;
            }}
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-4">{product.product_name}</h1>
          <p className="text-gray-600 mb-6">{product.product_description}</p>
          <div className="flex items-center justify-between mb-4">
            <span className="text-2xl font-bold text-primary">₹{product.product_price}</span>
            <span className="text-gray-500">Stock: {product.product_stock_quantity}</span>
          </div>
          <Button onClick={handleAddToCart} className="w-full gradient-primary text-primary-foreground">
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
}