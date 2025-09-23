import axios from '../lib/axios';

import { slugify } from '@/lib/slugify';

class ProductService {
    async getAllProducts() {
        try {
            const response = await axios.get('/api/get-all-products', {
                // Force bypass cache and get fresh data
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            
            console.log('Raw API response:', response.data);
            
            const productsWithSlugs = response.data.map(product => {
                // Make sure we have a product name to create a slug from
                if (!product.product_name) {
                    console.error('Product missing product_name:', product);
                }
                const productName = product.product_name || product.name || `product-${product.id}`;
                const slug = slugify(productName);
                
                // Ensure stock quantity is a number and default to 0
                let stock = 0;
                if (product.product_stock_quantity !== null && product.product_stock_quantity !== undefined) {
                    stock = typeof product.product_stock_quantity === 'string' 
                        ? parseInt(product.product_stock_quantity, 10) 
                        : product.product_stock_quantity;
                }
                
                console.log(`Product ${productName} (ID: ${product.id}) - Raw stock: ${product.product_stock_quantity}, Processed stock: ${stock}`);
                
                return {
                    ...product,
                    product_stock_quantity: stock,
                    slug
                };
            });
            
            return productsWithSlugs;
        } catch (error) {
            console.error('Error fetching products:', error);
            throw error;
        }
    }

    async getProduct(slugOrId) {
        try {
            // First try to get all products
            const allProducts = await this.getAllProducts();
            
            // Debug the incoming parameter
            console.log('Looking for product with slug/id:', slugOrId);
            
            // Try to find by slug first
            let product = allProducts.find(p => p.slug === slugOrId);
            
            // If not found by slug and it's a number, try by ID
            if (!product && !isNaN(slugOrId)) {
                console.log('Slug not found, trying ID lookup');
                const id = typeof slugOrId === 'string' ? parseInt(slugOrId) : slugOrId;
                product = allProducts.find(p => p.id === id);
            }
            
            // Debug the found product
            console.log('Found product:', product);
            
            if (!product) {
                throw new Error('Product not found');
            }
            
            return product;
        } catch (error) {
            console.error('Error fetching product:', error);
            throw error;
        }
    }

    async fetchPresignedUrls(productId) {
        try {
            console.log('Fetching presigned URLs for product:', productId);
            const response = await axios.post('/api/get-s3-presigned-urls', { product_id: productId });
            console.log('Received presigned URLs:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error fetching presigned URLs:', error);
            throw error;
        }
    }
}

export const productService = new ProductService();