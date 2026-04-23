import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: './', 
      server: {
        port: 5173, 
        strictPort: true, 
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
        'process.env.FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      // EKLEME YAPILAN KISIM BURASI:
      build: {
        chunkSizeWarningLimit: 1000, // Uyarı eşiğini 1000kb'a çıkarır
        rollupOptions: {
          output: {
            // Büyük kütüphaneleri ayrı dosyalara böler (Performans için)
            manualChunks(id) {
              if (id.includes('node_modules')) {
                if (id.includes('firebase')) {
                  return 'vendor-firebase';
                }
                if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('xlsx')) {
                  return 'vendor-utils';
                }
                return 'vendor'; // Geri kalan kütüphaneler
              }
            }
          }
        }
      }
    }
});