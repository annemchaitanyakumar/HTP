import { useState, useEffect, useRef, useMemo } from 'react';
import { Mic, X, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSearchStore } from '@/store/searchStore';
import { SearchResults } from './SearchResults';
import { useProductStore } from '@/store/productStore';

export const SearchBar = ({ className = '', placeholder = 'Search products...' }) => {
  const { searchQuery, setSearchQuery } = useSearchStore();
  const products = useProductStore((state) => state.products);
  const [isOpen, setIsOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const searchRef = useRef(null);
  const resultsRef = useRef(null);
  const [angle, setAngle] = useState(0);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return products.filter(
      (product) =>
        product.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.product_description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, products]);

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

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsOpen(value.trim() !== '');
  };

  const handleClear = () => {
    setSearchQuery('');
    setIsOpen(false);
  };

  // Voice search setup
  const handleMicClick = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }
      setSearchQuery(transcript);
      setIsOpen(transcript.trim() !== '');
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Animate the conic-gradient angle
  useEffect(() => {
    let frame;
    if (listening) {
      const animate = () => {
        setAngle((prev) => (prev + 2) % 360);
        frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(frame);
  }, [listening]);

  // Custom colors for the border
  const borderColors = [
    '#7C3AED', // purple
    '#06B6D4', // cyan
    '#F59E42', // orange
    '#F43F5E', // pink
    '#7C3AED', // purple again
  ];

  return (
    <div
      className={`relative ${className}`}
      ref={searchRef}
      style={{ minWidth: 0, width: '100%' }}
    >
      {/* Animated border wrapper */}
      <div
        className="relative w-full"
        style={{
          padding: listening ? '4.5px' : '0', // <-- Thicker border!
          borderRadius: '1.5rem',           // <-- More rounded for thicker border
          background: listening
            ? `conic-gradient(from ${angle}deg, ${borderColors.join(',')})`
            : 'transparent',
          transition: 'padding 0.2s, background 0.2s, border-radius 0.2s',
        }}
      >
        {/* White inner area */}
        <div
          className="relative bg-white flex items-center"
          style={{
            borderRadius: '1.2rem',         // <-- Match outer radius minus padding
            overflow: 'hidden',
            boxShadow: listening ? '0 0 0 1.5px #e5e7eb' : 'none',
          }}
        >
          {/* Search icon */}
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-20 pointer-events-none">
            <Search className="w-4 h-4" />
          </span>
          <Input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => setIsOpen(searchQuery.trim() !== '')}
            className="pl-10 pr-12 w-full h-10 text-base bg-white rounded-lg relative z-10"
            aria-label="Search products"
            style={{
              background: 'white',
              borderRadius: '1.2rem',
              position: 'relative',
              zIndex: 10,
              boxShadow: 'none',
            }}
          />
          {/* Mic and clear buttons */}
          <span className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center z-20">
            {!listening ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-transparent"
                onClick={handleMicClick}
                aria-label="Voice search"
              >
                <Mic className="w-5 h-5 text-gray-500" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-transparent"
                aria-label="Listening"
                tabIndex={-1}
              >
                <Mic className="w-5 h-5 text-purple-500" />
              </Button>
            )}
          </span>
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent z-20"
              onClick={handleClear}
              aria-label="Clear search"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>
      {isOpen && searchResults.length > 0 && (
        <SearchResults results={searchResults} onClose={() => setIsOpen(false)} ref={resultsRef} />
      )}
    </div>
  );
};