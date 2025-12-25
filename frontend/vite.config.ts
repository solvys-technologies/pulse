import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/', // Changed from './' for Vercel SPA routing
  build: {
    minify: false,
    outDir: 'dist',
  },
  server: {
    // Allow Electron to connect
    cors: true,
  },
})
