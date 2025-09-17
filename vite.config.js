import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3000,
    proxy: {
      // Default: Send all /api requests to Spring Boot (4040)
      '/api': {
        target: 'http://localhost:4040',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            if (req.headers.authorization) {
              proxyReq.setHeader('Authorization', req.headers.authorization);
            }
            proxyReq.setHeader('Content-Type', 'application/json');
          });
          
          proxy.on('error', (err, req, res) => {
            console.error('Spring Boot Proxy Error:', err);
          });
        }
      },
      // Override: Send image-related requests to Django (8000)
      '/api/images': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            if (req.headers.authorization) {
              proxyReq.setHeader('Authorization', req.headers.authorization);
            }
          });
          
          proxy.on('error', (err, req, res) => {
            console.error('Django Proxy Error:', err);
          });
        }
      }
    }
  },
  define: {
    'process.env': {},
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    extensions: ['.js', '.jsx', '.json']
  },
  esbuild: {
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
  },
}));
