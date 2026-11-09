import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/com-lab/', // Change this if your repo name is different
  plugins: [
    react(),
    tailwindcss(),
  ],
})