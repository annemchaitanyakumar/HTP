import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSearchStore } from '@/store/searchStore';
import { SearchResults } from './SearchResults';
import { products } from '@/data/products';

export const SearchBar = ({ className = '', placeholder = 'Search products...' }) => {
  const { searchQuery, setSearchQuery } = useSearchStore();
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);

  // Filter products based on search query
  const searchResults = products.filter(product => 
    searchQuery.trim() !== '' && (
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Handle click outside to close search results and reset search
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery(''); // Reset search query when clicking outside
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setSearchQuery]);

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
            // Use setTimeout to allow click events on search results to fire first
            setTimeout(() => {
              if (!searchRef.current?.contains(document.activeElement)) {
                setSearchQuery('');
                setIsOpen(false);
              }
            }, 200);
          }}
          className="pl-10 pr-10 w-full min-w-[100px]"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent"
            onClick={handleClear}
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </div>

      {isOpen && searchResults.length > 0 && (
        <SearchResults 
          results={searchResults} 
          onClose={() => setIsOpen(false)} 
        />
      )}
    </div>
  );
};
