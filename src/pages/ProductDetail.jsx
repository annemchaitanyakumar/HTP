// src/pages/ProductDetail.jsx
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, Link } from 'react-router-dom';
import * as HoverCard from '@radix-ui/react-hover-card';
import { cn } from "@/lib/utils";
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cartStore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import axios from '@/lib/axios';
import { FREE_SHIPPING_THRESHOLD } from '@/lib/shipping';
import { Truck } from 'lucide-react';

import { API_ENDPOINTS, getApiUrl } from '@/config/constants';

export default function ProductDetail() {
  const { user } = useAuth();
  const { slug } = useParams(); // expects numeric id or slug with id
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const { addItem } = useCartStore();
  const { toast } = useToast();
  const imageRef = useRef(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [[x, y], setMousePosition] = useState([0, 0]);
  const [[imgWidth, imgHeight], setImageSize] = useState([0, 0]);
  const ZOOM_INTENSITY = 2;

  // reviews
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const extractIdFromSlug = (s) => {
    if (!s) return null;
    if (/^\d+$/.test(s)) return Number(s);
    const m = s.match(/(\d+)$/); // try trailing digits
    if (m) return Number(m[1]);
    return null;
  };

  const normalizeVariant = (v) => ({
    variant_id: v.variantId ?? v.variant_id ?? v.id ?? null,
    weight: Number(v.weight ?? v.w ?? 0),
    unit: v.unit ?? 'g',
    price: Number(v.price ?? 0),
    stock: Number(v.stock ?? 0),
    raw: v
  });

  const fetchPresignedUrls = async (productId) => {
    try {
      const r = await axios.get(`${DJANGO_PRESIGN_ENDPOINT}/${productId}/presigned-urls`);
      const data = r.data || {};
      return {
        product_image1_url: data.product_image1_url ?? data.image1_url ?? data[0] ?? null,
        product_image2_url: data.product_image2_url ?? data.image2_url ?? data[1] ?? null,
        product_image3_url: data.product_image3_url ?? data.image3_url ?? data[2] ?? null,
      };
    } catch (err) {
      console.debug('presign fetch failed', err?.message ?? err);
      return { product_image1_url: null, product_image2_url: null, product_image3_url: null };
    }
  };

  const fetchProductById = async (id) => {
    try {
      const resp = await fetch(`http://localhost:8000/api/products/${id}`, { headers: { Accept: 'application/json' }});
      if (!resp.ok) throw new Error(`product fetch failed status=${resp.status}`);
      return await resp.json();
    } catch (err) {
      console.error('Failed to fetch product by id', err);
      throw err;
    }
  };

  const getInitialVariant = (prod) => {
    const variants = Array.isArray(prod.variants) ? prod.variants.map(normalizeVariant) : [];
    const avail = variants.filter(v => Number(v.stock) > 0);
    if (!avail.length) return null;
    avail.sort((a, b) => Number(b.weight) - Number(a.weight));
    return avail[0];
  };

  const fetchAndNormalizeProduct = async (id) => {
    // Try to fetch product from Django (recommended) else try Spring
    try {
      // First try your Spring endpoint at 4040 (if exists), because your products listing is from 4040.
      // But most reliable for images is Django presign endpoint.
      let productData = null;

      // Try Spring product detail first
      try {
        const resp = await fetch(`http://localhost:4040/api/products/${id}`);
        if (resp.ok) productData = await resp.json();
      } catch (e) { /* ignore */ }

      // If Spring didn't respond, try Django product endpoint
      if (!productData) {
        productData = await fetchProductById(id);
      }

      if (!productData) throw new Error('No product data');

      // Normalize fields
      const idNorm = productData.productId ?? productData.id ?? productData.product_id ?? null;
      const name = productData.productName ?? productData.product_name ?? productData.product_title ?? productData.productTitle ?? '';
      const desc = productData.productDescription ?? productData.product_description ?? productData.productDescription ?? '';
      const category = productData.category ?? 'VEG';
      // images might be keys or full urls
      let image1 = productData.product_image1_url ?? productData.productImage1 ?? productData.productImage1Url ?? productData.product_image1 ?? null;
      let image2 = productData.product_image2_url ?? productData.productImage2 ?? productData.product_image2 ?? null;
      let image3 = productData.product_image3_url ?? productData.productImage3 ?? productData.product_image3 ?? null;

      // If images are not full URLs (don't start with http), try presign
      if (!(typeof image1 === 'string' && image1.startsWith('http'))) {
        const presigns = await fetchPresignedUrls(idNorm);
        image1 = presigns.product_image1_url ?? (image1 ? `/${image1}` : '/placeholder.png');
        image2 = presigns.product_image2_url ?? (image2 ? `/${image2}` : '/placeholder.png');
        image3 = presigns.product_image3_url ?? (image3 ? `/${image3}` : '/placeholder.png');
      }

      const variantsRaw = Array.isArray(productData.variants) ? productData.variants : (productData.variants ?? productData.variant ?? []);
      const variants = variantsRaw.map(normalizeVariant);

      return {
        id: idNorm,
        product_name: name,
        product_description: desc,
        category,
        product_image1_url: image1 ?? '/placeholder.png',
        product_image2_url: image2 ?? '/placeholder.png',
        product_image3_url: image3 ?? '/placeholder.png',
        variants
      };
    } catch (err) {
      console.error('fetchAndNormalizeProduct error', err);
      throw err;
    }
  };

  const fetchProduct = async () => {
    setLoading(true);
    try {
      let id = extractIdFromSlug(slug);
      // if slug is not numeric, try search endpoint to get id
      if (!id && slug) {
        try {
          const query = slug.replace(/-/g, ' ');
          const params = new URLSearchParams({ name: query, page: '0', size: '1' });
          const resp = await fetch(`http://localhost:4040/api/search-by-name?${params.toString()}`);
          if (resp.ok) {
            const d = await resp.json().catch(() => null);
            const items = Array.isArray(d.content) ? d.content : Array.isArray(d) ? d : (d?.content ?? []);
            if (items && items.length) id = items[0].productId ?? items[0].id ?? items[0].product_id ?? items[0].productId;
          }
        } catch (e) { /* ignore */ }
      }

      if (!id) {
        toast({ variant: 'destructive', title: 'Product not found', description: 'Could not resolve product ID' });
        setProduct(null);
        setLoading(false);
        return;
      }

      const composed = await fetchAndNormalizeProduct(id);
      setProduct(composed);
      const initial = getInitialVariant(composed);
      setSelectedVariant(initial);
    } catch (err) {
      console.error('Error in fetchProduct:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch product details' });
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProduct(); /* eslint-disable-line */ }, [slug]);

  // Reviews (kept robust, same as before)
  const parsePaginated = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.results && Array.isArray(data.results)) return data.results;
    if (data.reviews && Array.isArray(data.reviews)) return data.reviews;
    if (data.items && Array.isArray(data.items)) return data.items;
    return [];
  };

  const fetchReviews = async () => {
    if (!product?.id) return;
    const pId = product.id;
    const tryUrls = [
      `http://localhost:4040/api/reviews/product/${pId}/`,
      `http://localhost:4040/api/reviews/product/${pId}`,
      `http://localhost:4040/api/reviews-by-id/${pId}`,
      `http://localhost:4040/api/reviews/product/${pId}`,
      `http://localhost:4040/api/reviews/?product=${pId}`,
    ];

    for (const url of tryUrls) {
      try {
        const resp = await fetch(url, { headers: { Accept: 'application/json' }});
        if (!resp.ok) continue;
        const data = await resp.json().catch(() => null);
        const parsed = parsePaginated(data);
        const normalized = parsed.map(r => ({
          id: r.id ?? r.pk ?? null,
          rating: r.rating ?? r.score ?? 0,
          comment: r.comment ?? r.text ?? '',
          created_at: r.created_at ?? r.createdAt ?? r.timestamp ?? null,
          user: {
            first_name: r.user_firstname ?? (r.user?.firstname ?? r.user?.first_name) ?? null,
            last_name: r.user_lastname ?? (r.user?.lastname ?? r.user?.last_name) ?? null,
            userid: r.user_id ?? r.user?.userid ?? r.user?.id ?? null
          }
        }));
        setReviews(normalized);
        return;
      } catch (err) { continue; }
    }
    setReviews([]);
  };

  const fetchAverageRating = async () => {
    if (!product?.id) return;
    const pId = product.id;
    const tryUrls = [
      `http://localhost:8000/api/reviews/product/${pId}/average/`,
      `http://localhost:8000/api/reviews/product/${pId}/average`,
      `http://localhost:4040/api/reviews-average/${pId}`,
      `http://localhost:4040/api/reviews/${pId}/average`,
    ];
    for (const url of tryUrls) {
      try {
        const resp = await fetch(url, { headers: { Accept: 'application/json' }});
        if (!resp.ok) continue;
        const data = await resp.json().catch(() => null);
        const avg = data?.average_rating ?? data?.average ?? data?.avg ?? 0;
        const cnt = data?.total_reviews ?? data?.count ?? data?.total ?? 0;
        setAverageRating(Number(avg) || 0);
        setRatingCount(Number(cnt) || 0);
        return;
      } catch (err) { continue; }
    }
    setAverageRating(0);
    setRatingCount(0);
  };

  useEffect(() => {
    if (product) {
      fetchReviews();
      fetchAverageRating();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  // submit review (keeps previous robust approach)
  const handleSubmitReview = async () => {
    if (!product?.id) return toast({ variant: 'destructive', title: 'Product missing' });
    if (!newRating || !newComment.trim()) return toast({ variant: 'destructive', title: 'Invalid review', description: 'Select rating and add comment' });
    setSubmittingReview(true);
    try {
      const token = user?.token ?? localStorage.getItem('token') ?? localStorage.getItem('auth_token');
      const payload = { product: product.id, user_id: user?.userid ?? undefined, rating: newRating, comment: newComment.trim() };
      const tryPostUrls = [`http://localhost:4040/api/create-review`, `http://localhost:8000/api/reviews/`, `http://localhost:8000/api/reviews`];
      let posted = false;
      for (const url of tryPostUrls) {
        try {
          const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) });
          if (!resp.ok) continue;
          posted = true;
          break;
        } catch (err) { continue; }
      }
      if (!posted) throw new Error('Could not post review; check endpoint and auth');
      toast({ title: 'Review submitted' });
      setNewRating(0); setNewComment('');
      await fetchReviews(); await fetchAverageRating();
    } catch (err) {
      console.error('submit review error', err);
      toast({ variant: 'destructive', title: 'Failed to submit review', description: String(err.message) });
    } finally {
      setSubmittingReview(false);
    }
  };

  // cart and variants helpers
  const getVariants = () => Array.isArray(product?.variants) ? product.variants.map(normalizeVariant) : [];
  const getTotalStock = () => getVariants().reduce((a, v) => a + (Number(v.stock) || 0), 0);
  const getCurrentStock = () => (selectedVariant ? Number(selectedVariant.stock || 0) : 0);
  const isOutOfStockOverall = getVariants().length ? getVariants().every(v => Number(v.stock) <= 0) : true;

  const handleVariantSelect = (variant) => {
    if (Number(variant.stock) > 0) setSelectedVariant(variant);
  };

  const handleAddToCart = async () => {
    if (!selectedVariant) return toast({ variant: 'destructive', title: 'Please select weight' });
    const currentStock = getCurrentStock();
    if (currentStock <= 0) return toast({ variant: 'destructive', title: 'Out of stock' });
    setAddingToCart(true);
    try {
      const cartItem = { id: product.id, name: product.product_name, price: selectedVariant.price, product_image1_url: product.product_image1_url || '/placeholder.png', weight: selectedVariant.weight, quantity: 1 };
      await addItem(cartItem);
      toast({ title: 'Added to cart' });
    } catch (err) {
      console.error('add to cart error', err);
      toast({ variant: 'destructive', title: 'Failed to add to cart' });
    } finally { setAddingToCart(false); }
  };

  // image rotation
  const images = product ? [product.product_image1_url, product.product_image2_url, product.product_image3_url].filter(Boolean) : [];
  useEffect(() => {
    // Don't rotate when hovering (for zoom) or when there's only one image
    if (images.length <= 1 || isHovered) return;
    
    const timer = setInterval(() => setCurrentImageIndex(prev => (prev + 1) % images.length), 3000);
    return () => clearInterval(timer);
  }, [isHovered, images.length]);

  if (loading) return <div className="container mx-auto p-4">Loading...</div>;
  if (!product) return (
    <div className="container mx-auto p-4 text-center">
      <h2 className="text-2xl font-bold">Product Not Found</h2>
      <Link to="/products" className="text-primary mt-4 inline-block">Back to products</Link>
    </div>
  );

  const variants = getVariants();
  const availableVariants = variants.filter(v => Number(v.stock) > 0);
  const displayedPrice = selectedVariant?.price ?? (availableVariants.length ? Math.min(...availableVariants.map(v => Number(v.price))) : 0);
  const displayedWeight = selectedVariant?.weight ?? null;
  const totalStock = getTotalStock();
  const currentStock = getCurrentStock();

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/products" className="inline-flex items-center text-primary hover:text-primary/80">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Products
          </Link>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* images */}
        <div className="space-y-4">
          <div 
            className="relative aspect-square w-full max-w-[400px] mx-auto overflow-hidden rounded-xl bg-gray-100 group cursor-zoom-in" 
            onMouseEnter={(e) => {
              setIsHovered(true);
              const rect = e.currentTarget.getBoundingClientRect();
              setImageSize([rect.width, rect.height]);
            }} 
            onMouseLeave={() => {
              setIsHovered(false);
              setCurrentImageIndex(0);
              setMousePosition([0, 0]);
            }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = (e.clientX - rect.left) / rect.width;
              const y = (e.clientY - rect.top) / rect.height;
              setMousePosition([x, y]);
            }}
          >
            <AnimatePresence mode="wait">
              <motion.img 
                key={currentImageIndex} 
                src={images[currentImageIndex] ?? '/placeholder.png'} 
                alt={`${product.product_name} view ${currentImageIndex + 1}`} 
                className="w-full h-full object-contain bg-white transition-transform duration-100"
                style={{
                  transform: isHovered 
                    ? `scale(${ZOOM_INTENSITY}) translate(${((0.5 - x) * 100) / ZOOM_INTENSITY}%, ${((0.5 - y) * 100) / ZOOM_INTENSITY}%)`
                    : 'none'
                }}
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                transition={{ duration: 0.4 }} 
                ref={imageRef} 
                onError={(e) => { e.target.src = '/placeholder.png'; e.target.onerror = null; }} 
              />
            </AnimatePresence>
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-3 gap-2 max-w-[400px] mx-auto">
              {images.map((img, i) => (
                <button key={i} onClick={() => setCurrentImageIndex(i)} className={cn("group relative aspect-square overflow-hidden rounded-lg transition-all duration-200 bg-white", currentImageIndex === i ? "ring-2 ring-primary scale-105" : "opacity-70 hover:opacity-100 hover:scale-105")}>
                  <img src={img} alt={`thumb ${i+1}`} className="w-full h-full object-contain" onError={(e) => e.currentTarget.src = '/placeholder.png'} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* details */}
        <div>
          <span className="text-sm uppercase tracking-wider text-gray-500 font-medium mb-2 block">Homely Taste Pickles</span>
          <h1 className="text-3xl font-bold mb-4">{product.product_name}</h1>
          <p className="text-gray-600 mb-4">{product.product_description}</p>

          <div className="flex items-center gap-2 mb-6">
            <div className="flex text-yellow-500">{[...Array(5)].map((_, i) => (<svg key={i} className="w-5 h-5" fill={i < Math.round(averageRating) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>))}</div>
            <span className="text-gray-500 text-sm">({averageRating.toFixed(1)} / 5) - {ratingCount} reviews</span>
          </div>

          <div className="flex flex-col gap-2 mb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary">₹{displayedPrice}</span>
              {displayedWeight && <span className="text-gray-500">/ {displayedWeight}g</span>}
            </div>

            <div className="flex items-center gap-2">
              <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, ease: "easeInOut", repeat: currentStock > 0 && currentStock < 10 ? Infinity : 0 }} className={cn("w-2 h-2 rounded-full", currentStock > 10 && "bg-green-500", currentStock > 0 && currentStock <= 10 && "bg-red-500", currentStock <= 0 && "bg-gray-500")} />
              <span className={cn("text-sm font-medium", currentStock > 10 && "text-green-600", currentStock > 0 && currentStock <= 10 && "text-red-600", currentStock <= 0 && "text-gray-600")}>
                {currentStock > 10 ? `In Stock (${currentStock} available)` : currentStock > 0 ? `Low Stock (${currentStock} left)` : 'Out of Stock'}
              </span>
            </div>
          </div>
          
          <div className="max-w-xs">
            <div className="flex items-center gap-2 text-sm text-primary border border-primary/20 rounded-md p-2 bg-primary/5">
              <Truck className="h-4 w-4 flex-shrink-0" />
              <span>FREE delivery on orders above ₹{FREE_SHIPPING_THRESHOLD}!</span>
            </div>
          </div>

          <div className="relative space-y-4 mb-6 max-w-xs">
            <label className="text-sm font-medium text-gray-700">Select Weight:</label>
            <div className="grid grid-cols-2 gap-2">
              {variants.map(variant => {
                const stock = Number(variant.stock || 0);
                return (
                  <Button key={variant.variant_id ?? `${variant.weight}-${variant.price}`} variant={selectedVariant?.variant_id === variant.variant_id ? 'default' : 'outline'} className={cn("text-sm py-1 px-2 h-auto relative", selectedVariant?.variant_id === variant.variant_id && "ring-2 ring-primary", stock <= 0 && "opacity-50 cursor-not-allowed")} onClick={() => handleVariantSelect(variant)} disabled={stock <= 0}>
                    {variant.weight}g - ₹{variant.price}
                  </Button>
                );
              })}
            </div>

            {isOutOfStockOverall && (
              <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none" initial={{ opacity: 0, scale: 1.2 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
                <div className="transform rotate-[-20deg]"><span className="text-3xl font-bold text-red-500/30 border-4 border-red-500/30 px-4 py-2 uppercase">Sold Out</span></div>
              </motion.div>
            )}
          </div>

          <div className="max-w-xs">
            <Button onClick={handleAddToCart} disabled={!selectedVariant || currentStock <= 0 || addingToCart} className={cn("w-full gradient-primary text-primary-foreground relative", (!selectedVariant || currentStock <= 0 || addingToCart) && "opacity-50 cursor-not-allowed pointer-events-none")}>
              {addingToCart ? 'Adding...' : currentStock <= 0 ? 'Out of Stock' : 'Add to Cart'}
            </Button>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Customer Reviews</h2>
        {reviews.length === 0 ? <p className="text-gray-600">No reviews yet. Be the first to review this product!</p> : reviews.map(review => (
          <div key={review.id} className="border-b py-4">
            <div className="flex justify-between mb-2">
              <span className="font-medium">{`${review.user?.first_name ?? ''} ${review.user?.last_name ?? ''}`.trim() || 'Anonymous'}</span>
              <span className="text-sm text-gray-500">{review.created_at ? new Date(review.created_at).toLocaleDateString() : ''}</span>
            </div>
            <div className="flex mb-2">{[...Array(5)].map((_, i) => (<svg key={i} className="w-4 h-4 text-yellow-500" fill={i < (review.rating ?? 0) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>))}</div>
            <p className="text-gray-700">{review.comment}</p>
          </div>
        ))}

        {user ? (
          <div className="mt-8">
            <h3 className="text-xl font-bold mb-4">Write a Review</h3>
            <div className="flex mb-4">{[1,2,3,4,5].map(r => (<button key={r} onClick={() => setNewRating(r)} className="mr-1" type="button"><svg className="w-6 h-6" fill={r <= newRating ? "#eab308" : "#d1d5db"} viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg></button>))}</div>
            <textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} className="w-full p-2 border rounded-md mb-4" rows="4" placeholder="Share your thoughts..." />
            <Button onClick={handleSubmitReview} disabled={submittingReview}>{submittingReview ? 'Submitting...' : 'Submit Review'}</Button>
          </div>
        ) : <p className="mt-4 text-gray-600">Please log in to write a review.</p>}
      </div>
    </div>
    </div>
  );
}
