import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
  plugins: [tailwindcss(), react()],
  mode: "development",
  build: {
    minify: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'mini-widget': resolve(__dirname, 'mini-widget.html'),
      },
    },
  },
  // Configure for Electron
  base: './',
  server: {
    // Allow Electron to connect
    cors: true,
  },
})
