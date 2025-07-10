import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@page': path.resolve(__dirname, './src/pages'),
      '@env': path.resolve(__dirname, './src/config/env.ts'),
      '@routes': path.resolve(__dirname, './src/router/routes.tsx'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@layouts': path.resolve(__dirname, './src/layouts'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@components': path.resolve(__dirname, './src/components'),
      '@api': path.resolve(__dirname, './src/services/api.ts'),
      '@encryption': path.resolve(__dirname, './src/services/encryption.ts'),
    },
  },
  server: {
    allowedHosts: ["reflex-site.kamish.pro"]
  },
})
