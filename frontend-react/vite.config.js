import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/executar_bot': 'http://localhost:8000',
      '/cancelar_bot': 'http://localhost:8000',
      '/estatisticas': 'http://localhost:8000',
      '/fotos': 'http://localhost:8000',
      '/uploads': 'http://localhost:8000',
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})
