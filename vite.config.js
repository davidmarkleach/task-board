import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // In development, `npm run dev` forwards API calls to `npm start` running on port 3000.
    proxy: { '/api': 'http://localhost:3000' },
  },
})
