class ProductService {
    async getAllProducts() {
        try {
            const response = await fetch('/api/get-all-products');
            if (!response.ok) {
                throw new Error('Failed to fetch products');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching products:', error);
            throw error;
        }
    }
}

export const productService = new ProductService();