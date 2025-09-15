import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSearchStore } from '@/store/searchStore';
import { SearchResults } from './SearchResults';
import { useProductStore } from '@/store/productStore';
import { useCartStore } from '@/store/cartStore';

export const SearchBar = ({ className = '', placeholder = 'Search products...' }) => {
  const { searchQuery, setSearchQuery } = useSearchStore();
  const products = useProductStore((state) => state.products); // <-- Always use backend products
  const { addItem } = useCartStore();
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);
  const resultsRef = useRef(null);

  // Memoize search results to prevent re-renders
  const searchResults = useMemo(() => {
    return products.filter(
      (product) =>
        searchQuery.trim() !== '' &&
        (product.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.product_description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [searchQuery, products]);

  // Handle click outside to close search results
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target) &&
        resultsRef.current &&
        !resultsRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsOpen(value.trim() !== '');
  };

  // Clear search and close dropdown
  const handleClear = () => {
    setSearchQuery('');
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={searchRef}>
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={() => setIsOpen(searchQuery.trim() !== '')}
          onBlur={() => {
            // Delay to allow clicks in SearchResults to register
            setTimeout(() => {
              if (
                !searchRef.current?.contains(document.activeElement) &&
                !resultsRef.current?.contains(document.activeElement)
              ) {
                setIsOpen(false);
                setSearchQuery('');
              }
            }, 200);
          }}
          className="pl-10 pr-10 w-full min-w-[100px]"
          aria-label="Search products"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent"
            onClick={handleClear}
            aria-label="Clear search"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </div>

      {isOpen && searchResults.length > 0 && (
        <SearchResults results={searchResults} onClose={() => setIsOpen(false)} ref={resultsRef} />
      )}
    </div>
  );
};