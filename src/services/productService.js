import axios from '../lib/axios';

import { slugify } from '@/lib/slugify';

class ProductService {
    async getAllProducts() {
        try {
            const response = await axios.get('/api/get-all-products');
            // Add slug to each product and ensure we use product_name
            const productsWithSlugs = response.data.map(product => {
                // Make sure we have a product name to create a slug from
                if (!product.product_name) {
                    console.error('Product missing product_name:', product);
                }
                const productName = product.product_name || product.name || `product-${product.id}`;
                const slug = slugify(productName);
                console.log(`Created slug for product ${product.id}: ${slug} from name: ${productName}`);
                return {
                    ...product,
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
}

export const productService = new ProductService();