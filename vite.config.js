import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/gis',
  build: {
    outDir: 'build',
    assetsDir: 'static',
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          let extType = assetInfo.name.split('.')[1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            extType = 'img';
          }
          return `static/${extType}/[name]-[hash][extname]`;
        },
        chunkFileNames: 'static/js/[name]-[hash].js',
        entryFileNames: 'static/js/[name]-[hash].js',
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true
  }
})