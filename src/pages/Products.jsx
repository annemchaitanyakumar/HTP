import { useState } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { ProductCard } from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { products } from '@/data/products';
import { useSearchStore } from '@/store/searchStore';
import { SearchBar } from '@/components/SearchBar';

export default function Products() {
  const [filter, setFilter] = useState('all');
  const { searchQuery } = useSearchStore();

  const filteredProducts = products.filter(product => {
    const matchesFilter = filter === 'all' ? true : product.category === filter;
    const matchesSearch = searchQuery.trim() === '' ? true : 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Navbar />
      
      {/* Hero Section */}
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

          {/* Filter Buttons */}
          {/* Search Bar */}
          {/* <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-md mx-auto mb-8"
          >
            <SearchBar className="w-full" placeholder="Search pickles by name or description..." />
          </motion.div> */}

          {/* Filter Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center mb-12"
          >
            <Card>
              <CardContent className="p-2">
                <div className="flex gap-2">
                  <Button
                    variant={filter === 'all' ? 'default' : 'outline'}
                    onClick={() => setFilter('all')}
                    className={filter === 'all' ? 'gradient-primary text-primary-foreground' : ''}
                  >
                    All Products
                  </Button>
                  <Button
                    variant={filter === 'veg' ? 'default' : 'outline'}
                    onClick={() => setFilter('veg')}
                    className={filter === 'veg' ? 'gradient-primary text-primary-foreground' : ''}
                  >
                    Vegetarian
                  </Button>
                  <Button
                    variant={filter === 'non-veg' ? 'default' : 'outline'}
                    onClick={() => setFilter('non-veg')}
                    className={filter === 'non-veg' ? 'gradient-primary text-primary-foreground' : ''}
                  >
                    Non-Vegetarian
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Products Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
          >
            {filteredProducts.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
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