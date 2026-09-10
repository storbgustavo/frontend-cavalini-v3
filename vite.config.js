import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:5800',
      '/ws': {
        target: 'ws://localhost:5800',
        ws: true,
      },
    },
  },
})
